// Builds one HyperFrames composition per feature from features.json, then
// (with --render) renders each to ../NN-<slug>.mp4.
//
//   node build.mjs            -> writes features/<slug>.html + assets/<slug>/*
//   node build.mjs --render   -> also renders every feature
//   node build.mjs --render --only=face-scan-clock-in
//
// Screenshots come from the Paylalo repo's design oracle
// (docs/post-login-screens). Paths in features.json are relative to SHOTS_ROOT.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const SHOTS_ROOT = "C:/Users/ryanc/OneDrive/Documents/PROJECTS/Paylalo/docs/post-login-screens";
const OUT_DIR = path.resolve(HERE, "..");
const FFMPEG_BIN =
  "C:/Users/ryanc/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.1-full_build/bin";

// Minimum segment lengths; each grows to fit its narration plus a pause.
const MIN_INTRO = 3.0;
const MIN_STEP = 4.5;
const MIN_OUTRO = 2.5;

// Narrator: "piper" (offline neural voice in ./tts) or "windows" (SAPI Zira).
const PIPER_DIR = path.join(HERE, "tts");
const PIPER_MODEL = "en_US-lessac-medium.onnx";
const VOICE = fs.existsSync(path.join(PIPER_DIR, PIPER_MODEL)) ? "piper" : "windows";

const args = process.argv.slice(2);
const doRender = args.includes("--render");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7) || null;

const features = JSON.parse(fs.readFileSync(path.join(HERE, "features.json"), "utf8"));

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Narration: one spoken line per segment (intro, each step, outro).
function introLine(f) {
  return `How to ${f.title.charAt(0).toLowerCase()}${f.title.slice(1)}.${f.subtitle ? " " + f.subtitle + "." : ""}`;
}
function stepLine(s, i) {
  const cap = s.caption.replace(/[.!]$/, "");
  return `Step ${i + 1}. ${cap}.${s.detail ? " " + s.detail : ""}`;
}
function outroLine(f) {
  return f.outro || "You're all set.";
}
// Text the voice should not read literally.
function speakable(t) {
  return t
    .replace(/Clock-In\/Out/g, "Clock In or Out")
    .replace(/\bOT\b/g, "overtime")
    .replace(/\be\.g\.\s*/gi, "for example, ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/→/g, ", then ")
    .replace(/\//g, " or ");
}

function speak(text, outWav, env) {
  const txt = outWav.replace(/\.wav$/, ".txt");
  const want = speakable(text);
  const tag = `[${VOICE}] `;
  if (fs.existsSync(outWav) && fs.existsSync(txt) && fs.readFileSync(txt, "utf8") === tag + want) return; // cached
  fs.writeFileSync(txt, tag + want, "utf8");
  if (VOICE === "piper") {
    // Offline neural voice (tts/piper + tts/en_US-lessac-medium.onnx), then
    // resampled to 44.1 kHz so every clip matches the render's audio rate.
    const raw = outWav.replace(/\.wav$/, ".raw.wav");
    execFileSync(path.join(PIPER_DIR, "piper", "piper.exe"),
      ["--model", path.join(PIPER_DIR, PIPER_MODEL), "--output_file", raw, "--sentence_silence", "0.35", "--length_scale", "1.05"],
      { input: want, stdio: ["pipe", "ignore", "ignore"] });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-ar", "44100", "-ac", "1", outWav], { env, shell: true });
    fs.unlinkSync(raw);
    return;
  }
  // Fallback: the built-in Windows voice.
  const plain = outWav.replace(/\.wav$/, ".say.txt");
  fs.writeFileSync(plain, want, "utf8");
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(HERE, "tts.ps1"), "-TextFile", plain, "-OutFile", outWav],
    { stdio: "inherit", env },
  );
  fs.unlinkSync(plain);
}

function wavSeconds(file, env) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8", env, shell: true },
  );
  return parseFloat(out.trim());
}

