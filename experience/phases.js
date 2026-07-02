/* AURA — embodied experience timeline.
 *
 * The ACT arc from AURA_Technical_Specification §4.2, re-scored as a felt
 * sequence rather than a dashboard, now with the clinical care made visible:
 * a contactless vitals sweep, the scheduled-dose dispense, a cooling compress,
 * and the amber-plus guardrail notifying night triage — before the deep-pressure
 * hold walks Elena's breath down to the 0.1 Hz resonance frequency.
 *
 * Per-phase targets (smoothly lerped by the engine):
 *   rate      breaths/min for AURA's pacing body
 *   embrace   0 = apart, 1 = full deep-pressure hold
 *   warmth    cold night -> warm presence (drives palette + skin heat)
 *   calm      0 = panic, 1 = settled (drives Elena's entrainment)
 *   scan      1 = contactless vitals sweep active
 *   compress  1 = cooling compress resting on Elena
 * Flags: breathe = show the breathe-along pacer · note = whisper line
 */
window.AURA_PHASES = [
  {
    id: "arrival", clock: "22:14", caption: true,
    voice: "ELENA",
    line: "The thermometer said thirty-eight. It's back. It's happening again, I can feel it.",
    rate: 26, embrace: 0.0, warmth: 0.08, calm: 0.05, dur: 7.5, breathe: false,
    instruction: "",
  },
  {
    id: "validate", clock: "22:14", caption: true,
    voice: "AURA", act: "Validate",
    line: "I'm right here. The number scared you, and after what your body survived, that fear makes complete sense. You are not alone with it this time.",
    rate: 24, embrace: 0.2, warmth: 0.2, calm: 0.12, dur: 11, breathe: false,
    instruction: "",
  },
  {
    id: "scan", clock: "22:15", caption: true,
    voice: "AURA", act: "Assessment",
    line: "May I take a look at you? Hold still — nothing touches you. Thirty-eight point one. Your heart is quick, but that is the fear, not the sepsis. Your oxygen is good.",
    rate: 23, embrace: 0.22, warmth: 0.26, calm: 0.16, dur: 15, breathe: false,
    scan: 1,
    instruction: "A soft light passes over you. Nothing touches your skin.",
  },
  {
    id: "care", clock: "22:16", caption: true,
    voice: "AURA", act: "Care",
    line: "Your evening antibiotic is due — here, with small sips of water. And something cool for your forehead while we wait.",
    rate: 21, embrace: 0.45, warmth: 0.32, calm: 0.22, dur: 13, breathe: false,
    med: true, compress: 1,
    instruction: "The scheduled dose, logged. A cool compress settles gently.",
  },
  {
    id: "triage", clock: "22:16", caption: true,
    voice: "AURA", act: "Guardrail",
    line: "I've already sent tonight's numbers to your night nurse. If anything climbs, they call us. You don't have to decide anything alone.",
    rate: 20, embrace: 0.5, warmth: 0.38, calm: 0.28, dur: 11, breathe: false,
    compress: 1, note: "amber · night triage notified ✓",
    instruction: "",
  },
  {
    id: "embrace", clock: "22:17", caption: true,
    voice: "AURA", act: "Deep-pressure hold",
    line: "Before anything else — can I just hold you? Feel the pressure of my arms. No effort. I've got us.",
    rate: 22, embrace: 1.0, warmth: 0.44, calm: 0.32, dur: 11, breathe: false,
    compress: 0.35,
    instruction: "Feel the weight settle. Let your breath drift toward mine.",
  },
  {
    id: "coreg1", clock: "22:18", caption: true,
    voice: "AURA", act: "Breathe with me",
    line: "Let's breathe together. In, through the nose… and slowly out.",
    rate: 15, embrace: 1.0, warmth: 0.55, calm: 0.42, dur: 18, breathe: true,
    instruction: "Follow the light. Breathe in as it grows, out as it falls.",
  },
  {
    id: "coreg2", clock: "22:19", caption: false,
    voice: null, line: "",
    rate: 10, embrace: 1.0, warmth: 0.68, calm: 0.6, dur: 20, breathe: true,
    instruction: "Slower now. There's no hurry. I'm not going anywhere.",
  },
  {
    id: "resonance", clock: "22:20", caption: true,
    voice: "AURA", act: "Co-regulation",
    line: "You're doing beautifully. Your body still knows how to come back down.",
    rate: 6, embrace: 1.0, warmth: 0.82, calm: 0.78, dur: 24, breathe: true,
    instruction: "Six breaths a minute — the resonance of a calming nervous system.",
  },
  {
    id: "values", clock: "22:22", caption: true,
    voice: "AURA", act: "Values",
    line: "A few minutes ago you couldn't get a full breath. Now you're breathing with me. That's you doing that.",
    rate: 6, embrace: 0.92, warmth: 0.94, calm: 0.9, dur: 14, breathe: true,
    instruction: "",
  },
  {
    id: "presence", clock: "22:23", caption: true,
    voice: "AURA", act: "Presence",
    line: "I'm not going anywhere. Stay here, held, as long as you like.",
    rate: 6, embrace: 0.9, warmth: 1.0, calm: 1.0, dur: 99999, breathe: true,
    instruction: "Stay as long as you like.",
    last: true,
  },
];
