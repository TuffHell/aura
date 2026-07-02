"""AURA concept film — the Elena amber scene, rendered from a timing manifest.

This scene contains no clinical logic. `build_film.py` synthesizes the voice
track, runs the fusion policy, and writes `_build/timing.json`; this file just
draws each beat for exactly its audio slot so the rendered video lines up with
the muxed narration. Long monologues are shown subtitle-style: sentences advance
within the beat, time-sliced by length so they track the speech.

Render (driven by build_film.py):
    ../.venv/bin/manim render -qm aura_scene.py AuraRealWorld
"""
from __future__ import annotations

import json
import math
import os
import re
import textwrap

from manim import (
    Scene, Text, VGroup, Line, Rectangle, RoundedRectangle, ImageMobject,
    FadeIn, FadeOut, ManimColor,
    UP, DOWN, LEFT, RIGHT,
)

HERE = os.path.dirname(os.path.abspath(__file__))
TIMING = os.environ.get("AURA_TIMING", os.path.join(HERE, "_build", "timing.json"))
AVATAR = os.path.join(HERE, "..", "out", "aura_front_rgba.png")

TEAL = ManimColor("#1D9E75")
CORAL = ManimColor("#D85A30")
AMBER = ManimColor("#E0A23A")
BLUE = ManimColor("#5AA6E8")
MUTED = ManimColor("#8C8A82")
INK = ManimColor("#ECEAE2")
BG = "#0d0d0f"

BAND_COLOR = {"green": TEAL, "amber": AMBER, "red": CORAL}
SPEAKER_COLOR = {"AURA": TEAL, "ELENA": CORAL, "TELEMETRY": MUTED, "SYSTEM": BLUE}

# Layout (Manim frame: x in [-7.1, 7.1], y in [-4, 4])
AVATAR_POS = (-5.0, 1.45, 0)
AVATAR_H = 2.3
VIT_LX, VIT_RX = 0.3, 6.8
VIT_TOP, VIT_DY = 2.35, 0.5
METER_X, METER_Y, METER_W, METER_H = 3.3, -1.05, 5.4, 0.24
CAP_Y = -2.95            # caption band center
CAP_DIV_Y = -1.95


def _status(metric: str, val: float) -> str:
    fns = {
        "hr": lambda x: "green" if x < 90 else "amber" if x < 120 else "red",
        "spo2": lambda x: "green" if x >= 96 else "amber" if x >= 93 else "red",
        "temp": lambda x: "green" if x < 37.5 else "amber" if x < 38.5 else "red",
        "resp": lambda x: "green" if x < 20 else "amber" if x < 25 else "red",
        "hrv": lambda x: "green" if x >= 85 else "amber" if x >= 60 else "red",
    }
    return fns[metric](val)


def _chunk_sentences(text: str, max_chars: int = 145) -> list[str]:
    sents = re.split(r"(?<=[.?!])\s+", text.strip())
    chunks, cur = [], ""
    for s in sents:
        if not cur:
            cur = s
        elif len(cur) + 1 + len(s) <= max_chars:
            cur = f"{cur} {s}"
        else:
            chunks.append(cur)
            cur = s
    if cur:
        chunks.append(cur)
    return chunks or [text]


