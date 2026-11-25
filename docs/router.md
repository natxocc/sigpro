# Routing: `router( )`

SigPro includes a lightweight **hash router** for single-page applications. It matches `window.location.hash` against a list of route patterns, renders the matching component, and disposes the previous view automatically.

## Function Signature

```typescript
router(routes: Route[]): () => HTMLElement

interface Route {
  path: string;                     // "/", "/user/:id", "*"
  component: (params: Record<string, string>) => Node | Node[] | null;
}
```

**Returns:** a **component function**. You pass it to `mount()`, or call it inside another component to render the outlet.

The route component receives the route parameters as its first argument.

> **Availability:** `router`, `currentPath`, and `routerParams` are exported from `sigpro/router`. Import them by name: `import { router, currentPath, routerParams } from 'sigpro/router'`.

---

## Usage Patterns

### 1. Basic Setup

```javascript
import { mount, exposeTags } from 'sigpro';
import { router } from 'sigpro/router';

exposeTags();

const Home = () => h1('Home Page');
const About = () => h1('About Page');
const NotFound = () => h1('404 — Page not found');

const App = router([
  { path: '/',       component: Home },
  { path: '/about',  component: About },
  { path: '*',       component: NotFound }
]);

mount(App, '#app');
```

The router returns a component. `mount` renders it into `#app` and manages its lifecycle.

### 2. Nested in a Layout

You can call the router inside another component to keep a persistent layout:

```javascript
import { mount, exposeTags } from 'sigpro';
import { router } from 'sigpro/router';

exposeTags();

const Router = router([
  { path: '/',      component: () => h1('Home') },
  { path: '/about', component: () => h1('About') },
  { path: '*',      component: () => h1('404') }
]);

const App = () =>
  div({ class: 'app-layout' },
    nav(
      a({ href: '#/' }, 'Home'),
      a({ href: '#/about' }, 'About')
    ),
    main(Router())
  );

mount(App, '#app');
```

`Router()` returns the router outlet element. Only the content inside `main` changes on navigation — the nav stays untouched.

### 3. Dynamic Segments

Any segment starting with `:` captures the corresponding part of the URL. Captured values are decoded with `decodeURIComponent`.

```javascript
const UserProfile = (params) => div(
  h1(`User ${params.id}`),
  p('Profile content here')
);

const App = router([
  { path: '/',          component: () => h1('Home') },
  { path: '/user/:id',  component: UserProfile },
  { path: '*',          component: () => h1('404') }
]);

mount(App, '#app');
```

If the URL is `#/user/42`, `params.id` is `"42"`. If the URL is `#/user/hello%20world`, `params.id` is `"hello world"`. If the segment is malformed (`#/user/%zz`), the raw value is used (`"%zz"`).

### 4. Multiple Params

```javascript
const Post = (params) => div(
  h1(`Blog: ${params.blog}`),
  h2(`Post: ${params.slug}`)
);

const App = router([
  { path: '/blog/:blog/post/:slug', component: Post }
]);
```

Any number of `:param` segments can appear in a route.

### 5. Catch-All

A route with `path: '*'` matches anything not caught by earlier routes.

```javascript
router([
  { path: '/',       component: Home },
  { path: '/about',  component: About },
  { path: '*',       component: () => h1('404') }
]);
```

> **Route priority is automatic.** The router sorts the routes at construction:
> 1. `*` always ends up last.
> 2. Among non-`*` routes, the one with fewer `:param` segments wins.
>
> So `[{ path: '/about' }, { path: '/:id' }]` and `[{ path: '/:id' }, { path: '/about' }]` behave identically — `/about` wins for URL `/about`, `/:id` wins for `/42`. You don't need to sort manually; keep the `*` route in the list and let the router do its thing.

---

## Navigation

### `router.to(path)`

Sets `window.location.hash`. Accepts a plain path or a full hash.

```javascript
import { router } from 'sigpro/router';

button({ onclick: () => router.to('/about') }, 'Go to About');
router.to('/user/42');   // → '#/user/42'
router.to('#/user/42');  // same
```

**Query strings are preserved in the URL but ignored for route matching.** `router.to('/users?page=2')` sets `#/users?page=2`; the route `/users` matches; the URL keeps `?page=2`; `routerParams()` is `{}` (the query is not part of params). Read the query separately with `currentPath()` if you need it.

### `router.back()`

Calls `window.history.back()`.

```javascript
import { router } from 'sigpro/router';

button({ onclick: () => router.back() }, '← Back');
```

### `router.path()`

Returns the current path as a string, without the leading `#`. **Includes the query string** if present.

```javascript
import { router } from 'sigpro/router';

console.log(router.path()); // "/user/42"  or  "/users?page=2"
```

### Links

Use regular `<a>` tags with an `href` starting with `#/`:

```javascript
a({ href: '#/about' }, 'About');
a({ href: '#/user/42' }, 'User 42');
```

No special handling is required — the router listens to `hashchange`.

---

## Reactive Route State

Two signals are exported for reading the current route anywhere in your app:

- **`currentPath`** — the current path string, including query string.
- **`routerParams`** — the current route parameters object (the same object passed to the route component as `props`).

### `currentPath`

```javascript
import { currentPath } from 'sigpro/router';

h1(() => `Path: ${currentPath()}`);
```

