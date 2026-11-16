# Manual Unmount: `unmount( )`

The `unmount` function detaches a DOM node from the document and recursively cleans up every scope, effect, and event listener that SigPro attached to it or its descendants.

## Signature

```typescript
unmount(node: Node): void
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`node`** | `Node` | Yes | The DOM node to remove and clean up. If not a `Node`, the call is a no-op. |

**Returns:** nothing.

> **Availability:** `unmount` is exported from the SigPro module. Import it by name (`import { unmount } from 'sigpro'`). Tag helpers (`div`, `button`, ...) are globals after `exposeTags()` — they are **not** named exports.

---

## When You Need It

SigPro manages cleanup automatically for anything created through `h()`, `mount()`, or the router. **You rarely call `unmount` directly.** The cases where you actually need it:

1. **You created a node outside `h()`** — with `document.createElement`, `innerHTML`, or from a third-party library — and SigPro has no reference to it.
2. **You're integrating a library that hands you a node** — Chart.js, Google Maps, a WYSIWYG editor — and you need to remove it cleanly.
3. **You want to remove a subtree imperatively** without going through the reactive system.

If you render everything through `h()`, you never call `unmount`. The reactive parent handles it when the node's owner is disposed.

---

## What `unmount` Does

Given a node, `unmount` walks the subtree (the node itself plus every descendant) and for each node:

1. **Stops its scope.** If the node was created by a component (via `h(Component)`), its `effectScope` is disposed. Every effect and computed created during that component's render is torn down.
2. **Runs its `_cln` cleanups.** Every `addEventListener` added by `h()` is tracked on the element's `_cln` array. `unmount` runs them all, removing each listener.
3. **Cleans reactive children.** Any child rendered by a function is disposed, running its cleanup and removing the nodes it produced.
4. **Recurses into descendants.** Every child node is treated the same way.

After the cleanup, the node is detached from its parent with `parentNode.removeChild(node)`. If the node is not in the DOM, the cleanup still runs — only the `removeChild` call is skipped.

---

## Basic Usage

```javascript
import { unmount } from 'sigpro';

unmount(document.querySelector('.widget'));
```

If the argument is not a `Node` (e.g. `null`), the call is a no-op and nothing throws.

---

## Manual Node with Listeners

The core case where `unmount` matters:

```javascript
import { unmount } from 'sigpro';

const el = document.createElement('div');
el.textContent = 'Hand-made node';
el.addEventListener('click', () => console.log('clicked'));

document.body.appendChild(el);

// Later
unmount(el);
```

Without `unmount`, `el.remove()` would detach the node but leave the listener attached to a node that's now garbage. The GC usually collects it, but if anything holds a reference to `el`, the listener stays alive and the closure it captures stays alive with it.

> **Note:** `addEventListener` called directly on an element is **not** tracked by SigPro — `unmount` only runs `_cln` cleanups, and direct `addEventListener` calls don't register there. If you add listeners by hand, you own their removal. Use the `on()` helper below if you want `unmount` to handle them.

---

## The `on()` Helper (Userland)

If you're creating nodes outside `h()` and want SigPro's cleanup to cover their listeners, define a small `on` helper that writes to the element's `_cln` array — the same mechanism `h()` uses internally:

```javascript
export const on = (el, ev, fn) => {
  el.addEventListener(ev, fn);
  const off = () => el.removeEventListener(ev, fn);
  (el._cln || (el._cln = [])).push(off);
  return off;
};
```

Now `unmount` will remove those listeners automatically:

```javascript
import { unmount } from 'sigpro';
import { on } from './on.js';

const el = document.createElement('div');
on(el, 'click', () => console.log('clicked'));
on(el, 'mouseover', () => console.log('hovered'));

document.body.appendChild(el);

// Later — both listeners removed
unmount(el);
```

> **Caveat:** `_cln` is an internal implementation detail. It's stable in the current version, but if you prefer not to depend on it, track your listeners in your own array and remove them in a custom cleanup.

---

## Integration with External Libraries

A chart library returns a canvas element you need to insert and later remove. Assuming `exposeTags()` has been called:

```javascript
import { unmount, effect, signal } from 'sigpro';

