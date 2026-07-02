/* AURA talk — a soft 3D companion you speak to (Three.js, global THREE r149).
 * Voice in (Web Speech recognition) + voice out (speech synthesis), with a typed
 * fallback. The body reacts: idle breathing, listening, thinking, speaking.
 */
(function () {
  "use strict";

  // ---------- calming environment ----------
  // A serene dawn-gradient world (soft sky, warm horizon glow, drifting light,
  // distant hills) in the spirit of VR calm apps like Tripp, Healium and Calm.
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x2a1d33, 0.045);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0.2, 6.2);

  // dawn-gradient sky (enveloping sphere shader)
  const skyUniforms = {
    uTop:{ value:new THREE.Color(0x141235) }, uMid:{ value:new THREE.Color(0x4a2a55) },
    uHorizon:{ value:new THREE.Color(0xe79a6b) }, uTime:{ value:0 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 40, 40), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false, uniforms: skyUniforms,
    vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "varying vec3 vP; uniform vec3 uTop,uMid,uHorizon; uniform float uTime;" +
      "void main(){ float h=normalize(vP).y;" +
      " vec3 col=mix(uMid,uTop,smoothstep(0.05,0.85,h));" +
      " col=mix(uHorizon,col,smoothstep(-0.25,0.18,h));" +
      " col+=0.015*sin(uTime*0.25+vP.x*0.5); gl_FragColor=vec4(col,1.0); }"
  })));

  scene.add(new THREE.HemisphereLight(0xbca6ff, 0x3a2418, 0.55));
  const key = new THREE.PointLight(0xffd9a8, 18, 50, 2); key.position.set(2.6, 3.2, 3.6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9b6ff, 0.5); rim.position.set(-3, 1.2, -4); scene.add(rim);

  // soft radial sprite texture for glow + bokeh
  const softTex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128; const c = cv.getContext("2d");
    const g = c.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,"rgba(255,255,255,1)"); g.addColorStop(0.4,"rgba(255,255,255,0.45)"); g.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0,0,128,128); return new THREE.CanvasTexture(cv);
  })();

  // warm halo behind AURA (bloom-like glow)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:softTex, color:0xffcaa0,
    transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false }));
  halo.scale.set(11,11,1); halo.position.set(0, 0.4, -2); scene.add(halo);

  // distant hill silhouettes (depth + parallax)
  function hill(width, height, baseY, color, z){
    const s = new THREE.Shape(); s.moveTo(-width/2, -14); s.lineTo(-width/2, baseY);
    const steps = 48;
    for (let i=0;i<=steps;i++){ const x=-width/2+width*i/steps; const y=baseY+height*(0.5+0.5*Math.sin(i*0.45+z*1.7)); s.lineTo(x,y); }
    s.lineTo(width/2, -14); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.97 }));
    m.position.set(0, -3.2, z); scene.add(m); return m;
  }
  const hills = [ hill(60,1.6,0,0x2a1d44,-12), hill(54,1.1,0.5,0x18112e,-8) ];

  // two particle layers: fine dust + drifting glowing bokeh
  function particles(n, spread, size, color, op, glow){
    const pos = new Float32Array(n*3);
    for (let i=0;i<n;i++){ pos[i*3]=(Math.random()*2-1)*spread; pos[i*3+1]=(Math.random()*2-1)*spread*0.6; pos[i*3+2]=(Math.random()*2-1)*spread*0.5-1; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos,3));
    const m = new THREE.PointsMaterial({ size, color, map: glow?softTex:null, transparent:true,
      opacity:op, depthWrite:false, blending:THREE.AdditiveBlending });
    const p = new THREE.Points(g,m); scene.add(p); return p;
  }
  const dust = particles(420, 9, 0.05, 0xbfa9e0, 0.4, false);
  const bokeh = particles(70, 8, 0.5, 0xffd9a0, 0.5, true);
  const bokehPos = bokeh.geometry.attributes.position;

  // AURA
  const aura = new THREE.Group(); scene.add(aura);
  const TEAL = new THREE.Color(0x1d9e75), AMBER = new THREE.Color(0xe0a23a), CORAL = new THREE.Color(0xd85a30);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color:0xf3f4ef, roughness:0.5, sheen:1, sheenColor:new THREE.Color(0xffe6d0), clearcoat:0.35, clearcoatRoughness:0.55, emissive:TEAL.clone(), emissiveIntensity:0.08 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 48), bodyMat); aura.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 48, 36), bodyMat); head.position.set(0, 1.25, 0.12); aura.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.52, 36, 24), new THREE.MeshPhysicalMaterial({ color:0x0c0e12, roughness:0.15, clearcoat:1, metalness:0.2 }));
  visor.scale.set(1, 0.62, 0.42); visor.position.set(0, 1.27, 0.66); aura.add(visor);
  const eyeMat = new THREE.MeshStandardMaterial({ color:0x0a0a0a, emissive:TEAL.clone(), emissiveIntensity:1.4 });
  const eyeGeo = new THREE.SphereGeometry(0.085, 20, 16);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.18, 1.29, 0.93);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.18, 1.29, 0.93);
  aura.add(eyeL, eyeR);
  function arm(side){ const p=new THREE.Group(); p.position.set(side*1.05,0.05,0.2); const a=new THREE.Mesh(new THREE.CapsuleGeometry(0.26,1.3,10,18),bodyMat); a.position.set(side*0.12,-0.7,0); a.rotation.z=side*0.35; p.add(a); aura.add(p); return p; }
  arm(-1); arm(1);

  // ---------- state machine: idle | listening | thinking | speaking ----------
  const st = { mode:"idle", t:0, glow:0.08, eye:1.4, scaleK:0, speakAmp:0 };
  const stateEl = document.getElementById("state");
  const STATE_TEXT = { idle:"here with you", listening:"listening…", thinking:"…", speaking:"" };
  function setState(m){ st.mode=m; stateEl.textContent = STATE_TEXT[m] || ""; stateEl.style.opacity = m==="speaking" ? "0" : "0.7"; }

  let last = performance.now();
  function tick(now){
    const dt = Math.min(0.05, (now-last)/1000); last=now; st.t += dt;
    const damp=(a,b,l)=>a+(b-a)*(1-Math.exp(-l*dt));

    // targets per state
    let glowT=0.08, eyeT=1.3, leanT=0;
    if (st.mode==="listening"){ glowT=0.5; eyeT=2.4; }
    else if (st.mode==="thinking"){ glowT=0.3; eyeT=0.7; leanT=0.08; }
    else if (st.mode==="speaking"){ glowT=0.55; eyeT=2.0; }
    st.glow=damp(st.glow,glowT,3); st.eye=damp(st.eye,eyeT,4); st.scaleK=damp(st.scaleK,leanT,3);

    // breathing + speaking pulse
    const breath = 0.5-0.5*Math.cos(2*Math.PI*st.t/5.0);
    const speak = st.mode==="speaking" ? (0.5+0.5*Math.sin(st.t*14)) * st.speakAmp : 0;
    const s = 1 + 0.04*breath + 0.05*speak - 0.04*st.scaleK;
    aura.scale.set(s, 1+0.028*breath+0.04*speak - 0.03*st.scaleK, s);
    aura.position.y = -0.05 + 0.03*Math.sin(st.t*0.8) - 0.12*st.scaleK;
    aura.rotation.x = 0.18*st.scaleK;

    const col = st.mode==="speaking"||st.mode==="listening" ? TEAL : (st.mode==="thinking"?AMBER:TEAL);
    bodyMat.emissive.lerp(col, 0.1); bodyMat.emissiveIntensity = st.glow;
    eyeMat.emissive.lerp(col, 0.1); eyeMat.emissiveIntensity = st.eye + speak*1.5;

    // ambient calm motion
    skyUniforms.uTime.value = st.t;
    dust.rotation.y += dt*0.015;
    const bp = bokehPos.array;
    for (let i=1;i<bp.length;i+=3){ bp[i] += dt*0.12; if (bp[i] > 5) bp[i] = -5; }
    bokehPos.needsUpdate = true;
    const haloB = 1 + 0.06*breath + 0.10*speak;
    halo.scale.set(11*haloB, 11*haloB, 1);
    halo.material.opacity = 0.38 + 0.18*st.glow + 0.15*speak;
    hills.forEach((h,i)=>{ h.position.x = Math.sin(st.t*0.05)*(0.3+i*0.2); });
    camera.position.x = Math.sin(st.t*0.1)*0.3; camera.position.y = 0.2 + Math.sin(st.t*0.13)*0.08;
    camera.lookAt(0, 0.05, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  function resize(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); }
  addEventListener("resize", resize); resize(); requestAnimationFrame(tick);

  // ---------- conversation ----------
  const $ = (id)=>document.getElementById(id);
  const log = $("log"), escal = $("escal"), textInput = $("text"), micBtn = $("mic");
  const messages = [];   // {role, content}
  let busy = false;

  function addMsg(role, text){
    const d = document.createElement("div");
    d.className = "msg " + (role==="assistant" ? "aura" : "you");
    d.textContent = (role==="assistant" ? "" : "you · ") + text;
    log.appendChild(d);
    while (log.children.length > 4) log.removeChild(log.firstChild);
    return d;
  }

  function parseSSE(chunk){
    let ev = "message", data = "";
    for (const line of chunk.split("\n")){
      if (line.startsWith("event:")) ev = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    try { return { event: ev, data: data ? JSON.parse(data) : {} }; }
    catch(e){ return { event: ev, data: {} }; }
  }

  // voice + captions — each sentence's TEXT is revealed exactly as its VOICE
  // begins, so the transcript and the speech stay together. A generation id lets
  // a new turn or a barge-in cancel everything in flight.
  let genId = 0, chatAbort = null;
  let speakQueue = [], speakDone = true, curAudio = null, curBubble = null;

  function resetSpeech(){
    speakQueue = []; speakDone = true;
    if (curAudio){ try { curAudio.pause(); } catch(e){} curAudio = null; }
    st.speakAmp = 0;
  }
  function interrupt(){            // barge-in: drop whatever AURA is doing
    genId++; resetSpeech();
    if (chatAbort){ try { chatAbort.abort(); } catch(e){} chatAbort = null; }
  }

  // fetch audio for `text` and play it; resolve when it ends
  function playTTS(text, myGen, voice){
    return new Promise(async (resolve)=>{
      let url = null;
      try {
        const r = await fetch("/api/tts", { method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify(voice ? { text, voice } : { text }) });
        if (r.ok) url = URL.createObjectURL(await r.blob());
      } catch(e){}
      if (myGen !== genId){ if (url) URL.revokeObjectURL(url); return resolve(false); }
      if (!url) return resolve(false);
      const a = new Audio(url); curAudio = a;
      a.onended = ()=>{ URL.revokeObjectURL(url); if (curAudio===a) curAudio = null; resolve(true); };
      a.onerror = ()=>{ URL.revokeObjectURL(url); resolve(false); };
      a.play().catch(()=>resolve(false));
    });
  }
  function revealInto(bubble, text){
    if (bubble) bubble.textContent = (bubble.textContent ? bubble.textContent + " " : "") + text;
  }

  async function speakWorker(myGen){
    while (myGen === genId){
      if (speakQueue.length === 0){ if (speakDone) break; await new Promise(r=>setTimeout(r,60)); continue; }
      const sentence = speakQueue.shift();
      st.speakAmp = 1; setState("speaking");
      revealInto(curBubble, sentence);   // text appears as the voice starts
      await playTTS(sentence, myGen);
      st.speakAmp = 0;
    }
    if (myGen === genId && speakQueue.length === 0) setState("idle");
  }

  function queueSentences(full, cur, final){
    const rest = full.slice(cur.upto);
    const re = /[^.!?…]*[.!?…]+/g; let m, last = 0;
    while ((m = re.exec(rest))){ const s = m[0].trim(); if (s) speakQueue.push(s); last = re.lastIndex; }
    cur.upto += last;
    if (final){ const tail = full.slice(cur.upto).trim(); if (tail) speakQueue.push(tail); cur.upto = full.length; }
  }

  function sayLine(text){             // one-off spoken line (greeting)
    interrupt(); const myGen = ++genId;
    curBubble = addMsg("assistant","");
    speakQueue = [text]; speakDone = true; speakWorker(myGen);
  }

  // resolves once AURA has finished speaking the whole reply (used by the demo)
  function awaitSpoken(myGen){
    return new Promise((res)=>{ const iv=setInterval(()=>{
      if (myGen!==genId || (speakDone && speakQueue.length===0 && !curAudio)){ clearInterval(iv); res(); }
    }, 120); });
  }

  async function send(text, opts){
    text = (text||"").trim(); if (!text) return;
    opts = opts || {};
    interrupt(); const myGen = ++genId;
    chatAbort = new AbortController();
    speakQueue = []; speakDone = false;
    textInput.value = "";
    messages.push({ role:"user", content:text });
    if (!opts.userShown) addMsg("user", text);
    curBubble = null;                  // the reply bubble is created on first token
    setState("thinking");
    speakWorker(myGen);
    const cur = { upto: 0 };

    let full = "", meta = {};
    try {
      const r = await fetch("/api/chat/stream", { method:"POST", signal: chatAbort.signal,
        headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ messages }) });
      if (!r.ok || !r.body) throw new Error("no stream");
      const reader = r.body.getReader(), dec = new TextDecoder(); let sb = "";
      for (;;){
        const { value, done } = await reader.read(); if (done) break;
        if (myGen !== genId) return;
        sb += dec.decode(value, { stream:true });
        let i;
        while ((i = sb.indexOf("\n\n")) >= 0){
          const ev = parseSSE(sb.slice(0, i)); sb = sb.slice(i + 2);
          if (ev.event === "delta"){ full += ev.data.t || ""; if (!curBubble) curBubble = addMsg("assistant",""); queueSentences(full, cur, false); }
          else if (ev.event === "meta") meta = ev.data;
        }
      }
    } catch(e){
      if (myGen !== genId) return;
      try {
        const r2 = await fetch("/api/chat", { method:"POST",
          headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ messages }) });
        const d = await r2.json(); full = d.reply || ""; meta = d;
      } catch(e2){ full = "I'm having a little trouble, sweetheart, but I'm still right here. Try once more."; }
      if (!curBubble) curBubble = addMsg("assistant","");
    }

    if (myGen !== genId) return;
    if (!full) full = "I'm right here with you.";
    messages.push({ role:"assistant", content:full });
    if (meta.escalate) showEscalation(); else escal.style.display = "none";
    queueSentences(full, cur, true);   // flush the final sentence
    speakDone = true;                  // worker drains the queue, then goes idle
    chatAbort = null;
    await awaitSpoken(myGen);
  }

  // ---------- self-running demo: a simulated user (Elena) talks with AURA ------
  const DEMO_LINES = [
    "AURA? I woke up and my heart is racing. I think the infection is coming back.",
    "The thermometer said thirty-eight. It's happening again, isn't it?",
    "Okay... the breathing helps. Will you stay with me?",
    "I feel a little calmer now. Thank you for being here.",
  ];
  let demoOn = false;
  async function runDemo(){
    if (demoOn) return; demoOn = true;
    for (const line of DEMO_LINES){
      if (!demoOn) break;
      interrupt(); const g = ++genId;
      addMsg("user", line);                 // show the simulated person's words
      curBubble = null; setState("listening");
      await playTTS(line, g, "elena");       // distinct simulated-user voice
      if (!demoOn || g !== genId) break;
      await send(line, { userShown:true });  // AURA replies with the real local brain
      if (!demoOn) break;
      await new Promise(r=>setTimeout(r, 900));
    }
    demoOn = false;
  }
  function stopDemo(){ if (demoOn){ demoOn = false; interrupt(); setState("idle"); } }

  function showEscalation(){
    escal.innerHTML = "<b>This may be an emergency.</b> Please call your local emergency number now, "
      + "or your nurse triage line. AURA is a companion, not a substitute for urgent care.";
    escal.style.display = "block";
  }

  // text controls (any user input stops the demo)
  $("send").addEventListener("click", ()=>{ stopDemo(); send(textInput.value); });
  textInput.addEventListener("keydown", (e)=>{ if (e.key==="Enter"){ stopDemo(); send(textInput.value); } });

  // voice in — record audio in the browser, transcribe on the server with
  // local Whisper. Works in any modern browser (Chrome/Safari/Firefox/Edge),
  // unlike the browser's own speech recognition. Tap to start, tap to stop.
  let mediaRec = null, recChunks = [], recording = false, micStream = null, recTimer = null;

  function stopTracks(){ if (micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream = null; } }

  async function startRec(){
    if (!(navigator.mediaDevices && window.MediaRecorder)){ textInput.focus(); return; }
    try { micStream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(e){
      addMsg("assistant", "I couldn't reach your microphone, love — please allow mic access, or just type to me.");
      setState("idle"); return;
    }
    recChunks = [];
    try { mediaRec = new MediaRecorder(micStream); }
    catch(e){ stopTracks(); textInput.focus(); return; }
    mediaRec.ondataavailable = (e)=>{ if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = transcribeRec;
    mediaRec.start();
    recording = true; micBtn.classList.add("listening"); setState("listening");
    recTimer = setTimeout(stopRec, 25000);   // safety auto-stop after 25s
  }

  function stopRec(){
    if (recTimer){ clearTimeout(recTimer); recTimer = null; }
    if (mediaRec && recording){ try { mediaRec.stop(); } catch(e){} }
    recording = false; micBtn.classList.remove("listening");
  }

  async function transcribeRec(){
    stopTracks();
    const blob = new Blob(recChunks, { type: (mediaRec && mediaRec.mimeType) || "audio/webm" });
    if (!blob.size){ setState("idle"); return; }
    setState("thinking");
    try {
      const r = await fetch("/api/stt", { method:"POST",
        headers:{ "Content-Type": blob.type || "application/octet-stream" }, body: blob });
      const d = await r.json();
      const text = (d.text || "").trim();
      if (text) send(text); else setState("idle");
    } catch(e){ setState("idle"); }
  }

  micBtn.addEventListener("click", ()=>{
    if (recording){ stopRec(); return; }
    stopDemo();
    interrupt();          // let the user talk over AURA — continuous conversation
    startRec();
  });
  if (!(navigator.mediaDevices && window.MediaRecorder)){
    micBtn.title = "Voice needs a modern browser — type instead"; micBtn.style.opacity = "0.45";
  } else {
    micBtn.title = "Tap to talk · tap again to stop";
  }

  // mode badge
  fetch("/api/health").then(r=>r.json()).then(d=>{
    const el = $("mode");
    el.className = "corner " + (d.mode==="offline" ? "offline" : "claude"); // green dot for any live AI
    const labels = { claude:"claude · "+(d.model||""), ollama:"local AI · "+(d.model||""), offline:"offline · free" };
    $("modeText").textContent = labels[d.mode] || d.mode;
  }).catch(()=>{});

  // begin (you talk) and demo (watch a simulated conversation)
  function enterScene(){ $("intro").classList.add("gone"); setState("idle"); }
  $("begin").addEventListener("click", ()=>{
    enterScene();
    setTimeout(()=>{ const greet = "Hello, sweetheart. I'm right here with you. How are you feeling?";
      messages.push({role:"assistant",content:greet}); sayLine(greet); }, 600);
  });
  const demoBtn = $("demo");
  if (demoBtn) demoBtn.addEventListener("click", ()=>{ enterScene(); setTimeout(runDemo, 500); });
})();
