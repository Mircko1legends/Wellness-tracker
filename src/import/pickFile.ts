import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

export interface PickedFile {
  name: string;
  mimeType: string;
  base64: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "text/plain", "text/csv", "application/json", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? (asset.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
  let base64: string;
  if (Platform.OS === "web") {
    base64 = toBase64(await (await fetch(asset.uri)).arrayBuffer());
  } else {
    const { readAsStringAsync, EncodingType } = await import("expo-file-system/legacy");
    base64 = await readAsStringAsync(asset.uri, { encoding: EncodingType.Base64 });
  }
  return { name: asset.name, mimeType, base64 };
}
