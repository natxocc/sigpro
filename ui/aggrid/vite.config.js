import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import path from "node:path";

const __dirname = path.resolve();

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    // Usamos la configuración de librería para generar el bundle limpio
    lib: {
      entry: resolve(__dirname, "./UI/aggrid/aggrid-lib.js"),
      name: "AgGridBundle",
      fileName: "aggrid",
      formats: ["es"],
    },
    outDir: "./UI/aggrid/dist",
    minify: "terser", // Máxima compresión
    rollupOptions: {
      // Si quieres que ag-grid NO se incluya y sea externo, añádelo aquí.
      // Pero como quieres un "Bundle", lo dejamos vacío para que empaquete todo.
      external: ["sigpro"], 
      output: {
        globals: {
          sigpro: "$",
        },
      },
    },
  },
});