const Chart = () => {
  const chart = signal(null);

  effect(() => {
    const canvas = document.createElement('canvas');
    const instance = new ChartLib(canvas, { /* config */ });
    chart(canvas);

    return () => {
      instance.destroy();  // library's own cleanup
    };
  });

  return div(
    button({ onclick: () => unmount(chart()) }, 'Remove chart'),
    () => chart()  // reactive child renders the canvas
  );
};
```

The `effect` handles the library's internal teardown. The `unmount` handles the DOM removal plus any listeners SigPro tracked on the wrapper. If the chart is inside a component that gets unmounted, both run automatically — you wouldn't call `unmount` yourself.

---

## `unmount` vs `mount`'s Stop Function

They serve different purposes:

| Function | Removes | Disposes |
| :--- | :--- | :--- |
| `mount(Component, target)` returns a stop function | The target's children (including manually added ones, via `replaceChildren`) | The root scope of the mount, plus `_cln`/`_stopScope` on the nodes it created |
| `unmount(node)` | The node itself (via `removeChild`) | The node's subtree of scopes and `_cln` cleanups |

The stop function from `mount` only knows about the nodes it created. If you later added a node to that target manually and want its scopes cleaned up, `unmount(node)` on that node is what does it.

Example:

```javascript
const stop = mount(App, '#app');

// ...later, an external library added a node to #app:
const chart = document.querySelector('.chart');
unmount(chart); // cleans up the chart node's listeners

stop();          // then cleans up the whole App
```

Order doesn't strictly matter, but cleaning up the small thing before the big thing is idiomatic.

---

## `cleanupNode()` — Cleanup Without Detaching

If you want the same recursive cleanup as `unmount` but **without removing the node from the DOM**, use `cleanupNode()`:

```javascript
import { cleanupNode } from 'sigpro';

cleanupNode(el);   // stops scopes + removes listeners, el stays in place
```

This is useful when you want to reuse the node (e.g. re-insert it elsewhere) but its previous effects and listeners should be dead.

| Function | Detaches from DOM | Cleans subtree |
| :--- | :--- | :--- |
| `unmount(node)` | ✅ | ✅ |
| `cleanupNode(node)` | ❌ | ✅ |

---

## What `unmount` Does Not Do

- **Does not remove siblings.** It removes the node and cleans up its subtree. Siblings are untouched.
- **Does not stop external resources.** If an effect inside the subtree created a `setInterval`, the effect's cleanup runs (which should call `clearInterval`). But if you created the interval **outside** an effect, SigPro doesn't know about it. Return a cleanup from an effect to make it tracked.
- **Does not clear `ref` values.** If you passed `ref: { current: null }`, the object still points to the (now detached) node. Clear it yourself if needed.
- **Does not affect other references.** If you hold a reference to the node in a variable, the variable still points to it. The node is just detached from the DOM.
- **Does not run on the root of a component you still want.** Once unmounted, the component is gone. If you want to re-show it, create it again.

---

## Common Patterns

### Removing a Single Element

```javascript
const el = document.querySelector('.toast');
unmount(el);
```

### Removing a Component from the DOM (Outside Its Owner)

If a component was mounted into a detached container, its scope is still alive even if the container is not in the DOM. `unmount` handles it:

```javascript
import { unmount } from 'sigpro';

const container = div({}, ...);   // after exposeTags(), or use h('div', ...)
document.body.appendChild(container);

// Later:
unmount(container); // scopes are stopped, listeners removed
```

### Integration with Modal / Toast Systems

When the toast library doesn't own the node you insert, clean it up yourself:

```javascript
import { unmount, signal } from 'sigpro';

const toast = signal(null);

const show = () => {
  const el = div({ class: 'toast' }, 'Hello');   // after exposeTags()
  document.body.appendChild(el);
  toast(el);

  setTimeout(() => {
    unmount(toast());   // no-op if toast() is null
    toast(null);
  }, 3000);
};
```

`unmount` ensures that if the toast contained reactive children or listeners, they're cleaned up at removal time. `unmount(null)` is safe (the guard `if (!(node instanceof Node)) return` prevents errors).

---

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Remove a node created by `h()` | Just let the parent dispose — no need to call `unmount` |
| Remove a hand-made node | `unmount(el)` |
| Clean a node's scopes/listeners without detaching | `cleanupNode(el)` |
| Track listeners on a hand-made node | Define an `on(el, ev, fn)` helper that writes to `el._cln` |
| Stop the whole app | `const stop = mount(...); stop()` |
| Clean up after a library | library's own destroy, then let SigPro's scope handle the rest |
