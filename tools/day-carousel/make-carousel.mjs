#!/usr/bin/env node
/**
 * One carousel of images (1080×1920) per day from the week file exported by the app
 * (Resoconto settimana → "File completo della settimana"), to swipe through with a soundtrack
 * chosen from the day's results.
 *
 *   node make-carousel.mjs resoconto-2026-W41.json [--out out] [--only 1..7] [--day-one 2026-09-28] [--pubblico]
 *
 * Slides, in order: "day N" and the day's numbers → every action in order of time with ✅ (fatta) or
 * ❌ (saltata / non segnata) → the day's balance (sleep, mood, water, training, meds, gym sets, meals,
 * first-month missions, notes) → "Avrei voluto fare" → "Non avrei voluto fare" → Thorfinn's face, with the
 * expression that matches how the day went.
 * Next to the images: didascalia.txt with the caption, the hashtags and the soundtrack for that day.
 *
 * Images (jpg/png/webp), all frames from the anime:
 *   backgrounds/  landscapes behind the lists, one per slide in alphabetical order
 *   faces/        Thorfinn's face for the last slide, named after the kind of day:
 *                 guerriero, forte, costante, meta, ripartenza (e.g. forte.jpg, forte-2.jpg; forte@30.jpg
 *                 when the face is at 30% of the width)
 * Without them, placeholder landscapes from make-landscapes.py are used, only to check the layout.
 * --pubblico leaves out mood, weight, medicine names and notes.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = 1080;
const H = 1920;
const PANEL_TOP = 420;
const PANEL_BOTTOM = 1650;
const MAX_SLIDES = 20; // Instagram's limit for a carousel (TikTok takes 35)

// ---------- arguments and config ----------

function readConfig() {
  const file = path.join(HERE, "config.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function parseArgs(argv) {
  const config = readConfig();
  const args = {
    input: null,
    out: path.join(HERE, "out"),
    only: null,
    dayOne: config.dayOne ?? null,
    credit: config.credit ?? "Immagini: Vinland Saga © Makoto Yukimura / Kodansha",
    hashtags: config.hashtags ?? ["#vinlandsaga", "#thorfinn", "#selfimprovement", "#discipline"],
    public: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--only") args.only = Number(argv[++i]);
    else if (a === "--day-one") args.dayOne = argv[++i];
    else if (a === "--pubblico") args.public = true;
    else if (!args.input) args.input = path.resolve(a);
  }
  if (!args.input) {
    console.error("Uso: node make-carousel.mjs resoconto-AAAA-Wxx.json [--out cartella] [--only 1..7] [--day-one AAAA-MM-GG] [--pubblico]");
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

// ---------- "day one" ----------

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${numberWords(n % 100)}` : ""}`;
  const rest = n % 1000;
  return `${numberWords(Math.floor(n / 1000))} thousand${rest ? (rest < 100 ? " and " : " ") + numberWords(rest) : ""}`;
}

const utcDay = (key) => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));

function dayNumber(date, dayOne) {
  return Math.round((utcDay(date) - utcDay(dayOne)) / 86400000) + 1;
}

// ---------- how the day went: face and soundtrack ----------

/**
 * From the share of actions done. `face` is what to look for in faces/;
 * the songs are Vinland Saga openings and endings, from the most epic to the calmest.
 */
const TIERS = [
  { id: "guerriero", min: 0.9, mood: "giornata da guerriero", face: "sguardo deciso, da battaglia", song: "Dark Crow — MAN WITH A MISSION", alt: "MUKANJYO — Survive Said The Prophet" },
  { id: "forte", min: 0.75, mood: "giornata forte", face: "sorriso sicuro", song: "MUKANJYO — Survive Said The Prophet", alt: "Paradox — Survive Said The Prophet" },
  { id: "costante", min: 0.6, mood: "giornata costante", face: "sereno, guarda lontano", song: "River — Anonymouz", alt: "Ember — haju:harmonics" },
  { id: "meta", min: 0.4, mood: "giornata a metà", face: "stanco, pensieroso", song: "Torches — Aimer", alt: "Drown — milet" },
  { id: "ripartenza", min: 0, mood: "giornata di ripartenza", face: "triste, ma ancora in piedi", song: "Without Love — LMYK", alt: "Torches — Aimer" },
];

