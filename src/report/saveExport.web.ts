import { takeSnapshot } from "../backup/backup";
import { buildWeekExport } from "./weekExport";

/** In the browser the file is simply downloaded. */
export async function saveWeekExport(anyDay: string): Promise<string> {
  const week = buildWeekExport(await takeSnapshot(), anyDay);
  const name = `resoconto-${week.week}.json`;
  const blob = new Blob([JSON.stringify(week, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}
