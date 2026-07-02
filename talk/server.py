"""AURA talk server — a small FastAPI app you speak to.

Three reply backends, auto-selected at request time:
  1. Claude        — if ANTHROPIC_API_KEY is set (best quality; billed per turn)
  2. Local LLM     — if an Ollama server is reachable (free, private, on-device)
  3. Offline       — curated ACT responder, always available ($0, canned)

Red-flag emergencies are detected server-side and force escalation regardless of
which backend produced the words — AURA never withholds escalation, never
diagnoses.

Run:
    cd talk && ../.venv/bin/uvicorn server:app --port 8600
    open http://localhost:8600
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import persona

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "static")

MAX_TOKENS = 90           # very short spoken replies — clear + calm for patients
MAX_HISTORY = 20          # cap turns sent to the model
MAX_CHARS = 2000          # cap per-message length

# Claude (optional). Haiku is cheapest/snappiest; override with AURA_MODEL.
CLAUDE_MODEL = os.environ.get("AURA_MODEL", "claude-haiku-4-5")
_HAS_KEY = bool(os.environ.get("ANTHROPIC_API_KEY"))
_client = None
if _HAS_KEY:
    import anthropic
    _client = anthropic.Anthropic()

# Local LLM via Ollama (free). Default model is set after you `ollama pull`.
OLLAMA_URL = os.environ.get("AURA_OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("AURA_OLLAMA_MODEL", "qwen2.5:7b")

# Warm voice: macOS `say` (the same Samantha used in the videos), rendered
# server-side so the voice is consistent in any browser. A gentle pace reads
# as tender rather than clipped.
TTS_VOICE = os.environ.get("AURA_TTS_VOICE", "Samantha")
TTS_RATE = int(os.environ.get("AURA_TTS_RATE", "164"))
_HAS_SAY = bool(shutil.which("say")) and bool(shutil.which("ffmpeg"))

# Natural neural voice via Piper (local, free) — far warmer than `say`.
PIPER_ONNX = os.path.join(HERE, "voices", os.environ.get("AURA_PIPER_VOICE", "en_US-amy-medium") + ".onnx")
try:
    import piper  # noqa: F401
    _HAS_PIPER = os.path.exists(PIPER_ONNX)
except Exception:
    _HAS_PIPER = False
_piper = {"voice": None}


def _get_piper():
    if _piper["voice"] is None:
        from piper import PiperVoice
        _piper["voice"] = PiperVoice.load(PIPER_ONNX, config_path=PIPER_ONNX + ".json")
    return _piper["voice"]


def _piper_wav(text: str) -> bytes:
    import io
    import wave
    chunks = list(_get_piper().synthesize(text))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        c0 = chunks[0]
        wf.setnchannels(c0.sample_channels)
        wf.setsampwidth(c0.sample_width)
        wf.setframerate(c0.sample_rate)
        for c in chunks:
            wf.writeframes(c.audio_int16_bytes)
    return buf.getvalue()

# Speech-to-text via local Whisper (faster-whisper). Free, private, works in any
# browser because the browser only records audio — transcription happens here.
STT_MODEL = os.environ.get("AURA_STT_MODEL", "base.en")
try:
    import faster_whisper  # noqa: F401
    _HAS_STT = bool(shutil.which("ffmpeg"))
except Exception:
    _HAS_STT = False
_stt = {"model": None}


def _get_stt():
    if _stt["model"] is None:
        from faster_whisper import WhisperModel
        _stt["model"] = WhisperModel(STT_MODEL, device="cpu", compute_type="int8")
    return _stt["model"]

app = FastAPI(title="AURA talk")


# --- backend selection --------------------------------------------------------
_ollama = {"ok": None, "ts": 0.0}


def _ollama_up() -> bool:
    now = time.time()
    if _ollama["ok"] is None or now - _ollama["ts"] > 15:
        try:
            with urllib.request.urlopen(OLLAMA_URL + "/api/tags", timeout=1.5) as r:
                _ollama["ok"] = r.status == 200
        except Exception:
            _ollama["ok"] = False
        _ollama["ts"] = now
    return bool(_ollama["ok"])


def current_backend() -> str:
    if _HAS_KEY:
        return "claude"
    if _ollama_up():
        return "ollama"
    return "offline"


# --- request shaping ----------------------------------------------------------
class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Turn] = Field(default_factory=list)


def _clean_history(turns: list[Turn]) -> list[dict]:
    cleaned: list[dict] = []
    for t in turns[-MAX_HISTORY:]:
        if t.role not in ("user", "assistant"):
            continue
        text = (t.content or "").strip()[:MAX_CHARS]
        if text:
            cleaned.append({"role": t.role, "content": text})
    while cleaned and cleaned[0]["role"] != "user":  # first turn must be the user
        cleaned.pop(0)
    return cleaned


def _system_text(flags: list[str]) -> str:
    text = persona.SYSTEM_PROMPT
    if flags:
        text = text + "\n\n" + persona.escalation_note(flags)
    return text


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# --- Claude backend -----------------------------------------------------------
def _claude_system(flags: list[str]) -> list[dict]:
    return [{"type": "text", "text": _system_text(flags), "cache_control": {"type": "ephemeral"}}]


def _claude_reply(history: list[dict], flags: list[str]) -> str:
    resp = _client.messages.create(model=CLAUDE_MODEL, max_tokens=MAX_TOKENS,
                                   system=_claude_system(flags), messages=history)
    return "".join(b.text for b in resp.content if b.type == "text").strip()


# --- Local (Ollama) backend ---------------------------------------------------
def _ollama_payload(history: list[dict], flags: list[str], stream: bool) -> bytes:
    messages = [{"role": "system", "content": _system_text(flags)}] + history
    return json.dumps({
        "model": OLLAMA_MODEL, "messages": messages, "stream": stream,
        "keep_alive": "30m",   # keep the model resident so turns stay snappy
        "options": {"num_predict": MAX_TOKENS, "temperature": 0.5},
    }).encode()


def _ollama_request(history: list[dict], flags: list[str], stream: bool):
    req = urllib.request.Request(
        OLLAMA_URL + "/api/chat", data=_ollama_payload(history, flags, stream),
        headers={"Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=180)  # first call loads the model


def _ollama_reply(history: list[dict], flags: list[str]) -> str:
    with _ollama_request(history, flags, False) as r:
        data = json.loads(r.read())
    return (data.get("message", {}).get("content", "") or "").strip()


def _ollama_stream(history: list[dict], flags: list[str]):
    with _ollama_request(history, flags, True) as r:
        for line in r:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            chunk = obj.get("message", {}).get("content", "")
            if chunk:
                yield chunk
            if obj.get("done"):
                break


# --- endpoints ----------------------------------------------------------------
@app.get("/api/health")
def health() -> dict:
    backend = current_backend()
    model = CLAUDE_MODEL if backend == "claude" else (OLLAMA_MODEL if backend == "ollama" else None)
    return {"ok": True, "mode": backend, "model": model}


@app.post("/api/chat")
def chat(req: ChatRequest):
    history = _clean_history(req.messages)
    if not history:
        return JSONResponse({"error": "no user message"}, status_code=400)
    latest_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    flags = persona.detect_red_flags(latest_user)
    band = "red" if flags else "green"
    backend = current_backend()

    if backend == "offline":
        reply, esc, band = persona.offline_reply(latest_user)
        return {"reply": reply, "escalate": esc, "band": band, "mode": "offline"}

    try:
        reply = _claude_reply(history, flags) if backend == "claude" else _ollama_reply(history, flags)
    except Exception:
        reply, esc, band = persona.offline_reply(latest_user)
        return {"reply": reply, "escalate": esc, "band": band, "mode": backend + "-fallback"}

    if not reply:
        reply = persona.offline_reply(latest_user)[0]
    return {"reply": reply, "escalate": bool(flags), "band": band, "mode": backend}


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    """SSE: progressive reply tokens, then a final meta event."""
    history = _clean_history(req.messages)
    if not history:
        return JSONResponse({"error": "no user message"}, status_code=400)
    latest_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    flags = persona.detect_red_flags(latest_user)
    band = "red" if flags else "green"
    backend = current_backend()

    def gen():
        if backend == "offline":
            reply, esc, b = persona.offline_reply(latest_user)
            yield _sse("delta", {"t": reply})
            yield _sse("meta", {"escalate": esc, "band": b, "mode": "offline"})
            yield _sse("done", {})
            return
        try:
            if backend == "claude":
                with _client.messages.stream(model=CLAUDE_MODEL, max_tokens=MAX_TOKENS,
                                             system=_claude_system(flags), messages=history) as s:
                    for text in s.text_stream:
                        yield _sse("delta", {"t": text})
            else:  # ollama
                for chunk in _ollama_stream(history, flags):
                    yield _sse("delta", {"t": chunk})
            yield _sse("meta", {"escalate": bool(flags), "band": band, "mode": backend})
        except Exception:
            reply, esc, b = persona.offline_reply(latest_user)
            yield _sse("delta", {"t": reply})
            yield _sse("meta", {"escalate": esc, "band": b, "mode": backend + "-fallback"})
        yield _sse("done", {})

    return StreamingResponse(gen(), media_type="text/event-stream")


class TtsRequest(BaseModel):
    text: str
    voice: str | None = None      # "elena" -> distinct voice for the simulated user


def _say_mp3(text: str, voice: str, rate: int) -> bytes:
    with tempfile.TemporaryDirectory() as d:
        aiff, mp3 = os.path.join(d, "a.aiff"), os.path.join(d, "a.mp3")
        subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", aiff, text], check=True)
        subprocess.run(["ffmpeg", "-y", "-i", aiff, "-codec:a", "libmp3lame", "-qscale:a", "5", mp3],
                       check=True, capture_output=True)
        with open(mp3, "rb") as fh:
            return fh.read()


@app.post("/api/tts")
def tts(req: TtsRequest):
    """Render words to audio. AURA uses the natural Piper voice; the simulated
    user ("elena") uses a distinct macOS voice so the demo has two speakers."""
    text = (req.text or "").strip()[:1200]
    if not text:
        return JSONResponse({"error": "no text"}, status_code=400)
    # simulated user gets a clearly different voice
    if req.voice == "elena" and _HAS_SAY:
        try:
            return Response(content=_say_mp3(text, "Moira", 180), media_type="audio/mpeg")
        except Exception:
            pass
    if _HAS_PIPER:
        try:
            return Response(content=_piper_wav(text), media_type="audio/wav")
        except Exception:
            pass
    if _HAS_SAY:
        try:
            return Response(content=_say_mp3(text, TTS_VOICE, TTS_RATE), media_type="audio/mpeg")
        except Exception:
            pass
    return JSONResponse({"error": "voice unavailable"}, status_code=501)


@app.post("/api/stt")
async def stt(request: Request):
    """Transcribe recorded browser audio with local Whisper -> text."""
    if not _HAS_STT:
        return JSONResponse({"error": "speech-to-text unavailable"}, status_code=501)
    raw = await request.body()
    if not raw:
        return JSONResponse({"error": "empty audio"}, status_code=400)
    try:
        with tempfile.TemporaryDirectory() as d:
            src, wav = os.path.join(d, "in"), os.path.join(d, "out.wav")
            with open(src, "wb") as fh:
                fh.write(raw)
            subprocess.run(["ffmpeg", "-y", "-i", src, "-ar", "16000", "-ac", "1", wav],
                           check=True, capture_output=True)
            segs, _ = _get_stt().transcribe(wav, language="en")
            text = "".join(s.text for s in segs).strip()
        return {"text": text}
    except Exception:
        return JSONResponse({"error": "transcription failed"}, status_code=500)


@app.get("/api/voice")
def voice() -> dict:
    engine = "piper" if _HAS_PIPER else ("say" if _HAS_SAY else None)
    name = os.path.basename(PIPER_ONNX)[:-5] if _HAS_PIPER else (TTS_VOICE if _HAS_SAY else None)
    return {"server_voice": bool(engine), "engine": engine, "voice": name, "stt": _HAS_STT}


# index.html at "/", assets under the same root. Mounted last so /api/* wins.
app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
