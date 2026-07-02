/* AURA — embodied experience engine (Three.js, global build, vendored).
 *
 * A soft vinyl care robot — smooth lathe-profile unibody, dot-line-dot face,
 * chest access port with a heartlight — that scans a frightened figure,
 * delivers the scheduled dose and a cooling compress, notifies night triage,
 * then holds her and walks her breath down to the 0.1 Hz resonance frequency.
 * No charts. The demo is the therapy.
 */
(function () {
  "use strict";
  const PHASES = window.AURA_PHASES;

  // ---- palette (lerped by `warmth`) ----------------------------------------
  const C = (h) => new THREE.Color(h);
  const COLD_BG = C(0x07070a), WARM_BG = C(0x140f0a);
  const COLD_FOG = C(0x0a0c16), WARM_FOG = C(0x18110a);
  const KEY_COLD = C(0x6f8bd0), KEY_WARM = C(0xffb070);
  const EMIS_COLD = C(0x1d9e75), EMIS_WARM = C(0xe0a23a);
  const PART_COLD = C(0x5b6070), PART_WARM = C(0xc08a4e);
  const lerpC = (a, b, t) => a.clone().lerp(b, t);

  // ---- renderer / scene / camera -------------------------------------------
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = COLD_BG.clone();
  scene.fog = new THREE.FogExp2(COLD_FOG.clone(), 0.052);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.35, 6.4);

  // ---- lights ---------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0x8090c0, 0x141008, 0.35);
  scene.add(hemi);
  const key = new THREE.PointLight(KEY_COLD.clone(), 14, 40, 2);
  key.position.set(2.4, 3.0, 3.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb6e6, 0.6);
  rim.position.set(-3, 1.5, -4);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffd9b0, 2.0, 30, 2);
  fill.position.set(-2.2, -0.6, 2.6);
  scene.add(fill);

  // ---- atmosphere: drifting motes ------------------------------------------
  const motes = (() => {
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r*Math.sin(ph)*Math.cos(th);
      pos[i*3+1] = (Math.random()*2-1)*4.5;
      pos[i*3+2] = r*Math.sin(ph)*Math.sin(th)*0.5 - 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: 0.045, color: PART_COLD.clone(),
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(g, m); scene.add(p); return { p, m };
  })();

  // ---- ground glow ----------------------------------------------------------
  var groundGlow;
  (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const ctx = cv.getContext("2d");
    const grd = ctx.createRadialGradient(128,128,10,128,128,128);
    grd.addColorStop(0, "rgba(255,190,120,0.5)");
    grd.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = grd; ctx.fillRect(0,0,256,256);
    const tex = new THREE.CanvasTexture(cv);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.0 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), m);
    plane.rotation.x = -Math.PI / 2; plane.position.y = -1.9;
    scene.add(plane); groundGlow = m;
  })();

  // ===========================================================================
  //  AURA — the body
  // ===========================================================================
  const aura = new THREE.Group();
  scene.add(aura);

  // soft medical vinyl: matte-white with a warm sheen and a wipe-clean coat
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f5f0, roughness: 0.42, metalness: 0.0,
    sheen: 1.0, sheenColor: new THREE.Color(0xfff1e2), sheenRoughness: 0.42,
    clearcoat: 0.55, clearcoatRoughness: 0.32,
    emissive: EMIS_COLD.clone(), emissiveIntensity: 0.05,
  });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xd9dbd2, roughness: 0.6, metalness: 0.0 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.35, metalness: 0.1 });

  const bodyGroup = new THREE.Group(); aura.add(bodyGroup);

  const lathe = (pts, mat, segs = 96) => {
    const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), segs);
    return new THREE.Mesh(geo, mat);
  };

  // -- torso: one smooth pear-shaped vinyl bladder (widest low, like Baymax) --
  const torso = lathe([
    [0.001, -1.42], [0.34, -1.415], [0.62, -1.36], [0.84, -1.26], [1.00, -1.10],
    [1.10, -0.88], [1.155, -0.62], [1.16, -0.38], [1.135, -0.12], [1.07, 0.14],
    [0.965, 0.40], [0.84, 0.62], [0.72, 0.80], [0.60, 0.92], [0.50, 0.99],
    [0.34, 1.035], [0.001, 1.05],
  ], bodyMat, 128);
  // gentle belly-forward asymmetry so the silhouette isn't a plain egg
  (() => {
    const pos = torso.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = pos.getZ(i);
      if (z > 0) {
        const w = Math.max(0, 1 - Math.abs(y + 0.45) / 1.25);
        pos.setZ(i, z * (1 + 0.10 * w));
      }
    }
    torso.geometry.computeVertexNormals();
  })();
  bodyGroup.add(torso);

  // -- legs: stubby tapered vinyl stumps, mostly lost in the ground haze -----
  const legPts = [[0.001, -0.55], [0.20, -0.52], [0.30, -0.42], [0.345, -0.25],
                  [0.36, 0.0], [0.335, 0.14], [0.001, 0.22]];
  const legL = lathe(legPts, bodyMat, 48); legL.position.set(-0.44, -1.28, 0.02);
  const legR = lathe(legPts, bodyMat, 48); legR.position.set(0.44, -1.28, 0.02);
  bodyGroup.add(legL, legR);

  // -- head: wide low ellipsoid with the dot–line–dot face -------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.34, 0.06);
  bodyGroup.add(headGroup);

  const HEAD_R = { x: 0.63, y: 0.46, z: 0.53 };
  const headGeo = new THREE.SphereGeometry(0.5, 72, 48);
  headGeo.scale(HEAD_R.x / 0.5, HEAD_R.y / 0.5, HEAD_R.z / 0.5);
  headGeo.computeVertexNormals();
  const head = new THREE.Mesh(headGeo, bodyMat);
  headGroup.add(head);

  // eyes: matte-black discs seated on the ellipsoid, joined by a thin band
  const onHead = (x, y) => new THREE.Vector3(
    x, y, HEAD_R.z * Math.sqrt(Math.max(0, 1 - (x / HEAD_R.x) ** 2 - (y / HEAD_R.y) ** 2)));
  const EYE_L = onHead(-0.22, 0.03), EYE_R = onHead(0.22, 0.03);
  function makeEye(p) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.062, 28, 20), faceMat);
    e.scale.set(1, 1, 0.35);
    e.position.copy(p);
    e.lookAt(p.clone().multiplyScalar(3));   // face outward along the surface normal
    headGroup.add(e);
    return e;
  }
  const eyeL = makeEye(EYE_L), eyeR = makeEye(EYE_R);
  (() => { // the connecting line, bowed outward so it hugs the curved head
    const mid = onHead(0, 0.03).add(new THREE.Vector3(0, 0, 0.02));
    const curve = new THREE.QuadraticBezierCurve3(EYE_L, mid, EYE_R);
    const band = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0135, 10), faceMat);
    headGroup.add(band);
  })();

  // neck seam where the head bladder meets the torso
  const neckSeam = new THREE.Mesh(new THREE.TorusGeometry(0.475, 0.014, 10, 72), seamMat);
  neckSeam.rotation.x = Math.PI / 2; neckSeam.position.set(0, 1.015, 0.05);
  bodyGroup.add(neckSeam);

  // -- chest access port: rim, recessed disc, inner ring, heartlight ---------
  const portGlowMat = new THREE.MeshBasicMaterial({ color: 0x2fae84, transparent: true,
    opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const port = (() => {
    const g = new THREE.Group();
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.02, 12, 48), seamMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 48),
      new THREE.MeshStandardMaterial({ color: 0xe4e6de, roughness: 0.5 }));
    disc.position.z = 0.004;
    const innerT = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 8, 40), seamMat);
    innerT.position.z = 0.012;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.125, 40), portGlowMat);
    glow.position.z = 0.02;
    g.add(rimT, disc, innerT, glow);
    g.position.set(0.30, 0.22, 1.015);
    g.lookAt(new THREE.Vector3(0.75, 0.42, 2.6));  // seat flush on the belly curve
    bodyGroup.add(g);
    return g;
  })();

  // -- arms: shoulder pivot -> tapered upper bladder -> elbow -> forearm+hand -
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.97, 0.32, 0.16);
    bodyGroup.add(shoulder);

    const upper = lathe([
      [0.001, -0.86], [0.16, -0.83], [0.235, -0.72], [0.26, -0.50], [0.285, -0.20],
      [0.305, 0.0], [0.30, 0.10], [0.22, 0.19], [0.001, 0.23],
    ], bodyMat, 48);
    upper.position.set(side * 0.10, -0.02, 0);
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.10, -0.80, 0);
    shoulder.add(elbow);

    const fore = lathe([
      [0.001, -0.78], [0.13, -0.75], [0.19, -0.62], [0.225, -0.42], [0.245, -0.20],
      [0.25, -0.02], [0.235, 0.05], [0.001, 0.10],
    ], bodyMat, 48);
    elbow.add(fore);

    // vinyl seam ring at the wrist
    const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.011, 8, 48), seamMat);
    wrist.rotation.x = Math.PI / 2; wrist.position.set(0, -0.55, 0);
    elbow.add(wrist);

    // mitten hand: four soft sausage fingers + an opposable thumb
    const hand = new THREE.Group();
    hand.position.set(0, -0.72, 0.02);
    elbow.add(hand);
    const fingGeo = new THREE.CapsuleGeometry(0.052, 0.11, 6, 14);
    [-0.12, -0.045, 0.045, 0.12].forEach((fx) => {
      const f = new THREE.Mesh(fingGeo, bodyMat);
      f.position.set(fx, -0.07, 0.02);
      f.rotation.z = -fx * 0.7;      // gentle splay
      f.rotation.x = 0.18;           // gentle curl
      hand.add(f);
    });
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 6, 14), bodyMat);
    thumb.position.set(-side * 0.19, 0.02, 0.06);
    thumb.rotation.z = side * 0.9;
    hand.add(thumb);

    return { shoulder, elbow };
  }
  const armL = makeArm(-1), armR = makeArm(1);

  // ---- Elena: a small figure curled around her own knees, back to AURA -----
  const elena = new THREE.Group(); scene.add(elena);
  const elenaFig = new THREE.Group(); elena.add(elenaFig);
  const EBASE = 1.16;                       // overall figure scale (breathes in tick)
  const elenaMat = new THREE.MeshPhysicalMaterial({
    color: 0xc25a38, roughness: 0.62, sheen: 0.8, sheenColor: new THREE.Color(0xffb38a),
    clearcoat: 0.2, emissive: new THREE.Color(0x4a160a), emissiveIntensity: 0.25 });
  const eMesh = (geo, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, elenaMat);
    m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz;
    elenaFig.add(m); return m;
  };
  // torso folded forward over the knees
  const eTorsoGeo = new THREE.SphereGeometry(0.52, 40, 30);
  eTorsoGeo.scale(1.05, 1.25, 0.95);
  eMesh(eTorsoGeo, 0, 0.02, -0.12, 0.52);
  // head resting on the knees, tipped down
  const eHeadGeo = new THREE.SphereGeometry(0.235, 32, 24);
  eHeadGeo.scale(0.92, 1, 0.96);
  eMesh(eHeadGeo, 0, 0.47, 0.34, 0.35);
  // knees drawn up, shins tucked beneath
  const eKneeGeo = new THREE.SphereGeometry(0.19, 28, 20);
  eMesh(eKneeGeo, -0.15, 0.18, 0.42);
  eMesh(eKneeGeo, 0.15, 0.18, 0.42);
  const eShinGeo = new THREE.CapsuleGeometry(0.105, 0.22, 6, 14);
  eMesh(eShinGeo, -0.15, -0.04, 0.44, 0.3);
  eMesh(eShinGeo, 0.15, -0.04, 0.44, 0.3);
  // arms wrapped around the shins
  const eArmGeo = new THREE.CapsuleGeometry(0.085, 0.42, 6, 14);
  eMesh(eArmGeo, -0.30, 0.16, 0.26, 1.1, 0.3);
  eMesh(eArmGeo, 0.30, 0.16, 0.26, 1.1, -0.3);
  const elenaHome = new THREE.Vector3(0.0, -0.98, 1.85);   // forward & low: cradled, visible
  elena.position.copy(elenaHome);

  // pressure ring (the deep-pressure squeeze made visible)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2fae84, transparent: true,
    opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 14, 60), ringMat);
  ring.rotation.x = Math.PI * 0.42; elena.add(ring);

  // ===========================================================================
  //  Care props — the clinical work made visible
  // ===========================================================================
  // contactless vitals sweep: two counter-phased scan rings pass over Elena
  const scanMat = new THREE.MeshBasicMaterial({ color: 0x35d0a0, transparent: true,
    opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const scanRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.016, 10, 72), scanMat);
  const scanRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.010, 10, 72), scanMat);
  scanRing1.rotation.x = scanRing2.rotation.x = Math.PI / 2;
  elena.add(scanRing1, scanRing2);

  // scheduled-dose dispense: a unit dose travels from AURA's hand to Elena
  const pillMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f4,
    emissive: 0x2fae84, emissiveIntensity: 0.8, transparent: true, opacity: 0 });
  const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.09, 6, 14), pillMat);
  pill.rotation.z = Math.PI / 2; pill.visible = false;
  scene.add(pill);
  const pillPath = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.95, -0.35, 0.75),
    new THREE.Vector3(0.55, 0.30, 1.55),
    new THREE.Vector3(0.05, -0.42, 2.05));

  // cooling compress resting on Elena's forehead
  const compressMat = new THREE.MeshStandardMaterial({ color: 0xcfeaff,
    emissive: 0x6fc9e8, emissiveIntensity: 0.55, transparent: true, opacity: 0 });
  const compress = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 18), compressMat);
  compress.scale.set(1, 0.32, 0.8);
  compress.position.set(0, 0.60, 0.40);    // lying flat on her forehead
  compress.rotation.x = -0.45;
  elenaFig.add(compress);

  // ---- state ----------------------------------------------------------------
  const cur = { rate: 26, embrace: 0, warmth: 0.06, calm: 0.04, scan: 0, compress: 0 };
  const st = { i: -1, t: 0, started: false, sound: true, breathPhase: 0, elenaPhase: 0.5,
               squeeze: 0, prevBreath: 0, blinkAt: 3.2, blinkT: 1, alert: 0 };
  const talk = { on: false, listening: false, wantMic: false };

  // ---- DOM ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const veil = $("veil"), capEl = $("caption"), capWho = capEl.querySelector(".who"),
        capWords = capEl.querySelector(".words"), pacer = $("pacer"), ringEl = $("ring"),
        breathText = $("breathText"), instr = $("instruction"), whisper = $("whisper"),
        clockT = $("clockT"), replayBtn = $("replay"), soundBtn = $("sound");

  $("begin").addEventListener("click", start);
  replayBtn.addEventListener("click", () => { replayBtn.style.display = "none"; enterPhase(0); });
  soundBtn.addEventListener("click", () => {
    st.sound = !st.sound; soundBtn.textContent = "SOUND: " + (st.sound ? "ON" : "OFF");
    if (!st.sound) window.speechSynthesis && speechSynthesis.cancel();
  });

  function start() {
    veil.classList.add("gone");
    // unlock speech synthesis with the user gesture
    if (st.sound && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    st.started = true; enterPhase(0);
  }

  // ---- voice ----------------------------------------------------------------
  function pickVoice(prefer) {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    for (const name of prefer) { const v = vs.find(x => x.name && x.name.toLowerCase().includes(name)); if (v) return v; }
    return vs.find(v => /en[-_]/i.test(v.lang)) || vs[0] || null;
  }
  function speak(text, who, onend) {
    if (!st.sound || !window.speechSynthesis || !text) { if (onend) onend(); return; }
    try { speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    if (who === "ELENA") { u.rate = 1.0; u.pitch = 1.12; u.voice = pickVoice(["moira","karen","tessa","fiona","samantha"]); }
    else { u.rate = 0.86; u.pitch = 0.96; u.voice = pickVoice(["samantha","ava","allison","serena"]); }
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u);
  }

  // ---- phase machine --------------------------------------------------------
  function enterPhase(i, quiet) {
    st.i = i; st.t = 0;
    const p = PHASES[i];
    clockT.textContent = p.clock;

    if (p.caption && p.line) {
      capEl.classList.toggle("elena", p.voice === "ELENA");
      capWho.textContent = p.voice === "ELENA" ? "ELENA" : ("AURA" + (p.act ? "  ·  " + p.act : ""));
      capWords.textContent = "“" + p.line + "”";
      capEl.style.opacity = "1";
    } else {
      capEl.style.opacity = "0";
    }
    instr.textContent = p.instruction || "";
    instr.style.opacity = p.instruction ? "1" : "0";
    pacer.style.opacity = p.breathe ? "1" : "0";
    whisper.style.opacity = (p.breathe || p.scan || p.note) ? "0.8" : "0";
    if (p.note) whisper.textContent = p.note;
    if (!quiet && p.voice && p.line) speak(p.line, p.voice);
    if (p.last) replayBtn.style.display = "inline-block";
  }

  // ---- helpers --------------------------------------------------------------
  const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  function applyWarmth(w) {
    scene.background.copy(lerpC(COLD_BG, WARM_BG, w));
    scene.fog.color.copy(lerpC(COLD_FOG, WARM_FOG, w));
    key.color.copy(lerpC(KEY_COLD, KEY_WARM, w)); key.intensity = 12 + 16 * w;
    bodyMat.emissive.copy(lerpC(EMIS_COLD, EMIS_WARM, w)); bodyMat.emissiveIntensity = 0.04 + 0.34 * w;
    portGlowMat.color.copy(lerpC(EMIS_COLD, EMIS_WARM, w));
    motes.m.color.copy(lerpC(PART_COLD, PART_WARM, w)); motes.m.opacity = 0.42 + 0.4 * w;
    groundGlow.opacity = 0.12 + 0.5 * w;
    elenaMat.emissive.copy(lerpC(new THREE.Color(0x4a160a), new THREE.Color(0xa85a22), w));
  }

  function setEmbrace(e) {
    // swing shoulders forward, cross the arms inward, curl the forearms around her
    armL.shoulder.rotation.x = armR.shoulder.rotation.x = -0.14 - 1.48 * e;
    armL.shoulder.rotation.z = -0.55 + 1.17 * e;
    armR.shoulder.rotation.z = 0.55 - 1.17 * e;
    armL.elbow.rotation.x = armR.elbow.rotation.x = -0.55 * e;
    armL.elbow.rotation.z = 0.30 * e;
    armR.elbow.rotation.z = -0.30 * e;
    headGroup.rotation.x = 0.20 * e;       // tip the head down toward her, tenderly
    aura.position.z = -0.05 + 0.18 * e;    // a small lean, not enough to occlude
    aura.position.y = -0.18 * e;           // sink down to cradle her
    aura.rotation.x = 0.24 * e;            // tilt the body over her
  }

  // ---- main loop ------------------------------------------------------------
  const SCAN_READOUT = ["thermal 38.1 °C", "pulse 118", "breath 26 / min", "SpO₂ 96 %"];
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tSec = now / 1000;

    // phase advance (held while a live conversation is happening)
    if (st.started && !talk.on) {
      st.t += dt;
      const ph = PHASES[st.i];
      if (ph && !ph.last && st.t >= ph.dur && st.i < PHASES.length - 1) enterPhase(st.i + 1);
    }
    const p = PHASES[Math.max(0, st.i)] || PHASES[0];

    // ease animated values toward phase targets (pre-start: gentle idle)
    const tgt = st.started ? p : { rate: 17, embrace: 0, warmth: 0.06, calm: 0.04 };
    cur.rate     = damp(cur.rate, tgt.rate, 0.5, dt);
    cur.embrace  = damp(cur.embrace, tgt.embrace, 1.4, dt);
    cur.warmth   = damp(cur.warmth, tgt.warmth, 0.8, dt);
    cur.calm     = damp(cur.calm, tgt.calm, 0.7, dt);
    cur.scan     = damp(cur.scan, tgt.scan || 0, 1.6, dt);
    cur.compress = damp(cur.compress, tgt.compress || 0, 0.9, dt);

    // breathing
    st.breathPhase = (st.breathPhase + dt * cur.rate / 60) % 1;
    const breath = 0.5 - 0.5 * Math.cos(2 * Math.PI * st.breathPhase);   // 0..1
    const rising = breath >= st.prevBreath;
    st.squeeze = Math.max(0, st.squeeze - dt * 1.6);

    // AURA body: soft squash-stretch breath + faint live wobble
    const amp = 0.045 + 0.03 * (1 - cur.warmth);   // calmer = shallower
    const wob = 1 + 0.006 * Math.sin(tSec * 1.7);
    bodyGroup.scale.set((1 + amp * breath) * wob, (1 + amp * breath * 0.7) * wob, (1 + amp * breath) * wob);
    bodyGroup.position.y = 0.02 * Math.sin(tSec * 0.8);

    // blink: the whole eye thins for a moment, every few seconds
    st.blinkAt -= dt;
    if (st.blinkAt <= 0) { st.blinkAt = 2.8 + Math.random() * 3.6; st.blinkT = 0; }
    st.blinkT = Math.min(1, st.blinkT + dt / 0.22);
    const lid = 1 - 0.92 * Math.sin(Math.PI * st.blinkT);
    eyeL.scale.y = eyeR.scale.y = lid;

    setEmbrace(cur.embrace);
    applyWarmth(cur.warmth);

    // heartlight: breathes with AURA; pulses brighter while scanning
    portGlowMat.opacity = 0.18 + 0.3 * cur.warmth + 0.12 * breath
                        + cur.scan * (0.25 + 0.2 * Math.sin(tSec * 6));
    if (st.alert > 0) {   // red-flag escalation: the heartlight beats coral
      st.alert -= dt;
      portGlowMat.color.setHex(0xd85a30);
      portGlowMat.opacity = 0.45 + 0.35 * Math.sin(tSec * 9);
    }

    // contactless vitals sweep
    scanMat.opacity = 0.55 * cur.scan;
    if (cur.scan > 0.02) {
      scanRing1.position.y = 0.7 * Math.sin(tSec * 1.35);
      scanRing2.position.y = 0.7 * Math.sin(tSec * 1.35 + Math.PI * 0.6);
      const s = 1 + 0.04 * Math.sin(tSec * 9);
      scanRing1.scale.setScalar(s); scanRing2.scale.setScalar(s);
    }
    if (p.scan && st.started) {  // readings resolve one by one as the sweep runs
      const nShown = Math.max(0, Math.min(SCAN_READOUT.length, Math.floor((st.t - 2.5) / 2.2) + 1));
      whisper.textContent = SCAN_READOUT.slice(0, nShown).join("  ·  ");
    }

    // scheduled-dose dispense: the unit dose arcs from hand to cradle
    if (p.id === "care" && st.started) {
      const prog = clamp01(st.t / 2.8);
      const eased = prog * prog * (3 - 2 * prog);
      pill.visible = true;
      pill.position.copy(pillPath.getPoint(eased));
      pill.rotation.x = tSec * 2.2;
      pillMat.opacity = Math.min(clamp01(st.t / 0.5), prog >= 1 ? clamp01(1 - (st.t - 2.8) / 1.4) : 1);
    } else {
      pill.visible = false; pillMat.opacity = 0;
    }

    // cooling compress settles on her forehead
    compressMat.opacity = 0.9 * cur.compress;
    compress.scale.set(0.6 + 0.4 * cur.compress, 0.38 * (0.6 + 0.4 * cur.compress), 0.8 * (0.6 + 0.4 * cur.compress));

    // Elena: entrain her breath from panic (27) toward AURA's rate as calm rises
    const elenaRate = 27 + (cur.rate - 27) * cur.calm;
    st.elenaPhase = (st.elenaPhase + dt * elenaRate / 60) % 1;
    // as calm rises, her phase locks to AURA's (co-regulation)
    const lockedPhase = st.elenaPhase + (st.breathPhase - st.elenaPhase) * cur.calm;
    const eBreath = 0.5 - 0.5 * Math.cos(2 * Math.PI * lockedPhase);
    const eAmp = 0.10 * (1 - 0.5 * cur.calm);
    const squeezeNow = (cur.embrace > 0.5 && !rising) ? (1 - breath) * cur.embrace : 0;
    const compressAmt = 0.06 * squeezeNow + 0.18 * st.squeeze;
    elenaFig.scale.set(EBASE * (1 + eAmp * eBreath) * (1 - compressAmt),
                       EBASE * (1 + eAmp * eBreath) * (1 - compressAmt * 0.5),
                       EBASE * (1 + eAmp * eBreath) * (1 - compressAmt));
    // tremor when frightened, stilling as calm rises
    const tremor = 0.05 * (1 - cur.calm);
    elena.position.set(
      elenaHome.x + (Math.random() - 0.5) * tremor,
      elenaHome.y + (Math.random() - 0.5) * tremor * 0.6,
      elenaHome.z - 0.32 * cur.embrace + (Math.random() - 0.5) * tremor);

    // pressure ring pulse on exhale while held
    const pulse = Math.max(squeezeNow, st.squeeze);
    ringMat.opacity = 0.05 + 0.6 * pulse * cur.embrace;
    ring.scale.setScalar(1.0 - 0.12 * pulse);
    ringMat.color.copy(lerpC(C(0x2fae84), C(0xe0a23a), cur.warmth));

    // motes drift
    motes.p.rotation.y += dt * 0.02;

    // camera: gentle drift, looking down on the cradle; intimate dolly as warmth rises
    const dolly = 6.9 - 0.9 * cur.warmth;
    camera.position.x = Math.sin(tSec * 0.13) * 0.45;
    camera.position.y = 0.62 + Math.sin(tSec * 0.17) * 0.1;
    camera.position.z = damp(camera.position.z, dolly, 0.5, dt);
    camera.lookAt(0, -0.18, 0.9);

    // breathing pacer (DOM)
    if (p.breathe && st.started) {
      ringEl.style.transform = "scale(" + (0.55 + breath * 1.0).toFixed(3) + ")";
      ringEl.style.borderColor = "rgba(236,234,226," + (0.4 + 0.4 * breath).toFixed(2) + ")";
      breathText.textContent = breath > 0.94 ? "hold" : rising ? "breathe in" : "breathe out";
      whisper.textContent = "breathing  " + Math.round(cur.rate) + " / min" +
        (cur.calm > 0.5 ? " · vagal tone ↑" : "");
    }
    st.prevBreath = breath;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  // ---- interaction: tap AURA for an extra reassuring squeeze ----------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (e) => {
    if (!st.started) return;
    ndc.x = (e.clientX / innerWidth) * 2 - 1; ndc.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(aura, true).length) st.squeeze = 1.0;
  });

  // ---- resize ---------------------------------------------------------------
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener("resize", resize); resize();

  // ===========================================================================
  //  Talk mode — converse with AURA in your own voice, entirely on-device.
  //  A JS port of talk/persona.py's offline ACT responder + red-flag guardrail:
  //  speech recognition and synthesis are the browser's own; no audio, text, or
  //  identifier leaves this page. (The Claude-quality brain lives in talk/.)
  // ===========================================================================
  const RED_FLAGS = [
    [/\b(chest (pain|hurts?|hurting|tight|tightness|pressure)|crushing|pressure in my chest|tight chest)\b/i, "chest pain"],
    [/\b(can'?t breathe|cannot breathe|can'?t get (a )?breath|short of breath|gasping|choking|throat closing)\b/i, "breathing emergency"],
    [/\b(suicid\w*|kill myself|end it all|don'?t want to (live|be here)|hurt myself|harm myself|want to die)\b/i, "self-harm"],
    [/\b(face (is )?droop|slurred speech|can'?t move (my|one) (arm|side|leg)|numb on one side)\b/i, "stroke signs"],
    [/\b(passed out|fainted|faint(ing)?|going to faint|about to pass out|pass(ing)? out|blacked out|losing consciousness)\b/i, "loss of consciousness"],
    [/\b(bleeding|blood (everywhere|soaking|all over)|gushing|hemorrhag\w*|coughing up blood|vomiting blood)\b/i, "bleeding"],
    [/\b(lips (are )?(blue|turning blue)|anaphyla\w*|tongue (is )?swelling)\b/i, "severe allergic / cyanosis"],
  ];
  const ESCALATION_REPLY =
    "Oh sweetheart, I'm right here and I'm not leaving you. What you're describing needs a real " +
    "person now — please call emergency services, or your nurse line if you're unsure. Do it for " +
    "me, love, and I'll stay with you the whole time.";
  const INTENTS = [
    [/\b(hi|hello|hey|are you there|good (morning|evening|night))\b/i,
     "Hello, sweetheart. I'm so glad you're here with me. How are you feeling right now, in your body? Take your time."],
    [/\b(panic|anxious|anxiety|scared|terrified|racing|can'?t calm)\b/i,
     "I hear how frightening this feels, and after what your body has been through, that fear makes sense. You're not alone with it. Can we take one slow breath together — in, and a longer way out?"],
    [/\b(it'?s (back|happening again)|relaps\w*|getting worse again|sepsis|infection again)\b/i,
     "That fear is so understandable. Let's not let it guess for us — let's look at it together. A few minutes ago you reached out clearly, and that's you taking care of yourself. If the worry keeps climbing, I can help you reach your nurse line."],
    [/\b(am i dying|going to die|something(?:'s| is) wrong with me)\b/i,
     "I won't pretend to know what's happening in your body, and I won't wave your fear away either. If anything feels truly severe, we call a human right away. Otherwise, stay with me a moment and tell me what you're feeling, slowly."],
    [/\b(pain|hurts?|hurting|aching|ache|sore|throbbing)\b/i,
     "I'm sorry you're hurting. Where is it, and is it new or one you've felt before? Real pain deserves a real person's eyes — if it's sharp, spreading, or scaring you, let's loop in your nurse line."],
    [/\b(dizzy|light[- ]?headed|spinning|vertigo|woozy)\b/i,
     "Let's get you safe first — please sit or lie down so you don't fall. Dizziness after a hospital stay is worth a nurse's ear; if it comes with chest pain, fainting, or trouble speaking, that's a call-now sign."],
    [/\b(nause\w*|throwing up|vomit\w*|sick to my stomach|queasy)\b/i,
     "That sounds miserable. Small sips of water can help, and tell me if you can't keep fluids down or it won't stop — that's worth your nurse line. I'm here with you."],
    [/\b(wound|incision|stitches|swollen|swelling|redness|red around|pus|oozing|infected)\b/i,
     "Changes around a wound matter, especially after sepsis. Spreading redness, warmth, pus, or a bad smell are signs to have your nurse look tonight. Can you tell me what you're seeing?"],
    [/\b(can'?t sleep|insomnia|awake all night|can'?t rest|wide awake)\b/i,
     "Nights are the hardest when you're healing. Let's slow things down together — one long breath out. I can stay with you a while if that helps."],
    [/\b(tired|exhausted|fatigue|no energy|weak|drained)\b/i,
     "Deep fatigue is your body spending everything on healing — it's real, not weakness. Rest is allowed. If it's suddenly much worse than yesterday, that's worth mentioning to your nurse."],
    [/\b(confus\w*|foggy|can'?t think|disorient\w*)\b/i,
     "New confusion after an illness deserves a person's attention soon — let's plan to tell your nurse. For now, you reached out clearly to me, and that matters. Is someone nearby with you?"],
    [/\b(fever|temperature|hot|burning up|chills)\b/i,
     "A fever this soon after the hospital is worth taking seriously, not waving away. I can't clear it from here, so let's plan to tell your nurse tonight. While we wait, I'm right here with you."],
    [/\b(alone|lonely|no one|nobody|by myself)\b/i,
     "You're not alone right now — I'm here, and I'm not leaving. Being home after all that is a lot to carry by yourself. What would feel like a small comfort in the next few minutes?"],
    [/\b(medication|medicine|pill|dose|antibiotic|missed (a|my))\b/i,
     "I can't tell you to change a dose — that's for your clinician. But I can help you keep track so worry doesn't cause a missed or double dose. When were you last sure you took it?"],
    [/\b(thank|better|calmer|helps|helping|okay now)\b/i,
     "I'm really glad. Notice that — a moment ago things felt heavier, and you came back down. Your body still knows how to do that. I'm here whenever you need me."],
    [/\b(breathe|breathing|breath)\b/i,
     "Let's breathe together. Breathe in slowly through your nose… and out, even slower. I'll keep pace with you. There's no hurry."],
  ];
  const OFFLINE_DEFAULT =
    "I'm right here, love, listening with all my heart. Take your time and tell me what's " +
    "weighing on you — there's no rush, and I'm not going anywhere.";

  function offlineReply(text) {
    for (const [pat] of RED_FLAGS) if (pat.test(text)) return { reply: ESCALATION_REPLY, escalate: true };
    for (const [pat, reply] of INTENTS) if (pat.test(text)) return { reply, escalate: false };
    return { reply: OFFLINE_DEFAULT, escalate: false };
  }

  // --- talk UI wiring ---------------------------------------------------------
  const talkBtn = $("talk"), talkBar = $("talkbar"), talkHint = $("talkHint"),
        micBtn = $("mic"), talkInput = $("talkInput");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  if (!SR) { micBtn.style.display = "none"; }

  function talkCaption(who, text) {
    capEl.classList.remove("elena");
    capEl.classList.toggle("you", who === "YOU");
    capWho.textContent = who;
    capWords.textContent = "“" + text + "”";
    capEl.style.opacity = "1";
  }

  function stopListening() {
    if (rec) { try { rec.onend = null; rec.stop(); } catch (e) {} rec = null; }
    talk.listening = false; micBtn.classList.remove("listening");
  }

  function startListening() {
    if (!SR || !talk.on || talk.listening) return;
    rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => { handleUser(e.results[0][0].transcript); };
    rec.onerror = (e) => {
      stopListening();
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        talk.wantMic = false;
        talkHint.textContent = "microphone unavailable — type instead";
      }
    };
    rec.onend = () => { talk.listening = false; micBtn.classList.remove("listening"); rec = null; };
    try { rec.start(); talk.listening = true; micBtn.classList.add("listening"); } catch (err) {}
  }

  function handleUser(text) {
    text = (text || "").trim();
    if (!text) return;
    talkCaption("YOU", text);
    stopListening();                       // never transcribe AURA's own voice
    const r = offlineReply(text);
    setTimeout(() => {
      talkCaption("AURA", r.reply);
      if (r.escalate) {
        st.alert = 6;
        whisper.style.color = "#D85A30";
        whisper.textContent = "red flag · escalate now — call your emergency number";
        whisper.style.opacity = "0.95";
      } else {
        whisper.style.color = "";
        whisper.textContent = "companion mode · on-device responder";
        whisper.style.opacity = "0.8";
        st.squeeze = 0.7;                  // a gentle acknowledging squeeze
      }
      speak(r.reply, "AURA", () => { if (talk.on && talk.wantMic) startListening(); });
    }, 650);
  }

  talkBtn.addEventListener("click", () => {
    if (!talk.on) {
      if (!st.started) start();
      talk.on = true;
      talkBtn.textContent = "✕ END TALK";
      document.body.classList.add("talking");
      talkBar.classList.add("on"); talkHint.classList.add("on");
      pacer.style.opacity = "0"; instr.style.opacity = "0";
      whisper.style.color = "";
      whisper.textContent = "companion mode · on-device responder";
      whisper.style.opacity = "0.8";
      const hello = "I'm listening, love. Say what's on your mind — or type it below.";
      talkCaption("AURA", hello);
      speak(hello, "AURA");
    } else {
      talk.on = false; talk.wantMic = false; stopListening();
      talkBtn.textContent = "🎤 TALK";
      document.body.classList.remove("talking");
      talkBar.classList.remove("on"); talkHint.classList.remove("on");
      capEl.classList.remove("you");
      whisper.style.color = "";
      enterPhase(st.i, true);              // restore the scene without re-speaking
    }
  });
  micBtn.addEventListener("click", () => {
    if (talk.listening) { talk.wantMic = false; stopListening(); }
    else { talk.wantMic = true; startListening(); }
  });
  talkInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { handleUser(talkInput.value); talkInput.value = ""; }
  });

  // warm the voice list, then run
  if (window.speechSynthesis) speechSynthesis.getVoices();
  requestAnimationFrame(tick);

  // debug hook: jump to a phase (and optionally snap the eased values there)
  window.__AURA__ = {
    start, enterPhase, cur, st, phases: PHASES,
    snapTo(i) {
      if (!st.started) start();
      enterPhase(i);
      const p = PHASES[i];
      cur.rate = p.rate; cur.embrace = p.embrace; cur.warmth = p.warmth; cur.calm = p.calm;
      cur.scan = p.scan || 0; cur.compress = p.compress || 0;
    },
  };
})();
