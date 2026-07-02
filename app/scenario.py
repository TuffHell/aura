"""Canonical Elena scenario — the single source of truth shared by the
Streamlit prototype and the Manim concept film.

Reconstructed verbatim from AURA_Technical_Specification §4.2 ("The system in
action"). Day 6 post-discharge: Elena Reyes, 61, urosepsis survivor, home alone,
low-grade fever oscillating 37.9-38.1 °C plus an acute panic attack. AURA runs a
dual-track hypothesis (sepsis relapse vs. panic + dysautonomia), co-regulates,
takes a clean contact reading, then fires a mandatory nurse triage ("amber-plus")
because a post-sepsis fever cannot be home-cleared without BP/lactate.

This module is import-safe (no Streamlit, no I/O at import time) so the film
build pipeline can import it directly.
"""
from __future__ import annotations

from dataclasses import dataclass

# --- Brand palette (from the spec / build_docx.js) ----------------------------
TEAL = "#1D9E75"      # AURA, calm / good
CORAL = "#D85A30"     # patient, distress
AMBER = "#BA7517"     # caution band
BLUE = "#378ADD"      # system / clinical
MUTED = "#B4B2A9"     # secondary text
BG = "#0d0d0f"        # night room
PANEL = "#16161a"

# Voices for offline `say` synthesis (macOS).
VOICE_AURA = "Samantha"   # warm US voice, paced slow for co-regulation
VOICE_ELENA = "Moira"     # distinct person (en_IE), reads as a different speaker


@dataclass(frozen=True)
class Vitals:
    """A snapshot of what AURA can sense. rPPG values are contactless;
    `contact` flags the clean finger-sensor confirmation reading."""
    hr: int             # heart rate, bpm
    spo2: int           # oxygen saturation, %
    temp: float         # skin/core estimate, °C
    resp: int           # respiratory rate, breaths/min
    rmssd_pct: float    # HRV RMSSD as % of personal baseline (100 = normal)
    f0_var: float       # vocal pitch variability index, 0..1 (low = flat/distressed)
    contact: bool = False


@dataclass(frozen=True)
class Beat:
    """One step of the scenario timeline."""
    t: str              # clock label, e.g. "22:14"
    speaker: str        # AURA | ELENA | TELEMETRY | SYSTEM
    text: str
    act_move: str       # ACT phase driving the line (empty for non-AURA beats)
    vitals: Vitals | None
    note: str           # short stage direction / reasoning gist for the UI
    spoken: bool        # synthesize audio for the film?
    voice: str = ""     # `say` voice when spoken


# Personal baseline (a calm "green day") used for the resting reference + tests.
BASELINE = Vitals(hr=68, spo2=98, temp=36.7, resp=14, rmssd_pct=100.0, f0_var=0.62)


# --- The scenario -------------------------------------------------------------
# Vitals are attached at the beats where AURA's sensing actually updates; UI/film
# carry the last known reading forward between updates.

