/**
 * Browser-side PDF extractor, shipped as a string because it runs inside a WebView on Android
 * (and in the page on web). It only extracts raw data: text with positions and a coarse colour grid
 * of each rendered page. All interpretation happens in TypeScript (see routineParser.ts).
 *
 * Grid values: 0 = white background, 1 = grey/black ink, n >= 2 = palette[n - 2].
 */
export const ENGINE_JS = String.raw`
async function __wtAnalyzePdf(pdfjs, bytes, maxPages) {
  var doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  var pages = [];
  var count = Math.min(doc.numPages, maxPages || 6);
  for (var p = 1; p <= count; p++) {
    var page = await doc.getPage(p);
    var base = page.getViewport({ scale: 1 });
    var scale = 1000 / Math.max(base.width, base.height);
    var vp = page.getViewport({ scale: scale });

    var content = await page.getTextContent();
    var texts = [];
    for (var i = 0; i < content.items.length; i++) {
      var it = content.items[i];
      if (!it.str || !it.str.trim()) continue;
      var tx = pdfjs.Util.transform(vp.transform, it.transform);
      var fh = Math.hypot(tx[2], tx[3]);
      texts.push({ str: it.str, x: tx[4], y: tx[5] - fh, w: it.width * scale, h: fh });
    }

    var canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas, canvasContext: ctx, viewport: vp }).promise;
    var px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    var cell = 2;
    var cols = Math.floor(canvas.width / cell);
    var rows = Math.floor(canvas.height / cell);
    var grid = new Uint8Array(cols * rows);
    var palette = [];
    var index = new Map();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var o = ((r * cell + 1) * canvas.width + (c * cell + 1)) * 4;
        var R = px[o], G = px[o + 1], B = px[o + 2];
        var mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        var v;
        if (mn > 235) v = 0;
        else if (mx - mn < 28) v = 1;
        else {
          var key = (Math.round(R / 24) << 16) | (Math.round(G / 24) << 8) | Math.round(B / 24);
          var found = index.get(key);
          if (found === undefined) {
            if (palette.length >= 250) { v = 1; grid[r * cols + c] = v; continue; }
            found = palette.length;
            index.set(key, found);
            palette.push("#" + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1));
          }
          v = found + 2;
        }
        grid[r * cols + c] = v;
      }
    }
    var bin = "";
    for (var k = 0; k < grid.length; k += 8192) bin += String.fromCharCode.apply(null, grid.subarray(k, k + 8192));
    pages.push({ width: canvas.width, height: canvas.height, cell: cell, cols: cols, rows: rows, grid: btoa(bin), palette: palette, texts: texts });
  }
  return { numPages: doc.numPages, pages: pages };
}

async function __wtLoadPdfjs(pdfSrc, workerSrc, importer) {
  var workerUrl = URL.createObjectURL(new Blob([workerSrc], { type: "text/javascript" }));
  var libUrl = URL.createObjectURL(new Blob([pdfSrc], { type: "text/javascript" }));
  var pdfjs = await importer(libUrl);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}
`;

/** HTML for the hidden Android WebView: receives {id, base64} messages, answers {id, result|error}. */
export function buildEngineHtml(pdfSrc: string, workerSrc: string): string {
  // JSON.stringify output can contain "</script>" sequences only via the sources; escape them.
  const safe = (s: string) => JSON.stringify(s).replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
${ENGINE_JS}
var __wtPdf = ${safe(pdfSrc)};
var __wtWorker = ${safe(workerSrc)};
var __wtLib = null;
function __wtReply(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
async function __wtHandle(raw) {
  var msg = JSON.parse(raw);
  try {
    if (!__wtLib) __wtLib = await __wtLoadPdfjs(__wtPdf, __wtWorker, function (u) { return import(u); });
    var bin = atob(msg.base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    __wtReply({ id: msg.id, result: await __wtAnalyzePdf(__wtLib, bytes, msg.maxPages) });
  } catch (e) {
    __wtReply({ id: msg.id, error: String(e && e.message || e) });
  }
}
document.addEventListener("message", function (e) { __wtHandle(e.data); });
window.addEventListener("message", function (e) { __wtHandle(e.data); });
__wtReply({ ready: true });
</script></body></html>`;
}
