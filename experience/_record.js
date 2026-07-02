/* Record a silent flythrough of the AURA experience (visual reference).
 * The live experience speaks (Web Speech); page-capture can't record that audio,
 * so this is a silent motion reference. Usage: node _record.js [baseURL]
 */
const { chromium } = require("playwright");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:8534/";
const VIDDIR = path.join(__dirname, "_build_vid");

(async () => {
  const browser = await chromium.launch({
    headless: true, channel: "chrome",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
           "--enable-webgl", "--enable-unsafe-swiftshader"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDDIR, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.THREE && window.__AURA__, { timeout: 8000 });

  // sync to the narration plan if present, else a default
  const fs2 = require("fs");
  const dwellsPath = path.join(__dirname, "_build", "dwells.json");
  let intro = 2.5, plan = [[0,5],[1,6],[2,8],[3,10],[4,10],[5,13],[6,7],[7,9]];
  if (fs2.existsSync(dwellsPath)) {
    const d = JSON.parse(fs2.readFileSync(dwellsPath, "utf8"));
    intro = d.intro; plan = d.plan;
  }

  await page.waitForTimeout(intro * 1000);               // intro veil
  await page.evaluate(() => window.__AURA__.start());
  for (const [i, secs] of plan) {
    await page.evaluate((idx) => window.__AURA__.enterPhase(idx), i);
    await page.waitForTimeout(secs * 1000);
  }

  const video = page.video();
  await ctx.close();   // finalizes the video file
  await browser.close();
  const p = await video.path();
  console.log("VIDEO:" + p);
})().catch((e) => { console.error(e); process.exit(1); });
