import { Platform } from "react-native";
import { getBackupFolder } from "../backup/backup";

export type PhotoKind = "viso" | "fisico";

export interface ProgressPhoto {
  id: string;
  date: string;
  kind: PhotoKind;
  uri: string; // copy inside the app
  backupUri?: string; // copy in the backup folder, which survives uninstalling the app
}

export const PHOTO_TIPS: Record<PhotoKind, string> = {
  viso: "Stessa finestra, luce del giorno, niente filtri. Viso dritto, poi un profilo. Mattina, a pelle pulita.",
  fisico: "Stesso posto e stessa luce, al mattino prima di colazione. Fronte, fianco e schiena, stessa distanza.",
};

export const isProgressPhotoSupported = Platform.OS !== "web";

/** Keeps the photo in the app and, when a backup folder is set, also there (private, never uploaded). */
export async function storeProgressPhoto(sourceUri: string, kind: PhotoKind, date: string): Promise<ProgressPhoto> {
  const FS = await import("expo-file-system/legacy");
  const id = `${date}-${kind}-${Date.now()}`;
  const dir = `${FS.documentDirectory}progress/`;
  await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const uri = `${dir}${id}.jpg`;
  await FS.copyAsync({ from: sourceUri, to: uri });
  const photo: ProgressPhoto = { id, date, kind, uri };
  const folder = await getBackupFolder();
  if (folder) {
    try {
      const base64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
      const backupUri = await FS.StorageAccessFramework.createFileAsync(folder, `progressi-${id}`, "image/jpeg");
      await FS.writeAsStringAsync(backupUri, base64, { encoding: FS.EncodingType.Base64 });
      photo.backupUri = backupUri;
    } catch {
      // the in-app copy is enough to go on
    }
  }
  return photo;
}

export async function deleteProgressPhoto(photo: ProgressPhoto): Promise<void> {
  const FS = await import("expo-file-system/legacy");
  await FS.deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
  if (photo.backupUri) await FS.StorageAccessFramework.deleteAsync(photo.backupUri).catch(() => {});
}

export function daysSinceLast(photos: ProgressPhoto[], kind: PhotoKind, today: string): number | null {
  const last = photos.filter((p) => p.kind === kind).map((p) => p.date).sort().pop();
  if (!last) return null;
  return Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86_400_000);
}
