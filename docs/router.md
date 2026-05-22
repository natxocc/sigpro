# Routing: `router( )` & Utilities

SigPro includes a built‑in, lightweight **hash router** to create single‑page applications (SPA). It manages the URL hash, matches components to routes with dynamic segments (`:id`), and automatically cleans up each page when you navigate away.

## Function Signature

```typescript
router(routes: Route[]): HTMLElement
```

### Route Object

| Property | Type | Description |
| :--- | :--- | :--- |
| **`path`** | `string` | The URL fragment pattern (e.g. `"/"`, `"/user/:id"`, or `"*"` for catch‑all). |
| **`component`** | `Function` | A function that returns a Node, a string, or a reactive view. Receives `params` object as argument. |

**Returns:** A `div` element (with class `"router-hook"`) that acts as the router outlet. The router automatically destroys the previous view and mounts the matched component when the hash changes.

> You must import them (`import { router } from 'sigpro/router'`). The examples below assume the functions are already in scope.

---

## Usage Patterns

### 1. Defining Routes

Place the `router` element where you want the page content to appear. Inside the routes array, define your routes.

```javascript
// remember import router
import { router } from 'sigpro/router'

const Home = () => h1("Home Page");
const UserProfile = (params) => h1(`User ID: ${params.id}`);
const NotFound = () => h1("404 – Page not found");

const App = () =>
  div({ class: "app-layout" }, [
    nav([
      a({ href: "#/" }, "Home"),
      a({ href: "#/user/42" }, "User 42")
    ]),
    router([
      { path: "/", component: Home },
      { path: "/user/:id", component: UserProfile },
      { path: "*", component: NotFound }
    ])
  ]);

mount(App, "#app");
```

### 2. Dynamic Segments (`:id`)

When a route contains a colon‑prefixed segment (like `:id`), the router extracts the corresponding value from the current hash and passes it as a property inside the `params` object to the component function.

```javascript
// If the hash is #/user/42
const UserProfile = (params) => {
  console.log(params.id); // "42"
  return div(`User ${params.id}`);
};
```

### 3. Accessing Route Parameters Anywhere

The router maintains a reactive signal `router.params` that always holds the parameters of the currently matched route. You can read it anywhere in your app.

```javascript
watch(() => {
  const params = router.params();
  console.log("Current route params:", params);
});
```

---

## Navigation Utilities

SigPro provides several helper functions to control navigation and read the router state.

### `router.to(path)`

Navigates to the given path. It automatically formats the hash (e.g. `"/dashboard"` becomes `"#/dashboard"`). You can pass either a full hash string or a path without the `#`.

```javascript
button({ onclick: () => router.to("/dashboard") }, "Go to Dashboard")
```

### `router.back()`

Goes back one step in the browser’s history, just like calling `history.back()`.

```javascript
button({ onclick: () => router.back() }, "← Back")
```

### `router.path()`

Returns the current route path **without the leading `#`**. This is a plain string, not a signal.

```javascript
console.log(router.path()); // e.g. "/user/42"
```

---

## Automatic Cleanup

Every time you navigate to a new route, the router calls `.destroy()` on the previous view. This recursively disposes of:

- All `watch` effects created inside that page
- All event listeners attached via SigPro’s event binding
- Any nested `when`, `each`, or `router` instances

**No manual cleanup is required** – memory leaks are prevented automatically.

---

## Reactive Route Parameters

`router.params` is a **reactive signal** (created with `$({})`). You can watch it to react to parameter changes without re‑mounting the whole router outlet.

```javascript
watch(() => router.params(), (params) => {
  console.log("Params changed:", params);
  // e.g. fetch new data when the :id changes
});
```

---

## Styling the Router Outlet

The router returns a `div` with the class `"router-hook"`. You can style it just like any other element:

```css
.router-hook {
  display: block;
  min-height: 60vh;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

If you want the router outlet to have no layout impact, you can set `display: contents` on it.

---

## Complete Example

```javascript
import { mount } from 'sigpro';

const Home = () => div("Welcome home");
const About = () => div("About us");
const User = (params) => div(`User profile: ${params.id}`);

const App = () =>
  div([
    nav([
      a({ href: "#/" }, "Home"),
      a({ href: "#/about" }, "About"),
      a({ href: "#/user/5" }, "User 5")
    ]),
    router([
      { path: "/", component: Home },
      { path: "/about", component: About },
      { path: "/user/:id", component: User },
      { path: "*", component: () => div("404 – Not found") }
    ])
  ]);

