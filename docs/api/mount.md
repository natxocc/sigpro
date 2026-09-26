# Application Mounter: `mount( )`

The `mount` function is the entry point of your reactive world. It bridges the gap between your SigPro logic and the browser's real DOM by rendering a component into a target element and managing its full reactive lifecycle.

## Function Signature

```typescript
mount(
  component: (props?: any) => Node | Node[] | null,
  target: string | Element
): () => void
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`component`** | `Function` | Yes | A component function that returns a node, an array of nodes, or `null`. |
| **`target`** | `string` or `Element` | Yes | CSS selector (e.g., `"#app"`) or DOM element where the app will be mounted. |

**Returns:** A **stop function**. Call it to dispose the app's root scope and clear the target. There is no runtime object, no `.destroy()` method, no `.container` property — just a plain function.

> **Availability:** `mount` is exported from the SigPro module. Import it (`import { mount } from 'sigpro'`). The tag helpers (`div`, `h1`, `button`, ...) become globals after calling `exposeTags()` once at startup.

---

## Usage Patterns

### 1. Main Application Entry Point

```javascript
import { mount, exposeTags } from 'sigpro';

exposeTags();

const App = () =>
  div({ class: 'app' }, [
    h1('Hello SigPro'),
    button('Click me')
  ]);

const stop = mount(App, '#app');
```

### 2. Reactive Widget (Island Architecture)

Mount small reactive components into static HTML pages.

```javascript
import { signal, mount, exposeTags } from 'sigpro';

exposeTags();

const Counter = () => {
  const count = signal(0);
  return button(
    { onclick: () => count(count() + 1) },
    () => `Clicks: ${count()}`
  );
};

const stop = mount(Counter, '#sidebar-widget');
```

### 3. Dynamic tag or pre-built node

`mount` accepts a component function. If you already have a node, wrap it in a function:

```javascript
const myDiv = div('I am already a node');
mount(() => myDiv, '#container');
```

Note: mounting a static node is possible but unusual — `h()` already lets you insert nodes anywhere in a tree. `mount` is designed for **component functions** that own their own reactive scope.

---

## How It Works (Lifecycle & Cleanup)

When you call `mount`, SigPro performs these steps:

1. **Resolve target**
   If `target` is a string, `document.querySelector(target)` finds the element. If it does not exist, `mount` returns a no-op function and does nothing — no error is thrown.

2. **Create root scope**
   An `effectScope()` wraps the component call. Every effect, event listener, and nested scope created during the render is registered inside this scope.

3. **Render component**
   `h(component, {})` is called. The result may be a single node, an array of nodes, or `null`. Arrays are filtered to remove falsy entries.

4. **Inject into target**
   The target's children are replaced with the rendered nodes via `el.replaceChildren(...nodes)`.

5. **Return stop function**
   The function returned stops the root scope (cascading cleanup of all descendant effects and listeners) and clears the target with `el.replaceChildren()`.

---

## Manual Unmounting

Call the returned function to tear down the app at any time. This is essential for imperatively managed UI like **modals**, **toasts**, or **dynamic panels**.

```javascript
const stop = mount(MyToast, '#toast-container');

// Later, remove it completely:
stop();
```

For a **single node** created outside the mount tree, use `unmount(node)` instead:

```javascript
import { unmount } from 'sigpro';

unmount(document.querySelector('.some-node'));
```

`unmount` recursively stops scopes and removes tracked listeners on the node and its descendants, then detaches it from the DOM.

---

## What Is Automatically Cleaned Up

When the stop function is called, everything created under the mount scope is purged:

- All `effect` and `computed` instances created inside components, including nested `effectScope()` calls.
- All event listeners registered via `h()` (`onclick`, `oninput`, ...). They are stored on each element's `_cln` array and executed on cleanup.
- All reactive child nodes created by passing functions as children.
- All nested component scopes.

> **You must clean up manually** for external resources not managed by SigPro: `setInterval`, `setTimeout`, WebSocket connections, third-party library instances, `IntersectionObserver`, etc.

**How to register cleanup:** return a function from an `effect()`, or wrap the resource in an `effectScope()` and call the returned stopper on unmount.

```javascript
const App = () => {
  effect(() => {
    const id = setInterval(() => console.log('tick'), 1000);
    return () => clearInterval(id);   // ← runs on dispose
  });
  return div('...');
};
```

---

## No Auto-Replace on Same Target

Unlike some frameworks, **SigPro does not track mounted targets in a registry**. If you call `mount` twice on the same target:

```javascript
mount(LoginScreen, '#app');
// ...later
mount(Dashboard, '#app');
```

The second call replaces the DOM children but **does not dispose the first mount's scope**. The old effects and listeners stay alive, attached to detached nodes. This is a **leak**.

**Correct pattern**: keep the stop function and call it before mounting again.

```javascript
let stop = mount(LoginScreen, '#app');

// ...later
stop();
stop = mount(Dashboard, '#app');
```

If you want a "one-liner" that handles this, wrap it yourself:

```javascript
const mounts = new WeakMap();

export function remount(component, target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return () => {};
  mounts.get(el)?.();
  const stop = mount(component, el);
  mounts.set(el, stop);
  return stop;
}
```

Ten lines. No hidden registry in the core.

---

## Complete Example

```javascript
import { signal, effect, mount, exposeTags } from 'sigpro';

exposeTags();

const App = () => {
  const count = signal(0);

  // External resource with cleanup
  effect(() => {
    const id = setInterval(() => console.log('app alive'), 5000);
    return () => clearInterval(id);
  });

  return div({ class: 'demo' }, [
    h1(() => `Count: ${count()}`),
    button({ onclick: () => count(count() + 1) }, 'Increment')
  ]);
};

const stop = mount(App, '#app');

// Destroy after 10 seconds
setTimeout(stop, 10000);
```

---

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Mount to a CSS selector | `const stop = mount(App, '#root')` |
| Mount to a DOM element | `const stop = mount(App, document.getElementById('root'))` |
| Stop the app | `stop()` |
| Remove an arbitrary node | `unmount(el)` |
| Register cleanup for a resource | `return () => cleanup` inside `effect()` |

> **Note:** The target must exist in the DOM at the time of mounting. If it does not, `mount` returns a no-op function and logs nothing.