function tierFor(share) {
  return TIERS.find((t) => share >= t.min) ?? TIERS[TIERS.length - 1];
}

// ---------- backgrounds ----------

const IMAGE = /\.(jpe?g|png|webp)$/i;
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** faces/<tier>*.jpg; several per tier are used in turn, day after day. */
function facesByTier() {
  const all = listImages(path.join(HERE, "faces"));
  return Object.fromEntries(TIERS.map((t) => [t.id, all.filter((f) => path.basename(f).toLowerCase().startsWith(t.id))]));
}

function backgrounds() {
  const own = listImages(path.join(HERE, "backgrounds"));
  if (own.length) return { own: true, files: own };
  const generated = path.join(HERE, "generated");
  if (!listImages(generated).length) {
    console.log("Nessuna immagine in backgrounds/: genero dei paesaggi di prova…");
    const run = spawnSync("python3", [path.join(HERE, "make-landscapes.py"), generated, "12"], { stdio: "inherit" });
    if (run.status !== 0) throw new Error("Metti delle immagini in backgrounds/ oppure installa Python 3 con Pillow.");
  }
  return { own: false, files: listImages(generated) };
}

const dataUrls = new Map();
function dataUrl(file) {
  if (!dataUrls.has(file)) {
    const ext = path.extname(file).slice(1).toLowerCase();
    dataUrls.set(file, `data:${MIME[ext]};base64,${fs.readFileSync(file).toString("base64")}`);
  }
  return dataUrls.get(file);
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

const PRIVATE_CHECKS = new Set(["Umore nella zona stabile", "Pesata"]);

function publicDay(day) {
  return {
    ...day,
    checks: day.checks
      .filter((c) => !PRIVATE_CHECKS.has(c.label))
      .map((c) => (c.label === "Farmaci" ? { ...c, detail: c.detail.replace(/\s*\(.*\)$/, "") } : c)),
    notes: "",
  };
}

/** A block starts on a new slide; inside it a heading never ends a slide. */
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

function itemHtml(item) {
  if (item.kind === "heading") {
    return `<div class="h">${item.time ? `<span class="ht">${esc(item.time)}</span>` : ""}<span class="hx">${esc(item.text)}${
      item.continued ? ' <span class="cont">(segue)</span>' : ""
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

const SHADOW = "0 0 3px rgba(0,0,0,.95), 0 2px 10px rgba(0,0,0,.85)";

const CSS = `
${font("Cinzel", "Cinzel.woff2")}
${font("Inter", "Inter.woff2")}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0b0f16; }
body { font-family: Inter, 'DejaVu Sans', 'Noto Color Emoji', sans-serif; color: #FAF7F0; -webkit-font-smoothing: antialiased; text-shadow: ${SHADOW}; }
.emoji, .e { font-family: 'Noto Color Emoji', sans-serif; text-shadow: none; }
.bg { position: absolute; inset: 0; background-size: cover; background-repeat: no-repeat; filter: brightness(.55) saturate(1.08); }
.shade-top { position: absolute; left: 0; right: 0; top: 0; height: 520px; background: linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,0)); }
.shade-bottom { position: absolute; left: 0; right: 0; bottom: 0; height: 420px; background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.6)); }
.top { position: absolute; left: 64px; right: 64px; top: 130px; }
.dayn { font: 700 84px Cinzel, 'DejaVu Serif', serif; line-height: 1; letter-spacing: 2px; }
.sub { font: 600 32px Inter, sans-serif; margin-top: 18px; color: rgba(250,247,240,.92); }
.sub b { color: #F1CF86; font-weight: 700; }
.panel { position: absolute; left: 48px; right: 48px; top: ${PANEL_TOP}px; max-height: ${PANEL_BOTTOM - PANEL_TOP}px; padding: 32px 38px 26px;
  background: transparent; border: 2px solid rgba(250,247,240,.55); border-radius: 34px; overflow: hidden; }
.h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; padding: 18px 0 10px; border-bottom: 2px solid rgba(241,207,134,.55); margin-bottom: 8px; }
.h:first-child { padding-top: 0; }
.ht { font: 800 27px Inter, sans-serif; color: #F1CF86; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
.hx { font: 700 40px Cinzel, 'DejaVu Serif', serif; line-height: 1.15; }
.hs { font: 600 27px Inter, sans-serif; font-style: italic; flex-basis: 100%; color: rgba(250,247,240,.85); }
.cont { font: 600 24px Inter, sans-serif; color: rgba(250,247,240,.8); }
.r { display: flex; gap: 20px; align-items: flex-start; padding: 12px 0; }
.e { font-size: 42px; line-height: 44px; width: 50px; flex: none; }
.b { flex: 1; min-width: 0; font-size: 34px; line-height: 1.28; font-weight: 600; }
.t { font-weight: 800; color: #F1CF86; margin-right: 12px; font-variant-numeric: tabular-nums; font-size: 30px; }
.tag { display: inline-block; margin-left: 12px; padding: 1px 14px 3px; border-radius: 999px; font-size: 22px; font-weight: 800; vertical-align: 3px;
  background: rgba(200,50,40,.85); color: #fff; text-shadow: none; }
.s { font-size: 28px; font-weight: 600; color: rgba(250,247,240,.9); margin-top: 3px; }
.note { font-size: 33px; line-height: 1.4; font-style: italic; padding: 10px 0 6px; }
.empty { font-size: 31px; font-style: italic; color: rgba(250,247,240,.8); padding: 12px 0 10px; }
.foot { position: absolute; left: 64px; right: 64px; top: ${PANEL_BOTTOM + 44}px; display: flex; align-items: center; justify-content: space-between; font: 800 28px Inter, sans-serif; }
.credit { position: absolute; left: 64px; right: 64px; bottom: 120px; text-align: center; font: 600 24px Inter, sans-serif; color: rgba(250,247,240,.85); }
.center { position: absolute; left: 64px; right: 64px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.big { font: 800 150px Cinzel, 'DejaVu Serif', serif; line-height: 1.02; }
.date { font: 700 46px Cinzel, 'DejaVu Serif', serif; margin-top: 26px; }
.card { margin: 70px auto 0; width: 100%; padding: 38px 44px; border: 2px solid rgba(250,247,240,.55); border-radius: 34px; text-align: left; }
.stat { display: flex; align-items: center; gap: 22px; font-size: 46px; font-weight: 800; padding: 8px 0; }
.stat small { font-size: 28px; font-weight: 600; color: rgba(250,247,240,.9); }
.pct { margin-top: 24px; display: flex; gap: 20px; align-items: center; font: 800 32px Inter, sans-serif; }
.bar { flex: 1; height: 14px; border-radius: 14px; background: rgba(255,255,255,.3); overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.6); }
.bar i { display: block; height: 100%; background: #F1CF86; border-radius: 14px; }
.quote { font: 700 56px Cinzel, 'DejaVu Serif', serif; line-height: 1.3; }
.quote-sub { font: 600 34px Inter, sans-serif; margin-top: 36px; line-height: 1.4; }
.bg.face { filter: none; }
.shade-face { position: absolute; left: 0; right: 0; bottom: 0; height: 760px; background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.82)); }
.face-text { position: absolute; left: 64px; right: 64px; bottom: 190px; text-align: center; }
.tier { font: 800 76px Cinzel, 'DejaVu Serif', serif; line-height: 1.1; margin-top: 18px; }
.dense .b { font-size: 29px; } .dense .e { font-size: 36px; line-height: 38px; width: 42px; } .dense .r { padding: 8px 0; }
.dense .hx { font-size: 34px; } .dense .t { font-size: 26px; } .dense .s { font-size: 24px; }
`;

function frame(bg, inner) {
  return `<div class="bg" style="background-image:url('${bg.url}');background-position:${bg.pos}% 50%"></div>
    <div class="shade-top"></div><div class="shade-bottom"></div>${inner}`;
}

function header(ctx, section) {
  return `<div class="top"><div class="dayn">${esc(ctx.dayLabel)}</div><div class="sub">${esc(cap(ctx.day.label))} · <b>${esc(section)}</b></div></div>`;
}

function listSlide(ctx, bg, blockName, html, index, total) {
  const s = ctx.day.summary;
  return frame(
    bg,
    `${header(ctx, blockName)}
    <div class="panel${ctx.dense ? " dense" : ""}">${html}</div>
    <div class="foot"><span>${index}/${total}</span>
      <span><span class="emoji">${OK}</span> ${s.done} · <span class="emoji">${NO}</span> ${s.total - s.done}</span></div>`,
  );
}

function introSlide(ctx, bg) {
  const s = ctx.day.summary;
  const not = s.total - s.done;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return frame(
    bg,
    `<div class="center">
      <div class="big">${esc(ctx.dayLabel)}</div>
      <div class="date">${esc(cap(ctx.day.label))}</div>
      <div class="card">
        <div class="stat"><span class="emoji">${OK}</span><span>${s.done} ${s.done === 1 ? "azione fatta" : "azioni fatte"}</span></div>
        <div class="stat"><span class="emoji">${NO}</span><span>${not} non ${not === 1 ? "fatta" : "fatte"} <small>(${s.skipped} saltate · ${s.notMarked} non segnate)</small></span></div>
        <div class="pct"><span>${pct}%</span><div class="bar"><i style="width:${pct}%"></i></div><span>${s.total} in tutto</span></div>
      </div>
    </div>
    ${ctx.credit ? `<div class="credit">${esc(ctx.credit)}</div>` : ""}`,
  );
}

function outroSlide(ctx, bg) {
  return frame(
    bg,
    `<div class="center">
      <div class="quote">Nessun nemico.<br>Solo il prossimo passo.</div>
      <div class="quote-sub">${esc(ctx.closing)}</div>
      <div class="sub" style="margin-top:56px">${esc(ctx.dayLabel)} · ${esc(cap(ctx.day.label))}</div>
    </div>
    ${ctx.credit ? `<div class="credit">${esc(ctx.credit)}</div>` : ""}`,
  );
}

/** The last slide: Thorfinn's face, full screen, with the expression of the day. */
function faceSlide(ctx, face) {
  const s = ctx.day.summary;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return `<div class="bg face" style="background-image:url('${face.url}');background-position:${face.pos}% 35%"></div>
    <div class="shade-face"></div>
    <div class="face-text">
      <div class="sub" style="margin-top:0">${esc(ctx.dayLabel)} · ${pct}%</div>
      <div class="tier">${esc(cap(ctx.tier.mood))}</div>
      <div class="quote-sub" style="margin-top:22px">${esc(ctx.closing)}</div>
    </div>
    ${ctx.credit ? `<div class="credit" style="bottom:90px">${esc(ctx.credit)}</div>` : ""}`;
}

function closingLine(share) {
  if (share >= 0.85) return "Giornata solida. Così si costruisce, un giorno alla volta.";
  if (share >= 0.6) return "Più della metà fatta: conta, e si somma.";
  return "Anche le giornate storte fanno parte della saga. Si riparte dal prossimo passo.";
}

// ---------- pagination ----------

async function measure(page, items, dense) {
  const html = items.map(itemHtml).join("");
  return page.evaluate(
    async ({ inner, dense }) => {
      document.body.innerHTML = `<div class="panel${dense ? " dense" : ""}" style="max-height:none" id="m">${inner}</div>`;
      await document.fonts.ready;
      const panel = document.getElementById("m");
      const kids = [...panel.children];
      const style = getComputedStyle(panel);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 4;
      return { pad, heights: kids.map((k, i) => (i + 1 < kids.length ? kids[i + 1].offsetTop - k.offsetTop : k.offsetHeight + 12)) };
    },
    { inner: html, dense },
  );
}

/** Greedy packing; a heading never ends a slide, and a slide that starts mid-activity repeats its heading. */
async function paginate(page, items, dense) {
  const { pad, heights } = await measure(page, items, dense);
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

// ---------- rendering ----------

/** A different picture on every slide; when they run out, the same ones framed on another side. */
function pickBackground(bgs, n) {
  const file = bgs[n % bgs.length];
  const pos = [50, 15, 85, 35, 65][Math.floor(n / bgs.length) % 5];
  return { url: dataUrl(file), pos };
}

async function renderDay(page, ctx, bgs, bgOffset, face, dir) {
  let blocks = [];
  for (const dense of [false, true]) {
    ctx.dense = dense;
    blocks = [];
    for (const block of dayBlocks(ctx.day)) blocks.push({ block, pages: await paginate(page, block.items, dense) });
    if (blocks.reduce((n, b) => n + b.pages.length, 0) + 2 <= MAX_SLIDES) break;
  }
  const total = blocks.reduce((n, b) => n + b.pages.length, 0);
  const files = [];
  const shoot = async (html) => {
    const file = path.join(dir, `${String(files.length + 1).padStart(2, "0")}.jpg`);
    await page.evaluate(async (inner) => {
      document.body.innerHTML = inner;
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    }, html);
    await page.waitForTimeout(30);
    await page.screenshot({ path: file, type: "jpeg", quality: 92 });
    files.push(file);
  };

  let n = bgOffset;
  await shoot(introSlide(ctx, pickBackground(bgs, n++)));
  let index = 0;
  for (const { block, pages } of blocks) {
    for (const items of pages) {
      index++;
      await shoot(listSlide(ctx, pickBackground(bgs, n++), block.name, items.map(itemHtml).join(""), index, total));
    }
  }
  await shoot(face ? faceSlide(ctx, face) : outroSlide(ctx, pickBackground(bgs, n++)));
  return files;
}

function caption(ctx, number, track, hashtags, hasFace) {
  const s = ctx.day.summary;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return [
    `${ctx.dayLabel} · ${cap(ctx.day.label)}`,
    `${OK} ${s.done} fatte · ${NO} ${s.total - s.done} non fatte (${pct}%)`,
    "",
    [...hashtags, number >= 1 ? `#day${number}` : ""].filter(Boolean).join(" "),
    "",
    "----- solo per te, non da copiare nel post -----",
    `🎵 Colonna sonora (${track.mood}): ${track.song}`,
    `   in alternativa: ${track.alt}`,
    "   Nel post: tocca \"Aggiungi suono\" e cerca il titolo.",
    hasFace ? "" : `🙂 Manca il volto per "${track.id}" (${track.face}): mettilo in faces/${track.id}.jpg`,
    "",
  ].join("\n");
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
  const dayOne = args.dayOne ?? week.from;
  const outDir = path.join(args.out, week.week);
  fs.mkdirSync(outDir, { recursive: true });

  const bg = backgrounds();
  if (!bg.own) console.log("Attenzione: paesaggi di prova. Metti i fotogrammi di Vinland Saga in backgrounds/.");
  const faces = facesByTier();
  const used = Object.fromEntries(TIERS.map((t) => [t.id, 0]));

  const browser = await chromium.launch({ executablePath: findChromium() });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body></body></html>`);

  try {
    for (let d = 0; d < week.days.length; d++) {
      if (args.only && args.only !== d + 1) continue;
      const day = args.public ? publicDay(week.days[d]) : week.days[d];
      const number = dayNumber(day.date, dayOne);
      const share = day.summary.total ? day.summary.done / day.summary.total : 0;
      const tier = tierFor(share);
      const ctx = {
        day,
        tier,
        dayLabel: `day ${numberWords(Math.max(0, number))}`,
        credit: bg.own || faces[tier.id].length ? args.credit : "",
        closing: closingLine(share),
        dense: false,
      };
      const faceFile = faces[tier.id].length ? faces[tier.id][used[tier.id]++ % faces[tier.id].length] : null;
      // "forte@30.jpg": the face is at 30% of the width (the slide is narrower than a screenshot)
      const face = faceFile ? { url: dataUrl(faceFile), pos: Number(path.basename(faceFile).match(/@(\d{1,3})/)?.[1] ?? 50) } : null;
      if (!face) console.log(`  manca il volto "${tier.id}" (${tier.face}) in faces/: uso la chiusura senza volto`);
      const dir = path.join(outDir, `${d + 1}-${slug(day.label)}`);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const files = await renderDay(page, ctx, bg.files, d * 5, face, dir);
      fs.writeFileSync(path.join(dir, "didascalia.txt"), caption(ctx, number, tier, args.hashtags, !!face));
      console.log(`${path.relative(process.cwd(), dir)}  ·  ${ctx.dayLabel}  ·  ${files.length} immagini  ·  ${tier.id}  ·  🎵 ${tier.song}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
