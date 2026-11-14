import path from "path";

const pagesDir = path.resolve(import.meta.dir, "src/pages");

export const sigproPlugin = {
  name: "sigpro-hmr",
  setup(build) {
    build.onLoad({ filter: /\.(js|jsx)$/ }, async (args) => {
      if (!args.path.startsWith(pagesDir)) return;

      let source = await Bun.file(args.path).text();

      if (process.env.NODE_ENV !== "production") {
        const relative = path.relative(pagesDir, args.path).replace(/\\/g, "/").replace(/\.(js|jsx)$/, "");
        const routePath = relative === "index" ? "/" : "/" + relative.replace(/\/index$/, "");
        source += `
          if (import.meta.hot) {
            import.meta.hot.accept((newMod) => {
              if (newMod && typeof window !== 'undefined' && window.__sigpro_hmr_page__) {
                window.__sigpro_hmr_page__("${routePath}", newMod.default ?? newMod);
              }
            });
          }`;
      }

      return { contents: source, loader: "js" };
    });
  },
};