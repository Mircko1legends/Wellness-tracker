#!/usr/bin/env node
/**
 * One vertical video (1080×1920) per day from the week file exported by the app
 * (Resoconto settimana → "File completo della settimana").
 *
 *   node make-videos.mjs resoconto-2026-W41.json [--out out] [--day 1..7] [--draft]
 *
 * Every action of the day in chronological order with ✅ (fatta) or ❌ (saltata / non segnata),
 * then the day's balance (sleep, mood, water, training, meds, gym sets, meals, first-month missions, notes),
 * then "Avrei voluto fare" and "Non avrei voluto fare", over slowly scrolling landscapes.
 *
 * Backgrounds: your own images in backgrounds/ (jpg/png/webp), used in alphabetical order;
 * if the folder is empty the original landscapes of make-landscapes.py are used (generated/).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { chromium } from "playwright-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = 1080;
const H = 1920;
const FPS = 30;
const FADE = 0.6;
const PANEL_TOP = 430;
const PANEL_BOTTOM = 1640;
const PAN_SPEED = 70; // px/s: slow enough to read over it

// ---------- arguments ----------

function parseArgs(argv) {
  const args = { input: null, out: path.join(HERE, "out"), day: null, draft: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--day") args.day = Number(argv[++i]);
    else if (a === "--draft") args.draft = true;
    else if (!args.input) args.input = path.resolve(a);
  }
  if (!args.input) {
    console.error("Uso: node make-videos.mjs resoconto-AAAA-Wxx.json [--out cartella] [--day 1..7] [--draft]");
    process.exit(1);
  }
  return args;
}

function readWeek(file) {
  const week = JSON.parse(fs.readFileSync(file, "utf8"));
  if (week.app !== "wellness-tracker-week" || !Array.isArray(week.days)) {
    throw new Error(`${file} non è un resoconto settimanale esportato dall'app.`);
  }
  return week;
}

// ---------- backgrounds ----------

const IMAGE = /\.(jpe?g|png|webp)$/i;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function backgrounds() {
  const own = listImages(path.join(HERE, "backgrounds"));
  if (own.length) return own;
  const generated = path.join(HERE, "generated");
  if (!listImages(generated).length) {
    console.log("Nessuna immagine in backgrounds/: genero i paesaggi originali…");
    const run = spawnSync("python3", [path.join(HERE, "make-landscapes.py"), generated, "12"], { stdio: "inherit" });
    if (run.status !== 0) throw new Error("Metti delle immagini in backgrounds/ oppure installa Python 3 con Pillow.");
  }
  return listImages(generated);
}

/** Each background once, already scaled to cover 1080×1920 with room to pan sideways. */
function prepareBackground(src, cacheDir, index) {
  const out = path.join(cacheDir, `bg-${String(index).padStart(2, "0")}.png`);
  if (!fs.existsSync(out)) {
    execFileSync(ffmpegPath, [
      "-v", "error", "-y", "-i", src,
      "-vf", `scale=${Math.round(W * 1.25)}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop='min(iw,4000)':${H}`,
      "-frames:v", "1", out,
    ]);
  }
  return out;
}

function imageWidth(file) {
  const buf = fs.readFileSync(file);
  return buf.readUInt32BE(16); // PNG IHDR width
}

// ---------- content ----------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const OK = "✅";
const NO = "❌";

