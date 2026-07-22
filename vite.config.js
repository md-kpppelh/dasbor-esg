import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Root = folder ini. engine/ & data/ (sibling app/) diimpor langsung; semua di dalam root.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
});
