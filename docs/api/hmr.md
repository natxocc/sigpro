# Hot Module Replacement (HMR)

SigPro ships a first-class HMR integration that works with any bundler exposing `import.meta.hot` (Bun, Vite, Webpack via plugins). It replaces the component rendered by a route without reloading the page — state in other routes, scroll position, and open modals stay intact.

The contract is **two functions and one signal**:

- `window.__sigpro_hmr_page__(routePath, component)` — registers a new component for a route.
- `hmrTick` — a signal that increments on every registration; the router reads it so it can re-evaluate.
- The router internally maintains an `hmrRegistry` Map keyed by route path.

You rarely call any of these directly. A bundler plugin wires them for you.

## How It Works

1. Your dev server detects a change in `src/pages/about.js`.
2. The plugin imports the new module.
3. The plugin calls `window.__sigpro_hmr_page__("/about", newModule.default)`.
4. The internal registry is updated: `hmrRegistry.set("/about", newComponent)`.
5. `hmrTick` increments, triggering the router's effect.
6. The effect re-runs: for the current URL, it looks up the component in `hmrRegistry` and renders it. State in other routes is preserved.

## Route Path Convention

The plugin converts file paths under `src/pages/` to route paths using a Next.js-style convention:

| File | Route path |
| :--- | :--- |
| `src/pages/index.js` | `/` |
| `src/pages/about.js` | `/about` |
| `src/pages/users/index.js` | `/users` |
| `src/pages/users/[id].js` | `/users/:id` |
| `src/pages/blog/[slug]/comments.js` | `/blog/:slug/comments` |

The route path must match exactly what's declared in your `router([...])` config. If they differ, HMR updates are silently ignored (the registry has a key the router never asks for).

## Setup with Bun

Add the plugin to your Bun build config:

```js
// build.js
import { hmr } from "sigpro/hmr";

await Bun.build({
  entrypoints: ["./src/main.js"],
  outdir: "./dist",
  plugins: [hmr],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
});
```

Create `sigpro.bun.js` in your project root with the plugin (full source below). Run with `NODE_ENV=development` in dev and `NODE_ENV=production` in prod.

## The Plugin, In Full

The plugin is small (~30 lines) and has **no SigPro dependency** — it just calls `window.__sigpro_hmr_page__` if it exists.

```js
// sigpro.bun.js
import path from "path";

const PAGES = path.resolve(import.meta.dir, "src/pages") + path.sep;
const isDev = process.env.NODE_ENV === "development";

export const sigproPlugin = {
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
```

The plugin only touches `.js` files inside `src/pages/`. Anything outside is untouched. The `isDev` check ensures the HMR block is **stripped entirely** in production builds (it never reaches the browser).

## `hmrTick` and `__sigpro_hmr_page__`

Both are exported (or installed globally) by SigPro for advanced use:

```js
import { hmrTick } from "sigpro/router";
```

- **`window.__sigpro_hmr_page__(path, component)`** — updates the internal registry and increments `hmrTick`. Call it from a custom HMR integration (e.g., a Vite plugin) if you're not using the Bun plugin.
- **`hmrTick`** — a signal. The router's effect reads it on every run. Incrementing it forces the router to re-evaluate the current route. If you ever need to force a route re-render from user code, `hmrTick(hmrTick() + 1)` does it. Rarely needed outside HMR itself.

## Production Behavior

In production:

- `import.meta.hot` is `undefined` — the HMR block is dead code.
- The plugin skips the `source +=` when `isDev` is false, so the block isn't even in the bundle.
- `window.__sigpro_hmr_page__` still exists on the runtime side, but nobody calls it.
- The router's `hmrRegistry` stays empty.
- `hmrRegistry.get(route.path)` returns `undefined` for every route.
- The `?? route.component` fallback kicks in — the component from your `router([...])` config is used.

Result: zero runtime overhead in production. The registry Map stays empty (~32 bytes). `hmrTick` stays at `0`.

## Manual Control (Advanced)

If you write your own bundler plugin (Vite, Webpack, esbuild), the contract is minimal:

1. Import the new module.
2. If it has a `default` export that is a **function**, call `window.__sigpro_hmr_page__(routePath, newModule.default)`.
3. Done.

You don't need to:
- Unmount the old component manually (the router handles it).
- Refresh `currentPath` (the URL hasn't changed).
- Touch `routerParams` (same route, same params).
- Call `flush()` or `batch()` (the increment of `hmrTick` triggers the effect synchronously).

The whole integration is one function call per file change.

## What HMR Does Not Do

- **Does not reload CSS.** Only `.js` files are watched. Use your bundler's CSS HMR for styles.
- **Does not preserve component state.** The component is re-rendered from scratch; any `signal()` declared inside the component body is recreated. For cross-reload state, keep it outside the component (module-level signal or `local()`).
- **Does not work with `route.component`.** The fallback is only for production or for routes not registered via HMR. Editing a file outside `src/pages/` (or a file whose route doesn't match the convention) won't replace the currently rendered component.
- **Does not change the URL.** HMR only swaps components. If you rename `about.js` to `about-us.js`, you must update your `router([...])` config; the registry now has `/about-us` as key, but the old `/about` route still points to the old component (which no longer exists in the new file).

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Enable HMR | `NODE_ENV=development` + Bun plugin |
| Register a page for HMR | Name the file `src/pages/<route>.js` |
| Force a route refresh from user code | `hmrTick(hmrTick() + 1)` |
| Disable HMR | `NODE_ENV=production` (block is stripped) |
| Check if HMR is active | `typeof window.__sigpro_hmr_page__ === "function"` |
