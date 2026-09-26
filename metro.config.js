const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// pdf.js ships as .txt assets (see scripts/copy-pdfjs.mjs).
config.resolver.assetExts.push("txt");

module.exports = config;
