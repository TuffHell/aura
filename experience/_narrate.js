/* Build an offline narration track for the experience flythrough, and the
 * matching per-phase dwell plan so the recorded video stays in sync with the
 * voice (audio-driven, like the concept film). macOS `say` -> wav, concatenated
 * with silence padding to each phase's dwell.
 *
 * Outputs: _build/narration.wav, _build/dwells.json
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

global.window = {};
require("./phases.js");
const PHASES = global.window.AURA_PHASES;

const BUILD = path.join(__dirname, "_build");
const CLIPS = path.join(BUILD, "clips");
fs.rmSync(CLIPS, { recursive: true, force: true });
fs.mkdirSync(CLIPS, { recursive: true });

const VOICE = { AURA: { v: "Samantha", r: 172 }, ELENA: { v: "Moira", r: 180 } };
const INTRO = 2.5, GAP = 0.9, MIN_LINE = 5.5, LAST_EXTRA = 3.0;

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
const dur = (f) => parseFloat(sh("ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString().trim());

function silence(seconds, out) {
  sh("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", seconds.toFixed(3), "-c:a", "pcm_s16le", out]);
}

const segments = [];
const introSeg = path.join(CLIPS, "seg_intro.wav");
silence(INTRO, introSeg); segments.push(introSeg);

const plan = [];
PHASES.forEach((p, i) => {
  const seg = path.join(CLIPS, `seg_${i}.wav`);
  let dwell;
  if (p.line && p.voice && VOICE[p.voice]) {
    const cfg = VOICE[p.voice];
    const aiff = path.join(CLIPS, `clip_${i}.aiff`);
    const wav = path.join(CLIPS, `clip_${i}.wav`);
    sh("say", ["-v", cfg.v, "-r", String(cfg.r), "-o", aiff, p.line]);
    sh("ffmpeg", ["-y", "-i", aiff, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav]);
    const d = dur(wav);
    dwell = Math.max(d + GAP, MIN_LINE) + (p.last ? LAST_EXTRA : 0);
    sh("ffmpeg", ["-y", "-i", wav, "-af", `apad=pad_dur=${(dwell - d).toFixed(3)}`,
      "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", seg]);
  } else {
    dwell = p.breathe ? 11.0 : 6.0;
    silence(dwell, seg);
  }
  segments.push(seg);
  plan.push([i, +dwell.toFixed(3)]);
});

const listfile = path.join(BUILD, "concat.txt");
fs.writeFileSync(listfile, segments.map((s) => `file '${s}'`).join("\n") + "\n");
const narration = path.join(BUILD, "narration.wav");
sh("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", narration]);

fs.writeFileSync(path.join(BUILD, "dwells.json"), JSON.stringify({ intro: INTRO, plan }, null, 2));
const total = INTRO + plan.reduce((s, [, d]) => s + d, 0);
console.log(`narration ${dur(narration).toFixed(1)}s | plan total ${total.toFixed(1)}s | ${plan.length} phases`);