Use it in reactive child positions to update the DOM when the route changes.

### `routerParams`

```javascript
import { routerParams } from 'sigpro/router';

h2(() => `Slug: ${routerParams().slug}`);
```

`routerParams()` returns the params object of the currently matched route. It is `{}` before any route matches, or when the matched route has no dynamic segments (e.g. `/about`). When the route changes, this signal updates and any element reading it re-renders.

> **Full re-mount on param change.** Navigating from `/user/42` to `/user/43` counts as a route change: the previous component instance is disposed (its effects stop, its listeners are removed) and the new instance is rendered from scratch. Any local state inside the route component — an open dropdown, a partially-filled form, a running animation — is lost. If you need to preserve state across param changes, keep it in a module-level signal or a store, not inside the route component body.

### Watching Route Changes

```javascript
import { watch } from 'sigpro';
import { routerParams } from 'sigpro/router';

watch(routerParams, (nuevo, viejo) => {
  console.log('params changed:', nuevo, viejo);
});
```

---

## Cleanup

Every navigation disposes the previous view. The router uses an `effectScope` internally, so when the matched route changes:

- Effects created inside the previous component stop.
- Event listeners added via `h()` are removed.
- Nested reactive children are cleaned up.
- Nested routers or scopes are disposed.

**No manual cleanup required.** The `router` outlet is a normal component; when it unmounts (because you called the stop function from `mount`, or the parent is disposed), everything underneath it is disposed too.

---

## Styling the Outlet

The router returns a `<div class="router-hook">`. Style it like any other element.

```css
.router-hook {
  display: block;
  min-height: 60vh;
}
```

Or make it layout-neutral:

```css
.router-hook {
  display: contents;
}
```

`display: contents` makes the wrapper invisible to layout while still being a real DOM node that the router can replace.

---

## Complete Example

```javascript
import { mount, exposeTags } from 'sigpro';
import { router, currentPath, routerParams } from 'sigpro/router';

exposeTags();

const Home = () => div(
  h1('Home'),
  p('Welcome to the app.')
);

const About = () => div(
  h1('About'),
  p('SigPro hash router demo.')
);

const UserProfile = (params) => div(
  h1(`User ${params.id}`),
  p(() => `Current path: ${currentPath()}`)
);

const NotFound = () => div(
  h1('404'),
  p('Page not found.')
);

const route = router([
  { path: '/',         component: Home },
  { path: '/about',    component: About },
  { path: '/user/:id', component: UserProfile },
  { path: '*',         component: NotFound }
]);

const App = () => div({ class: 'layout' },
  nav(
    a({ href: '#/' }, 'Home'),
    a({ href: '#/about' }, 'About'),
    a({ href: '#/user/42' }, 'User 42')
  ),
  main(route())
);

mount(App, '#app');
```

Note that `route` is created **once**, outside the component. Calling `route()` inside `App` creates the outlet element. This is the recommended pattern — creating a new router on every render of the layout would leak (a fresh `effectScope` and `hashchange` effect per render).

---

## ⚠️ Using `sigpro/router` and `sigpro/vite` Together

`sigpro/vite` auto-generates routes from `src/pages/`. If you also use `sigpro/router` with a **manual** route list that lives in the same `src/pages/` folder, you will get conflicts: the two routers will try to claim the same routes, and the generated virtual module can shadow or collide with your manual entries.

**Do not mix both in the same folder.** Pick one approach per folder:

- **Automatic routing** — put your pages under `src/pages/` and let `sigpro/vite` generate the routes.
- **Manual routing** — put your route components under a different folder (e.g. `src/routes/`) and build the list yourself with `sigpro/router`.

You can use both, as long as they point at different directories:

```js
import { sigproRouter } from "sigpro/vite";

export default defineConfig({
  plugins: [
    // automatic routes from src/pages/
    sigproRouter({ pagesDir: "src/pages" }),
    // manual routes from src/routes/ (built by hand, not auto-generated)
  ],
});
```

---

## Hot Module Replacement (HMR)

The router has built-in HMR support that only activates in dev. When a bundler plugin (such as `sigpro/vite`) updates a page component, it calls `window.__sigpro_hmr_page__(routePath, newComponent)`. The router stores that replacement in an internal `hmrRegistry` keyed by route path and bumps an `hmrTick` signal, which forces the router's effect to re-render the current route with the new component — no page reload, so state in other routes, scroll position, and open modals stay intact.

The replacement is looked up on every render:

```js
const component = (import.meta.hot && hmrRegistry.get(route.path)) || route.component;
```

In production `import.meta.hot` is `undefined`, so the registry is never populated and the router falls back to `route.component` from your config. The whole block is stripped from production builds, leaving zero runtime overhead.

See [Vite Plugin](api/vite.md) for the plugin that wires it up.

---

## Summary Cheat Sheet

| Function / Signal | Description |
| :--- | :--- |
| `router(routes)` | Returns a component. Pass to `mount` or call inside another component as `Router()`. |
| `router.to(path)` | Navigate to a path (updates `window.location.hash`). |
| `router.back()` | Go back in browser history. |
| `router.path()` | Current path string (no `#`, includes query). |
| `currentPath` | Signal: current path (with query). |
| `routerParams` | Signal: current route params object (`{}` if none). |
