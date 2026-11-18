// sigpro.bun.js
import path from "path";

const PAGES = path.resolve(import.meta.dir, "src/pages") + path.sep;
const isDev = process.env.NODE_ENV === "development";

export const hmr = {
  name: "sigpro-hmr",
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      if (!args.path.startsWith(PAGES)) return;

      let source;
      try {
        source = await Bun.file(args.path).text();
      } catch {
        return;
      }

      if (isDev) {
        const rel = path
          .relative(PAGES, args.path)
          .replace(/\\/g, "/")
          .replace(/\.js$/, "");

        const routePath =
          rel === "index"
            ? "/"
            : "/" +
              rel.replace(/\/index$/, "").replace(/\[([^\]]+)\]/g, ":$1");

        source += `
          if (import.meta.hot) {
            import.meta.hot.accept((newMod) => {
              const component = newMod && newMod.default;
              if (typeof component === 'function' && typeof window !== 'undefined' && window.__sigpro_hmr_page__) {
                window.__sigpro_hmr_page__(${JSON.stringify(routePath)}, component);
              }
            });
          }`;
      }

      return { contents: source, loader: "js" };
    });
  },
};