/** A block is a list of items; pages never break inside a block's heading + first row. */
function dayBlocks(day) {
  const timeline = [];
  for (const a of day.activities) {
    timeline.push({ kind: "heading", time: `${a.start}–${a.end}`, text: a.title });
    if (!a.steps.length) timeline.push({ kind: "row", ok: null, text: "Nessuna azione da spuntare" });
    for (const s of a.steps) {
      timeline.push({
        kind: "row",
        ok: s.status === "done",
        time: s.time,
        text: s.label,
        tag: s.status === "skipped" ? "saltata" : s.status === "none" ? "non segnata" : "",
      });
    }
  }

  const balance = [];
  if (day.checks.length) {
    balance.push({ kind: "heading", text: "Il bilancio" });
    for (const c of day.checks) balance.push({ kind: "row", ok: c.ok, text: c.label, sub: c.detail });
  }
  if (day.gym.length) {
    balance.push({ kind: "heading", text: "Palestra" });
    for (const g of day.gym) balance.push({ kind: "row", ok: true, text: g.exercise, sub: g.sets });
  }
  if (day.meals.length) {
    balance.push({ kind: "heading", text: "Pasti registrati" });
    for (const m of day.meals) balance.push({ kind: "row", ok: true, time: m.time, text: m.title, sub: m.detail });
  }
  if (day.missions.length) {
    balance.push({ kind: "heading", text: "Missioni del primo mese" });
    for (const m of day.missions) balance.push({ kind: "row", ok: m.done, text: m.name });
  }
  if (day.notes) {
    balance.push({ kind: "heading", text: "Note" });
    balance.push({ kind: "note", text: day.notes });
  }

  // In the order you asked: first what you wished you had done, then what you wish you hadn't.
  const wishes = [{ kind: "heading", text: "Avrei voluto fare", sub: "e non l'ho fatto" }];
  if (day.wished.length) for (const w of day.wished) wishes.push({ kind: "row", ok: false, text: w });
  else wishes.push({ kind: "empty", text: "Niente scritto nel diario" });
  wishes.push({ kind: "heading", text: "Non avrei voluto fare", sub: "e l'ho fatto" });
  if (day.unwanted.length) for (const u of day.unwanted) wishes.push({ kind: "row", ok: true, text: u });
  else wishes.push({ kind: "empty", text: "Niente scritto nel diario" });

  return [
    { name: "La giornata", items: timeline },
    { name: "Il bilancio", items: balance },
    { name: "Avrei e non avrei voluto", items: wishes },
  ].filter((b) => b.items.length);
}

function itemHtml(item, continued = false) {
  if (item.kind === "heading") {
    return `<div class="h">${item.time ? `<span class="ht">${esc(item.time)}</span>` : ""}<span class="hx">${esc(item.text)}${
      continued ? ' <span class="cont">(segue)</span>' : ""
    }</span>${item.sub ? `<span class="hs">${esc(item.sub)}</span>` : ""}</div>`;
  }
  if (item.kind === "note") return `<div class="note">${esc(item.text).replace(/\n/g, "<br>")}</div>`;
  if (item.kind === "empty") return `<div class="empty">${esc(item.text)}</div>`;
  const mark = item.ok === null ? "▫️" : item.ok ? OK : NO;
  return `<div class="r${item.ok === false ? " miss" : ""}"><span class="e">${mark}</span><div class="b">${
    item.time ? `<span class="t">${esc(item.time)}</span>` : ""
  }<span class="x">${esc(item.text)}</span>${item.tag ? `<span class="tag">${esc(item.tag)}</span>` : ""}${
    item.sub ? `<div class="s">${esc(item.sub)}</div>` : ""
  }</div></div>`;
}

// ---------- page template ----------

const font = (family, file) =>
  `@font-face { font-family: '${family}'; font-weight: 100 900; font-display: block; src: url(data:font/woff2;base64,${fs
    .readFileSync(path.join(HERE, "fonts", file))
    .toString("base64")}) format('woff2'); }`;

