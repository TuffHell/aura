/* Headless QA for the talk app: load, begin, send a message, screenshot;
 * then send a red-flag message and confirm the escalation banner shows. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.argv[2] || "http://localhost:8600/";
const OUT = path.join(__dirname, "_shots");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome",
    args: ["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
  page.on("pageerror", e => errs.push("PAGEERROR: "+e.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.THREE, { timeout: 8000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "00_intro.png") });

  await page.click("#begin");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "01_greeting.png") });

  // a normal turn
  await page.fill("#text", "I'm scared the infection is coming back");
  await page.click("#send");
  await page.waitForFunction(() => document.querySelectorAll("#log .aura").length >= 2, { timeout: 8000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "02_reply.png") });

  // a red-flag turn -> escalation banner
  await page.fill("#text", "my chest hurts and I feel like I might faint");
  await page.click("#send");
  await page.waitForSelector("#escal", { state: "visible", timeout: 8000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "03_escalation.png") });

  const escalVisible = await page.isVisible("#escal");
  const mode = await page.textContent("#modeText");
  await browser.close();
  console.log(JSON.stringify({ escalVisible, mode, errors: errs.slice(0,8) }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
