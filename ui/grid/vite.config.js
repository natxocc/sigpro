import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import path from "node:path";

const __dirname = path.resolve();

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    lib: {
      entry: resolve(__dirname, "./UI/aggrid/grid-lib.js"),
      name: "GridBundle",
      fileName: "grid",
      formats: ["es"],
    },
    outDir: "./ui/grid/dist",
    minify: "terser",
    rollupOptions: {
      external: ["sigpro"], 
      output: {
        globals: {
          sigpro: "$",
        },
      },
    },
  },
});