const CSS = `
${font("Cinzel", "Cinzel.woff2")}
${font("Inter", "Inter.woff2")}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
body { font-family: Inter, 'DejaVu Sans', 'Noto Color Emoji', sans-serif; color: #F4F1EA; -webkit-font-smoothing: antialiased; }
.emoji, .e { font-family: 'Noto Color Emoji', sans-serif; }
.shade-top { position: absolute; left: 0; right: 0; top: 0; height: 560px; background: linear-gradient(rgba(6,9,16,.78), rgba(6,9,16,0)); }
.shade-bottom { position: absolute; left: 0; right: 0; bottom: 0; height: 420px; background: linear-gradient(rgba(6,9,16,0), rgba(6,9,16,.72)); }
.top { position: absolute; left: 64px; right: 64px; top: 150px; }
.ago { font: 700 26px Inter, sans-serif; letter-spacing: 7px; text-transform: uppercase; color: #E7C27A; }
.day { font: 800 72px Cinzel, 'DejaVu Serif', serif; line-height: 1.05; margin-top: 10px; text-shadow: 0 3px 18px rgba(0,0,0,.55); }
.section { font: 600 30px Inter, sans-serif; color: rgba(244,241,234,.78); margin-top: 12px; letter-spacing: 1px; }
.panel { position: absolute; left: 52px; right: 52px; top: ${PANEL_TOP}px; max-height: ${PANEL_BOTTOM - PANEL_TOP}px; padding: 34px 40px 30px;
  background: rgba(9,13,22,.76); border: 1.5px solid rgba(231,194,122,.28); border-radius: 34px; box-shadow: 0 20px 60px rgba(0,0,0,.35); overflow: hidden; }
.h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; padding: 18px 0 10px; border-bottom: 1.5px solid rgba(231,194,122,.25); margin-bottom: 8px; }
.h:first-child { padding-top: 0; }
.ht { font: 700 26px Inter, sans-serif; color: #E7C27A; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
.hx { font: 700 38px Cinzel, 'DejaVu Serif', serif; line-height: 1.15; }
.hs { font: 500 26px Inter, sans-serif; color: rgba(244,241,234,.6); font-style: italic; flex-basis: 100%; }
.cont { font: 500 24px Inter, sans-serif; color: rgba(244,241,234,.55); }
.r { display: flex; gap: 20px; align-items: flex-start; padding: 12px 0; }
.e { font-size: 42px; line-height: 44px; width: 50px; flex: none; }
.b { flex: 1; min-width: 0; font-size: 33px; line-height: 1.28; }
.t { font-weight: 700; color: #E7C27A; margin-right: 12px; font-variant-numeric: tabular-nums; font-size: 29px; }
.x { font-weight: 500; }
.miss .x { color: rgba(244,241,234,.8); }
.tag { display: inline-block; margin-left: 12px; padding: 1px 14px 3px; border-radius: 999px; font-size: 22px; font-weight: 700; vertical-align: 3px;
  background: rgba(230,90,80,.22); color: #FFB4A8; }
.s { font-size: 27px; color: rgba(244,241,234,.66); margin-top: 3px; }
.note { font-size: 32px; line-height: 1.4; font-style: italic; padding: 10px 0 6px; color: rgba(244,241,234,.9); }
.empty { font-size: 30px; font-style: italic; color: rgba(244,241,234,.5); padding: 12px 0 10px; }
.foot { position: absolute; left: 64px; right: 64px; top: ${PANEL_BOTTOM + 40}px; display: flex; align-items: center; gap: 22px; font: 700 26px Inter, sans-serif; color: rgba(244,241,234,.85); }
.bar { flex: 1; height: 8px; border-radius: 8px; background: rgba(255,255,255,.18); overflow: hidden; }
.bar i { display: block; height: 100%; background: #E7C27A; border-radius: 8px; }
.center { position: absolute; left: 64px; right: 64px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.big { font: 800 118px Cinzel, 'DejaVu Serif', serif; line-height: 1; text-shadow: 0 4px 26px rgba(0,0,0,.6); }
.date { font: 600 58px Cinzel, 'DejaVu Serif', serif; margin-top: 18px; text-shadow: 0 3px 18px rgba(0,0,0,.6); }
.card { margin: 70px auto 0; width: 100%; padding: 40px 44px; background: rgba(9,13,22,.74); border: 1.5px solid rgba(231,194,122,.28); border-radius: 34px; text-align: left; }
.stat { display: flex; align-items: center; gap: 22px; font-size: 44px; font-weight: 800; padding: 8px 0; }
.stat small { font-size: 28px; font-weight: 500; color: rgba(244,241,234,.7); }
.pct { margin-top: 26px; display: flex; gap: 20px; align-items: center; font: 700 30px Inter, sans-serif; }
.pct .bar { height: 14px; }
.quote { font: 600 46px Cinzel, 'DejaVu Serif', serif; line-height: 1.3; text-shadow: 0 3px 18px rgba(0,0,0,.7); }
.quote-sub { font: 500 32px Inter, sans-serif; margin-top: 34px; color: rgba(244,241,234,.85); line-height: 1.4; text-shadow: 0 2px 12px rgba(0,0,0,.7); }
`;

function frame(inner) {
  return `<div class="shade-top"></div><div class="shade-bottom"></div>${inner}`;
}

function listSlide(day, blockName, html, index, total) {
  return frame(`
    <div class="top"><div class="ago">7 giorni fa</div><div class="day">${esc(cap(day.label))}</div><div class="section">${esc(blockName)}</div></div>
    <div class="panel">${html}</div>
    <div class="foot"><span>${index}/${total}</span><div class="bar"><i style="width:${Math.round((index / total) * 100)}%"></i></div>
      <span><span class="emoji">${OK}</span> ${day.summary.done} · <span class="emoji">${NO}</span> ${day.summary.total - day.summary.done}</span></div>`);
}

