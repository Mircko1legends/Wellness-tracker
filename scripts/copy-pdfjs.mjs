// Copies pdf.js into the app assets as .txt so it can be loaded offline inside the WebView.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/pdfjs-dist/legacy/build");
const out = join(root, "assets/pdfjs");
mkdirSync(out, { recursive: true });
copyFileSync(join(src, "pdf.min.mjs"), join(out, "pdf.min.txt"));
copyFileSync(join(src, "pdf.worker.min.mjs"), join(out, "pdf.worker.min.txt"));
