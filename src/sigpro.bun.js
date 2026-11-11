// sigpro.bun.js
import path from "path";

const pagesDir = path.resolve(import.meta.dir, "src/pages");

export const sigproPlugin = {
  name: "sigpro-hmr",
  setup(build) {
    build.onLoad({ filter: /\.(js|jsx)$/ }, async (args) => {
      // Solo procesa archivos dentro de src/pages
      if (!args.path.startsWith(pagesDir)) return;

      let source = await Bun.file(args.path).text();

      // HMR condicional: solo en desarrollo
      if (process.env.NODE_ENV !== "production") {
        const relative = path.relative(import.meta.dir, args.path).replace(/\\/g, "/");
        source += `
if (import.meta.hot) {
  import.meta.hot.accept((newMod) => {
    if (newMod && typeof window !== 'undefined' && window.__sigpro_hmr_page__) {
      window.__sigpro_hmr_page__("/${relative}", newMod.default ?? newMod);
    }
  });
}`;
      }

      return { contents: source, loader: "js" };
    });
  },
};