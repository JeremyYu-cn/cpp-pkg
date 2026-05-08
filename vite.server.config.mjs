import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: path.join(rootDir, "server-ui"),
  build: {
    emptyOutDir: true,
    outDir: path.join(rootDir, "dist", "server-ui"),
    rollupOptions: {
      input: path.join(rootDir, "server-ui", "index.html"),
    },
  },
  server: {
    host: "127.0.0.1",
  },
});
