# Application Mounter: `mount( )`

The `mount` function is the entry point of your reactive world. It bridges the gap between your SigPro logic and the browser's real DOM by rendering a component into a target element and managing its full reactive lifecycle.

## Function Signature

```typescript
mount(component: Function | Node, target: string | HTMLElement): RuntimeObject
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`component`** | `Function` or `Node` | Yes | A component function (returns a Node) or a direct DOM node. |
| **`target`** | `string` or `HTMLElement` | Yes | CSS selector (e.g., `"#app"`) or DOM element where the app will be mounted. |

**Returns:** A `Runtime` object with:
- `container`: The actual DOM element created by the renderer.
- `destroy()`: A method to completely unmount and clean up the application.

> **Availability:** `mount` is exported from the SigPro module. In **ESM** you must import it (`import { mount } from 'sigpro'`). In the **IIFE** classic script, it is automatically available on `window`. The examples below assume the function is already in scope.

---

## Usage Patterns

### 1. Main Application Entry Point

```javascript
import { mount } from 'sigpro';

const App = () => div({ class: "app" }, [
  h1("Hello SigPro"),
  button("Click me")
]);

mount(App, '#app');
```

### 2. Reactive Widget (Island Architecture)

Mount small reactive components into static HTML pages.

```javascript
const Counter = () => {
  const count = $(0);
  return button({ onclick: () => count(count() + 1) }, () => `Clicks: ${count()}`);
};

mount(Counter, '#sidebar-widget');
```

### 3. Direct Node Mounting

You can also mount an already existing DOM node.

```javascript
const myDiv = div("I am already a node");
mount(myDiv, '#container');
```

---

## How It Works (Lifecycle & Cleanup)

When you call `mount`, SigPro performs these steps:

1. **Duplicate Detection**  
   SigPro keeps a `WeakMap` (`MOUNTED_NODES`) that tracks which DOM target already has a mounted runtime. If you mount a new component to the same target, the previous instance is **automatically destroyed** before the new one is rendered. This prevents memory leaks and “zombie effects”.

2. **Render Phase**  
   The `render` function creates a **cleanup container** (a `div` with `style="display: contents"`), and executes the component inside a fresh reactive owner. All effects (`watch`), event listeners, and child components created during this render are captured.

3. **DOM Injection**  
   The target element is cleared using `replaceChildren()`, and the container (which holds the rendered content) is appended.

4. **Runtime Object**  
   Returns an object `{ _isRuntime: true, container, destroy }`. The `destroy` function recursively disposes all effects, cleans up DOM nodes, and removes the container from the parent.

---

## Manual Unmounting

You can call `destroy()` at any time to tear down the application. This is essential for imperatively managed UI like **modals**, **toasts**, or **dynamic panels**.

```javascript
const widget = mount(MyToast, '#toast-container');

// Later, remove it completely:
widget.destroy();
```

---

## Automatic Re‑mount on Same Target

If you call `mount` a second time on the same target, SigPro automatically destroys the previous instance and replaces it with the new one. No manual cleanup required.

```javascript
mount(LoginScreen, '#app');
// ... later, after login
mount(Dashboard, '#app');  // LoginScreen is destroyed automatically
```

---

## What is Automatically Cleaned Up

When `destroy()` is called (or when a new mount replaces an old one), everything is purged:

- All `watch` effects
- All event listeners added via SigPro (`onClick`, `onInput`, etc.)
- All child components created with `when`, `each`, or nested `mount` calls
- Any custom cleanups registered with `onUnmount`

> **You only need manual cleanup** for external resources not managed by SigPro (e.g., `setInterval`, third‑party libraries, WebSocket connections). Use `onUnmount` for that.

---

## Complete Example

```javascript
import { $, mount } from 'sigpro';


const App = () => {
  const count = $(0);
  return div({ class: "demo" }, [
    h1(() => `Count: ${count()}`),
    button({ onClick: () => count(count() + 1) }, "Increment")
  ]);
};

const runtime = mount(App, '#app');

// Destroy after 10 seconds
setTimeout(() => runtime.destroy(), 10000);
```

---

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Mount to a CSS selector | `mount(App, '#root')` |
| Mount to a DOM element | `mount(App, document.getElementById('root'))` |
| Mount a static node | `mount(div("Hello"), '#target')` |
| Manual destruction | `const app = mount(App, '#app'); app.destroy();` |
| Auto‑replace on same target | Just call `mount` again – SigPro handles cleanup. |

> **Note:** The target must exist in the DOM at the time of mounting.