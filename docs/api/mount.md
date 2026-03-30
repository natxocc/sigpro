# Application Mounter: `$mount( )`

The `$mount` function is the entry point of your reactive world. It bridges the gap between your SigPro logic and the browser's Real DOM by injecting a component into the document and initializing its reactive lifecycle.

## Function Signature

```typescript
$mount(node: Function | HTMLElement, target?: string | HTMLElement): RuntimeObject
```

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`node`** | `Function` or `Node` | **Required** | The component function or DOM element to render. |
| **`target`** | `string` or `Node` | `document.body` | CSS selector or DOM element where the app will live. |

**Returns:** A `Runtime` object containing the `container` and a `destroy()` method to wipe all reactivity and DOM nodes.

---

## Common Usage Scenarios

### 1. The SPA Entry Point
In a Single Page Application, you typically mount your main component to the body or a root div. SigPro manages the entire view from that point.

```javascript
import SigPro from 'sigpro';
import App from './App.js';

// Mounts your main App component
$mount(App, '#app-root'); 
```

### 2. Reactive "Islands"
SigPro is perfect for adding reactivity to static pages. You can mount small widgets into specific parts of an existing HTML layout.

```javascript
const Counter = () => {
  const count = $(0);
  return Button({ onclick: () => count(c => c + 1) }, [
    "Clicks: ", count
  ]);
};

// Mount only the counter into a specific sidebar div
$mount(Counter, '#sidebar-widget');
```

---

## How it Works (Lifecycle & Cleanup)

When `$mount` is executed, it performs these critical steps to ensure a leak-free environment:

1.  **Duplicate Detection**: If you call `$mount` on a target that already has a SigPro instance, it automatically calls `.destroy()` on the previous instance. This prevents "Zombie Effects" from stacking in memory.
2.  **Internal Scoping**: It executes the component function inside an internal **Reactive Owner**. This captures every `$watch` and event listener created during the render.
3.  **Target Injection**: It clears the target using `replaceChildren()` and appends the new component.
4.  **Runtime Creation**: It returns a control object:
    * `container`: The actual DOM element created.
    * `destroy()`: The "kill switch" that runs all cleanups, stops all watchers, and removes the element from the DOM.

---

## Manual Unmounting

While SigPro handles most cleanups automatically (via `$if`, `$for`, and `$router`), you can manually destroy any mounted instance. This is vital for imperatively managed UI like **Toasts** or **Modals**.

```javascript
const instance = $mount(MyToast, '#toast-container');

// Later, to remove the toast and kill its reactivity:
instance.destroy();
```

---

## Summary Cheat Sheet

| Goal | Code Pattern |
| :--- | :--- |
| **Mount to body** | `$mount(App)` |
| **Mount to CSS Selector** | `$mount(App, '#root')` |
| **Mount to DOM Node** | `$mount(App, myElement)` |
| **Clean & Re-mount** | Calling `$mount` again on the same target |
| **Total Cleanup** | `const app = $mount(App); app.destroy();` |

