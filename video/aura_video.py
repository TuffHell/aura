"""Project AURA - explainer video (Manim Community).

Render:
  ../.venv/bin/manim -qm aura_video.py AuraExplainer -o aura_explainer

Segments: title, sepsis-interception graph, breathing co-regulation, closing.
Uses Text only (no LaTeX dependency).
"""
import numpy as np
from manim import (
    Scene, Text, VGroup, Axes, Line, DashedLine, Brace, Circle, Rectangle,
    RoundedRectangle, ImageMobject,
    Write, Create, FadeIn, FadeOut, ManimColor,
    UP, DOWN, LEFT, RIGHT, UR, DR, ORIGIN, always_redraw, ValueTracker,
)

AURA_PNG = "/Users/jasper/health/aura/out/aura_front_rgba.png"

TEAL = ManimColor("#1D9E75")
CORAL = ManimColor("#D85A30")
AMBER = ManimColor("#BA7517")
BLUE = ManimColor("#378ADD")
MUTED = ManimColor("#B4B2A9")


def aura(x):
    return 8 + 86 / (1 + np.exp(-(x + 6) / 2.0))


def conv(x):
    return 10 + 80 / (1 + np.exp(-(x + 1) / 0.6))


class AuraExplainer(Scene):
    def construct(self):
        self.camera.background_color = "#0d0d0f"
        self.title_card()
        self.interception_graph()
        self.coregulation()
        self.closing()

    def title_card(self):
        title = Text("Project AURA", font_size=58, color=TEAL, weight="MEDIUM")
        sub = Text("a discharge-to-recovery companion", font_size=26, color=MUTED)
        sub.next_to(title, DOWN, buff=0.3)
        self.play(Write(title), run_time=1.4)
        self.play(FadeIn(sub, shift=UP * 0.2))
        self.wait(1.3)
        self.play(FadeOut(title), FadeOut(sub))

    def interception_graph(self):
        head = Text("Catch the slope, not the threshold", font_size=34, color="#ECEAE2")
        head.to_edge(UP, buff=0.5)
        self.play(Write(head), run_time=1.0)

        ax = Axes(
            x_range=[-12, 0, 2], y_range=[0, 100, 25],
            x_length=9.2, y_length=4.6,
            tips=False,
            axis_config={"color": MUTED, "stroke_width": 2},
        ).shift(DOWN * 0.4)

        ticks = VGroup()
        for xv in [-12, -8, -4, 0]:
            ticks.add(Text(str(xv), font_size=16, color=MUTED).next_to(ax.c2p(xv, 0), DOWN, buff=0.15))
        for yv in [0, 50, 100]:
            ticks.add(Text(str(yv), font_size=16, color=MUTED).next_to(ax.c2p(-12, yv), LEFT, buff=0.15))

        x_lbl = Text("hours to clinical presentation", font_size=20, color=MUTED)
        x_lbl.next_to(ax, DOWN, buff=0.5)

        aura_g = ax.plot(aura, x_range=[-12, 0], color=TEAL, stroke_width=6)
        conv_g = ax.plot(conv, x_range=[-12, 0], color=CORAL, stroke_width=4)
        thresh = DashedLine(ax.c2p(-12, 38), ax.c2p(0, 38), color=AMBER, stroke_width=2.5)

        legend = VGroup(
            self._legend_row(TEAL, "AURA fused risk"),
            self._legend_row(CORAL, "conventional vital"),
            self._legend_row(AMBER, "amber threshold"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.16).scale(0.9)
        legend.to_corner(UR, buff=0.5).shift(DOWN * 0.6)

        self.play(Create(ax), FadeIn(ticks), FadeIn(x_lbl), run_time=1.2)
        self.play(FadeIn(legend), Create(thresh), run_time=0.8)
        self.play(Create(aura_g), run_time=1.8)
        self.play(Create(conv_g), run_time=1.4)

        x1, x2 = -7.25, -1.37
        seg = Line(ax.c2p(x1, 38), ax.c2p(x2, 38))
        brace = Brace(seg, DOWN, color=MUTED)
        lead = Text("about 6 hours earlier", font_size=24, color=AMBER)
        lead.next_to(brace, DOWN, buff=0.12)
        self.play(FadeIn(brace), Write(lead), run_time=1.2)
        self.wait(1.6)
        self.play(*[FadeOut(m) for m in [head, ax, ticks, x_lbl, aura_g, conv_g, thresh, legend, brace, lead]])

    def _legend_row(self, color, label):
        swatch = Line(LEFT * 0.25, RIGHT * 0.25, color=color, stroke_width=6)
        txt = Text(label, font_size=20, color="#ECEAE2")
        txt.next_to(swatch, RIGHT, buff=0.2)
        return VGroup(swatch, txt)

    def coregulation(self):
        head = Text("Co-regulation toward the resonance frequency", font_size=32, color="#ECEAE2")
        head.to_edge(UP, buff=0.6)
        self.play(Write(head), run_time=1.0)

        tt = ValueTracker(0.0)
        aura_anchor = LEFT * 3.4 + DOWN * 0.35
        pat_anchor = RIGHT * 3.4 + DOWN * 0.35
        AURA_H = 2.7

        aura = ImageMobject(AURA_PNG).scale_to_fit_height(AURA_H).move_to(aura_anchor)

        def upd_aura(m):
            s = 0.5 - 0.5 * np.cos(2 * np.pi * tt.get_value() / 2.6)
            m.scale_to_fit_height(AURA_H * (1 + 0.05 * s))
            m.move_to(aura_anchor)

        aura.add_updater(upd_aura)

        p_body = RoundedRectangle(corner_radius=0.32, height=1.45, width=1.25, color=CORAL,
                                  fill_color=CORAL, fill_opacity=0.4, stroke_width=3)
        p_head = Circle(radius=0.42, color=CORAL, fill_color=CORAL, fill_opacity=0.4, stroke_width=3)
        p_head.next_to(p_body, UP, buff=0.05)
        patient = VGroup(p_body, p_head).move_to(pat_anchor)
        P_H = patient.height

        def upd_pat(m):
            t = tt.get_value()
            phase = 2 * np.pi * t / 2.6 - 0.9 * np.exp(-t / 4.0)
            s = 0.5 - 0.5 * np.cos(phase)
            amp = 0.05 + 0.10 * (1 - np.exp(-t / 4.0))
            m.scale_to_fit_height(P_H * (1 + amp * s))
            m.move_to(pat_anchor)

        patient.add_updater(upd_pat)

        aura_l = Text("AURA paces", font_size=22, color=TEAL).move_to(LEFT * 3.4 + DOWN * 2.05)
        pat_l = Text("patient entrains", font_size=22, color=CORAL).move_to(RIGHT * 3.4 + DOWN * 2.05)
        outline = Rectangle(width=6.0, height=0.32, color=MUTED, stroke_width=2).move_to(DOWN * 2.75)

        def vbar():
            frac = 1 - np.exp(-tt.get_value() / 4.0)
            w = max(6.0 * frac, 0.001)
            col = CORAL if frac < 0.45 else (AMBER if frac < 0.7 else TEAL)
            r = Rectangle(width=w, height=0.32, fill_color=col, fill_opacity=1, stroke_width=0)
            r.move_to(outline.get_left() + RIGHT * (w / 2))
            return r

        bar = always_redraw(vbar)
        vlabel = Text("vagal tone", font_size=18, color=MUTED).next_to(outline, UP, buff=0.1)

        self.add(aura, patient)
        self.play(FadeIn(aura), FadeIn(patient), FadeIn(aura_l), FadeIn(pat_l),
                  FadeIn(outline), FadeIn(bar), FadeIn(vlabel))
        self.play(tt.animate.set_value(11.0), run_time=11.0, rate_func=lambda t: t)
        self.wait(0.4)
        aura.clear_updaters()
        patient.clear_updaters()
        self.play(FadeOut(aura), FadeOut(patient), *[FadeOut(m) for m in [head, aura_l, pat_l, outline, bar, vlabel]])

    def closing(self):
        a = Text("The 30-day window, finally monitored.", font_size=38, color="#ECEAE2")
        b = Text("grounded in 30+ peer-reviewed sources", font_size=22, color=MUTED)
        b.next_to(a, DOWN, buff=0.35)
        self.play(Write(a), run_time=1.4)
        self.play(FadeIn(b, shift=UP * 0.2))
        self.wait(2.0)
        self.play(FadeOut(a), FadeOut(b))