function introSlide(day) {
  const [weekday, ...rest] = day.label.split(" ");
  const s = day.summary;
  const not = s.total - s.done;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return frame(`
    <div class="center">
      <div class="ago">7 giorni fa</div>
      <div class="big" style="margin-top:26px">${esc(cap(weekday))}</div>
      <div class="date">${esc(rest.join(" "))}</div>
      <div class="card">
        <div class="stat"><span class="emoji">${OK}</span><span>${s.done} ${s.done === 1 ? "azione fatta" : "azioni fatte"}</span></div>
        <div class="stat"><span class="emoji">${NO}</span><span>${not} non ${not === 1 ? "fatta" : "fatte"} <small>(${s.skipped} saltate · ${s.notMarked} non segnate)</small></span></div>
        <div class="pct"><span>${pct}%</span><div class="bar"><i style="width:${pct}%"></i></div><span>${s.total} in tutto</span></div>
      </div>
    </div>`);
}

function outroSlide(day, week) {
  const pct = day.summary.total ? day.summary.done / day.summary.total : 0;
  const line =
    pct >= 0.85
      ? "Giornata solida. Così si costruisce, un giorno alla volta."
      : pct >= 0.6
        ? "Più della metà fatta: conta, e si somma."
        : "Anche le giornate storte fanno parte della saga. Si riparte dal prossimo passo.";
  return frame(`
    <div class="center">
      <div class="card" style="margin-top:0;text-align:center;padding:64px 48px">
        <div class="quote">Nessun nemico.<br>Solo il prossimo passo.</div>
        <div class="quote-sub">${esc(line)}</div>
        <div class="ago" style="margin-top:48px">${esc(week.week)} · ${esc(cap(day.label))}</div>
      </div>
    </div>`);
}

// ---------- pagination ----------

async function measure(page, items) {
  const html = items.map((it) => itemHtml(it)).join("");
  return page.evaluate(async (inner) => {
    document.body.innerHTML = `<div class="panel" style="max-height:none" id="m">${inner}</div>`;
    await document.fonts.ready;
    const panel = document.getElementById("m");
    const kids = [...panel.children];
    const style = getComputedStyle(panel);
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 3;
    return { pad, heights: kids.map((k, i) => (i + 1 < kids.length ? kids[i + 1].offsetTop - k.offsetTop : k.offsetHeight + 12)) };
  }, html);
}

