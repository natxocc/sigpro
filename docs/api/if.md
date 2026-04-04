# Reactive Branching: `$if( )`

The `$if` function is a reactive control flow operator. It manages the conditional rendering of components with optional smooth transitions, ensuring that only the active branch exists in the DOM and in memory.

## Function Signature

```typescript
$if(
  condition: Signal<boolean> | Function, 
  thenVal: Component | Node, 
  otherwiseVal?: Component | Node,
  transition?: Transition
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`condition`** | `Signal` | Yes | A reactive source that determines which branch to render. |
| **`thenVal`** | `any` | Yes | The content to show when the condition is **truthy**. |
| **`otherwiseVal`** | `any` | No | The content to show when the condition is **falsy** (defaults to null). |
| **`transition`** | `Transition` | No | Optional animation hooks for enter/exit transitions. |

**Returns:** A `div` element with `display: contents` that acts as a reactive portal for the branches.

---

## Transition Interface

```typescript
interface Transition {
  /** Called when branch enters. Use for fade-in, slide-in, etc. */
  in: (el: HTMLElement) => void;
  /** Called when branch leaves. Call `done()` when animation completes. */
  out: (el: HTMLElement, done: () => void) => void;
}
```

### Example: Fade Transition

```javascript
const fade = {
  in: (el) => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
  },
  out: (el, done) => {
    el.style.transition = "opacity 0.3s";
    el.style.opacity = "0";
    setTimeout(done, 300);
  }
};

$if(show, Modal, null, fade);
```

---

## Usage Patterns

### 1. Simple Toggle

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

### 2. With Smooth Animation

```javascript
const showModal = $(false);

Div([
  Button({ onclick: () => showModal(true) }, "Open Modal"),
  
  $if(showModal, 
    () => Modal({ onClose: () => showModal(false) }),
    null,
    fade  // ← Smooth enter/exit animation
  )
]);
```

### 3. Lazy Component Loading

Unlike CSS `display: none`, `$if` is **lazy**. The inactive branch is never created, saving memory.

```javascript
$if(() => user.isLogged(), 
  () => Dashboard(), // Only executed if logged in
  () => LoginGate()  // Only executed if guest
)
```

### 4. Complex Conditions

```javascript
$if(() => count() > 10 && status() === 'ready', 
  Span("Threshold reached!")
)
```

### 5. $if.not Helper

```javascript
$if.not(loading, 
  () => Content(),  // Shows when loading is FALSE
  () => Spinner()   // Shows when loading is TRUE
)
```

---

## Automatic Cleanup

One of the core strengths of `$if` is its integrated **Cleanup** logic. SigPro ensures that when a branch is swapped out, it is completely purged.

1. **Stop Watchers**: All `$watch` calls inside the inactive branch are permanently stopped.
2. **Unbind Events**: Event listeners attached via `$html` are removed.
3. **Recursive Sweep**: SigPro performs a deep "sweep" of the removed branch.
4. **Transition Respect**: When using transitions, destruction only happens AFTER the `out` animation completes.

---

## Best Practices

- **Function Wrappers**: For heavy components, use `() => MyComponent()` to prevent initialization until needed.
- **Reusable Transitions**: Define common transitions (fade, slide, scale) in a shared module.
- **Cleanup**: No manual cleanup needed. SigPro handles everything automatically.

---

## Technical Comparison

| Feature | Standard CSS `hidden` | SigPro `$if` |
| :--- | :--- | :--- |
| **DOM Presence** | Always present | Only if active |
| **Reactivity** | Still processing | **Paused/Destroyed** |
| **Memory usage** | Higher | **Optimized** |
| **Cleanup** | Manual | **Automatic** |
| **Smooth Transitions** | Manual | **Built-in hook** |
| **Animation Timing** | You manage | **Respected by core** |

---

## Complete Transition Examples

### Fade
```javascript
const fade = {
  in: (el) => { el.style.opacity = "0"; requestAnimationFrame(() => { el.style.transition = "opacity 0.3s"; el.style.opacity = "1"; }); },
  out: (el, done) => { el.style.transition = "opacity 0.3s"; el.style.opacity = "0"; setTimeout(done, 300); }
};
```

### Slide
```javascript
const slide = {
  in: (el) => { el.style.transform = "translateX(-100%)"; requestAnimationFrame(() => { el.style.transition = "transform 0.3s"; el.style.transform = "translateX(0)"; }); },
  out: (el, done) => { el.style.transition = "transform 0.3s"; el.style.transform = "translateX(-100%)"; setTimeout(done, 300); }
};
```

### Scale
```javascript
const scale = {
  in: (el) => { el.style.transform = "scale(0)"; requestAnimationFrame(() => { el.style.transition = "transform 0.2s"; el.style.transform = "scale(1)"; }); },
  out: (el, done) => { el.style.transition = "transform 0.2s"; el.style.transform = "scale(0)"; setTimeout(done, 200); }
};
```