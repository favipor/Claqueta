// Dibuja video.html fotograma a fotograma (30 fps, 1920×1080) con Chrome sin ventana.
// Uso: node render.mjs [--pw RUTA_A_playwright-core] [--only 12.5,20] (solo capturas sueltas para revisar)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(HERE, "work");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const require = createRequire(import.meta.url);
const { chromium } = require(arg("--pw") ?? "playwright-core");

const TL = JSON.parse(fs.readFileSync(path.join(WORK, "timeline.json"), "utf8"));
const P = JSON.parse(fs.readFileSync(path.join(WORK, "posters.json"), "utf8"));
for (const k in P) P[k] = Array.isArray(P[k]) ? P[k].map((v) => "work/" + v) : "work/" + P[k];

const FPS = 30;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
page.on("pageerror", (e) => { console.error("ERROR en la página:", e.message); process.exit(1); });
await page.addInitScript(([tl, p]) => { window.TL = tl; window.P = p; }, [TL, P]);
await page.goto(pathToFileURL(path.join(HERE, "video.html")).href, { waitUntil: "networkidle" });
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode?.().catch(() => {}))); });
await page.waitForFunction(() => window.READY);

fs.writeFileSync(path.join(WORK, "cues.json"), JSON.stringify(await page.evaluate(() => window.CUES)));

const only = arg("--only");
if (only) {
  fs.mkdirSync(path.join(WORK, "peek"), { recursive: true });
  for (const s of only.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), s);
    await page.screenshot({ path: path.join(WORK, "peek", `t${s.toFixed(2)}.jpg`), type: "jpeg", quality: 80 });
  }
  console.log("capturas en work/peek");
} else {
  const dir = path.join(WORK, "frames");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.ceil(TL.total * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(dir, `f${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
    if (f % 150 === 0) console.log(`fotograma ${f}/${n}`);
  }
  console.log("fotogramas listos:", n);
}
await browser.close();