function compositionHtml(f, index, t) {
  const id = f.slug.replace(/[^a-z0-9]/gi, "_");
  const n = f.steps.length;
  const INTRO = t.intro;
  const OUTRO = t.outro;
  const stepStart = (i) => INTRO + t.steps.slice(0, i).reduce((a, b) => a + b, 0);
  const stepsTotal = t.steps.reduce((a, b) => a + b, 0);
  const total = INTRO + stepsTotal + OUTRO;
  const r = (x) => Math.round(x * 1000) / 1000;

  const audio = [
    `<audio id="vo-intro" data-start="0.3" data-duration="${r(t.audio.intro)}" data-track-index="4" data-volume="1" src="../assets/${f.slug}/vo-00.wav"></audio>`,
    ...f.steps.map(
      (_, i) =>
        `<audio id="vo${i}" data-start="${r(stepStart(i) + 0.4)}" data-duration="${r(t.audio.steps[i])}" data-track-index="4" data-volume="1" src="../assets/${f.slug}/vo-${String(i + 1).padStart(2, "0")}.wav"></audio>`,
    ),
    `<audio id="vo-outro" data-start="${r(INTRO + stepsTotal + 0.3)}" data-duration="${r(t.audio.outro)}" data-track-index="4" data-volume="1" src="../assets/${f.slug}/vo-99.wav"></audio>`,
  ].join("\n      ");

  const phones = f.steps
    .map((s, i) => {
      const start = r(stepStart(i));
      return `<img class="clip shot" id="shot${i}" src="../assets/${f.slug}/${String(i + 1).padStart(2, "0")}.png" data-start="${start}" data-duration="${r(t.steps[i])}" data-track-index="2" alt="" />`;
    })
    .join("\n        ");

  const captions = f.steps
    .map((s, i) => {
      const start = r(stepStart(i));
      return `<div class="clip cap" id="cap${i}" data-start="${start}" data-duration="${r(t.steps[i])}" data-track-index="3">
          <div class="stepno">Step ${i + 1} of ${n}</div>
          <div class="captext">${esc(s.caption)}</div>
          ${s.detail ? `<div class="detail">${esc(s.detail)}</div>` : ""}
        </div>`;
    })
    .join("\n        ");

  const dots = f.steps.map((_, i) => `<span class="dot" id="dot${i}"></span>`).join("");

  const tween = f.steps
    .map((_, i) => {
      const s0 = r(stepStart(i));
      const d = t.steps[i];
      return `
      tl.fromTo("#shot${i}", { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }, ${s0});
      tl.to("#shot${i}", { opacity: 0, duration: 0.35, ease: "power1.in" }, ${r(s0 + d - 0.35)});
      tl.fromTo("#cap${i}", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, ${r(s0 + 0.15)});
      tl.to("#cap${i}", { opacity: 0, duration: 0.3, ease: "power1.in" }, ${r(s0 + d - 0.3)});
      tl.to("#dot${i}", { backgroundColor: "#ffffff", scale: 1.25, duration: 0.3 }, ${s0});`;
    })
    .join("");

  return `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {
        --brand-dark: #050170;
        --brand: #147bea;
        --ink: #ffffff;
        --ink-soft: rgba(255, 255, 255, 0.78);
        --font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--brand-dark); }
      #root {
        position: relative; width: 1920px; height: 1080px; font-family: var(--font); color: var(--ink);
        background: radial-gradient(1200px 800px at 15% 20%, #1a3fb8 0%, transparent 60%),
                    radial-gradient(900px 700px at 90% 90%, #0b63c9 0%, transparent 55%),
                    linear-gradient(135deg, #050170 0%, #08128f 55%, #0a2fa8 100%);
      }
      .clip { position: absolute; }
      .brand { position: absolute; left: 80px; top: 56px; font-size: 30px; font-weight: 700; letter-spacing: 0.02em; opacity: 0.95; }
      .brand small { font-weight: 500; opacity: 0.7; margin-left: 14px; font-size: 22px; }
      .feature { position: absolute; right: 80px; top: 60px; font-size: 22px; color: var(--ink-soft); text-align: right; max-width: 900px; }
      .shot { left: 300px; top: 90px; height: 900px; width: auto; border-radius: 40px;
              filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.45)); }
      .cap { left: 900px; top: 330px; width: 900px; }
      .stepno { font-size: 26px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8fc3ff; margin-bottom: 22px; }
      .captext { font-size: 60px; font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; }
      .detail { margin-top: 28px; font-size: 32px; line-height: 1.4; color: var(--ink-soft); }
      .dots { position: absolute; left: 900px; top: 900px; display: flex; gap: 16px; }
      .dot { width: 16px; height: 16px; border-radius: 50%; background: rgba(255, 255, 255, 0.28); display: inline-block; }
      .card { left: 0; top: 0; width: 1920px; height: 1080px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
      .card .kicker { font-size: 30px; letter-spacing: 0.14em; text-transform: uppercase; color: #8fc3ff; margin-bottom: 26px; }
      .card h1 { font-size: 104px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; max-width: 1500px; }
      .card p { margin-top: 30px; font-size: 38px; color: var(--ink-soft); max-width: 1300px; line-height: 1.35; }
      .card .who { margin-top: 40px; font-size: 28px; padding: 12px 28px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
      <div class="clip card" id="intro" data-start="0" data-duration="${r(INTRO)}" data-track-index="0">
        <div class="kicker">Paylalo how-to · ${String(index + 1).padStart(2, "0")}</div>
        <h1>${esc(f.title)}</h1>
        ${f.subtitle ? `<p>${esc(f.subtitle)}</p>` : ""}
        ${f.who ? `<div class="who">For: ${esc(f.who)}</div>` : ""}
      </div>
      <div class="clip" id="chrome" data-start="${INTRO}" data-duration="${r(stepsTotal)}" data-track-index="1" style="left:0;top:0;width:1920px;height:1080px">
        <div class="brand">Paylalo<small>How-to</small></div>
        <div class="feature">${esc(f.title)}</div>
        <div class="dots">${dots}</div>
      </div>
        ${phones}
        ${captions}
      <div class="clip card" id="outro" data-start="${r(INTRO + stepsTotal)}" data-duration="${r(OUTRO)}" data-track-index="0">
        <div class="kicker">That's it</div>
        <h1>${esc(f.outro || "You're all set.")}</h1>
        <p>Paylalo · Attendance and payroll for Philippine SMEs</p>
      </div>
      ${audio}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#intro .kicker", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);
      tl.fromTo("#intro h1", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.25);
      tl.fromTo("#intro p, #intro .who", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.7);
      tl.to("#intro", { opacity: 0, duration: 0.35 }, ${r(INTRO - 0.35)});
      tl.fromTo("#chrome", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${INTRO});${tween}
      tl.fromTo("#outro", { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }, ${r(INTRO + stepsTotal)});
      window.__timelines = window.__timelines || {};
      window.__timelines["${id}"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

const env = { ...process.env, PATH: `${FFMPEG_BIN}${path.delimiter}${process.env.PATH}` };
fs.mkdirSync(path.join(HERE, "features"), { recursive: true });
const missing = [];
features.forEach((f, i) => {
  if (only && f.slug !== only) return;
  const adir = path.join(HERE, "assets", f.slug);
  fs.mkdirSync(adir, { recursive: true });
  f.steps.forEach((s, j) => {
    const src = path.join(SHOTS_ROOT, s.img);
    if (!fs.existsSync(src)) { missing.push(`${f.slug}: ${s.img}`); return; }
    fs.copyFileSync(src, path.join(adir, `${String(j + 1).padStart(2, "0")}.png`));
  });
  if (missing.length) return;

  // Narration: speak each segment, measure it, size the segment to fit.
  const vo = (name, text) => {
    const wav = path.join(adir, `vo-${name}.wav`);
    speak(text, wav, env);
    return wavSeconds(wav, env);
  };
  const aIntro = vo("00", introLine(f));
  const aSteps = f.steps.map((s, j) => vo(String(j + 1).padStart(2, "0"), stepLine(s, j)));
  const aOutro = vo("99", outroLine(f));
  const timing = {
    intro: Math.max(MIN_INTRO, aIntro + 0.9),
    steps: aSteps.map((a) => Math.max(MIN_STEP, a + 1.1)),
    outro: Math.max(MIN_OUTRO, aOutro + 1.2),
    audio: { intro: aIntro, steps: aSteps, outro: aOutro },
  };
  fs.writeFileSync(path.join(HERE, "features", `${f.slug}.html`), compositionHtml(f, i, timing));
});
if (missing.length) {
  console.error("Missing screenshots:\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log(`Built ${only ? 1 : features.length} composition(s).`);

if (doRender) {
  features.forEach((f, i) => {
    if (only && f.slug !== only) return;
    const out = path.join(OUT_DIR, `${String(i + 1).padStart(2, "0")}-${f.slug}.mp4`);
    console.log(`Rendering ${f.slug} -> ${out}`);
    execFileSync(
      "hyperframes",
      ["render", HERE, "-c", `features/${f.slug}.html`, "-o", out, "-q", "delivery", "--quiet"],
      { stdio: "inherit", env, shell: true },
    );
  });
}
