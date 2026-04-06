# Reactive Lists: `For( )`

The `For` function is a high-performance list renderer. It maps an array (or a Signal containing an array) to DOM nodes. Unlike a simple `.map()`, `For` is **keyed**, meaning it only updates, moves, or deletes the specific items that changed.

## Function Signature

```typescript
For(
  source: Signal<any[]> | Function | any[], 
  render: (item: any, index: number) => HTMLElement, 
  keyFn?: (item: any, index: number) => string | number
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`source`** | `Signal` | Yes | The reactive array to iterate over. |
| **`render`** | `Function` | Yes | A function that returns a component or Node for each item. |
| **`keyFn`** | `Function` | **No** | A function to extract a **unique ID**. If omitted, it defaults to the `index`. |

**Returns:** A `div` element with `display: contents` containing the live list.

---

## Usage Patterns

### 1. Basic Keyed List (Recommended)
Always use a unique property (like an `id`) as a key to ensure SigPro doesn't recreate nodes unnecessarily when reordering or filtering.

```javascript
const users = $([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
]);

Ul({ class: "list" }, [
  For(users, 
    (user) => Li({ class: "p-2" }, user.name),
    (user) => user.id // Stable and unique key
  )
]);
```

### 2. Simplified Usage (Automatic Key)
If you omit the third parameter, `For` will automatically use the array index as the key. This is ideal for simple lists that don't change order frequently.

```javascript
const tags = $(["Tech", "JS", "Web"]);

// No need to pass keyFn if the index is sufficient
Div({ class: "flex gap-1" }, [
  For(tags, (tag) => Badge(tag)) 
]);
```

---

## How it Works (The Reconciliation)

When the `source` signal changes, `For` performs the following steps:

1.  **Key Diffing**: It compares the new keys with the previous ones stored in an internal `Map`.
2.  **Node Reuse**: If a key already exists, the DOM node is **reused** and moved to its new position. No new elements are created.
3.  **Physical Cleanup**: If a key disappears from the list, SigPro calls `.destroy()` to stop reactivity and physically removes the node from the DOM to prevent memory leaks.

---

## Performance Tips

* **Stable Keys**: Never use `Math.random()` as a key. This will force SigPro to destroy and recreate the entire list on every update, killing performance.
* **State Preservation**: If your list items have internal state (like an input with text), `For` ensures that state is preserved even if the list is reordered, as long as the key (`id`) remains the same.

---

## Summary Comparison

| Feature | Standard `Array.map` | SigPro `For` |
| :--- | :--- | :--- |
| **Re-render** | Re-renders everything | Only updates changes |
| **DOM Nodes** | Re-created every time | **Reused via Keys** |
| **Memory** | Potential leaks | **Automatic Cleanup** |
| **State** | Lost on re-render | **Preserved per item** |
| **Ease of Use** | Manual logic required | **Optional (fallback to index)** |