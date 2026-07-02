const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageBreak, ExternalHyperlink, PageNumber,
  Header, Footer,
} = require("docx");

const OUT = "/Users/jasper/health/aura/out";
const TEAL = "0F6E56", AMBER = "633806", AMBER_FILL = "FAEEDA", CORAL = "993C1D";
const INK = "1A1A1A", MUT = "5F5E5A";
const CW = 9360;

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 276 },
  alignment: opts.align,
  children: [new TextRun({ text, color: opts.color ?? INK, italics: opts.italics, bold: opts.bold, size: opts.size })],
});

const runs = (children, opts = {}) => new Paragraph({ spacing: { after: opts.after ?? 120, line: 276 }, children });

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 276 },
  children: [new TextRun({ text, color: INK })],
});

function realityBox(text) {
  const cell = new TableCell({
    width: { size: CW, type: WidthType.DXA },
    shading: { fill: AMBER_FILL, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: AMBER },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER },
      left: { style: BorderStyle.SINGLE, size: 12, color: AMBER },
      right: { style: BorderStyle.SINGLE, size: 2, color: AMBER },
    },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Engineering reality check", bold: true, color: AMBER, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text, color: "4A1B0C", size: 20 })] }),
    ],
  });
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [cell] })] });
}

function figure(file, w, h, caption) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(`${OUT}/${file}`), transformation: { width: w, height: h }, altText: { title: caption, description: caption, name: file } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: caption, italics: true, color: MUT, size: 18 })] }),
  ];
}

function simpleTable(headers, rows, widths) {
  const hd = (t) => new TableCell({
    width: { size: widths[0], type: WidthType.DXA }, shading: { fill: "0F6E56", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })] })],
  });
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({ tableHeader: true, children: headers.map((t, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, shading: { fill: "0F6E56", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 }, borders,
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })] })],
  })) });
  const bodyRows = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: ri % 2 ? "F1EFE8" : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 }, borders,
    children: [new Paragraph({ children: [new TextRun({ text: c, color: INK, size: 19 })] })],
  })) }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [headerRow, ...bodyRows] });
}

const ref = (n, text, doi) => new Paragraph({
  numbering: { reference: "refs", level: 0 }, spacing: { after: 80, line: 264 },
  children: [
    new TextRun({ text: text + " ", color: INK, size: 19 }),
    new ExternalHyperlink({ children: [new TextRun({ text: doi ? ("doi:" + doi) : "PMID lookup", style: "Hyperlink", size: 19 })], link: doi ? ("https://doi.org/" + doi) : "https://pubmed.ncbi.nlm.nih.gov/" }),
  ],
});

const dlg = (who, text, kind) => {
  if (kind === "tel") return new Paragraph({ spacing: { after: 80, line: 264 }, indent: { left: 360 }, children: [new TextRun({ text: text, italics: true, color: TEAL, size: 18 })] });
  const color = who === "AURA" ? TEAL : CORAL;
  return new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: who + ":  ", bold: true, color }), new TextRun({ text, color: INK })] });
};

const children = [];