SCENARIO: tuple[Beat, ...] = (
    Beat(
        t="22:14", speaker="TELEMETRY",
        text=("rPPG: RMSSD down 34%, LF/HF up, resp 22->27. Skin temp 38.0 C, "
              "+0.4 in 90 min. Vocal: F0 variance down, pauses lengthening. "
              "Fusion: deterioration P=0.36 (amber). Hypotheses: (a) sepsis "
              "relapse, (b) acute panic + dysautonomia. Panic physiology "
              "dominant. Open dual-track; do not reassure prematurely."),
        act_move="",
        vitals=Vitals(hr=112, spo2=97, temp=38.0, resp=27, rmssd_pct=66.0, f0_var=0.28),
        note="Contactless baseline drift detected. Dual-track opened.",
        spoken=False,
    ),
    Beat(
        t="22:14", speaker="ELENA",
        text=("The thermometer said thirty-eight. It's back. It's happening "
              "again, I can feel it, it's exactly how it started last time."),
        act_move="",
        vitals=None,
        note="(rapid, thin voice)",
        spoken=True, voice=VOICE_ELENA,
    ),
    Beat(
        t="22:14", speaker="AURA",
        text=("I'm right here, Elena. I heard you. The number scared you, and "
              "after what your body survived, that fear makes complete sense. "
              "We're going to look at this together, carefully, right now. You "
              "are not alone with it this time."),
        act_move="Validate",
        vitals=None,
        note="Tone-match, then de-escalate prosody. Validate the fear, not the fever.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:15", speaker="TELEMETRY",
        text=("DPT girdle engaged, force-controlled. Breath pacing at 26/min to "
              "match her, walking down toward 0.1 Hz (resonance frequency)."),
        act_move="",
        vitals=None,
        note="Deep-pressure therapy + entrainment begins.",
        spoken=False,
    ),
    Beat(
        t="22:15", speaker="AURA",
        text=("Before anything else, can I just breathe with you? You don't have "
              "to do anything. Feel the pressure of my arms, and if it helps, "
              "let your breath drift toward mine. No effort. I've got us."),
        act_move="Co-regulate",
        vitals=None,
        note="Co-regulation invitation. No demand language.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:16", speaker="ELENA",
        text="It's... okay. That's... the weight helps.",
        act_move="",
        vitals=Vitals(hr=104, spo2=98, temp=38.0, resp=18, rmssd_pct=78.0, f0_var=0.41),
        note="(shaky, then an exhale) Resp following the girdle: 27 -> 18.",
        spoken=True, voice=VOICE_ELENA,
    ),
    Beat(
        t="22:16", speaker="TELEMETRY",
        text=("resp 27->18, following the girdle. RMSSD recovering. Panic "
              "hypothesis gaining weight, but the fever is real and unexplained; "
              "cannot close the sepsis hypothesis on calming alone. Proceed to "
              "discriminator."),
        act_move="",
        vitals=None,
        note="Calming works, but the fever can't be explained away. Need a clean reading.",
        spoken=False,
    ),
    Beat(
        t="22:17", speaker="AURA",
        text=("You're doing beautifully. Now, because I take that fever "
              "seriously, not because I'm dismissing it, I'd like one clean "
              "reading. Would you slip the finger sensor on for me? It gives me "
              "a much sharper picture of your heart than I can get from across "
              "the room."),
        act_move="Committed action",
        vitals=None,
        note="Requests the confirmatory contact reading. Frames it as taking the fever seriously.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:18", speaker="TELEMETRY",
        text=("contact reading: HR 104 regular, SpO2 98, no arrhythmia, resp 15. "
              "Temp 38.0 C. qSOFA not met now, but no home BP/lactate -> cannot "
              "home-clear a post-sepsis fever. Decision: amber-plus -> mandatory "
              "human triage tonight; not self-managed, not 911 yet."),
        act_move="",
        vitals=Vitals(hr=104, spo2=98, temp=38.0, resp=15, rmssd_pct=84.0, f0_var=0.52, contact=True),
        note="Clean contact reading. amber-plus decision locked.",
        spoken=False,
    ),
    Beat(
        t="22:18", speaker="AURA",
        text=("Here's what I see, in plain terms. Your oxygen is excellent, "
              "ninety-eight percent. Your heart was fast from the fear and it's "
              "already coming down. Your temperature is thirty-eight, a real "
              "low-grade fever, and I won't wave it away. The honest part: a "
              "fever this soon after sepsis is something a human nurse needs to "
              "weigh in on tonight. It is probably your body and your fear "
              "amplifying each other, but probably isn't good enough for me when "
              "it's you. So I'd like to do two things."),
        act_move="Honest disclosure",
        vitals=None,
        note="Transparent read-back. Names uncertainty instead of false reassurance.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:19", speaker="ELENA",
        text="...okay. Two things.",
        act_move="",
        vitals=None,
        note="(steadier)",
        spoken=True, voice=VOICE_ELENA,
    ),
    Beat(
        t="22:19", speaker="AURA",
        text=("One: I connect us to the nurse triage line now, and I'll tell "
              "them everything I've measured so you don't have to find the "
              "words. Two: I stay right here with you, arms around you, while we "
              "wait. You will not be on hold alone. Does that feel okay?"),
        act_move="Committed action",
        vitals=None,
        note="Offers the plan, keeps consent with Elena.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:19", speaker="SYSTEM",
        text=("Escalation firing: FHIR Communication -> on-call triage with the "
              "full trended packet. AURA does not diagnose and does not stand "
              "down the human. Patient retains consent to escalate."),
        act_move="",
        vitals=None,
        note="Nurse triage connected. Augmentation, not autonomy.",
        spoken=False,
    ),
    Beat(
        t="22:20", speaker="AURA",
        text=("I'm not going anywhere. And Elena, a few minutes ago you couldn't "
              "get a full breath, and now you're talking to me in whole "
              "sentences. That's you doing that. Your body still knows how to "
              "come back down. That's worth remembering next time the fear says "
              "it's hopeless."),
        act_move="Values",
        vitals=None,
        note="Reflects her own agency back to her — an ACT values move.",
        spoken=True, voice=VOICE_AURA,
    ),
    Beat(
        t="22:21", speaker="AURA",
        text=("While we wait for the nurse: your next antibiotic is at eleven. "
              "I'll remind you gently, and if your mind tells you you might have "
              "missed one, check with me first. We don't double up. Your "
              "medication is doing its job in the background; let's not let "
              "tonight's worry disturb it."),
        act_move="Committed action",
        vitals=None,
        note="Protects fluoroquinolone AUC/MIC exposure; prevents panic-driven dosing error.",
        spoken=True, voice=VOICE_AURA,
    ),
)


def vitals_at(index: int) -> Vitals:
    """The last-known vitals at or before `index` (carry-forward), starting
    from baseline."""
    current = BASELINE
    for beat in SCENARIO[: index + 1]:
        if beat.vitals is not None:
            current = beat.vitals
    return current
