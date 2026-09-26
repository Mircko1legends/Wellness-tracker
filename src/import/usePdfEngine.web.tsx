import { useCallback } from "react";
import { ENGINE_JS } from "./engineSource";
import { loadPdfjsSources } from "./pdfjsSources";
import { PdfAnalysis } from "./types";

type Engine = (base64: string) => Promise<PdfAnalysis>;
let engine: Promise<Engine> | null = null;

function loadEngine(): Promise<Engine> {
  if (!engine) {
    engine = (async () => {
      const { pdf, worker } = await loadPdfjsSources();
      // Built at runtime so the bundler doesn't try to resolve the blob-URL import.
      const api = new Function(`${ENGINE_JS}; return { analyze: __wtAnalyzePdf, load: __wtLoadPdfjs };`)();
      const importer = new Function("u", "return import(u)");
      const lib = await api.load(pdf, worker, importer);
      return (base64: string) => {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return api.analyze(lib, bytes, 6);
      };
    })();
    engine.catch(() => {
      engine = null;
    });
  }
  return engine;
}

/** Web: pdf.js runs directly in the page. */
export function usePdfEngine() {
  const analyze = useCallback(async (base64: string) => (await loadEngine())(base64), []);
  return { host: null, analyze };
}
