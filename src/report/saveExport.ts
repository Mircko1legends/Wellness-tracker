import * as Sharing from "expo-sharing";
import { takeSnapshot } from "../backup/backup";
import { buildWeekExport } from "./weekExport";

/** Writes the week's file and opens the share sheet: save it in Files/Drive or send it straight to the chat. */
export async function saveWeekExport(anyDay: string): Promise<string> {
  const week = buildWeekExport(await takeSnapshot(), anyDay);
  const name = `resoconto-${week.week}.json`;
  const FS = await import("expo-file-system/legacy");
  const uri = `${FS.cacheDirectory}${name}`;
  await FS.writeAsStringAsync(uri, JSON.stringify(week, null, 1));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: `Resoconto ${week.week}` });
  }
  return name;
}
