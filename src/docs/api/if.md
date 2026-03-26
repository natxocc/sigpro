
# 🔀 Reactive Branching: `$if( )`

The `$if` function is a reactive control flow operator. It manages the conditional rendering of components, ensuring that only the active branch exists in the DOM and in memory.

## 🛠️ Function Signature

```typescript
$if(
  condition: Signal<boolean> | Function, 
  thenVal: Component | Node, 
  otherwiseVal?: Component | Node
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`condition`** | `Signal` | Yes | A reactive source that determines which branch to render. |
| **`thenVal`** | `any` | Yes | The content to show when the condition is **truthy**. |
| **`otherwiseVal`** | `any` | No | The content to show when the condition is **falsy** (defaults to null). |

**Returns:** A `div` element with `display: contents` that acts as a reactive portal for the branches.

---

## 📖 Usage Patterns

### 1. Simple Toggle
The most common use case is showing or hiding a single element based on a state.

```javascript
const isVisible = $(false);

Div([
  Button({ onclick: () => isVisible(!isVisible()) }, "Toggle Message"),
  
  $if(isVisible, 
    P("Now you see me!"), 
    P("Now you don't...")
  )
]);
```

### 2. Lazy Component Loading
Unlike using a hidden class (CSS `display: none`), `$if` is **lazy**. The branch that isn't active **is never created**. This saves memory and initial processing time.

```javascript
$if(() => user.isLogged(), 
  () => Dashboard(), // Only executed if logged in
  () => LoginGate()  // Only executed if guest
)
```

---

## 🧹 Automatic Cleanup

One of the core strengths of `$if` is its integrated **Cleanup** logic. SigPro ensures that when a branch is swapped out, it is completely purged.

1.  **Stop Watchers**: All `$.watch` calls inside the inactive branch are permanently stopped.
2.  **Unbind Events**: Event listeners attached via `$.html` are removed.
3.  **Recursive Sweep**: SigPro performs a deep "sweep" of the removed branch to ensure no nested reactive effects remain active.



---

## 💡 Best Practices

* **Function Wrappers**: If your branches are heavy (e.g., they contain complex components), wrap them in a function `() => MyComponent()`. This prevents the component from being initialized until the condition actually meets its requirement.
* **Logical Expressions**: You can pass a complex computed function as the condition:
    ```javascript
    $if(() => count() > 10 && status() === 'ready', 
      Span("Threshold reached!")
    )
    ```

---

## 🏗️ Technical Comparison

| Feature | Standard CSS `hidden` | SigPro `$if` |
| :--- | :--- | :--- |
| **DOM Presence** | Always present | Only if active |
| **Reactivity** | Still processing in background | **Paused/Destroyed** |
| **Memory usage** | Higher | **Optimized** |
| **Cleanup** | Manual | **Automatic** |

