import { PageAnalysis } from "./types";

export interface ColorBlock {
  group: number;
  color: string;
  x: number; // page pixels
  y: number;
  w: number;
  h: number;
  cells: number;
  fill: number; // cells / bounding-box cells: ~1 for rectangles, lower for pie slices
  cellIndices: number[];
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Groups near-identical palette colours (anti-aliasing, quantisation) into one colour. */
export function groupPalette(palette: string[], threshold = 16): { groupOf: number[]; groupColor: string[] } {
  const groupOf: number[] = [];
  const groupColor: string[] = [];
  const groupRgb: [number, number, number][] = [];
  palette.forEach((hex, i) => {
    const rgb = hexToRgb(hex);
    const existing = groupRgb.findIndex(
      (g) => Math.hypot(g[0] - rgb[0], g[1] - rgb[1], g[2] - rgb[2]) < threshold
    );
    if (existing >= 0) {
      groupOf[i] = existing;
    } else {
      groupOf[i] = groupRgb.length;
      groupRgb.push(rgb);
      groupColor.push(hex);
    }
  });
  return { groupOf, groupColor };
}

export interface DecodedPage {
  page: PageAnalysis;
  cells: Int16Array; // colour group per cell, -1 for white, -2 for grey/black ink
  groupColor: string[];
}

export function decodePage(page: PageAnalysis): DecodedPage {
  const raw = decodeBase64(page.grid);
  const { groupOf, groupColor } = groupPalette(page.palette);
  const cells = new Int16Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    cells[i] = raw[i] === 0 ? -1 : raw[i] === 1 ? -2 : groupOf[raw[i] - 2];
  }
  return { page, cells, groupColor };
}

/** Connected regions of one colour (4-neighbourhood), ignoring tiny specks. */
export function findBlocks(decoded: DecodedPage, minCells = 6): ColorBlock[] {
  const { page, cells, groupColor } = decoded;
  const { cols, rows, cell } = page;
  const seen = new Uint8Array(cells.length);
  const blocks: ColorBlock[] = [];
  const stack: number[] = [];

  for (let start = 0; start < cells.length; start++) {
    const group = cells[start];
    if (group < 0 || seen[start]) continue;
    const indices: number[] = [];
    let minC = cols, maxC = 0, minR = rows, maxR = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      indices.push(i);
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      const neighbours = [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1];
      for (const n of neighbours) {
        if (n >= 0 && !seen[n] && cells[n] === group) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (indices.length < minCells) continue;
    const bboxCells = (maxC - minC + 1) * (maxR - minR + 1);
    blocks.push({
      group,
      color: groupColor[group],
      x: minC * cell,
      y: minR * cell,
      w: (maxC - minC + 1) * cell,
      h: (maxR - minR + 1) * cell,
      cells: indices.length,
      fill: indices.length / bboxCells,
      cellIndices: indices,
    });
  }
  return blocks;
}

/** Most common colour group under a rectangle, or -1 when it's on white/grey. */
export function dominantGroupIn(decoded: DecodedPage, x: number, y: number, w: number, h: number): number {
  const { page, cells } = decoded;
  const counts = new Map<number, number>();
  const c0 = Math.max(0, Math.floor(x / page.cell));
  const c1 = Math.min(page.cols - 1, Math.floor((x + w) / page.cell));
  const r0 = Math.max(0, Math.floor(y / page.cell));
  const r1 = Math.min(page.rows - 1, Math.floor((y + h) / page.cell));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const g = cells[r * page.cols + c];
      if (g >= 0) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  let best = -1;
  let bestCount = 0;
  counts.forEach((count, g) => {
    if (count > bestCount) {
      best = g;
      bestCount = count;
    }
  });
  return best;
}
