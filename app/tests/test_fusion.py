"""Unit tests for the deterioration fusion + escalation policy.

These pin the two behaviours that matter clinically:
1. The fused score tracks the spec ("P=0.36" at Elena's opening drift).
2. The amber-plus guardrail refuses to downgrade an un-clearable post-sepsis
   fever even when the fused score looks reassuring.
"""
import pytest

from scenario import BASELINE, SCENARIO, Vitals, vitals_at
from fusion import (
    AMBER_MAX,
    GREEN_MAX,
    classify,
    decide,
    fuse,
    qsofa_partial,
)


# --- fuse() calibration -------------------------------------------------------

def test_baseline_is_green_and_low():
    p = fuse(BASELINE)
    assert p < GREEN_MAX
    assert classify(p) == "green"


def test_opening_drift_matches_spec_probability():
    # 22:14 telemetry beat — the contactless drift the spec labels P=0.36 (amber).
    opening = SCENARIO[0].vitals
    p = fuse(opening)
    assert p == pytest.approx(0.36, abs=0.04)
    assert classify(p) == "amber"


def test_frank_decompensation_is_red():
    crash = Vitals(hr=124, spo2=91, temp=39.2, resp=28, rmssd_pct=45.0, f0_var=0.25)
    p = fuse(crash)
    assert p >= AMBER_MAX
    assert classify(p) == "red"


def test_fuse_is_monotonic_in_fever():
    cool = Vitals(hr=80, spo2=98, temp=36.8, resp=16, rmssd_pct=95.0, f0_var=0.6)
    warm = Vitals(hr=80, spo2=98, temp=38.6, resp=16, rmssd_pct=95.0, f0_var=0.6)
    assert fuse(warm) > fuse(cool)


# --- classify() thresholds ----------------------------------------------------

@pytest.mark.parametrize("p,band", [
    (0.05, "green"),
    (0.19, "green"),
    (0.20, "amber"),
    (0.40, "amber"),
    (0.55, "red"),
    (0.90, "red"),
])
def test_classify_bands(p, band):
    assert classify(p) == band


# --- decide() guardrail (the crux of the scene) -------------------------------

def test_amber_plus_guardrail_floors_a_reassuring_post_sepsis_fever():
    # The 22:18 contact reading: calming worked, fused score looks green-ish, but
    # the 38.0 C fever cannot be home-cleared -> must escalate to a human.
    contact = Vitals(hr=104, spo2=98, temp=38.0, resp=15, rmssd_pct=84.0,
                     f0_var=0.52, contact=True)
    p = fuse(contact)
    assert classify(p) == "green"          # fused score alone would self-clear
    d = decide(contact, post_sepsis_window=True)
    assert d.band == "amber"               # guardrail floors it
    assert d.raw_band == "green"
    assert d.mandatory_human is True
    assert "cannot be home-cleared" in d.rationale
    assert d.fhir["resourceType"] == "Communication"


def test_no_guardrail_outside_post_sepsis_window():
    contact = Vitals(hr=104, spo2=98, temp=38.0, resp=15, rmssd_pct=84.0, f0_var=0.52)
    d = decide(contact, post_sepsis_window=False)
    assert d.band == "green"
    assert d.mandatory_human is False
    assert d.fhir == {}


def test_red_emits_urgent_fhir_packet():
    crash = Vitals(hr=124, spo2=91, temp=39.2, resp=28, rmssd_pct=45.0, f0_var=0.25)
    d = decide(crash)
    assert d.band == "red"
    assert d.fhir["priority"] == "urgent"
    assert any("qSOFA" in p["contentString"] for p in d.fhir["payload"])


# --- qSOFA + scenario integrity ----------------------------------------------

def test_qsofa_never_fully_computable_at_home():
    points, computable = qsofa_partial(SCENARIO[0].vitals)
    assert computable is False
    assert points == 1            # resp 27 >= 22


def test_scenario_carry_forward_reaches_contact_reading():
    last = vitals_at(len(SCENARIO) - 1)
    assert last.contact is True   # final carried reading is the clean contact one
    assert last.temp == pytest.approx(38.0)