/** Greedy packing; a heading never ends a page, and a page that starts mid-activity repeats its heading. */
async function paginate(page, items) {
  const { pad, heights } = await measure(page, items);
  const room = PANEL_BOTTOM - PANEL_TOP - pad;
  const headingH = Math.max(...heights.filter((_, i) => items[i].kind === "heading"), 60);
  const pages = [];
  let cur = [];
  let used = 0;
  let lastHeading = null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const h = heights[i];
    const nextH = it.kind === "heading" && i + 1 < items.length ? heights[i + 1] : 0;
    if (cur.length && used + h + nextH > room) {
      pages.push(cur);
      cur = [];
      used = 0;
      if (it.kind !== "heading" && lastHeading) {
        cur.push({ ...lastHeading, continued: true });
        used += headingH;
      }
    }
    cur.push(it);
    used += h;
    if (it.kind === "heading") lastHeading = it;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

function readingTime(items) {
  let t = 2.2;
  for (const it of items) {
    if (it.kind === "heading") t += it.continued ? 0.2 : 0.6;
    else if (it.kind === "note") t += Math.min(8, 1 + it.text.length / 18);
    else t += 0.75 + Math.max(0, ((it.text?.length ?? 0) + (it.sub?.length ?? 0) - 45) / 40) * 0.5;
  }
  return Math.min(16, Math.max(4.5, t));
}

// ---------- rendering ----------

async function renderSlides(page, day, week, dir) {
  const slides = [];
  const shoot = async (html, duration) => {
    const file = path.join(dir, `slide-${String(slides.length).padStart(2, "0")}.png`);
    await page.evaluate(async (inner) => {
      document.body.innerHTML = inner;
      await document.fonts.ready;
    }, html);
    await page.screenshot({ path: file, omitBackground: true });
    slides.push({ file, duration });
  };

  const pagesPerBlock = [];
  for (const block of dayBlocks(day)) pagesPerBlock.push({ block, pages: await paginate(page, block.items) });
  const total = pagesPerBlock.reduce((n, b) => n + b.pages.length, 0);

  await shoot(introSlide(day), 4.5);
  let index = 0;
  for (const { block, pages } of pagesPerBlock) {
    for (const items of pages) {
      index++;
      const html = items.map((it) => itemHtml(it, it.continued)).join("");
      await shoot(listSlide(day, block.name, html, index, total), readingTime(items));
    }
  }
  await shoot(outroSlide(day, week), 4.5);
  return slides;
}

function encode(slides, bgs, offset, out, draft) {
  const args = ["-v", "error", "-y"];
  const filters = [];
  slides.forEach((s, i) => {
    const bg = bgs[(offset + i) % bgs.length];
    args.push("-framerate", String(FPS), "-i", bg.file, "-framerate", String(FPS), "-i", s.file);
    const frames = Math.round(s.duration * FPS);
    // decode each picture once and repeat it in memory (re-reading the PNG every frame is 10× slower)
    const hold = `loop=loop=${frames - 1}:size=1:start=0,setpts=N/${FPS}/TB`;
    const room = Math.max(0, bg.width - W);
    const dist = Math.min(room, Math.round(PAN_SPEED * s.duration));
    const start = Math.round(((i * 0.37) % 1) * (room - dist));
    const x = i % 2 === 0 ? `${start}+${dist}*t/${s.duration.toFixed(2)}` : `${start + dist}-${dist}*t/${s.duration.toFixed(2)}`;
    filters.push(`[${2 * i}:v]${hold},crop=${W}:${H}:'${x}':0,setsar=1[bg${i}]`);
    filters.push(`[${2 * i + 1}:v]${hold}[ov${i}]`);
    filters.push(`[bg${i}][ov${i}]overlay=0:0:format=auto:shortest=1,format=yuv420p,settb=1/${FPS},fps=${FPS}[s${i}]`);
  });
  let last = "s0";
  let offsetT = slides[0].duration;
  for (let i = 1; i < slides.length; i++) {
    const outLabel = i === slides.length - 1 ? "v" : `x${i}`;
    filters.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE}:offset=${(offsetT - FADE).toFixed(2)}[${outLabel}]`);
    offsetT += slides[i].duration - FADE;
    last = outLabel;
  }
  if (slides.length === 1) filters.push("[s0]null[v]");
  args.push(
    "-filter_complex_threads", String(os.availableParallelism?.() ?? 4),
    "-filter_complex", filters.join(";"),
    "-map", "[v]",
    "-c:v", "libx264", "-preset", draft ? "ultrafast" : "fast", "-crf", draft ? "28" : "20",
    "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart",
    out,
  );
  execFileSync(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 26 });
  return offsetT;
}

function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = "/opt/pw-browsers";
  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
      const exe = path.join(root, d, "chrome-linux", "chrome");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined; // playwright-core's own download (npx playwright install chromium)
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const week = readWeek(args.input);
  const outDir = path.join(args.out, week.week);
  const work = path.join(outDir, ".work");
  fs.mkdirSync(work, { recursive: true });

  const sources = backgrounds();
  const bgs = sources.map((src, i) => {
    const file = prepareBackground(src, work, i);
    return { file, width: imageWidth(file) };
  });

  const browser = await chromium.launch({ executablePath: findChromium() });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body></body></html>`, { waitUntil: "networkidle" });

  try {
    for (let d = 0; d < week.days.length; d++) {
      if (args.day && args.day !== d + 1) continue;
      const day = week.days[d];
      const dir = path.join(work, `day-${d + 1}`);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const slides = await renderSlides(page, day, week, dir);
      const out = path.join(outDir, `${d + 1}-${slug(day.label)}.mp4`);
      const seconds = encode(slides, bgs, d * 3, out, args.draft);
      console.log(`${path.relative(process.cwd(), out)}  ·  ${slides.length} schermate  ·  ${Math.round(seconds)} s`);
    }
  } finally {
    await browser.close();
  }
  if (!args.draft) fs.rmSync(work, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
