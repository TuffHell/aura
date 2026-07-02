/* Headless capture of the AURA experience for visual QA.
 * Boots the served page, jumps through phases via window.__AURA__, screenshots each.
 * Usage: node _shot.js [baseURL]
 */
const { chromium } = require("playwright");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:8534/";
const OUT = path.join(__dirname, "_shots");

(async () => {
  const fs = require("fs");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",   // use the installed Google Chrome (no playwright download)
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
           "--enable-webgl", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.THREE && window.__AURA__, { timeout: 8000 });

  // intro veil
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "00_intro.png") });

  const shots = [
    [0, "01_arrival"], [2, "02_embrace"], [3, "03_coreg"],
    [5, "04_resonance"], [6, "05_values"], [7, "06_presence"],
  ];
  for (const [i, name] of shots) {
    await page.evaluate((idx) => window.__AURA__.snapTo(idx), i);
    await page.waitForTimeout(1400); // let breath cycle + render settle
    await page.screenshot({ path: path.join(OUT, name + ".png") });
  }

  await browser.close();
  console.log("shots written to", OUT);
  if (errors.length) { console.log("CONSOLE ERRORS:\n" + errors.slice(0, 12).join("\n")); }
  else console.log("no console errors");
})().catch((e) => { console.error(e); process.exit(1); });
