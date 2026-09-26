/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";
import { gunzipSync } from "zlib";
import { PdfAnalysis } from "../types";

/** Engine output recorded in Chromium from synthetic PDFs (see __tests__/fixtures). */
export function loadFixture(name: string): PdfAnalysis {
  return JSON.parse(gunzipSync(readFileSync(join(__dirname, `${name}.json.gz`))).toString("utf8"));
}
