import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { buildEngineHtml } from "./engineSource";
import { loadPdfjsSources } from "./pdfjsSources";
import { PdfAnalysis } from "./types";

const TIMEOUT_MS = 60_000;

type Pending = { resolve: (a: PdfAnalysis) => void; reject: (e: Error) => void };

/** Android: pdf.js runs in a hidden WebView. Render `host` somewhere in the screen that uses it. */
export function usePdfEngine() {
  const [html, setHtml] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const ready = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

  const ensureReady = useCallback(async () => {
    if (!ready.current) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      ready.current = { promise, resolve };
      const { pdf, worker } = await loadPdfjsSources();
      setHtml(buildEngineHtml(pdf, worker));
    }
    await ready.current.promise;
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.ready) {
      ready.current?.resolve();
      return;
    }
    const waiter = pending.current.get(msg.id);
    if (!waiter) return;
    pending.current.delete(msg.id);
    if (msg.error) waiter.reject(new Error(msg.error));
    else waiter.resolve(msg.result as PdfAnalysis);
  }, []);

  const analyze = useCallback(
    async (base64: string): Promise<PdfAnalysis> => {
      await ensureReady();
      const id = nextId.current++;
      return new Promise<PdfAnalysis>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error("Lettura del PDF troppo lenta"));
        }, TIMEOUT_MS);
        pending.current.set(id, {
          resolve: (a) => {
            clearTimeout(timer);
            resolve(a);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        });
        webRef.current?.postMessage(JSON.stringify({ id, base64, maxPages: 6 }));
      });
    },
    [ensureReady]
  );

  const host = html ? (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ html, baseUrl: "https://localhost/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onMessage={onMessage}
      />
    </View>
  ) : null;

  return { host, analyze };
}
