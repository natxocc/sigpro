# Vite Router Plugin: `sigpro/vite`

`sigpro/vite` exports `sigproRouter()`, a Vite plugin that does two things:

1. **Auto-generates routes** from a `src/pages/` directory structure.
2. **Wires HMR** into each page so component changes reload in place.

## Usage

```js
// vite.config.js
import { defineConfig } from "vite";
import { sigproRouter } from "sigpro/vite";
import tailwindcss from "@tailwindcss/vite";

const dev = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [sigproRouter({ pagesDir: "src/pages" }), tailwindcss()],
  base: dev ? "/absproxy/5173/" : "/",
  server: { host: "0.0.0.0", allowedHosts: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});
```

`pagesDir` defaults to `"src/pages"`.

## Routing

### What It Generates

It builds a virtual `virtual:sigpro-routes` module exporting a `routes` array. All routes are sorted by priority: static > dynamic > catch-all. Pages under `src/pages/` are automatically converted to route entries.

### File → Route Convention

| File | Route path |
| :--- | :--- |
| `src/pages/index.js` | `/` |
| `src/pages/about.js` | `/about` |
| `src/pages/users/index.js` | `/users` |
| `src/pages/users/[id].js` | `/users/:id` |
| `src/pages/blog/[slug]/comments.js` | `/blog/:slug/comments` |

### Supported Path Patterns

- `:param` → dynamic segment (`[id]` in filenames)
- `*` → catch-all (`[...slug]` in filenames)

### Ignored Files

- Files starting with `_` (e.g. `_layout.js`).
- Files whose path contains `.store.` (e.g. `users.users.store.js`).
- Non-JS/TS files (`.js`, `.jsx`, `.ts`, `.tsx` are watched).

### Consuming the Generated Routes

```js
import { router } from 'sigpro/router';
import { routes } from 'virtual:sigpro-routes';

const App = router(routes);
mount(App, '#root');
```

The generated `routes` array is the same shape the router expects: `{ path, component }` entries. The plugin appends a catch-all `*` route that renders a `404 - Not Found` div, so you don't need to provide one.

### Folder Structure

The plugin reads whatever is under `pagesDir` (default `src/pages/`). Here is a layout that produces a full set of routes automatically:

```text
src/
├── pages/
│   ├── index.js              →  /
│   ├── about.js              →  /about
│   ├── users/
│   │   ├── index.js          →  /users
│   │   └── [id].js           →  /users/:id
│   └── blog/
│       ├── [slug].js         →  /blog/:slug
│       └── comments.js       →  /blog/comments
├── main.js                   → imports 'virtual:sigpro-routes'
└── App.js
```

```js
// src/main.js
import { mount } from 'sigpro';
import { router } from 'sigpro/router';
import { routes } from 'virtual:sigpro-routes';

const App = router(routes);
mount(App, '#root');
```

The plugin walks `src/pages/` recursively, converts each file to a route entry, sorts them by priority, and emits the `virtual:sigpro-routes` module. You only write the page components — the route list is generated for you.

## HMR

The plugin performs HMR in two layers: **page components** and the **generated route module**.

### Page Components

Each page file gets an `import.meta.hot.accept(...)` block appended at transform time:

```js
if (import.meta.hot) {
  import.meta.hot.accept((newMod) => {
    if (newMod && typeof window !== 'undefined' && window.__sigpro_hmr_page__) {
      Promise.resolve().then(() => {
        window.__sigpro_hmr_page__(url, newMod.default ?? newMod);
      });
    }
  });
}
```

When a page changes, the plugin calls `window.__sigpro_hmr_page__(url, newModule.default ?? newModule)` inside a `Promise.resolve().then(...)` so the router picks up the replacement on the next tick. This swaps the component for that route **without reloading the page** — state in other routes, scroll position, and open modals stay intact.

### Demo Structure

Here is a minimal project that makes HMR work end-to-end.

```text
project/
├── vite.config.js
├── index.html
└── src/
    ├── main.js
    ├── App.js
    └── pages/
        └── index.js
```

```js
// vite.config.js
import { defineConfig } from "vite";
import { sigproRouter } from "sigpro/vite";
import tailwindcss from "@tailwindcss/vite";

const dev = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [sigproRouter({ pagesDir: "src/pages" }), tailwindcss()],
  base: dev ? "/absproxy/5173/" : "/",
  server: { host: "0.0.0.0", allowedHosts: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});
```

```html
<!-- index.html -->
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>demo</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

```js
// src/main.js
import { mount } from 'sigpro';
import App from './pages/App.js';

let dispose = mount(App, '#root');

if (import.meta.hot) {
  import.meta.hot.accept('./pages/App.js', (newModule) => {
    dispose?.();
    dispose = mount(newModule.default, '#root');
  });
}
```

```js
// src/App.js
import { router } from 'sigpro/router';
import { routes } from 'virtual:sigpro-routes';

export default router(routes);
```

```js
// src/pages/index.js
export default () => h1('Hello from src/pages/index.js');
```

Edit `src/pages/index.js` and the component updates in place. Edit `src/App.js` and `main.js` re-mounts via the explicit `import.meta.hot.accept` block above.

### The Dev Server

The plugin also hooks the dev server's file watcher. When a page is added or removed, it invalidates the virtual module and sends a full-reload:

```js
configureServer(server) {
  const onChange = (file) => {
    const posix = file.split(path.sep).join("/");
    if (!posix.startsWith(pagesRootPosix + "/")) return;
    if (!isPage(posix)) return;
    const vm = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
    if (vm) {
      server.moduleGraph.invalidateModule(vm);
      server.ws.send({ type: "full-reload" });
    }
  };
  server.watcher.on("add", onChange);
  server.watcher.on("unlink", onChange);
}
```

### How It Connects to the Router

The router exposes an internal contract that the plugin relies on:

```js
const component = (import.meta.hot && hmrRegistry.get(route.path)) || route.component;
```

- `window.__sigpro_hmr_page__(url, component)` — stores the replacement in an internal `hmrRegistry` Map keyed by route path.
- `hmrTick` — a signal the router reads on every render; bumping it forces a re-evaluation.

The plugin calls `window.__sigpro_hmr_page__`, which updates the registry and increments `hmrTick`. The router's effect then re-renders the current route with the new component.

### Production Behavior

The HMR block is guarded by `import.meta.hot`, so it is stripped entirely in production builds. `import.meta.hot` is `undefined` in production, so:

- The `import.meta.hot.accept(...)` block never runs.
- `window.__sigpro_hmr_page__`, `hmrTick`, and `hmrRegistry` are never defined.
- The router falls back to `route.component` from your config.

Result: zero runtime overhead in production.

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Auto-generate routes from `src/pages/` | `sigproRouter({ pagesDir: "src/pages" })` |
| Import generated routes | `import { routes } from 'virtual:sigpro-routes'` |
| Watched extensions | `.js`, `.jsx`, `.ts`, `.tsx` |
| Ignored files | leading `_`, `.store.` |
| Page-level HMR | `import.meta.hot.accept(...)` appended per page |
| Route swap without reload | `window.__sigpro_hmr_page__(url, component)` |
