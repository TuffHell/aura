"""AURA — talking prototype.

A runnable slice of the discharge-to-recovery companion: step through Elena's
night and watch the ACT-trained voice persona, the simulated vitals feed, and the
green/amber/red fusion + escalation logic work together. AURA actually speaks
(browser Web Speech API).

Run:
    cd app && ../.venv/bin/streamlit run streamlit_app.py
"""
from __future__ import annotations

import base64
import os

import streamlit as st
import streamlit.components.v1 as components

from scenario import (
    AMBER, BLUE, BG, CORAL, MUTED, PANEL, SCENARIO, TEAL, Vitals, vitals_at,
)
from fusion import decide, feature_contributions, fuse
from speech import speak_html

ASSET = os.path.join(os.path.dirname(__file__), "..", "out", "aura_front_rgba.png")

st.set_page_config(page_title="AURA — prototype", page_icon="🫧", layout="wide")


# --- styling ------------------------------------------------------------------
def _avatar_b64() -> str:
    try:
        with open(ASSET, "rb") as fh:
            return base64.b64encode(fh.read()).decode()
    except OSError:
        return ""


CSS = f"""
<style>
  .stApp {{ background: {BG}; }}
  #MainMenu, footer, header {{ visibility: hidden; }}
  .block-container {{ padding-top: 2.2rem; max-width: 1180px; }}
  html, body, [class*="css"] {{ color: #ECEAE2; }}

  .aura-brand {{ font-size: 2.4rem; font-weight: 600; color: {TEAL};
                 letter-spacing: .14em; }}
  .aura-tag {{ color: {MUTED}; font-size: .95rem; margin-top: -.4rem; }}
  .pill {{ display:inline-block; font-size:.66rem; letter-spacing:.18em;
           border:1px solid {MUTED}; color:{MUTED}; border-radius:999px;
           padding:.12rem .55rem; vertical-align:middle; margin-left:.6rem; }}
  .clock {{ font-variant-numeric: tabular-nums; color:{MUTED}; font-size:1.1rem; }}

  .avatar-wrap {{ text-align:center; padding:.4rem 0 1rem; }}
  .avatar {{ width:190px; height:190px; border-radius:50%;
             box-shadow:0 0 0 1px #2a2a30, 0 0 60px -8px {TEAL};
             animation: breathe 5.2s ease-in-out infinite; }}
  @keyframes breathe {{ 0%,100% {{ transform:scale(1); filter:brightness(.95);}}
                        50% {{ transform:scale(1.045); filter:brightness(1.08);}} }}

  .bubble {{ border-radius:16px; padding:.7rem 1rem; margin:.4rem 0;
             line-height:1.5; font-size:1rem; max-width:92%; }}
  .b-aura {{ background:#11241d; border:1px solid #1d4d3c; color:#e7f5ee; }}
  .b-elena {{ background:#2a1410; border:1px solid #5c2b1c; color:#f6e3dc;
              margin-left:auto; }}
  .b-tel {{ background:#121217; border:1px dashed #34343d; color:{MUTED};
            font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
            font-size:.82rem; }}
  .b-sys {{ background:#0f1c2c; border:1px solid #234a6e; color:#d6e8fb; }}
  .who {{ font-size:.68rem; letter-spacing:.16em; opacity:.8; }}
  .act-tag {{ float:right; font-size:.62rem; letter-spacing:.1em;
              color:{TEAL}; border:1px solid #1d4d3c; border-radius:999px;
              padding:.05rem .5rem; }}

  .panel {{ background:{PANEL}; border:1px solid #25252c; border-radius:14px;
            padding:1rem 1.1rem; margin-bottom:.9rem; }}
  .panel h4 {{ margin:0 0 .7rem; font-size:.72rem; letter-spacing:.18em;
               color:{MUTED}; font-weight:600; }}
  .vgrid {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:.55rem; }}
  .vcard {{ background:#0e0e12; border:1px solid #24242b; border-radius:10px;
            padding:.55rem .65rem; }}
  .vcard .lbl {{ font-size:.62rem; letter-spacing:.12em; color:{MUTED}; }}
  .vcard .val {{ font-size:1.45rem; font-weight:600; font-variant-numeric:tabular-nums; }}
  .vcard .unit {{ font-size:.7rem; color:{MUTED}; }}

  .meter {{ height:14px; border-radius:999px; position:relative;
            background:linear-gradient(90deg,{TEAL} 0%,{TEAL} 20%,
                      {AMBER} 20%,{AMBER} 55%,{CORAL} 55%,{CORAL} 100%);
            opacity:.92; }}
  .meter .knob {{ position:absolute; top:-5px; width:4px; height:24px;
                  background:#fff; border-radius:2px; box-shadow:0 0 8px #000; }}
  .meter-row {{ display:flex; justify-content:space-between; font-size:.64rem;
                color:{MUTED}; margin-top:.3rem; }}
  .bandbig {{ font-size:1.5rem; font-weight:700; letter-spacing:.05em; }}

  .escal {{ background:#1a1207; border:1px solid {AMBER}; border-radius:14px;
            padding:1rem 1.1rem; }}
  .escal.red {{ background:#220d0a; border-color:{CORAL}; }}
  .escal .hd {{ color:{AMBER}; font-weight:700; letter-spacing:.04em; }}
  .escal.red .hd {{ color:{CORAL}; }}
  .fhir {{ font-family:ui-monospace,Menlo,monospace; font-size:.74rem;
           color:#cdd6c9; white-space:pre-wrap; margin-top:.5rem;
           border-top:1px solid #33332b; padding-top:.5rem; }}
  .stButton>button {{ background:{TEAL}; color:#04130d; border:none;
                      font-weight:600; border-radius:10px; padding:.5rem 1.1rem; }}
  .stButton>button:hover {{ background:#23b487; color:#04130d; }}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)


# --- per-metric display thresholds (display only; real call is fusion.decide) -
def _status(metric: str, v: Vitals) -> str:
    table = {
        "hr": (v.hr, lambda x: "green" if x < 90 else "amber" if x < 120 else "red"),
        "spo2": (v.spo2, lambda x: "green" if x >= 96 else "amber" if x >= 93 else "red"),
        "temp": (v.temp, lambda x: "green" if x < 37.5 else "amber" if x < 38.5 else "red"),
        "resp": (v.resp, lambda x: "green" if x < 20 else "amber" if x < 25 else "red"),
        "hrv": (v.rmssd_pct, lambda x: "green" if x >= 85 else "amber" if x >= 60 else "red"),
        "voc": (v.f0_var, lambda x: "green" if x >= 0.5 else "amber" if x >= 0.35 else "red"),
    }
    val, fn = table[metric]
    return fn(val)


_COLORS = {"green": TEAL, "amber": AMBER, "red": CORAL}


def vcard(label: str, value: str, unit: str, status: str) -> str:
    c = _COLORS[status]
    return (f'<div class="vcard"><div class="lbl">{label}</div>'
            f'<div class="val" style="color:{c}">{value}'
            f'<span class="unit"> {unit}</span></div></div>')


# --- session state ------------------------------------------------------------
ss = st.session_state
ss.setdefault("idx", -1)
ss.setdefault("last_spoken", -2)
ss.setdefault("replay", 0)


def begin() -> None:
    ss.idx = 0
    ss.last_spoken = -2


def advance() -> None:
    if ss.idx < len(SCENARIO) - 1:
        ss.idx += 1


def restart() -> None:
    ss.idx = -1
    ss.last_spoken = -2


# --- header -------------------------------------------------------------------
clock = SCENARIO[ss.idx].t if ss.idx >= 0 else "22:13"
hcol1, hcol2 = st.columns([3, 1])
with hcol1:
    st.markdown(
        '<div class="aura-brand">AURA<span class="pill">PROTOTYPE</span></div>'
        '<div class="aura-tag">a discharge-to-recovery companion · '
        'Elena Reyes, 61 · day 6 post-urosepsis</div>',
        unsafe_allow_html=True,
    )
with hcol2:
    st.markdown(f'<div style="text-align:right" class="clock">🌙 {clock} · '
                f'home alone</div>', unsafe_allow_html=True)

with st.sidebar:
    st.markdown("### Controls")
    voice_on = st.toggle("AURA speaks (browser voice)", value=True)
    st.caption("Voice uses your browser's built-in speech — nothing leaves the "
               "machine. Click **Next** to advance the night; AURA talks on each "
               "of her turns.")
    st.divider()
    st.caption("Green / amber / red is computed live by a transparent fusion "
               "model. Watch the **amber-plus guardrail** fire at the contact "
               "reading: the score calms, but a post-sepsis fever can't be "
               "home-cleared.")

st.write("")
left, right = st.columns([1.32, 1])


# --- left: conversation -------------------------------------------------------
with left:
    av = _avatar_b64()
    speaking = ss.idx >= 0 and SCENARIO[ss.idx].speaker == "AURA"
    state_lbl = "speaking" if speaking else "listening" if ss.idx >= 0 else "ready"
    if av:
        st.markdown(
            f'<div class="avatar-wrap"><img class="avatar" '
            f'src="data:image/png;base64,{av}"/>'
            f'<div class="aura-tag" style="margin-top:.5rem">AURA · {state_lbl}</div>'
            f'</div>', unsafe_allow_html=True)

    if ss.idx < 0:
        st.info("It's 22:13. Elena's thermometer just read 38.0 °C and the fear "
                "is rising. Begin her night and walk through it with AURA.")
        st.button("▶  Begin Elena's night", on_click=begin, use_container_width=True)
    else:
        c1, c2, c3 = st.columns([1.1, 1, 1])
        with c1:
            st.button("Next  ▸", on_click=advance, use_container_width=True,
                      disabled=ss.idx >= len(SCENARIO) - 1)
        with c2:
            if st.button("🔊 Replay", use_container_width=True):
                ss.replay += 1
                ss.last_spoken = -2
        with c3:
            st.button("↺ Restart", on_click=restart, use_container_width=True)
        st.caption(f"beat {ss.idx + 1} / {len(SCENARIO)}")

        # transcript up to current beat (most recent last)
        for i in range(ss.idx + 1):
            b = SCENARIO[i]
            cur = i == ss.idx
            edge = "box-shadow:0 0 0 1px #2c5a48;" if (cur and b.speaker == "AURA") else ""
            if b.speaker == "AURA":
                tag = f'<span class="act-tag">{b.act_move}</span>' if b.act_move else ""
                st.markdown(f'<div class="bubble b-aura" style="{edge}">'
                            f'<span class="who">AURA</span>{tag}<br>{b.text}</div>',
                            unsafe_allow_html=True)
            elif b.speaker == "ELENA":
                st.markdown(f'<div class="bubble b-elena"><span class="who">ELENA</span>'
                            f'<br><i>{b.note}</i> {b.text}</div>', unsafe_allow_html=True)
            elif b.speaker == "TELEMETRY":
                st.markdown(f'<div class="bubble b-tel"><span class="who">⌬ AURA · '
                            f'INTERNAL TELEMETRY</span><br>{b.text}</div>',
                            unsafe_allow_html=True)
            else:  # SYSTEM
                st.markdown(f'<div class="bubble b-sys"><span class="who">▲ SYSTEM</span>'
                            f'<br>{b.text}</div>', unsafe_allow_html=True)


# --- right: clinical surface --------------------------------------------------
with right:
    v = vitals_at(ss.idx) if ss.idx >= 0 else vitals_at(-1)
    src = "contact sensor" if v.contact else "contactless (rPPG / vocal)"

    st.markdown('<div class="panel"><h4>VITALS · ' + src.upper() + '</h4>'
                '<div class="vgrid">'
                + vcard("HEART RATE", str(v.hr), "bpm", _status("hr", v))
                + vcard("SpO₂", str(v.spo2), "%", _status("spo2", v))
                + vcard("TEMP", f"{v.temp:.1f}", "°C", _status("temp", v))
                + vcard("RESP", str(v.resp), "/min", _status("resp", v))
                + vcard("HRV RMSSD", f"{v.rmssd_pct:.0f}", "% base", _status("hrv", v))
                + vcard("VOCAL F0", f"{v.f0_var:.2f}", "var", _status("voc", v))
                + '</div></div>', unsafe_allow_html=True)

    d = decide(v, post_sepsis_window=True)
    knob = max(1, min(99, int(d.p * 100)))
    st.markdown(
        '<div class="panel"><h4>FUSED DETERIORATION RISK</h4>'
        f'<div style="display:flex;align-items:baseline;gap:.6rem">'
        f'<span class="bandbig" style="color:{_COLORS[d.band]}">{d.band.upper()}</span>'
        f'<span style="color:{MUTED}">P = {d.p:.2f}</span></div>'
        f'<div class="meter" style="margin-top:.6rem"><div class="knob" '
        f'style="left:calc({knob}% - 2px)"></div></div>'
        '<div class="meter-row"><span>green</span><span>amber</span><span>red</span></div>'
        + (f'<div style="margin-top:.6rem;color:{AMBER};font-size:.8rem">'
           f'⚑ amber-plus guardrail: fused score reads <b>{d.raw_band}</b>, '
           f'but floored to amber — {d.rationale}</div>'
           if d.raw_band != d.band else
           f'<div style="margin-top:.5rem;color:{MUTED};font-size:.8rem">{d.rationale}</div>')
        + '</div>', unsafe_allow_html=True)

    with st.expander("Show AURA's reasoning (feature contributions)"):
        contribs = sorted(feature_contributions(v), key=lambda x: -x[1])
        for name, c in contribs:
            st.markdown(f"<div style='display:flex;justify-content:space-between;"
                        f"font-size:.85rem'><span style='color:{MUTED}'>{name}</span>"
                        f"<span>+{c:.2f} log-odds</span></div>", unsafe_allow_html=True)
        st.caption(f"Σ + bias → sigmoid → P = {d.p:.2f}. Transparent by design.")

    # escalation card: show once the SYSTEM beat (or a mandatory-human decision) is reached
    reached_escalation = any(SCENARIO[i].speaker == "SYSTEM" for i in range(ss.idx + 1)) if ss.idx >= 0 else False
    if d.mandatory_human and (reached_escalation or d.band == "red"):
        cls = "escal red" if d.band == "red" else "escal"
        lines = "\n".join(p["contentString"] for p in d.fhir.get("payload", []))
        st.markdown(
            f'<div class="{cls}"><div class="hd">▲ NURSE TRIAGE CONNECTED · '
            f'FHIR Communication sent</div>'
            f'<div style="font-size:.85rem;margin-top:.3rem">{d.action}</div>'
            f'<div class="fhir">{lines}</div></div>', unsafe_allow_html=True)
    elif d.mandatory_human:
        st.markdown(f'<div class="panel" style="border-color:{AMBER}">'
                    f'<span style="color:{AMBER}">⚑ Escalation armed</span> — '
                    f'AURA will loop in a human as the plan is offered.</div>',
                    unsafe_allow_html=True)


# --- speak the current beat once ----------------------------------------------
if ss.idx >= 0 and voice_on:
    b = SCENARIO[ss.idx]
    if b.spoken and ss.idx != ss.last_spoken:
        components.html(speak_html(b.text, b.speaker, ss.replay * 1000 + ss.idx),
                        height=0)
        ss.last_spoken = ss.idx
