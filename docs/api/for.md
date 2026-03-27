# Reactive Lists: `$for( )`

The `$for` function is a high-performance list renderer. It maps an array (or a Signal containing an array) to DOM nodes. Unlike a simple `.map()`, `$for` is **keyed**, meaning it only updates, moves, or deletes the specific items that changed.

## Function Signature

```typescript
$for(
  source: Signal<any[]> | Function | any[], 
  render: (item: any, index: number) => HTMLElement, 
  keyFn: (item: any, index: number) => string | number
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`source`** | `Signal` | Yes | The reactive array to iterate over. |
| **`render`** | `Function` | Yes | A function that returns a component or Node for each item. |
| **`keyFn`** | `Function` | Yes | A function to extract a **unique ID** for each item (crucial for performance). |

**Returns:** A `div` element with `display: contents` containing the live list.

---

## Usage Patterns

### 1. Basic Keyed List
Always use a unique property (like an `id`) as a key to ensure SigPro doesn't recreate nodes unnecessarily.

```javascript
const users = $([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
]);

Ul({ class: "list" }, [
  $for(users, 
    (user) => Li({ class: "p-2" }, user.name),
    (user) => user.id
  )
]);
```

### 2. Handling Primitive Arrays
If your array contains simple strings or numbers, you can use the value itself or the index as a key (though the index is less efficient for reordering).

```javascript
const tags = $(["Tech", "JS", "Web"]);

Div({ class: "flex gap-1" }, [
  $for(tags, (tag) => Badge(tag), (tag) => tag)
]);
```

---

## How it Works (The Reconciliation)

When the `source` signal changes, `$for` performs the following steps:

1.  **Key Diffing**: It compares the new keys with the previous ones stored in an internal `Map`.
2.  **Node Reuse**: If a key already exists, the DOM node is **reused** and moved to its new position. No new elements are created.
3.  **Cleanup**: If a key disappears from the list, SigPro calls `.destroy()` on that specific item's instance. This stops all its internal watchers and removes its DOM nodes.



---

## Performance Tips

* **Stable Keys**: Never use `Math.random()` as a key. This will force SigPro to destroy and recreate the entire list on every update, killing performance.
* **Component Encapsulation**: If each item in your list has its own complex internal state, `$for` ensures that state is preserved even if the list is reordered, as long as the key remains the same.

---

## Summary Comparison

| Feature | Standard `Array.map` | SigPro `$for` |
| :--- | :--- | :--- |
| **Re-render** | Re-renders everything | Only updates changes |
| **DOM Nodes** | Re-created every time | **Reused via Keys** |
| **Memory** | Potential leaks | **Automatic Cleanup** |
| **State** | Lost on re-render | **Preserved per item** |
