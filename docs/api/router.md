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

> **Availability:** `router` and its helper methods (`router.to`, `router.back`, `router.path`, `router.params`) are exported from the SigPro module. In **ESM** you must import them (`import { router } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, they are automatically available on `window`. The examples below assume the functions are already in scope.

---

## Usage Patterns

### 1. Defining Routes

Place the `router` element where you want the page content to appear. Inside the routes array, define your routes.

```javascript
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
import { $, router, mount } from "sigpro";
import "sigpro/tags" // tags helpers available in global

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
