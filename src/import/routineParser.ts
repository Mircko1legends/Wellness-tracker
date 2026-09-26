import { ColorBlock, decodePage, findBlocks } from "./grid";
import { DAY_MINUTES, formatHm, parseHm, roundTo } from "./time";
import { ImportedActivity, PdfAnalysis, RoutineParseResult, TextItem } from "./types";

const TIME = String.raw`\d{1,2}[:.]\d{2}`;
// Separator may be a dash/"alle"/"a", or just whitespace (start and end in separate table columns).
const RANGE = new RegExp(`(${TIME})(?:\\s*(?:-|–|—|->|→|alle|a)\\s*|\\s+)(${TIME})`, "i");
const LEADING_TIME = new RegExp(`^\\s*(${TIME})(?!\\d)\\s*[-–—:|•]?\\s*(.+)$`);
const ONLY_TIME = new RegExp(`^\\s*${TIME}\\s*$`);
const EDGE_SEPARATORS = /^[\s\-–—:|•·,()]+|[\s\-–—:|•·,()]+$/g;

const DAY_PATTERNS: [RegExp, number][] = [
  [/^(lun|mon)/i, 1],
  [/^(mar|tue)/i, 2],
  [/^(mer|wed)/i, 3],
  [/^(gio|thu)/i, 4],
  [/^(ven|fri)/i, 5],
  [/^(sab|sat)/i, 6],
  [/^(dom|sun)/i, 0],
];

function dayOf(text: string): number | null {
  const t = text.trim();
  if (t.length > 10) return null;
  for (const [re, day] of DAY_PATTERNS) if (re.test(t)) return day;
  return null;
}

const center = (t: { x: number; y: number; w: number; h: number }) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });

function stdev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

export interface TextLine {
  text: string;
  y: number;
  items: TextItem[];
}

export function groupLines(texts: TextItem[]): TextLine[] {
  const sorted = [...texts].sort((a, b) => center(a).y - center(b).y || a.x - b.x);
  const lines: TextLine[] = [];
  for (const item of sorted) {
    const cy = center(item).y;
    const line = lines.find((l) => Math.abs(l.y - cy) < Math.max(item.h, 6) * 0.6);
    if (line) line.items.push(item);
    else lines.push({ text: "", y: cy, items: [item] });
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str.trim()).join(" ").replace(/\s+/g, " ").trim();
  }
  return lines;
}

function cleanTitle(text: string): string {
  return text.replace(EDGE_SEPARATORS, "").replace(/\s+/g, " ").trim();
}

function countBackwardSteps(starts: number[]): number {
  let back = 0;
  for (let i = 1; i < starts.length; i++) if (starts[i] < starts[i - 1]) back++;
  return back;
}

/** "07:00 - 07:30 Colazione", "Colazione 07:00–07:30", "07:00 Colazione" lines. */
export function parseTextRoutine(analysis: PdfAnalysis): RoutineParseResult | null {
  const parsed: { title: string; start: number; end: number | null }[] = [];
  for (const page of analysis.pages) {
    for (const line of groupLines(page.texts)) {
      const range = line.text.match(RANGE);
      if (range) {
        const start = parseHm(range[1].replace(".", ":"));
        const end = parseHm(range[2].replace(".", ":"));
        const title = cleanTitle(line.text.replace(range[0], " "));
        if (start !== null && end !== null && title && !ONLY_TIME.test(title)) parsed.push({ title, start, end });
        continue;
      }
      const leading = line.text.match(LEADING_TIME);
      if (leading) {
        const start = parseHm(leading[1].replace(".", ":"));
        const title = cleanTitle(leading[2]);
        if (start !== null && title && !ONLY_TIME.test(title) && /[a-zà-ú]/i.test(title)) parsed.push({ title, start, end: null });
      }
    }
  }
  if (parsed.length < 3) return null;

  const activities: ImportedActivity[] = parsed.map((p, i) => {
    const end = p.end ?? parsed[i + 1]?.start ?? p.start + 30;
    return { title: p.title, start: formatHm(p.start), end: formatHm(end) };
  });
  const backward = countBackwardSteps(parsed.map((p) => p.start));
  const hasAxis = analysis.pages.some((p) => detectAxis(p.texts) !== null);
  const notes: string[] = [];
  if (parsed.some((p) => p.end === null)) notes.push("Alcune attività non avevano l'orario di fine: ho usato l'inizio della successiva.");
  const confidence = (backward <= 1 ? 0.9 : 0.5) * (hasAxis ? 0.5 : 1);
  return { method: "text", activities: joinContiguous(activities), confidence, notes };
}

