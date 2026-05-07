import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: path.join(rootDir, "docs-site"),
  build: {
    emptyOutDir: false,
    outDir: path.join(rootDir, "docs"),
    rollupOptions: {
      input: {
        index: path.join(rootDir, "docs-site", "index.html"),
        "zh-CN": path.join(rootDir, "docs-site", "zh-CN.html"),
      },
      output: {
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
      },
    },
  },
  server: {
    host: "127.0.0.1",
  },
});
