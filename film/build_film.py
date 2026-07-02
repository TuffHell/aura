"""Build the AURA concept film end-to-end (offline).

Pipeline:
  1. Import the canonical Elena SCENARIO + fusion policy (shared with the app).
  2. Synthesize each spoken line with macOS `say` (offline; AURA=Samantha,
     Elena=Moira) and measure its duration.
  3. Assemble a single narration track whose silence padding matches each beat's
     on-screen slot, so video and audio stay in sync.
  4. Write `_build/timing.json` (the manifest the Manim scene renders from).
  5. Render the scene with Manim.
  6. Mux video + narration into out/aura_realworld_film.mp4.

Usage:
    ../.venv/bin/python build_film.py            # full render (-qm)
    ../.venv/bin/python build_film.py --quality l # fast preview
    ../.venv/bin/python build_film.py --audio-only
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
APP = os.path.join(ROOT, "app")
BUILD = os.path.join(HERE, "_build")
CLIPS = os.path.join(BUILD, "clips")
OUT = os.path.join(ROOT, "out", "aura_realworld_film.mp4")
PY = os.path.join(ROOT, ".venv", "bin")

sys.path.insert(0, APP)
from scenario import SCENARIO, vitals_at  # noqa: E402
from fusion import decide                  # noqa: E402

# Timing knobs (seconds)
GAP_SPOKEN = 0.6
DUR_TELEMETRY = 5.2
DUR_SYSTEM = 5.6
TITLE_DUR = 3.2
HUD_FADE = 0.8           # scene's HUD fade-in, which plays after the title card
CLOSING_DUR = 4.6
FPS = 30

# `say` rates (words/min)
RATE = {"AURA": 172, "ELENA": 180}


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def probe_duration(path: str) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", path]).stdout.strip()
    return float(out)


def synth_clip(text: str, voice: str, rate: int, stem: str) -> tuple[str, float]:
    """Synthesize one line to a normalized wav; return (path, duration)."""
    aiff = os.path.join(CLIPS, stem + ".aiff")
    wav = os.path.join(CLIPS, stem + ".wav")
    run(["say", "-v", voice, "-r", str(rate), "-o", aiff, text])
    run(["ffmpeg", "-y", "-i", aiff, "-ac", "1", "-ar", "44100",
         "-c:a", "pcm_s16le", wav])
    return wav, probe_duration(wav)


def silence(seconds: float, path: str) -> None:
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
         "-t", f"{seconds:.3f}", "-c:a", "pcm_s16le", path])


def pad_clip(src: str, gap: float, dst: str) -> None:
    run(["ffmpeg", "-y", "-i", src, "-af", f"apad=pad_dur={gap:.3f}",
         "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", dst])


def build_audio_and_manifest() -> dict:
    if os.path.isdir(CLIPS):
        shutil.rmtree(CLIPS)
    os.makedirs(CLIPS, exist_ok=True)

    segments: list[str] = []
    beats: list[dict] = []

    # leading silence: title card + the HUD fade-in that follows it
    title_seg = os.path.join(CLIPS, "seg_title.wav")
    silence(TITLE_DUR + HUD_FADE, title_seg)
    segments.append(title_seg)

    start = TITLE_DUR + HUD_FADE
    for i, b in enumerate(SCENARIO):
        v = vitals_at(i)
        d = decide(v, post_sepsis_window=True)
        seg = os.path.join(CLIPS, f"seg_{i:02d}.wav")

        if b.spoken:
            clip, dur = synth_clip(b.text, b.voice, RATE.get(b.speaker, 172), f"clip_{i:02d}")
            slot = dur + GAP_SPOKEN
            pad_clip(clip, GAP_SPOKEN, seg)
        else:
            slot = DUR_SYSTEM if b.speaker == "SYSTEM" else DUR_TELEMETRY
            silence(slot, seg)
        segments.append(seg)

        beats.append({
            "idx": i, "t": b.t, "speaker": b.speaker, "text": b.text,
            "act_move": b.act_move, "note": b.note, "spoken": b.spoken,
            "start": round(start, 3), "slot": round(slot, 3),
            "vit_update": b.vitals is not None,
            "vit": {"hr": v.hr, "spo2": v.spo2, "temp": v.temp, "resp": v.resp,
                    "rmssd": v.rmssd_pct, "f0": v.f0_var, "contact": v.contact},
            "dec": {"p": round(d.p, 4), "band": d.band, "raw_band": d.raw_band,
                    "guardrail": d.raw_band != d.band,
                    "mandatory_human": d.mandatory_human, "action": d.action},
        })
        start += slot

    # trailing silence under the closing card
    closing_seg = os.path.join(CLIPS, "seg_closing.wav")
    silence(CLOSING_DUR, closing_seg)
    segments.append(closing_seg)

    # concat -> master narration
    listfile = os.path.join(BUILD, "concat.txt")
    with open(listfile, "w") as fh:
        for s in segments:
            fh.write(f"file '{s}'\n")
    master = os.path.join(BUILD, "narration.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
         "-c", "copy", master])

    manifest = {
        "meta": {"title_dur": TITLE_DUR, "closing_dur": CLOSING_DUR, "fps": FPS,
                 "total": round(start + CLOSING_DUR, 3)},
        "beats": beats,
    }
    with open(os.path.join(BUILD, "timing.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    return manifest


def render_scene(quality: str) -> str:
    media = os.path.join(BUILD, "manim")
    qflag = {"l": "-ql", "m": "-qm", "h": "-qh"}[quality]
    run([os.path.join(PY, "python"), "-m", "manim", "render", qflag, "--fps", str(FPS),
         "--media_dir", media, "-o", "aura_scene",
         os.path.join(HERE, "aura_scene.py"), "AuraRealWorld"], cwd=HERE)
    qdir = {"l": "480p15", "m": "720p30", "h": "1080p60"}[quality]
    # we forced --fps 30, manim still names the dir by quality preset resolution
    candidates = [
        os.path.join(media, "videos", "aura_scene", qdir, "aura_scene.mp4"),
        os.path.join(media, "videos", "aura_scene", f"{qdir.split('p')[0]}p{FPS}", "aura_scene.mp4"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # fall back: search
    base = os.path.join(media, "videos", "aura_scene")
    for dirpath, _, files in os.walk(base):
        for f in files:
            if f == "aura_scene.mp4":
                return os.path.join(dirpath, f)
    raise FileNotFoundError(f"rendered mp4 not found under {base}")


def mux(video: str, audio: str, dst: str) -> None:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    run(["ffmpeg", "-y", "-i", video, "-i", audio, "-c:v", "copy",
         "-c:a", "aac", "-b:a", "192k", "-shortest", dst])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quality", choices=["l", "m", "h"], default="m")
    ap.add_argument("--audio-only", action="store_true")
    args = ap.parse_args()

    os.makedirs(BUILD, exist_ok=True)
    print("→ synthesizing voice + manifest …")
    manifest = build_audio_and_manifest()
    print(f"  {len(manifest['beats'])} beats, total {manifest['meta']['total']:.1f}s "
          f"({manifest['meta']['total']/60:.1f} min)")
    if args.audio_only:
        print(f"  narration: {os.path.join(BUILD, 'narration.wav')}")
        return

    print(f"→ rendering Manim ({args.quality}) …")
    video = render_scene(args.quality)
    print(f"  video: {video}")

    print("→ muxing audio + video …")
    mux(video, os.path.join(BUILD, "narration.wav"), OUT)
    dur = probe_duration(OUT)
    size = os.path.getsize(OUT) / 1e6
    print(f"✓ {OUT}  ({dur:.1f}s, {size:.1f} MB)")


if __name__ == "__main__":
    main()