interface Axis {
  vertical: boolean;
  minutesPerPixel: number;
  toMinutes: (coord: number) => number;
  maxResidual: number;
  labels: TextItem[];
  edge: number; // x (vertical) or y (horizontal) beyond which the chart area starts
}

function detectAxis(texts: TextItem[]): Axis | null {
  const labels = texts.filter((t) => ONLY_TIME.test(t.str));
  if (labels.length < 3) return null;
  const xs = labels.map((l) => center(l).x);
  const ys = labels.map((l) => center(l).y);
  const vertical = stdev(xs) < stdev(ys);
  if ((vertical ? stdev(xs) : stdev(ys)) > 30) return null;

  const points = labels
    .map((l) => ({ coord: vertical ? l.y + l.h * 0.65 : center(l).x, minutes: parseHm(l.str.trim().replace(".", ":"))! }))
    .sort((a, b) => a.coord - b.coord);
  for (let i = 1; i < points.length; i++) {
    while (points[i].minutes < points[i - 1].minutes) points[i].minutes += DAY_MINUTES;
  }
  const n = points.length;
  const mc = points.reduce((s, p) => s + p.coord, 0) / n;
  const mm = points.reduce((s, p) => s + p.minutes, 0) / n;
  const cov = points.reduce((s, p) => s + (p.coord - mc) * (p.minutes - mm), 0);
  const varc = points.reduce((s, p) => s + (p.coord - mc) ** 2, 0);
  if (varc === 0) return null;
  const a = cov / varc;
  const b = mm - a * mc;
  if (a <= 0) return null;
  const maxResidual = Math.max(...points.map((p) => Math.abs(a * p.coord + b - p.minutes)));
  if (maxResidual > 20) return null;
  const edge = vertical ? Math.max(...labels.map((l) => l.x + l.w)) : Math.max(...labels.map((l) => l.y + l.h));
  return { vertical, minutesPerPixel: a, toMinutes: (coord) => a * coord + b, maxResidual, labels, edge };
}

/** Legend entries: a small coloured square followed by its title on the same line. */
function readLegend(blocks: ColorBlock[], texts: TextItem[]): Map<number, string> {
  const legend = new Map<number, string>();
  const swatches = blocks.filter((b) => b.fill > 0.8 && b.w <= 30 && b.h <= 30 && b.w / b.h < 2.5 && b.h / b.w < 2.5);
  for (const swatch of swatches) {
    const sy = swatch.y + swatch.h / 2;
    const right = swatch.x + swatch.w;
    const candidates = groupLines(texts.filter((t) => t.x >= right - 2 && t.x - right < 40 && Math.abs(center(t).y - sy) < Math.max(t.h, swatch.h)));
    const line = candidates[0];
    if (line && !legend.has(swatch.group)) legend.set(swatch.group, cleanTitle(line.text));
  }
  return legend;
}

function textsInside(texts: TextItem[], b: { x: number; y: number; w: number; h: number }): string {
  const inside = texts.filter((t) => {
    const c = center(t);
    return c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h;
  });
  return cleanTitle(groupLines(inside).map((l) => l.text).join(" "));
}

