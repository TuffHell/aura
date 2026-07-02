"""Deterioration fusion + green/amber/red escalation policy.

Pure functions only (no Streamlit, no I/O) so they are unit-testable and reusable
by the film pipeline. The model is a deliberately *transparent* weighted logistic
over normalized vital deviations — not a black box — so the prototype can show its
reasoning the way the spec's AURA narrates it.

The clinically important behaviour is the `decide()` guardrail: a fused score can
look reassuring (panic resolving) while a post-sepsis fever still cannot be
home-cleared. The policy therefore floors the band at amber and demands a human —
"amber-plus". AURA augments, it never withholds escalation.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from scenario import Vitals

# --- Tunable policy constants -------------------------------------------------
GREEN_MAX = 0.20          # P below this, with no guardrail, is self-manageable
AMBER_MAX = 0.55          # P at/above this is red regardless of context
FEVER_C = 37.8            # post-sepsis fever floor that cannot be home-cleared
QSOFA_RESP = 22           # respiratory rate point for qSOFA

# Logistic calibration: baseline ~0.05, Elena's opening drift ~0.36 (matches the
# spec's "Fusion: deterioration P=0.36"), a frank decompensation ~0.77.
_BIAS = -2.944


@dataclass(frozen=True)
class Feature:
    name: str
    weight: float
    # maps a Vitals snapshot to a clamped 0..~1.5 "badness" contribution
    fn: "callable"


def _clamp(x: float, lo: float = 0.0, hi: float = 1.5) -> float:
    return max(lo, min(hi, x))


FEATURES: tuple[Feature, ...] = (
    Feature("Respiratory rate", 0.80, lambda v: _clamp((v.resp - 16) / 12)),
    Feature("HRV depression",   0.72, lambda v: _clamp((100 - v.rmssd_pct) / 50)),
    Feature("Temperature",      0.90, lambda v: _clamp((v.temp - 37.2) / 1.5)),
    Feature("Heart rate",       0.55, lambda v: _clamp((v.hr - 85) / 45)),
    Feature("SpO2 drop",        1.05, lambda v: _clamp((95 - v.spo2) / 8)),
    Feature("Vocal flatness",   0.49, lambda v: _clamp((0.60 - v.f0_var) / 0.5)),
)


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def feature_contributions(v: Vitals) -> list[tuple[str, float]]:
    """Per-feature weighted contribution to the fused log-odds — for the
    "show your work" panel."""
    return [(f.name, f.weight * f.fn(v)) for f in FEATURES]


def fuse(v: Vitals) -> float:
    """Fused deterioration probability in [0, 1]."""
    z = _BIAS + sum(w for _, w in feature_contributions(v))
    return _sigmoid(z)


def classify(p: float) -> str:
    """Band from the fused probability alone (before clinical guardrails)."""
    if p < GREEN_MAX:
        return "green"
    if p < AMBER_MAX:
        return "amber"
    return "red"


def qsofa_partial(v: Vitals) -> tuple[int, bool]:
    """qSOFA points computable at home, and whether the score is *complete*.

    Home setting has no blood pressure and no formal mentation exam, so qSOFA can
    never be fully cleared at home — exactly why a post-sepsis fever escalates.
    """
    points = 1 if v.resp >= QSOFA_RESP else 0
    computable = False  # SBP and GCS unavailable in the living room
    return points, computable


@dataclass(frozen=True)
class Decision:
    band: str                 # effective band after guardrails
    raw_band: str             # band from P alone
    action: str               # human-readable next action
    mandatory_human: bool     # must a clinician be looped in?
    rationale: str
    p: float
    fhir: dict = field(default_factory=dict)


# Action copy keyed by effective band.
_ACTIONS = {
    "green": "Self-manage. AURA keeps watching; no human needed.",
    "amber": "Mandatory nurse triage tonight. Not self-managed, not 911 yet.",
    "red": "Urgent: connect emergency services now; AURA stays on the line.",
}


def decide(v: Vitals, post_sepsis_window: bool = True) -> Decision:
    """Map a snapshot to an escalation decision, applying the amber-plus
    guardrail for an un-clearable post-sepsis fever."""
    p = fuse(v)
    raw = classify(p)
    band = raw
    rationale = f"Fused deterioration P={p:.2f} -> {raw}."

    fever = v.temp >= FEVER_C
    if post_sepsis_window and fever and band == "green":
        # The crux: calming dropped the fused score, but the fever itself cannot
        # be cleared without BP/lactate. Floor the band; demand a human.
        band = "amber"
        rationale = (
            f"Fused P={p:.2f} reads reassuring (panic resolving), but a "
            f"post-sepsis fever of {v.temp:.1f} C cannot be home-cleared without "
            f"BP/lactate. Guardrail floors this at amber-plus."
        )

    mandatory_human = band in ("amber", "red")
    decision = Decision(
        band=band, raw_band=raw, action=_ACTIONS[band],
        mandatory_human=mandatory_human, rationale=rationale, p=p,
    )
    return Decision(**{**decision.__dict__, "fhir": fhir_communication(v, decision)})


def fhir_communication(v: Vitals, d: Decision) -> dict:
    """A FHIR R4 Communication-style packet for the care-team inbox. AURA emits
    one fused, high-value escalation instead of streams of raw alarms."""
    if not d.mandatory_human:
        return {}
    points, _ = qsofa_partial(v)
    return {
        "resourceType": "Communication",
        "status": "in-progress",
        "priority": "urgent" if d.band == "red" else "routine",
        "category": [{"text": f"AURA deterioration escalation ({d.band})"}],
        "subject": {"display": "Elena Reyes, 61 — urosepsis, day 6 post-discharge"},
        "recipient": [{"display": "On-call nurse triage"}],
        "payload": [
            {"contentString": f"Fused deterioration probability: {d.p:.2f} ({d.band})"},
            {"contentString": f"HR {v.hr} bpm, SpO2 {v.spo2}%, Temp {v.temp:.1f} C, "
                              f"Resp {v.resp}/min, HRV RMSSD {v.rmssd_pct:.0f}% of baseline"},
            {"contentString": f"qSOFA partial = {points} (no home BP/lactate; not clearable at home)"},
            {"contentString": d.rationale},
            {"contentString": "AURA does not diagnose and will not stand down the human."},
        ],
    }
