# AURA — embodied experience + talking prototype + concept film

**Live site: <https://tuffhell.github.io/aura/>** (deployed permanently from
`experience/` by `.github/workflows/pages.yml` on every push to `main`).

The achievable slice of Project AURA, built from the canonical Elena scenario in
`AURA_Technical_Specification.docx` §4.2:

- **`experience/`** — the hero. An immersive 3D **breathe-with-AURA** experience
  (Three.js, double-click `index.html` to open, or use the live site). A smooth
  vinyl soft-robot body — lathe-profile torso, dot-line-dot face, chest
  heartlight, articulated mitten hands — **scans Elena's vitals contactlessly,
  gives the scheduled evening dose with a cooling compress, notifies night
  triage (the amber-plus guardrail made visible), then holds her** in the
  deep-pressure embrace and walks her breath down from panic to the 0.1 Hz
  resonance frequency while warmth rises and the ACT voice speaks. No charts —
  the demo *is* the therapy. The **🎤 TALK button** opens companion mode: speak
  to AURA with your own voice (or type) and it answers in the ACT voice with the
  red-flag guardrail active — the offline responder from `talk/persona.py`
  ported to the browser, fully on-device, so the live site needs no server and
  nothing you say leaves the page.
- **`experience/engineering.html`** — the engineering dossier: the real-world
  physical requirements (mass/force/thermal/power budgets, contactless-vitals
  sensing stack, care effectors, ISO 13482 / IEC 60601 / ISO TS 15066 safety
  case), the procedure capability tiers, and the argued line at invasive
  procedures.
- **`app/`** — a runnable Streamlit prototype (the clinical view). Step through
  Elena's night and watch the ACT-trained voice persona, the simulated vitals
  feed, and the green/amber/red fusion + escalation logic work together. AURA
  talks via the browser's speech (no key, nothing leaves the machine).
- **`talk/`** — a web app with AURA in the centre that you **converse with**:
  speak or type, and AURA replies in the ACT voice while the 3D body reacts.
  Runs **free offline** by default; set `ANTHROPIC_API_KEY` to switch to Claude.
  Red-flag emergencies are detected and escalated in both modes. See
  [talk/README.md](talk/README.md).
- **`film/`** — a 2.7-minute 1080p concept film of the same scene, rendered with
  Manim and **voiced offline** (macOS `say`: Samantha as AURA, Moira as Elena).
  Output: `out/aura_realworld_film.mp4`. A narrated screen-flythrough of the
  embodied experience is at `out/aura_experience_narrated.mp4`.

## Open the experience

```bash
open experience/index.html        # or just double-click it
```

It runs entirely offline from `file://` (Three.js is vendored locally; the voice
uses the browser's built-in speech). Click **Begin**, turn sound on, and breathe
along when the light appears. Tap AURA for a reassuring squeeze. The four recovery
methods it foregrounds: the **deep-pressure hug**, **breath co-regulation** to
0.1 Hz, **warmth & presence**, and the **ACT voice arc**
(validate → hold → breathe → values → presence).

Both read **one shared source of truth** — `app/scenario.py` (the dialogue +
vitals timeline) and `app/fusion.py` (the deterioration policy) — so the app and
the film can never disagree about the clinical story.

## The clinical crux they demonstrate

"Catch the slope, not the threshold." The fused deterioration probability opens
at **P≈0.36 (amber)** — matching the spec — then *falls* into the green zone as
AURA co-regulates the panic. A naive monitor would stand down. AURA does not:
the **amber-plus guardrail** (`fusion.decide`) refuses to home-clear a
post-sepsis fever without BP/lactate, floors the band at amber, and fires a FHIR
Communication to nurse triage. *Augmentation, not autonomy — it never withholds
escalation.*

## Run the app

```bash
cd app
../.venv/bin/streamlit run streamlit_app.py
```

Click **Begin Elena's night**, then **Next** to advance. Toggle voice in the
sidebar. The right-hand "clinical surface" shows live vitals, the fused-risk
meter, AURA's feature-level reasoning, and the escalation packet when it fires.

## Rebuild the film

```bash
cd film
../.venv/bin/python build_film.py              # final 1080p  -> out/aura_realworld_film.mp4
../.venv/bin/python build_film.py --quality m  # faster 720p
../.venv/bin/python build_film.py --quality l  # quick 480p preview
../.venv/bin/python build_film.py --audio-only # narration + timing.json only
```

The build synthesizes each line, assembles a narration track whose silence
padding matches every on-screen beat (so audio and video stay in sync), writes
`film/_build/timing.json`, renders `film/aura_scene.py`, and muxes the result.

## Tests

```bash
cd app && ../.venv/bin/python -m pytest tests/ -q
```

15 tests pin the fusion calibration (P≈0.36 at Elena's opening), the band
thresholds, and the amber-plus guardrail behaviour.

## Layout

```
app/
  streamlit_app.py   # UI + driver
  scenario.py        # shared: Elena dialogue, vitals timeline, palette  (no Streamlit)
  fusion.py          # shared: fuse() + green/amber/red + decide() guardrail + FHIR
  speech.py          # Web Speech API component (AURA / Elena voices)
  tests/test_fusion.py
film/
  build_film.py      # offline pipeline: say -> narration.wav -> manifest -> manim -> mux
  aura_scene.py      # Manim scene; renders purely from _build/timing.json (no logic)
out/aura_realworld_film.mp4
```

## Notes / honest limits

- This is a **prototype**, not a medical device. The fusion model is a
  transparent, hand-calibrated logistic for demonstration — not a trained or
  validated classifier. Thresholds are illustrative.
- Browser speech voice quality depends on the OS/browser; the film's offline
  `say` voices are fixed and reproducible.
- The venv's console scripts have stale shebangs (it was moved into
  `Downloads/`), so invoke tools as `../.venv/bin/python -m <tool>`.