function mergeActivities(list: (ImportedActivity & { day?: number })[], hasDays: boolean): ImportedActivity[] {
  const merged = new Map<string, ImportedActivity>();
  for (const item of list) {
    const key = `${item.title}|${item.start}|${item.end}`;
    const existing = merged.get(key);
    if (!existing) {
      const { day, ...rest } = item;
      merged.set(key, hasDays && day !== undefined ? { ...rest, days: [day] } : rest);
    } else if (hasDays && item.day !== undefined && existing.days && !existing.days.includes(item.day)) {
      existing.days.push(item.day);
      existing.days.sort();
    }
  }
  return [...merged.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** Coloured blocks along a time axis; optional day columns (weekly planners) and a colour legend. */
export function parseChartRoutine(analysis: PdfAnalysis): RoutineParseResult | null {
  for (const page of analysis.pages) {
    const axis = detectAxis(page.texts);
    if (!axis) continue;
    const decoded = decodePage(page);
    const blocks = findBlocks(decoded);
    const legend = readLegend(blocks, page.texts);
    const labelSet = new Set(axis.labels);
    const dayHeaders = page.texts
      .map((t) => ({ t, day: dayOf(t.str) }))
      .filter((d): d is { t: TextItem; day: number } => d.day !== null);
    const hasDays = dayHeaders.length >= 3;
    const bodyTexts = page.texts.filter((t) => !labelSet.has(t) && !dayHeaders.some((d) => d.t === t));

    const dayOfBlock = (b: ColorBlock): number | undefined => {
      if (!hasDays) return undefined;
      const coord = axis.vertical ? center(b).x : center(b).y;
      const pos = (t: TextItem) => (axis.vertical ? center(t).x : center(t).y);
      return [...dayHeaders].sort((p, q) => Math.abs(pos(p.t) - coord) - Math.abs(pos(q.t) - coord))[0].day;
    };
    const candidates = dropNested(blocks).filter(
      (b) =>
        b.fill > 0.8 &&
        b.cells >= 40 &&
        (axis.vertical ? b.x > axis.edge - 4 : b.y > axis.edge - 4) &&
        !(b.w <= 30 && b.h <= 30)
    );
    const byDay = new Map<number | undefined, ColorBlock[]>();
    for (const b of candidates) {
      const day = dayOfBlock(b);
      byDay.set(day, [...(byDay.get(day) ?? []), b]);
    }
    const chartBlocks: { block: ColorBlock; day: number | undefined }[] = [];
    byDay.forEach((list, day) => mergeSplitBlocks(list, axis.vertical).forEach((block) => chartBlocks.push({ block, day })));
    if (chartBlocks.length < 2) continue;

    const notes: string[] = [];
    // Block edges are known to about ±1.5 px: on small charts that's more than 2 minutes.
    const step = 1.5 * axis.minutesPerPixel > 2 ? 15 : 5;
    if (step === 15) notes.push("Grafico piccolo: ho arrotondato gli orari al quarto d'ora, controllali.");
    let untitled = 0;
    const found = chartBlocks.map(({ block: b, day }) => {
      const from = axis.vertical ? b.y : b.x;
      const to = axis.vertical ? b.y + b.h : b.x + b.w;
      let title = textsInside(bodyTexts, b) || legend.get(b.group) || "";
      if (!title) {
        untitled++;
        title = `Attività ${b.color}`;
      }
      return {
        title,
        start: formatHm(roundTo(axis.toMinutes(from), step)),
        end: formatHm(roundTo(axis.toMinutes(to), step)),
        color: b.color,
        day,
      };
    });
    if (untitled) notes.push(`${untitled} blocchi senza titolo leggibile: rinominali qui sotto.`);
    if (hasDays) notes.push("Ho riconosciuto i giorni della settimana: ogni attività vale solo nei giorni in cui compare.");
    const activities = joinContiguous(mergeActivities(found, hasDays));
    const confidence = 0.85 - (untitled ? 0.25 : 0) - (axis.maxResidual > 8 ? 0.1 : 0);
    return { method: "chart", activities, confidence, notes };
  }
  return null;
}

/** Anti-aliased text inside a block shows up as small tinted regions: ignore anything nested in a bigger block. */
function dropNested(blocks: ColorBlock[]): ColorBlock[] {
  return blocks.filter(
    (b) =>
      !blocks.some(
        (o) => o !== b && o.cells > b.cells && b.x >= o.x - 2 && b.y >= o.y - 2 && b.x + b.w <= o.x + o.w + 2 && b.y + b.h <= o.y + o.h + 2
      )
  );
}

/** Text drawn across a thin block can cut it in two pieces of the same colour: stitch them back. */
function mergeSplitBlocks(blocks: ColorBlock[], vertical: boolean): ColorBlock[] {
  const out: ColorBlock[] = [];
  const tol = 6;
  for (const b of [...blocks].sort((p, q) => p.x - q.x || p.y - q.y)) {
    const twin = out.find((o) => {
      if (o.group !== b.group) return false;
      if (vertical) {
        const sameSpan = Math.abs(o.y - b.y) <= tol && Math.abs(o.y + o.h - (b.y + b.h)) <= tol;
        const touching = b.x <= o.x + o.w + tol * 3;
        return sameSpan && touching;
      }
      const sameSpan = Math.abs(o.x - b.x) <= tol && Math.abs(o.x + o.w - (b.x + b.w)) <= tol;
      const touching = b.y <= o.y + o.h + tol * 3;
      return sameSpan && touching;
    });
    if (!twin) {
      out.push({ ...b });
      continue;
    }
    const x = Math.min(twin.x, b.x);
    const y = Math.min(twin.y, b.y);
    twin.w = Math.max(twin.x + twin.w, b.x + b.w) - x;
    twin.h = Math.max(twin.y + twin.h, b.y + b.h) - y;
    twin.x = x;
    twin.y = y;
    twin.cells += b.cells;
  }
  return out;
}

/** 24h pie/donut chart. 00:00 is calibrated from hour labels around the circle, else assumed at the top. */
export function parsePieRoutine(analysis: PdfAnalysis): RoutineParseResult | null {
  for (const page of analysis.pages) {
    const decoded = decodePage(page);
    const blocks = findBlocks(decoded);
    const slices = dropNested(blocks).filter((b) => b.fill < 0.8 && b.cells >= 60);
    if (slices.length < 2) continue;

    const minX = Math.min(...slices.map((s) => s.x));
    const maxX = Math.max(...slices.map((s) => s.x + s.w));
    const minY = Math.min(...slices.map((s) => s.y));
    const maxY = Math.max(...slices.map((s) => s.y + s.h));
    const aspect = (maxX - minX) / (maxY - minY);
    if (aspect < 0.8 || aspect > 1.25) continue;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const R = Math.max(maxX - minX, maxY - minY) / 2;
    const angleOf = (x: number, y: number) => ((Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI + 360) % 360;

    const hourLabels = page.texts
      .map((t) => {
        const m = t.str.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
        if (!m) return null;
        const c = center(t);
        const dist = Math.hypot(c.x - cx, c.y - cy);
        if (dist < R * 0.9 || dist > R * 1.6) return null;
        return { angle: angleOf(c.x, c.y), hours: Number(m[1]) + Number(m[2] ?? 0) / 60 };
      })
      .filter((l): l is { angle: number; hours: number } => l !== null);

    const notes: string[] = [];
    let offset = 0;
    let calibrated = false;
    if (hourLabels.length >= 2) {
      const sx = hourLabels.reduce((s, l) => s + Math.sin(((l.angle - l.hours * 15) * Math.PI) / 180), 0);
      const sy = hourLabels.reduce((s, l) => s + Math.cos(((l.angle - l.hours * 15) * Math.PI) / 180), 0);
      offset = ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360;
      calibrated = true;
    } else {
      notes.push("Nel grafico non ci sono le ore: ho supposto mezzanotte in alto. Controlla l'orario della prima fetta.");
    }
    const toMinutes = (angle: number) => roundTo((((angle - offset) % 360) + 360) % 360 * 4) % DAY_MINUTES;

    const legend = readLegend(blocks, page.texts);
    const { cols, cell } = page;
    let untitled = 0;
    const activities: ImportedActivity[] = slices.map((slice) => {
      const bins = new Uint8Array(360);
      for (const i of slice.cellIndices) {
        const x = (i % cols) * cell + cell / 2;
        const y = Math.floor(i / cols) * cell + cell / 2;
        bins[Math.floor(angleOf(x, y)) % 360] = 1;
      }
      // The slice spans everything except the largest empty arc.
      let bestStart = 0;
      let bestLen = 0;
      for (let s = 0; s < 360; s++) {
        if (bins[s] || !bins[(s + 359) % 360]) continue;
        let len = 0;
        while (len < 360 && !bins[(s + len) % 360]) len++;
        if (len > bestLen) {
          bestLen = len;
          bestStart = s;
        }
      }
      const from = (bestStart + bestLen) % 360;
      const to = bestStart;
      const title =
        textsInside(page.texts, slice) ||
        legend.get(slice.group) ||
        (() => {
          untitled++;
          return `Attività ${slice.color}`;
        })();
      return { title, start: formatHm(toMinutes(from)), end: formatHm(toMinutes(to)), color: slice.color };
    });
    if (untitled) notes.push(`${untitled} fette senza titolo leggibile: rinominale qui sotto.`);
    const confidence = (calibrated ? 0.75 : 0.45) - (untitled ? 0.2 : 0);
    return { method: "pie", activities: joinContiguous(activities), confidence, notes };
  }
  return null;
}

/** "Sonno 23:30-00:00" + "Sonno 00:00-06:30" -> "Sonno 23:30-06:30". */
export function joinContiguous(list: ImportedActivity[]): ImportedActivity[] {
  const out = [...list].sort((a, b) => a.start.localeCompare(b.start));
  let changed = true;
  while (changed && out.length > 1) {
    changed = false;
    for (let i = 0; i < out.length && !changed; i++) {
      for (let j = 0; j < out.length && !changed; j++) {
        const a = out[i];
        const b = out[j];
        if (i === j || a.title !== b.title || a.end !== b.start) continue;
        if ((a.days ?? []).join() !== (b.days ?? []).join()) continue;
        out[i] = { ...a, end: b.end };
        out.splice(j, 1);
        changed = true;
      }
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Runs every strategy and keeps the most convincing result. */
export function parseRoutine(analysis: PdfAnalysis): RoutineParseResult | null {
  const results = [parseTextRoutine(analysis), parseChartRoutine(analysis), parsePieRoutine(analysis)].filter(
    (r): r is RoutineParseResult => r !== null && r.activities.length >= 2
  );
  results.sort((a, b) => b.confidence - a.confidence || b.activities.length - a.activities.length);
  return results[0] ?? null;
}

