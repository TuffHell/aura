# AURA — talk with it

A small web app with AURA in the centre that you actually converse with: speak
(or type), and AURA replies in the ACT-trained recovery-companion voice while the
3D body reacts — idle breathing, listening, thinking, speaking.

## Three backends — auto-selected, and the cost

The server picks a backend at request time, in this priority:

| Backend | When | Cost | Quality |
|---------|------|------|---------|
| **Claude** | `ANTHROPIC_API_KEY` set | per turn (your key) | best |
| **Local AI** (Ollama) | Ollama running, no key | **$0**, private, on-device | genuinely conversational |
| **Offline** | nothing else available | **$0** | canned keyword responder |

Only Offline and Claude understand-vs-match differ sharply: Offline is keyword
matching (limited topics); Claude and Local AI actually reason about what you say.

**Claude** per turn: Haiku ~$0.001–0.005, Sonnet ~$0.005–0.02, Opus ~$0.02–0.06
(`AURA_MODEL`, default `claude-haiku-4-5`).

**Local AI (free, recommended if you don't want per-turn cost):**

```bash
brew install ollama
ollama serve &
ollama pull qwen2.5:7b          # one-time ~4.7 GB download
# then just run the server below — it auto-detects Ollama
```

The badge in the top-right shows which backend is live (`claude` / `local AI` /
`offline · free`).

## Run

```bash
cd talk
../.venv/bin/uvicorn server:app --port 8600
open http://localhost:8600
```

Click **Begin**, then talk (mic button, Chrome/Edge) or type. The top-right badge
shows whether you're in `offline · free` or `claude` mode.

To enable Claude:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export AURA_MODEL=claude-haiku-4-5     # or claude-sonnet-4-6 / claude-opus-4-8
../.venv/bin/uvicorn server:app --port 8600
```

## Safety (both modes)

Every message is screened for red-flag emergencies (chest pain, trouble
breathing, stroke signs, fainting, severe bleeding, self-harm) **before** any
reply. On a hit, AURA does not reassure it away — it urges calling emergency
services / the nurse line, a red banner appears, and the escalation flag is set
server-side regardless of which path produced the words. AURA never diagnoses,
never changes a dose, and never withholds escalation. It is a prototype, not a
medical device.

## Layout

```
talk/
  server.py          # FastAPI: /api/chat (Claude or offline), /api/health, static
  persona.py         # AURA system prompt, red-flag detection, free offline responder
  static/
    index.html       # centered 3D AURA + mic/text + transcript + escalation banner
    app.js           # Three.js scene + conversation loop (speech in/out)
    vendor/three.min.js
  requirements.txt
  .env.example
```

Voice input uses the browser's Web Speech API (best in Chrome/Edge); typing is
always available as a fallback. Voice output uses the browser's speech synthesis.
Mic access requires `localhost` or HTTPS — opening `index.html` directly from the
file system won't grant the microphone, so run it through the server above.
