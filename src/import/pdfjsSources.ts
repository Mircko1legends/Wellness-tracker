import { Asset } from "expo-asset";
import { Platform } from "react-native";

let cached: Promise<{ pdf: string; worker: string }> | null = null;

async function readAssetText(asset: Asset): Promise<string> {
  if (Platform.OS === "web") return (await fetch(asset.uri)).text();
  const { readAsStringAsync } = await import("expo-file-system/legacy");
  return readAsStringAsync(asset.localUri ?? asset.uri);
}

/** pdf.js bundled with the app as text assets, so reading PDFs works offline. */
export function loadPdfjsSources(): Promise<{ pdf: string; worker: string }> {
  if (!cached) {
    cached = (async () => {
      const [pdfAsset, workerAsset] = await Asset.loadAsync([
        require("../../assets/pdfjs/pdf.min.txt"),
        require("../../assets/pdfjs/pdf.worker.min.txt"),
      ]);
      const [pdf, worker] = await Promise.all([readAssetText(pdfAsset), readAssetText(workerAsset)]);
      return { pdf, worker };
    })();
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}
