# Deploying AURA as a real, always-on website

The quick Cloudflare tunnel only lives while your Mac is on. This makes AURA a
proper public site: a stable URL, online 24/7, working even when your Mac is off.

## The honest architecture decision

A public site needs the AI to run *somewhere always on*. You can't have
free + private + 24/7 all at once — something has to give:

| Path | Brain | Speech | Host cost | Privacy |
|------|-------|--------|-----------|---------|
| **A. Cloud-brain (recommended)** | Claude API (per-message) | Whisper + Piper **in your container** | ~a few $/mo (scale-to-zero) | speech self-hosted; only the brain is a cloud call |
| **B. Fully open models** | qwen2.5 on your server | Whisper + Piper in container | **high** — needs a big-RAM/GPU box always on | fully self-hosted |

This repo is set up for **Path A** by default (cheap, simple, scales). Path B
notes are at the bottom.

Per-message brain cost on Path A is tiny: **Haiku ≈ $0.001–0.005** per reply.

---

## Path A — deploy to Fly.io (no local Docker needed)

Fly builds the container in its cloud, so you don't install Docker. You'll need:
a free Fly.io account, an Anthropic API key, and ~10 minutes.

```bash
# 1. install the Fly CLI + log in
brew install flyctl
fly auth signup           # or: fly auth login

# 2. from the talk/ folder, create the app (uses the included fly.toml + Dockerfile)
cd /Users/jasper/Downloads/health/aura/talk
#    edit fly.toml first: set a unique `app` name and your nearest `primary_region`
fly launch --no-deploy --copy-config --name YOUR-UNIQUE-NAME

# 3. add your brain key as a secret (never commit it)
fly secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx

# 4. ship it (remote build — first one takes a few minutes)
fly deploy
```

When it finishes you get **https://YOUR-UNIQUE-NAME.fly.dev** — that's your live
site, always on. `auto_stop_machines` means it sleeps when idle (you pay almost
nothing) and wakes on the next visit (a few seconds cold-start to reload models).

Useful: `fly logs`, `fly status`, `fly scale memory 2048`.

### Put it on your own domain
```bash
fly certs add aura.yourdomain.com
fly certs show aura.yourdomain.com      # shows the DNS records to add at your registrar
```
Add the shown CNAME/A/AAAA records; HTTPS is issued automatically. Now it's
**https://aura.yourdomain.com**.

---

## Security (do this before sharing widely)

The app is open by default so patients can just use it. For a public, named site:

- **Gate access with Cloudflare Access** (Zero Trust) — put your domain on
  Cloudflare, add an Access policy (email one-time-PIN or allowed list) in front
  of the site. No code change; auth happens at the edge.
- **Rate-limit** abusive traffic with a Cloudflare rule (e.g. N requests/min/IP)
  so nobody runs up your Claude bill.
- **Keep secrets in `fly secrets`**, never in git. (`.env` is git/Docker-ignored.)
- **It is a prototype, not a medical device.** Keep the on-screen disclaimer; the
  red-flag escalation is built in but this is **not HIPAA-compliant** — don't
  collect real patient identifiers.

---

## Custom domain via a named Cloudflare Tunnel (alternative)

If you'd rather host on a machine you own (your Mac kept awake, or a VPS) but
still want a stable URL on your domain (and Path B's open models), use a *named*
tunnel instead of the quick one:

```bash
cloudflared tunnel login                       # needs a Cloudflare account + your domain on Cloudflare
cloudflared tunnel create aura
cloudflared tunnel route dns aura aura.yourdomain.com
# ~/.cloudflared/config.yml:
#   tunnel: aura
#   credentials-file: /Users/you/.cloudflared/<id>.json
#   ingress:
#     - hostname: aura.yourdomain.com
#       service: http://localhost:8600
#     - service: http_status:404
cloudflared tunnel run aura            # or: sudo cloudflared service install  (runs 24/7)
```

---

## Path B — fully open models in the cloud

Keeps the brain self-hosted (no per-message cost, fully private) but needs a host
with real RAM/GPU, always on — that's the expensive part.

With Docker (`docker-compose.yml` included): leave `ANTHROPIC_API_KEY` blank,
uncomment the `AURA_OLLAMA_URL` / `ollama` lines, then on a big host:

```bash
docker compose --profile open up -d
docker compose exec ollama ollama pull qwen2.5:7b
```

On Fly this means a GPU machine (`fly scale ... --vm-gpu-kind`) — usable but
costs roughly $1+/hour while running. For most "official site" needs, Path A is
the sensible choice; switch to B only if per-message cost or full privacy is the
hard requirement.

---

## Notes
- **Speech in the container**: Whisper (`base.en`) and the Piper voice are baked
  into the image, so STT/TTS work with no extra setup. macOS `say` isn't present
  in Linux, so the demo's separate "Elena" voice falls back to the Piper voice
  there (the main companion voice is unaffected).
- **Other hosts**: the same Dockerfile deploys to Render, Railway, a VPS, etc.
  Point the platform at `talk/`, expose port 8600, set `ANTHROPIC_API_KEY`.