mount(App, "#app");
```

---

## Summary

| Function | Description |
| :--- | :--- |
| `router(routes)` | Creates a router outlet. |
| `router.to(path)` | Navigates to a new hash route. |
| `router.back()` | Goes back in history. |
| `router.path()` | Returns the current path without `#`. |
| `router.params()` | Reactive signal of the current route parameters. |



---


# Vite Plugin: File-based Routing

The `sigproRouter` plugin for Vite automates route generation by scanning your `pages` directory. It creates a **virtual module** that you can import directly into your code, eliminating the need to maintain a manual routes array.

## 1. Project Structure

To use the plugin, organize your files within the `src/pages` directory. The folder hierarchy directly determines your application's URL structure. SigPro uses brackets `[param]` for dynamic segments.

<div class="mockup-code bg-base-300 text-base-content shadow-xl my-8">
  <pre><code>my-sigpro-app/
├── src/
│   ├── pages/
│   │   ├── index.js          →  #/
│   │   ├── about.js          →  #/about
│   │   ├── users/
│   │   │   └── [id].js       →  #/users/:id
│   │   └── blog/
│   │       ├── index.js      →  #/blog
│   │       └── [slug].js     →  #/blog/:slug
│   ├── App.js                (Main Layout)
│   └── main.js               (Entry Point)
├── vite.config.js
└── package.json</code></pre>
</div>

---

## 2. Setup & Configuration

Add the plugin to your `vite.config.js`. It works out of the box with zero configuration.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { sigproRouter } from 'sigpro/vite';

export default defineConfig({
  plugins: [sigproRouter()]
});
```

---

## 3. Implementation

Thanks to **SigPro's synchronous initialization**, you no longer need to wrap your mounting logic in `.then()` blocks.

<div class="tabs tabs-box w-full mt-8 mb-12 bg-base-200/50 p-2 border border-base-300">
  <input type="radio" name="route_impl" class="tab" aria-label="Option A: Direct in main.js" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```javascript
// src/main.js
import { mount } from 'sigpro';
import { router } from 'sigpro/utils';
import { routes } from 'virtual:sigpro-routes';

// The Core already has Router ready
mount(router(routes), '#app');
```

  </div>

  <input type="radio" name="route_impl" class="tab" aria-label="Option B: Inside App.js (Persistent Layout)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```javascript
// src/App.js
import { routes } from 'virtual:sigpro-routes';

export default () => div({ class: 'layout' }, [
  header([
    h1("SigPro App"),
    nav([
      button({ onclick: () => Router.go('/') }, "Home"),
      button({ onclick: () => Router.go('/blog') }, "Blog")
    ])
  ]),
  // Only the content inside <main> will be swapped reactively
  main(Router(routes))
]);
```

  </div>
</div>

---

## 4. Route Mapping Reference

The plugin follows a simple convention to transform your file system into a routing map.

<div class="overflow-x-auto my-8">
  <table class="table table-zebra w-full">
    <thead class="bg-base-200">
      <tr>
        <th>File Path</th>
        <th>Generated Path</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>index.js</code></td>
        <td class="font-mono text-primary font-bold">/</td>
        <td>The application root.</td>
      </tr>
      <tr>
        <td><code>about.js</code></td>
        <td class="font-mono text-primary font-bold">/about</td>
        <td>A static page.</td>
      </tr>
      <tr>
        <td><code>[id].js</code></td>
        <td class="font-mono text-primary font-bold">/:id</td>
        <td>Dynamic parameter (passed to the component).</td>
      </tr>
      <tr>
        <td><code>blog/index.js</code></td>
        <td class="font-mono text-primary font-bold">/blog</td>
        <td>Folder index page.</td>
      </tr>
      <tr>
        <td><code>_utils.js</code></td>
        <td class="italic opacity-50 text-error">Ignored</td>
        <td>Files starting with <code>_</code> are excluded from routing.</td>
      </tr>
    </tbody>
  </table>
</div>

---

## 5. How it Works (Vite Virtual Module)

The plugin generates a virtual module named `virtual:sigpro-routes`. This module exports an array of objects compatible with `Router()`:

```javascript
// Internal representation generated by the plugin
export const routes = [
  { path: '/', component: () => import('/src/pages/index.js') },
  { path: '/users/:id', component: () => import('/src/pages/users/[id].js') },
  // ...
];
```

Because it uses dynamic `import()`, Vite automatically performs **Code Splitting**, meaning each page is its own small JS file that only loads when the user navigates to it.