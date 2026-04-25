# Reactive Lists: `each( )`

The `each` function is a high‑performance keyed list renderer. It maps a reactive array to DOM nodes and surgically updates only the items that changed (added, removed, or reordered). Unlike a simple `.map()`, `each` reuses DOM nodes and preserves internal state.

## Function Signature

```typescript
each(
  source: Signal<any[]> | (() => any[]) | any[],
  itemFn: (item: any, index: number) => Node | (() => Node),
  keyFn?: (item: any, index: number) => string | number
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`source`** | `Signal`, `() => any[]`, or `any[]` | Yes | The reactive array to iterate over. |
| **`itemFn`** | `(item, index) => Node` | Yes | Returns a DOM node (or a function that returns a node) for each item. |
| **`keyFn`** | `(item, index) => string/number` | No | Extracts a unique key. Default: `item?.id ?? index`. |

**Returns:** A `div` with `style="display: contents"` that contains the live list.

---

## Usage Patterns

### 1. Basic Keyed List (Recommended)

Always provide a unique `id` as the key. This allows SigPro to reuse DOM nodes when the list is reordered or filtered.

```javascript
const users = $([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
]);

ul({ class: "list" }, [
  each(users,
    (user) => li({ class: "p-2" }, user.name),
    (user) => user.id   // stable unique key
  )
]);
```

### 2. Automatic Key (Simple Lists)

If you omit the `keyFn`, `each` defaults to `item?.id ?? index`. For primitive arrays or objects without an `id`, the index is used.

```javascript
const tags = $(["Tech", "JS", "Web"]);

div({ class: "flex gap-1" }, [
  each(tags, (tag) => span({ class: "badge" }, tag))
  // key defaults to index (0,1,2) – fine for static order
]);
```

### 3. Dynamic Content Using Functions

If your `itemFn` returns a **function**, that function is re‑executed every time the item’s data changes (but the node is reused).

```javascript
const todos = $([
  { id: 1, text: "Learn SigPro", done: false }
]);

each(todos,
  (todo) => div([
    input({ type: "checkbox", checked: () => todo.done, onInput: e => todo.done = e.target.checked }),
    span(() => todo.done ? s(todo.text) : todo.text)
  ]),
  (todo) => todo.id
);
```

### 4. Source as a Plain Array or Function

`source` can be a plain array (non‑reactive) or a function that returns an array – it will still react to changes if signals are read inside the function.

```javascript
const filter = $("all");

const filteredTodos = () => {
  const all = todos();
  if (filter() === "active") return all.filter(t => !t.done);
  return all;
};

each(filteredTodos, (todo) => li(todo.text), (todo) => todo.id);
```

---

## How It Works (Reconciliation)

When the `source` changes, `each`:

1. **Compares keys** between the old and new items using the `keyFn`.
2. **Reuses existing DOM nodes** for keys that stay the same.
3. **Moves nodes** if order changed (no recreation).
4. **Creates new nodes** for new keys.
5. **Destroys nodes** for removed keys – cleans up all effects, event listeners, and child components.

> This is much more efficient than destroying and rebuilding the whole list on every update.

---

## Performance Tips

- **Stable keys** – Use a real `id` (like a database primary key). Avoid `Math.random()` or array `index` for lists that can be reordered.
- **State preservation** – If a list item contains an input or a local state, using a stable key ensures that state is preserved even when the list is filtered or sorted.
- **Lazy item functions** – If an item is expensive to render, wrap it in a function: `() => ExpensiveComponent(item)`. The component is only created when the item actually appears in the DOM.

---

## Summary Comparison

| Feature | Standard `Array.map` | SigPro `each` |
| :--- | :--- | :--- |
| **Re‑renders on change** | Re‑creates entire list | Only adds/removes/moves changed items |
| **DOM nodes** | New nodes every time | **Reused via keys** |
| **Memory cleanup** | Manual (or leak) | **Automatic** (destroy on removal) |
| **Internal state per item** | Lost on every update | **Preserved** (if key stable) |
| **Reactivity** | None (manual re‑render) | Built‑in, fine‑grained |

---

## Complete Example

```javascript
const items = $([
  { id: 1, name: "Apple", price: 1.2 },
  { id: 2, name: "Banana", price: 0.8 }
]);

const addItem = () => {
  const newId = Date.now();
  items([...items(), { id: newId, name: `Item ${newId}`, price: 1.0 }]);
};

const removeItem = (id) => {
  items(items().filter(i => i.id !== id));
};

const App = () =>
  div([
    button({ onClick: addItem }, "Add item"),
    ul(
      each(items,
        (item) => li([
          span(`${item.name} – $${item.price}`),
          button({ onClick: () => removeItem(item.id) }, "X")
        ]),
        (item) => item.id
      )
    )
  ]);

mount(App, '#app');
```