import { Platform } from "react-native";
import { WellnessEntry } from "../types";

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function entriesToCsv(entries: WellnessEntry[]): string {
  const header = [
    "date",
    "mood",
    "sleepHours",
    "waterGlasses",
    "activityMinutes",
    "bonusMissions",
    "notes",
  ];
  const rows = entries.map((e) =>
    [
      e.date,
      String(e.mood),
      String(e.sleepHours),
      String(e.waterGlasses),
      String(e.activityMinutes),
      escapeCsvField((e.bonusMissions ?? []).join(";")),
      escapeCsvField(e.notes ?? ""),
    ].join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export async function exportEntries(entries: WellnessEntry[]): Promise<boolean> {
  const csv = entriesToCsv(entries);
  const fileName = `wellness-tracker-${Date.now()}.csv`;

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: "Esporta dati Wellness Tracker",
      UTI: "public.comma-separated-values-text",
    });
    return true;
  }
  return false;
}
