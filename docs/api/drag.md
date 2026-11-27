# Drag & Drop: `drag` / `sortable`

Two interaction primitives built on SigPro’s reactive core. `drag()` positions an element reactively; `sortable()` reorders a reactive array by dragging. Both are **interaction-only** — no rendering, no styling. For a visual layer (ghost, placeholder, drop indicators) use [`sigpro-ui/drag`](https://sigpro-ui.natxocc.com).

## Signature

```typescript
drag(el: Element, opts?: DragOptions): DragHandle | null;
sortable(container: Element, opts?: SortableOptions): SortHandle;
```

## `drag()` — reactive positioning

Attaches pointer listeners to `el` and moves it reactively via `x()` / `y()` signals. The element is updated through a `translate()` (or `left`/`top`) driven by an `effect`, so any reactive view reading `x()`/`y()` stays in sync.

```javascript
import { drag } from 'sigpro/drag';

const el = div({ class: "draggable" }, "Grab me");
const handle = drag(el, {
  axis: 'y',          // 'both' | 'x' | 'y'
  grid: 20,           // snap to a grid (px)
  bounds: 'parent',   // 'window' | 'parent' | selector | Element | null
  threshold: 4,       // px before a drag "starts"
  onStart: ({ x, y }) => console.log('start', x, y),
  onMove: ({ x, y }) => console.log('move', x, y),
  onEnd: ({ x, y }) => console.log('end', x, y),
});

handle.x();   // → current X (reactive signal)
handle.y();   // → current Y (reactive signal)
handle.dragging(); // → boolean
handle.setPosition(100, 50); // programmatic move
handle.destroy();  // remove listeners
```

### `DragOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `handle` | `string \| Element \| function` | `null` | Restrict dragging to a handle element/selector, or a predicate `(target, root) => boolean`. |
| `disabled` | `boolean \| function` | `false` | Disable dragging; a function is reactive. |
| `threshold` | `number` | `4` | Pixel distance before the drag session starts. |
| `bounds` | `string \| Element \| null` | `null` | Clamp movement. `'window'`, `'parent'`, a selector, or an `Element`. |
| `axis` | `'both' \| 'x' \| 'y'` | `'both'` | Constrain movement to one axis. |
| `grid` | `number \| [x, y]` | `null` | Snap to a grid. |
| `useTransform` | `boolean` | `true` | Use `translate()` instead of `left`/`top`. |
| `initial` | `{ x, y }` | `{ x: 0, y: 0 }` | Starting position. |
| `cursor` / `activeCursor` | `string` | `'grab'` / `'grabbing'` | Cursor styles. |
| `dragClass` | `string` | `'dragging'` | Class toggled during drag. |
| `stopPropagation` | `boolean` | `true` | Stop the event from bubbling. |
| `onStart` / `onMove` / `onEnd` | `function` | — | Lifecycle callbacks. |

---

## `sortable()` — reorder a reactive array

Turns a container into a drag-to-reorder list. On drop it **mutates the `items()` reactive array**, so any view reading it re-renders automatically. Supports single-list reordering and cross-group dragging.

```javascript
import { sortable } from 'sigpro/drag';
import { signal, watch } from 'sigpro';

const items = signal(['apple', 'banana', 'cherry']);
const container = div({});

// Render the items into the container. Re-run this whenever `items()` changes.
const render = () => {
  container.replaceChildren(...items().map(i => div({ 'data-drag-item': '' }, i)));
};
render();
watch(items, render, { immediate: true }); // re-render whenever the array is reordered

const handle = sortable(container, {
  items,              // reactive array (mutated on drop)
  key: 'id',          // item key (or a function)
  group: 'default',   // items can only cross lists with the same group
  handle: '[data-handle]',
  onStart: (session) => console.log('start', session.item, session.fromIdx),
  onMove: (session) => console.log('move to', session.targetIdx),
  onEnd: (session) => console.log('end', session.item),
  onChange: ({ item, from, to }) => console.log('changed', item, from, to),
});

// Call destroy() ONLY when you want to stop the sortable entirely.
// After destroy() the sortable no longer responds to drag.
handle.destroy();
```

### `SortableOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `items` | `Signal<array>` | — | The reactive array to reorder. Mutated on drop. |
| `key` | `string \| function` | `'id'` | Item key, or a `(item, idx) => key` function. |
| `group` | `string` | `'default'` | Lists sharing a group can exchange items. |
| `handle` | `string \| Element \| function` | `null` | Restrict dragging to a handle. |
| `disabled` | `boolean \| function` | `false` | Disable dragging; a function is reactive. |
| `threshold` | `number` | `4` | Pixel distance before a drag starts. |
| `stopPropagation` | `boolean` | `true` | Stop the event from bubbling. |
| `onStart` / `onMove` / `onEnd` / `onChange` | `function` | — | Lifecycle callbacks. |

### Attributes

Sortable reads DOM markers on each item:

- `data-drag-item` — marks an element as a draggable item.
- `data-drag-key` — the item's key (used to exclude the dragged item from insertion math).

---

## Rendering layer: `sigpro-ui/drag`

`sigpro/drag` is interaction-only. For a visual layer that renders a **ghost** (fixed overlay) and a **placeholder** during drag, use `sigpro-ui/drag`:

```javascript
import { sortable } from 'sigpro-ui/drag';

sortable(container, {
  items,
  group: 'default',
  ghostStyle: 'box-shadow: 0 4px 12px; opacity: .85;',
  placeholderStyle: 'border: 2px dashed #888;',
});
```

`sigpro-ui/drag` re-exports `drag` and `vDrag` from the core unchanged.

---

## Behavior

- **Pointer-based.** Uses `pointerdown` / `pointermove` / `pointerup` so it works with mouse, touch, and pen. On mouse it only starts on button `0` (left click).
- **Pointer capture.** Captures the pointer during a drag so movement isn't lost when leaving the element.
- **Reactive.** `drag()` exposes `x()` / `y()` / `dragging()` as signals; `sortable()` mutates `items()`. Both integrate with SigPro's reactivity.
- **Clean up.** `destroy()` removes listeners (and the registry entry for `sortable`).

> **Availability:** `drag` and `sortable` are exported from `sigpro/drag`. Import by name: `import { drag, sortable } from 'sigpro/drag'`.