class AuraRealWorld(Scene):
    def construct(self):
        self.camera.background_color = BG
        with open(TIMING) as fh:
            self.data = json.load(fh)
        self.meta = self.data["meta"]
        self.beats = self.data["beats"]

        self._t = [0.0]
        self.cur_cap = None
        self.guardrail_note = None
        self.src_label = None
        self.vit_value_m = {}

        self.title_card()
        self.build_hud()
        for beat in self.beats:
            self.play_beat(beat)
        self.closing_card()

    # --- title / closing ------------------------------------------------------
    def title_card(self):
        t = Text("Project AURA", font_size=56, color=TEAL, weight="MEDIUM")
        s = Text("a night in the recovery ward of one", font_size=26, color=MUTED)
        s.next_to(t, DOWN, buff=0.3)
        cap = Text("Day 6 post-discharge · Elena Reyes, 61 · urosepsis survivor",
                   font_size=20, color=MUTED).next_to(s, DOWN, buff=0.5)
        self.play(FadeIn(t, shift=UP * 0.2), run_time=1.0)
        self.play(FadeIn(s), FadeIn(cap), run_time=0.8)
        self.wait(self.meta["title_dur"] - 2.4)   # total title == title_dur
        self.play(FadeOut(t), FadeOut(s), FadeOut(cap), run_time=0.6)

    def closing_card(self):
        if self.cur_cap is not None:
            self.play(FadeOut(self.cur_cap), run_time=0.4)
        a = Text("AURA escalates to humans — and never withholds escalation.",
                 font_size=30, color=INK)
        b = Text("augmentation, not autonomy", font_size=22, color=TEAL)
        b.next_to(a, DOWN, buff=0.35)
        self.avatar.clear_updaters()
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)
        self.camera.background_color = BG
        self.play(FadeIn(a, shift=UP * 0.2), run_time=1.0)
        self.play(FadeIn(b), run_time=0.6)
        self.wait(self.meta["closing_dur"] - 2.6)   # total closing == closing_dur

    # --- persistent HUD -------------------------------------------------------
    def build_hud(self):
        brand = Text("AURA", font_size=26, color=TEAL, weight="MEDIUM").to_corner(UP + LEFT, buff=0.5)
        live = Text("· live", font_size=20, color=MUTED).next_to(brand, RIGHT, buff=0.18)
        self.clock = Text("22:13", font_size=22, color=MUTED).to_corner(UP + RIGHT, buff=0.5)
        top_div = Line(LEFT * 6.9, RIGHT * 6.9, color="#26262c", stroke_width=1.5).shift(UP * 3.15)
        cap_div = Line(LEFT * 6.9, RIGHT * 6.9, color="#26262c", stroke_width=1.2).shift(UP * CAP_DIV_Y)

        self.avatar = ImageMobject(AVATAR).scale_to_fit_height(AVATAR_H).move_to(AVATAR_POS)

        def breathe(m, dt):
            self._t[0] += dt
            s = 1 + 0.035 * math.sin(2 * math.pi * self._t[0] / 5.0)
            m.scale_to_fit_height(AVATAR_H * s)
            m.move_to(AVATAR_POS)

        self.avatar.add_updater(breathe)
        self.avatar_state = Text("listening", font_size=18, color=MUTED).move_to([-5.0, -0.25, 0])

        vhead = Text("CLINICAL SURFACE", font_size=18, color=MUTED).move_to([3.3, 2.95, 0])
        self.vit_keys = ["hr", "spo2", "temp", "resp", "hrv"]
        self.vit_labels = ["HEART RATE", "SpO₂", "TEMP", "RESP", "HRV"]
        self.vit_units = ["bpm", "%", "°C", "/min", "% base"]
        vit_label_m = VGroup()
        for i, lbl in enumerate(self.vit_labels):
            y = VIT_TOP - i * VIT_DY
            vit_label_m.add(Text(lbl, font_size=18, color=MUTED).move_to([VIT_LX, y, 0], aligned_edge=LEFT))

        seg_specs = [(0.0, 0.20, TEAL), (0.20, 0.55, AMBER), (0.55, 1.0, CORAL)]
        left = METER_X - METER_W / 2
        self.meter_segs = VGroup()
        for a, b, col in seg_specs:
            w = (b - a) * METER_W
            self.meter_segs.add(Rectangle(width=w, height=METER_H, fill_color=col,
                                          fill_opacity=0.85, stroke_width=0)
                                .move_to([left + a * METER_W + w / 2, METER_Y, 0]))
        self.knob = Rectangle(width=0.06, height=METER_H + 0.24, fill_color=INK,
                              fill_opacity=1, stroke_width=0).move_to([left, METER_Y, 0])
        mlabels = VGroup(
            Text("green", font_size=14, color=MUTED).move_to([left + 0.05, METER_Y - 0.3, 0], aligned_edge=LEFT),
            Text("red", font_size=14, color=MUTED).move_to([left + METER_W - 0.05, METER_Y - 0.3, 0], aligned_edge=RIGHT),
        )
        rhead = Text("FUSED DETERIORATION RISK", font_size=16, color=MUTED).move_to([3.3, -0.2, 0])
        self.band_label = Text("GREEN", font_size=30, color=TEAL, weight="BOLD").move_to([1.4, -0.62, 0], aligned_edge=LEFT)
        self.p_label = Text("P = 0.05", font_size=20, color=MUTED).move_to([3.7, -0.62, 0], aligned_edge=LEFT)

        self.hud = VGroup(brand, live, self.clock, top_div, cap_div, self.avatar_state,
                          vhead, vit_label_m, self.meter_segs, self.knob, mlabels,
                          rhead, self.band_label, self.p_label)
        self.add(self.avatar)
        self.play(FadeIn(self.hud), run_time=0.8)
        self._set_vitals(self.beats[0]["vit"])

    def _knob_x(self, p: float) -> float:
        left = METER_X - METER_W / 2
        return left + max(0.01, min(0.99, p)) * METER_W

    def _set_vitals(self, vit: dict):
        new = {}
        for i, key in enumerate(self.vit_keys):
            y = VIT_TOP - i * VIT_DY
            raw = {"hr": vit["hr"], "spo2": vit["spo2"], "temp": vit["temp"],
                   "resp": vit["resp"], "hrv": vit["rmssd"]}[key]
            disp = f"{raw:.1f}" if key == "temp" else f"{int(raw)}"
            col = BAND_COLOR[_status(key, raw)]
            new[key] = Text(f"{disp} {self.vit_units[i]}", font_size=26, color=col,
                            weight="MEDIUM").move_to([VIT_RX, y, 0], aligned_edge=RIGHT)
        if self.vit_value_m:
            self.remove(*self.vit_value_m.values())
        self.vit_value_m = new
        self.add(*new.values())
        if self.src_label:
            self.remove(self.src_label)
        src = "contact sensor" if vit.get("contact") else "contactless · rPPG/vocal"
        self.src_label = Text(src.upper(), font_size=13, color=MUTED).move_to([3.3, 2.6, 0])
        self.add(self.src_label)

    # --- one beat -------------------------------------------------------------
    def play_beat(self, beat: dict):
        self.remove(self.clock)
        self.clock = Text(beat["t"], font_size=22, color=MUTED).to_corner(UP + RIGHT, buff=0.5)
        self.add(self.clock)

        if beat.get("vit_update"):
            self._set_vitals(beat["vit"])

        spk = beat["speaker"]
        state = {"AURA": "speaking", "ELENA": "listening"}.get(spk, "monitoring")
        self.remove(self.avatar_state)
        self.avatar_state = Text(state, font_size=18, color=SPEAKER_COLOR.get(spk, MUTED)).move_to([-5.0, -0.25, 0])
        self.add(self.avatar_state)

        # chunk the line, time-sliced by length
        if spk in ("AURA", "ELENA"):
            chunks = _chunk_sentences(beat["text"])
        else:
            chunks = [beat["text"]]
        total = sum(len(c) for c in chunks) or 1
        durs = [max(1.1, beat["slot"] * len(c) / total) for c in chunks]
        scale = beat["slot"] / sum(durs)
        durs = [d * scale for d in durs]
        caps = [self._caption(spk, c, beat) for c in chunks]

        # first chunk + HUD risk update together
        dec = beat["dec"]
        nb = Text(dec["band"].upper(), font_size=30, color=BAND_COLOR[dec["band"]],
                  weight="BOLD").move_to([1.4, -0.62, 0], aligned_edge=LEFT)
        npl = Text(f"P = {dec['p']:.2f}", font_size=20, color=MUTED).move_to([3.7, -0.62, 0], aligned_edge=LEFT)
        anims = [FadeIn(caps[0]), FadeOut(self.band_label), FadeIn(nb),
                 FadeOut(self.p_label), FadeIn(npl),
                 self.knob.animate.move_to([self._knob_x(dec["p"]), METER_Y, 0])]
        if self.cur_cap is not None:
            anims.append(FadeOut(self.cur_cap))
        if dec.get("guardrail") and self.guardrail_note is None:
            self.guardrail_note = Text("⚑ amber-plus · fever can't be home-cleared",
                                       font_size=15, color=AMBER).move_to([3.3, -1.5, 0])
            anims.append(FadeIn(self.guardrail_note))

        self.play(*anims, run_time=0.6)
        self.band_label, self.p_label, self.cur_cap = nb, npl, caps[0]
        self.wait(max(0.1, durs[0] - 0.6))

        for cap, dur in zip(caps[1:], durs[1:]):
            self.play(FadeOut(self.cur_cap), FadeIn(cap), run_time=0.35)
            self.cur_cap = cap
            self.wait(max(0.1, dur - 0.35))

    def _caption(self, spk: str, text: str, beat: dict):
        if spk in ("AURA", "ELENA"):
            who = spk + (("  ·  " + beat["act_move"]) if beat.get("act_move") else "")
            label = Text(who, font_size=17, color=SPEAKER_COLOR[spk])
            body = Text(textwrap.fill(text, width=54), font_size=26, color=INK, line_spacing=0.85)
            grp = VGroup(label, body).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
            return grp.move_to([0, CAP_Y, 0])
        if spk == "TELEMETRY":
            label = Text("⌬ AURA · INTERNAL TELEMETRY", font_size=15, color=MUTED)
            body = Text(textwrap.fill(text, width=72), font_size=17, color=MUTED, line_spacing=0.85)
            grp = VGroup(label, body).arrange(DOWN, aligned_edge=LEFT, buff=0.14)
            box = RoundedRectangle(corner_radius=0.1, width=grp.width + 0.5, height=grp.height + 0.36,
                                   stroke_color="#34343d", stroke_width=1.4,
                                   fill_color="#121217", fill_opacity=0.7).move_to(grp.get_center())
            return VGroup(box, grp).move_to([0, CAP_Y, 0])
        # SYSTEM
        label = Text("▲ ESCALATION · FHIR Communication → nurse triage",
                     font_size=17, color=BLUE, weight="MEDIUM")
        body = Text(textwrap.fill(text, width=64), font_size=18,
                    color=ManimColor("#d6e8fb"), line_spacing=0.85)
        grp = VGroup(label, body).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
        box = RoundedRectangle(corner_radius=0.12, width=grp.width + 0.6, height=grp.height + 0.44,
                               stroke_color=BLUE, stroke_width=2,
                               fill_color="#0f1c2c", fill_opacity=0.88).move_to(grp.get_center())
        return VGroup(box, grp).move_to([0, CAP_Y, 0])
