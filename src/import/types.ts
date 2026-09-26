export interface TextItem {
  str: string;
  x: number;
  y: number; // top edge, page pixels
  w: number;
  h: number;
}

export interface PageAnalysis {
  width: number;
  height: number;
  cell: number;
  cols: number;
  rows: number;
  grid: string; // base64, one byte per cell: 0 white, 1 grey/black, n>=2 palette[n-2]
  palette: string[];
  texts: TextItem[];
}

export interface PdfAnalysis {
  numPages: number;
  pages: PageAnalysis[];
}

export interface ImportedActivity {
  title: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM", may be earlier than start when it crosses midnight
  color?: string;
  days?: number[]; // 0 = Sunday ... 6 = Saturday; undefined = every day
  steps?: { time: string; label: string }[]; // micro-actions supplied by the AI reader
}

export type ParseMethod = "text" | "chart" | "pie" | "ai" | "manual";

export interface RoutineParseResult {
  method: ParseMethod;
  activities: ImportedActivity[];
  confidence: number; // 0..1
  notes: string[];
}
