import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" saat build → aset relatif, cocok untuk GitHub Pages (sub-path /<repo>/) & Netlify.
// Dev tetap "/" agar HMR normal.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
}));