// Title page
children.push(
  new Paragraph({ spacing: { before: 2200, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Project AURA", bold: true, size: 72, color: TEAL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Automated Ultrasonic Resilient Assistant", size: 28, color: MUT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Technical Specification & Design Blueprint", size: 24, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 1 } }, children: [new TextRun("")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 40 }, children: [new TextRun({ text: "Version 1.0  ·  14 June 2026", size: 22, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Principal Soft-Robotics Engineer · Biomedical Materials Scientist · Clinical Psychologist", size: 20, color: MUT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [new TextRun({ text: "Concept design — hybrid vision with engineering reality checks. All citations are real and PubMed/ClinicalTrials-indexed.", italics: true, size: 18, color: MUT })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(H1("Contents"), new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }), new Paragraph({ children: [new PageBreak()] }));

// Executive summary
children.push(
  H1("Executive summary"),
  P("The deadliest gap in modern medicine is not the intensive care unit — it is the unmonitored 30 days after discharge, when sepsis relapse, antibiotic failure, and post-intensive-care trauma compound in a patient's living room with no instrumentation and no witness. AURA is a continuous, non-contact, co-regulating sensor-and-support platform that converts that black box into a monitored, gently-staffed recovery ward of one."),
  P("AURA is the first system to fuse sub-clinical physiological deterioration detection, pharmacological adherence enforcement, and trauma-informed affective intervention into a single embodied agent whose physical form factor — a soft, breathing body — is itself the therapeutic instrument. The body is not packaging around a tablet; the body is the intervention."),
  P("This document specifies four pillars. Where a premise from the original brief fails materials science or pharmacology, it is flagged in an Engineering reality check and replaced with a buildable alternative. Three such corrections are made: the self-sanitizing internal-UV skin, the notion of “maintaining MIC,” and the claim of clinical-grade non-contact HRV."),
);

// Pillar 1
children.push(H1("Pillar 1 — Material science & soft-robotics architecture"));
children.push(H2("1.1 The “Zero-Vector” skin"));
children.push(P("A three-layer integument over an internal endoskeleton:"));
children.push(
  bullet("Layer A (structural bladder): airtight thermoplastic polyurethane, ~Shore A 80–90, forming the pneumatic envelope."),
  bullet("Layer B (compliant flesh): platform silicone, Shore A 10–30, giving the huggable compliance required for safe contact and deep pressure therapy."),
  bullet("Layer C (active surface): a copper/silver-doped silicone topcoat that kills MRSA, enveloped viruses, and fungi on contact."),
);
children.push(realityBox("The brief's self-sanitizing skin via an internal UV-C source plus TiO₂ photocatalysis does not work. (1) UV from the internal skeleton cannot reach the colonized outer surface — opaque silicone is optically thick at germicidal wavelengths. (2) TiO₂ is UV-A-activated, and the UV dose that drives photocatalysis is the same dose that photolytically degrades silicone and polyurethane; “without degrading the material” is the unsolved problem, stated as solved. (3) Putting UV on the outside creates a skin-exposure hazard. Fix: oligodynamic contact-killing copper/silver-doped silicone needs no light and has clinical evidence on healthcare surfaces [1,2]; reserve an externally-directed 222 nm far-UVC excimer for the charging cradle, where mammalian-skin safety and germicidal efficacy are both demonstrated [3,4]."));
children.push(...figure("fig_3d_turntable.png", 300, 300, "Figure 1. Exploded subsystem assembly (CAD turntable still): skin, flesh, DPT girdle, compute core, power base, head."));

children.push(H2("1.2 Haptic vagus regulation — deep pressure therapy at the resonance frequency"));
children.push(P("The torso embeds antagonistic fiber-reinforced pneumatic actuators wrapped as an “embrace girdle.” Flexible capacitive pressure sensors close a force-control loop, so applied pressure tracks a force target regardless of patient body size — force-controlled, not position-controlled, which is essential for safety across body habitus."));
children.push(P("Deep, distributed static pressure biases autonomic balance toward parasympathetic dominance; randomized trials show widespread weighted pressure reduces anxiety and pain [9,10]. AURA's girdle breathes at six breaths per minute (0.1 Hz), the cardiovascular resonance frequency, where respiratory and baroreflex oscillations phase-align to maximize respiratory sinus arrhythmia and vagal outflow [5,6,7]; slow deep breathing recruits pulmonary stretch-receptor afferents that drive central relaxation [8]."));
children.push(P("The novel mechanism is co-regulation through entrainment: AURA does not instruct the patient to breathe — it breathes, and the patient entrains to it, the same physiological synchrony that lets skin-to-skin contact regulate infants [11]. A closed loop reads the patient's instantaneous respiration via rPPG and walks them down from their current rate to 0.1 Hz over 60–90 seconds."));
children.push(...figure("fig_breathing.png", 460, 259, "Figure 2. Co-regulation: AURA (left) paces; the patient (right) entrains; the vagal-tone meter rises as rate falls toward 0.1 Hz."));
children.push(realityBox("Actuators, force-controlled DPT, and 0.1 Hz pacing are TRL 6+. The unproven, fundable claim is closed-loop entrainment efficacy — whether a robot breathing a patient down to 0.1 Hz outperforms an app instructing them to. That is the headline clinical trial, not a fantasy."));

// Pillar 2
children.push(H1("Pillar 2 — Micro-trend diagnostic suite & pharmacokinetics"));
children.push(P("The diagnostic thesis: catch the slope, not the threshold. Sepsis relapse and cellulitis announce themselves in trends — hours of drifting HRV, micro-rises in local skin temperature, VOC shifts — before any single vital crosses an alarm line."));
children.push(H2("2.1 Hyperspectral computer vision — sub-epidermal inflammation"));
children.push(P("A hyperspectral camera (~450–950 nm) images exposed skin. Per-pixel unmixing of oxy- versus deoxy-hemoglobin absorption yields tissue oxygen saturation, relative hemoglobin, and a perfusion index — the established basis of hyperspectral wound diagnostics [12,13]. A spreading erythema margin with rising local temperature and altered StO₂ is pre-clinical cellulitis; a 3D-CNN can grade the hyperspectral cube [14]. Melanin must be calibrated per skin tone — an equity requirement, not optional."));
children.push(H2("2.2 Electronic nose — bacterial VOC interception"));
children.push(P("A gas-sensor array samples air and breath for the volatile signature of infection. Pseudomonas aeruginosa emits 2-aminoacetophenone, hydrogen cyanide, and methyl thiocyanate; VOC headspace analysis detects it in sputum [15], and e-nose discriminates respiratory infection including ventilator-associated pneumonia from exhaled breath [16,17,18]. In an uncontrolled home the e-nose is a low-specificity suspicion channel that raises fusion weight on the other sensors — never a standalone diagnosis."));
children.push(H2("2.3 Non-contact cardiovascular monitoring"));
children.push(realityBox("The brief's “laser-based non-contact PPG for HRV” overstates what is measurable. The buildable technique is remote photoplethysmography (rPPG): HRV parameters are recoverable from facial video [21,22], but beat-to-beat HRV is noisy without contact. AURA uses rPPG for trended HRV over minutes to hours (robust), and for any red-flag escalation asks the patient to don a cheap contact wearable for a confirmatory clean reading. Trend non-contact; confirm on contact."));
children.push(P("Declining HRV (falling RMSSD/SDNN, rising LF/HF and sample-entropy abnormality) is an early fingerprint of systemic inflammatory autonomic dysfunction — the principle behind heart-rate-characteristics monitoring that flags neonatal sepsis early [19] and continuous-HRV early-warning in adults [20]."));
children.push(H2("2.4 Antibiotic adherence & pharmacokinetics"));
children.push(realityBox("“Maintaining the precise MIC” is a category error: MIC is a property of the bacterium, measured in a lab, not something a home robot sets. AURA enforces adherence (CV-confirmed ingestion of the right pill, dose, and time [35]) and times doses to defend the pharmacodynamic target appropriate to the drug class: %T>MIC for beta-lactams, AUC/MIC for fluoroquinolones and vancomycin, Cmax/MIC for aminoglycosides. True concentration targeting requires therapeutic drug monitoring (blood assays), which is explicitly out of home scope."));
children.push(H2("2.5 Sensor fusion"));
children.push(P("No single channel triggers action. A Bayesian/temporal model fuses HRV slope, skin-temperature trend, hyperspectral erythema margin, e-nose suspicion, respiratory rate, and vocal biomarkers into one deterioration probability with calibrated uncertainty, mapped to a green/amber/red escalation policy (qSOFA-aware). One fused, high-precision alert replaces dozens of raw alarms — the antidote to alarm fatigue."));
children.push(...figure("fig_interception.png", 460, 259, "Figure 3. Catch the slope: AURA's fused risk crosses its amber threshold roughly six hours before a conventional single-vital monitor alarms."));

// Pillar 3
children.push(H1("Pillar 3 — Neuro-psychological affective AI"));
children.push(H2("3.1 Vocal biomarker tracking"));
children.push(P("Every spoken interaction is, with consent, a psychiatric and inflammatory assay. The engine extracts source features (F0 and its variance, jitter, shimmer, harmonics-to-noise ratio), filter features (formant dispersion and trajectories), and prosodic features (speaking rate, pause ratio and distribution, response latency — markers of psychomotor retardation). Reduced pitch variability, slowed rate, and lengthened pauses discriminate major depression from vocal acoustics [23,24], and deep-learning models extract depression and anxiety from combined acoustic and lexical biomarkers [25]. AURA tracks the patient against their own baseline; intra-individual drift is more reliable than population thresholds, and on-device feature extraction means raw audio is never exfiltrated."));
children.push(H2("3.2 Trauma-informed CBT/ACT framework"));
children.push(P("Survivors of critical illness develop Post-Intensive Care Syndrome (PICS) — new physical, cognitive, and psychiatric impairment that is common, not rare [26,27,28], with long-term anxiety, depression, and PTSD after sepsis specifically [29]. The defining terror is relapse anxiety: every ambiguous body signal is catastrophized as “it's coming back,” which drives the sympathetic arousal that mimics relapse."));
children.push(P("Standard CBT-style reassurance (“don't worry, it's just anxiety”) is both toxic positivity and clinically dangerous here, because the feared event is real and the fever might be real. AURA leads with Acceptance and Commitment Therapy (ACT), which has randomized support for health anxiety [30] and chronic illness [31]: acceptance (validate, never minimize), cognitive defusion (hold “I'm having the thought that it's coming back”), present-moment anchoring (paired with the DPT breath), values and committed action (a small doable next step). The non-negotiable rule: ACT regulates the distress in parallel with, never instead of, the physiological check, with a hard human-escalation tripwire underneath. Reassurance is earned by data, not dispensed to soothe."));
children.push(realityBox("ACT/CBT content is evidence-based, but an autonomous agent delivering it to acutely distressed post-ICU patients is not a cleared device today and carries real risk (missed deterioration framed as anxiety; dependency; crisis mishandling). AURA must be positioned as a clinician-supervised adjunct with mandatory escalation tripwires and a crisis protocol. This is the project's largest ethical and regulatory surface."));

// Pillar 4
children.push(H1("Pillar 4 — Healthcare integration & clinical ROI"));
children.push(P("AURA reads and writes the EHR via HL7 FHIR R4 / SMART on FHIR, mapping to USCDI classes (Epic, Oracle Health/Cerner). Trended observations post as FHIR Observation and RiskAssessment resources; escalations fire as Communication/Flag to the care-team inbox."));
children.push(P("The Hospital Readmissions Reduction Program (HRRP) penalizes hospitals up to 3% of Medicare payments for excess 30-day readmissions. AURA attacks the causal drivers with RCT-backed mechanisms — structured education and self-management [33], remote medication monitoring [34], teach-back adherence [35]. Critically, HRRP is controversial: reduced readmissions may have come at the cost of a heart-failure mortality signal [32]. AURA's positioning is therefore fewer readmissions with a deterioration-detection safety net that guards against the exact mortality risk HRRP critics fear — the answer to the policy's central critique. Alarm fatigue, a documented safety hazard linked to burnout [36,37], is reduced by emitting one fused, high-predictive-value escalation instead of streams of raw alarms."));
children.push(simpleTable(
  ["Concern", "Mechanism", "Evidence"],
  [
    ["30-day readmission", "Adherence + self-management + early deterioration capture", "[33,34,35]"],
    ["HRRP mortality critique", "Continuous deterioration safety net", "[32]"],
    ["Alarm fatigue", "Edge sensor fusion → single trusted alert", "[36,37]"],
    ["Antibiotic resistance", "CV-confirmed adherence + full-course tracking", "[35]"],
  ],
  [2600, 4360, 2400],
));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));
children.push(P("Regulatory surface: FDA SaMD plus hardware (likely De Novo then 510(k)); IEC 60601-1, IEC 62304, ISO 14971, ISO 10993 (the copper-silicone must pass cytotoxicity/sensitization); HIPAA with on-device inference and no raw audio/video exfiltration. Cardinal rule: AURA is augmentation, not autonomy — it escalates to humans and never withholds escalation."));

children.push(H2("4.2 The system in action — clinical narrative"));
children.push(P("Scenario: Day 6 post-discharge. Elena Reyes, 61, survived urosepsis (ICU 4 days), home alone, on day 6 of an oral fluoroquinolone step-down. Evening. Presenting: profound fatigue, a low-grade fever oscillating around 37.9–38.1 °C, and an acute panic attack with the conviction that the sepsis is returning. Bracketed italic lines are AURA's internal telemetry and reasoning, running simultaneously with its speech.", { italics: false }));
children.push(
  dlg("", "[22:14 — rPPG: RMSSD down 34%, LF/HF up, resp 22→27. Skin temp 38.0 °C, +0.4 in 90 min. Vocal: F0 variance down, pauses lengthening. Fusion: deterioration P=0.36 (amber). Hypotheses: (a) sepsis relapse, (b) acute panic + dysautonomia. Panic physiology dominant. Open dual-track; do not reassure prematurely.]", "tel"),
  dlg("ELENA", "(rapid, thin voice) The thermometer said thirty-eight. It's back. It's happening again, I can feel it, it's exactly how it started last time —"),
  dlg("AURA", "I'm right here, Elena. I heard you — the number scared you, and after what your body survived, that fear makes complete sense. We're going to look at this together, carefully, right now. You are not alone with it this time."),
  dlg("", "[Tone-match → de-escalate prosody. Not minimizing the fever — validating the fear. DPT girdle engaged, force-controlled. Breath pacing at 26/min to match her, will walk down toward 0.1 Hz.]", "tel"),
  dlg("AURA", "Before anything else — can I just breathe with you? You don't have to do anything. Feel the pressure of my arms, and if it helps, let your breath drift toward mine. No effort. I've got us."),
  dlg("ELENA", "(shaky) It's — okay. That's… the weight helps. (exhales)"),
  dlg("", "[22:16 — resp 27→18, following the girdle. RMSSD recovering. Panic hypothesis gaining weight, but the fever is real and unexplained; cannot close the sepsis hypothesis on calming alone. Proceed to discriminator.]", "tel"),
  dlg("AURA", "You're doing beautifully. Now, because I take that fever seriously, not because I'm dismissing it, I'd like one clean reading. Would you slip the finger sensor on for me? It gives me a much sharper picture of your heart than I can get from across the room."),
  dlg("ELENA", "(complying) …Last time my heart was racing and they said my pressure crashed. Is that —"),
  dlg("AURA", "Good question, and exactly the right thing to check. Let's get the facts instead of letting the fear guess for us."),
  dlg("", "[22:18 — contact reading: HR 104 regular, SpO2 98%, no arrhythmia, resp 15. Temp 38.0 °C. qSOFA not met now, but no home BP/lactate → cannot home-clear a post-sepsis fever. Decision: amber-plus → mandatory human triage tonight; not self-managed, not 911 yet.]", "tel"),
  dlg("AURA", "Here's what I see, in plain terms. Your oxygen is excellent — 98%. Your heart was fast from the fear and it's already coming down. Your temperature is 38.0 — a real low-grade fever, and I won't wave it away. The honest part: a fever this soon after sepsis is something a human nurse needs to weigh in on tonight. It is probably your body and your fear amplifying each other — but “probably” isn't good enough for me when it's you. So I'd like to do two things."),
  dlg("ELENA", "…okay. Two things."),
  dlg("AURA", "One: I connect us to the nurse triage line now, and I'll tell them everything I've measured so you don't have to find the words. Two: I stay right here with you, arms around you, while we wait. You will not be on hold alone. Does that feel okay?"),
  dlg("", "[Escalation firing: FHIR Communication → on-call triage with the full trended packet. AURA does not diagnose and does not stand down the human. Patient retains consent to escalate.]", "tel"),
  dlg("ELENA", "(tearful, calmer) You'd stay?"),
  dlg("AURA", "I'm not going anywhere. And Elena — a few minutes ago you couldn't get a full breath, and now you're talking to me in whole sentences. That's you doing that. Your body still knows how to come back down. That's worth remembering next time the fear says it's hopeless."),
  dlg("", "[22:21 — next antibiotic dose due 23:00; fluoroquinolone is AUC/MIC-driven → protect total exposure, ensure the panic doesn't cause a missed or double dose.]", "tel"),
  dlg("AURA", "While we wait for the nurse: your next antibiotic is at 11. I'll remind you gently — and if your mind tells you you might have missed one, check with me first. We don't double up. Your medication is doing its job in the background; let's not let tonight's worry disturb it."),
);

// TRL
children.push(H1("Technology readiness summary"));
children.push(simpleTable(
  ["Subsystem", "Status", "TRL"],
  [
    ["DPT actuators + 0.1 Hz pacing", "Established; integration work", "6–7"],
    ["Closed-loop breathing entrainment efficacy", "Novel; needs clinical trial", "4"],
    ["Copper-silicone contact-kill skin", "Proven surface chemistry", "5–6"],
    ["Hyperspectral inflammation tracking", "Clinically validated for wounds", "6"],
    ["e-Nose bacterial VOC suspicion", "Lab-validated; home specificity open", "4–5"],
    ["rPPG trended HRV", "Robust for trends, not beat-to-beat", "5"],
    ["PK/PD-aware adherence", "Buildable from proven components", "6"],
    ["Vocal biomarker drift", "Active research area", "5–6"],
    ["Autonomous ACT delivery", "Clinician-supervised only", "3–4"],
  ],
  [4600, 3360, 1400],
));

// References
children.push(H1("References"));
children.push(P("Sources are real and PubMed-indexed (via PubMed); links resolve through doi.org.", { italics: true, color: MUT, size: 18 }));
const R = [
  ["Vincent M, et al. 2016. Antimicrobial applications of copper. Int J Hyg Environ Health.", "10.1016/j.ijheh.2016.06.003"],
  ["Chyderiotis S, et al. 2018. Antimicrobial efficacy of copper surfaces in healthcare: a systematic review. Clin Microbiol Infect.", "10.1016/j.cmi.2018.03.034"],
  ["Buonanno M, et al. 2017. Germicidal efficacy and mammalian skin safety of 222-nm UV light. Radiat Res.", "10.1667/RR0010CC.1"],
  ["Görlitz M, et al. 2023. Assessing the safety of new germicidal far-UVC technologies. Photochem Photobiol.", "10.1111/php.13866"],
  ["Shaffer F, et al. 2020. A practical guide to resonance frequency assessment for HRV biofeedback. Front Neurosci.", "10.3389/fnins.2020.570400"],
  ["Schwerdtfeger AR, et al. 2019. HRV: from brain death to resonance breathing at 6 breaths/min. Clin Neurophysiol.", "10.1016/j.clinph.2019.11.013"],
  ["Sevoz-Couche C, Laborde S. 2022. HRV and slow-paced breathing: when coherence meets resonance. Neurosci Biobehav Rev.", "10.1016/j.neubiorev.2022.104576"],
  ["Noble DJ, Hochman S. 2019. Pulmonary afferent activity during slow deep breathing and physiological relaxation. Front Physiol.", "10.3389/fphys.2019.01176"],
  ["Baumgartner JN, et al. 2021. Widespread pressure from a weighted blanket reduces chronic pain: an RCT. J Pain.", "10.1016/j.jpain.2021.07.009"],
  ["Payne C, et al. 2024. Weighted blanket versus traditional practice on anxiety and pain in elective surgery: multicenter RCT. AORN J.", "10.1002/aorn.14146"],
  ["Moore ER, et al. 2016. Early skin-to-skin contact for mothers and healthy newborns. Cochrane Database Syst Rev.", "10.1002/14651858.CD003519.pub4"],
  ["Holmer A, et al. 2018. Hyperspectral imaging in perfusion and wound diagnostics. Biomed Tech (Berl).", "10.1515/bmt-2017-0155"],
  ["Saiko G, et al. 2020. Hyperspectral imaging in wound care: a systematic review. Int Wound J.", "10.1111/iwj.13474"],
  ["Cihan M, et al. 2023. Hyperspectral cutaneous wound classification using a 3D CNN. Biomed Tech (Berl).", "10.1515/bmt-2022-0179"],
  ["Goeminne PC, et al. 2012. Detection of P. aeruginosa in sputum headspace through VOC analysis. Respir Res.", "10.1186/1465-9921-13-87"],
  ["Schnabel R, et al. 2015. Electronic nose analysis of exhaled breath to diagnose ventilator-associated pneumonia. Respir Med.", "10.1016/j.rmed.2015.09.014"],
  ["Dragonieri S, et al. 2017. Electronic nose technology in respiratory diseases. Lung.", "10.1007/s00408-017-9987-3"],
  ["Licht JC, Grasemann H. 2020. Potential of the electronic nose for respiratory disease detection. Int J Mol Sci.", "10.3390/ijms21249416"],
  ["Fairchild KD. 2013. Predictive monitoring for early detection of sepsis in neonatal ICU patients. Curr Opin Pediatr.", "10.1097/MOP.0b013e32835e8fe6"],
  ["Quinten VM, et al. 2017. Continuous HRV as an early warning for deterioration in infection/sepsis (sepsivit). BMJ Open.", "10.1136/bmjopen-2017-018259"],
  ["Odinaev I, et al. 2023. Robust heart rate variability measurement from facial videos. Bioengineering (Basel).", "10.3390/bioengineering10070851"],
  ["Talukdar D, et al. 2022. Evaluating visual photoplethysmography method. Cureus.", "10.7759/cureus.26871"],
  ["Taguchi T, et al. 2017. Major depressive disorder discrimination using vocal acoustic features. J Affect Disord.", "10.1016/j.jad.2017.08.038"],
  ["Higuchi M, et al. 2022. Detection of major depressive disorder from a combination of voice features. Int J Environ Res Public Health.", "10.3390/ijerph191811397"],
  ["Regondi S, et al. 2025. Voice of Mind: deep learning for depression and anxiety from vocal biomarkers. J Voice.", "10.1016/j.jvoice.2025.09.012"],
  ["Ayenew T, et al. 2025. Prevalence of post-intensive care syndrome among ICU survivors: meta-analysis. PLoS One.", "10.1371/journal.pone.0323311"],
  ["Marra A, et al. 2018. Co-occurrence of post-intensive care syndrome problems among 406 survivors. Crit Care Med.", "10.1097/CCM.0000000000003218"],
  ["Kawakami D, et al. 2021. Prevalence of post-intensive care syndrome among Japanese ICU patients (J-PICS). Crit Care.", "10.1186/s13054-021-03501-z"],
  ["Dal-Pizzol F, et al. 2021. Long-term psychiatric symptoms in sepsis survivors: a systematic review. Neurotherapeutics.", "10.1007/s13311-020-00981-9"],
  ["Eilenberg T. 2016. Acceptance and Commitment Group Therapy for health anxiety. Dan Med J.", ""],
  ["Carvalho SA, et al. 2021. Online ACT versus compassion-focused therapy for chronic illness: pilot RCT. Clin Psychol Psychother.", "10.1002/cpp.2643"],
  ["Gupta A, Fonarow GC. 2018. The Hospital Readmissions Reduction Program — learning from failure of a policy. Eur J Heart Fail.", "10.1002/ejhf.1212"],
  ["Cui X, et al. 2019. Nurse-led structured education reduces readmissions in chronic heart failure: RCT. Rural Remote Health.", "10.22605/RRH5270"],
  ["Hale TM, et al. 2016. Remote medication monitoring to reduce readmissions in chronic heart failure. J Med Internet Res.", "10.2196/jmir.5256"],
  ["Ha Dinh TT, et al. 2016. Teach-back method on adherence and self-management in chronic disease. JBI Database System Rev Implement Rep.", "10.11124/jbisrir-2016-2296"],
  ["Lewandowska K, et al. 2020. Impact of alarm fatigue on nurses in intensive care: systematic review. Int J Environ Res Public Health.", "10.3390/ijerph17228409"],
  ["Nyarko BA, et al. 2023. Nurses' alarm fatigue and its relationship with burnout in critical care. Aust Crit Care.", "10.1016/j.aucc.2023.06.010"],
];
R.forEach((r, i) => children.push(ref(i + 1, `${i + 1}. ${r[0]}`, r[1])));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: "Arial", color: "0F6E56" }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 25, bold: true, font: "Arial", color: "1A1A1A" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: "5F5E5A" }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "refs", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Project AURA — Technical Specification   ·   ", size: 16, color: MUT }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUT })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(`${OUT}/AURA_Technical_Specification.docx`, buffer);
  console.log("DOCX_WRITTEN", buffer.length);
});
