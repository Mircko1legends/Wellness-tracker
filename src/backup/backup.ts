import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { todayKey, addDays, toDateKey } from "../utils/date";
import { buildWeeklyTableCsv, isoWeekLabel, StorageSnapshot } from "../utils/weeklyTable";

// Outside the "@wellness/" namespace so it is neither backed up nor wiped by "reset all data".
const META_KEYS = {
  folder: "@wellnessMeta/backupFolder",
  lastBackupAt: "@wellnessMeta/lastBackupAt",
} as const;

const DATA_PREFIX = "@wellness/";
const BACKUP_PREFIX = "wellness-backup-";
const WEEK_PREFIX = "settimana-";
const BACKUPS_TO_KEEP = 30;
const BACKUP_FORMAT_VERSION = 1;

export const isBackupSupported = Platform.OS === "android";

export type BackupResult =
  | { status: "ok"; at: number }
  | { status: "no-folder" }
  | { status: "no-access" }
  | { status: "unsupported" };

async function saf() {
  const { StorageAccessFramework } = await import("expo-file-system/legacy");
  return StorageAccessFramework;
}

/** SAF file URIs encode the path; the display name is the last segment. */
export function fileNameFromUri(uri: string): string {
  return decodeURIComponent(uri).split("/").pop() ?? "";
}

export async function getBackupFolder(): Promise<string | null> {
  return AsyncStorage.getItem(META_KEYS.folder);
}

export async function getLastBackupAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(META_KEYS.lastBackupAt);
  return raw ? Number(raw) : null;
}

export async function chooseBackupFolder(): Promise<string | null> {
  if (!isBackupSupported) return null;
  const SAF = await saf();
  const result = await SAF.requestDirectoryPermissionsAsync();
  if (!result.granted) return null;
  await AsyncStorage.setItem(META_KEYS.folder, result.directoryUri);
  return result.directoryUri;
}

export async function takeSnapshot(): Promise<StorageSnapshot> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(DATA_PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  const snapshot: StorageSnapshot = {};
  for (const [key, value] of pairs) {
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

/** Replaces a file by deleting and recreating it: SAF "w" writes don't truncate on every device. */
async function replaceFile(folder: string, existing: string[], baseName: string, mimeType: string, contents: string) {
  const SAF = await saf();
  for (const uri of existing) {
    if (fileNameFromUri(uri).startsWith(baseName)) await SAF.deleteAsync(uri, { idempotent: true });
  }
  const uri = await SAF.createFileAsync(folder, baseName, mimeType);
  await SAF.writeAsStringAsync(uri, contents);
}

export async function runBackup(): Promise<BackupResult> {
  if (!isBackupSupported) return { status: "unsupported" };
  const folder = await getBackupFolder();
  if (!folder) return { status: "no-folder" };

  try {
    const SAF = await saf();
    const existing = await SAF.readDirectoryAsync(folder);
    const snapshot = await takeSnapshot();
    const today = todayKey();
    const now = Date.now();

    const backup = JSON.stringify({ app: "wellness-tracker", version: BACKUP_FORMAT_VERSION, createdAt: now, data: snapshot });
    await replaceFile(folder, existing, `${BACKUP_PREFIX}${today}`, "application/json", backup);

    // Current week plus the previous one, so a week that ended while the app was closed is finalized.
    const lastWeekDay = toDateKey(addDays(new Date(), -7));
    for (const day of [today, lastWeekDay]) {
      await replaceFile(folder, existing, `${WEEK_PREFIX}${isoWeekLabel(day)}`, "text/csv", buildWeeklyTableCsv(snapshot, day));
    }

    const oldBackups = existing
      .filter((uri) => fileNameFromUri(uri).startsWith(BACKUP_PREFIX))
      .sort((a, b) => fileNameFromUri(b).localeCompare(fileNameFromUri(a)))
      .slice(BACKUPS_TO_KEEP - 1);
    for (const uri of oldBackups) await SAF.deleteAsync(uri, { idempotent: true });

    await AsyncStorage.setItem(META_KEYS.lastBackupAt, String(now));
    return { status: "ok", at: now };
  } catch {
    // Most likely the folder was deleted or its permission revoked.
    return { status: "no-access" };
  }
}

export interface BackupFile {
  createdAt: number;
  data: StorageSnapshot;
}

export function parseBackup(json: string): BackupFile | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.app !== "wellness-tracker" || typeof parsed.data !== "object") return null;
    return { createdAt: Number(parsed.createdAt), data: parsed.data as StorageSnapshot };
  } catch {
    return null;
  }
}

/** Finds the newest backup in the chosen folder and writes it back into app storage. */
export type RestoreResult =
  | { status: "restored"; createdAt: number }
  | { status: "none" }
  | { status: "no-folder" }
  | { status: "no-access" }
  | { status: "unsupported" };

export async function restoreLatestBackup(): Promise<RestoreResult> {
  if (!isBackupSupported) return { status: "unsupported" };
  const folder = await getBackupFolder();
  if (!folder) return { status: "no-folder" };
  try {
    const SAF = await saf();
    const newest = (await SAF.readDirectoryAsync(folder))
      .filter((uri) => fileNameFromUri(uri).startsWith(BACKUP_PREFIX))
      .sort((a, b) => fileNameFromUri(b).localeCompare(fileNameFromUri(a)))[0];
    if (!newest) return { status: "none" };
    const backup = parseBackup(await SAF.readAsStringAsync(newest));
    if (!backup) return { status: "none" };

    const currentKeys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(DATA_PREFIX));
    await AsyncStorage.multiRemove(currentKeys);
    await AsyncStorage.multiSet(Object.entries(backup.data));
    return { status: "restored", createdAt: backup.createdAt };
  } catch {
    return { status: "no-access" };
  }
}
