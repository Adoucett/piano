import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this project at https://adoucett.github.io/piano/.
  // Use that base in production, root in dev. (Path is case-sensitive.)
  base: mode === "production" ? "/piano/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    host: "127.0.0.1",
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 8000,
  },
}));
