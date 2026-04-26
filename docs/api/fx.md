# Animation Helper: `fx( )`

The `fx` function applies simple **enter animations** to DOM elements. You can either use a predefined CSS keyframes animation or declare inline transition effects (scale, slide, rotate, blur). It is designed to be used when dynamically creating elements – especially inside `when` or `each` branches.

## Function Signature

```typescript
fx(
  options: {
    name?: string;          // CSS keyframes animation name (will append '-in')
    duration?: number;      // Animation duration in ms (default: 200)
    scale?: boolean;        // Start with scale(0.95) → none
    slide?: boolean;        // Start with translateY(-10px) → none
    rotate?: boolean;       // Start with rotate(-2deg) → none
    blur?: boolean;         // Start with blur(4px) → none
  },
  child: Node | (() => Node)
): Node
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`options`** | `object` | Yes | Animation configuration. |
| **`options.name`** | `string` | No | Name of a CSS `@keyframes` animation. The actual animation name becomes `${name}-in`. |
| **`options.duration`** | `number` | No | Duration in milliseconds (default `200`). |
| **`options.scale`** | `boolean` | No | Add a scale transform from `0.95` to `none`. |
| **`options.slide`** | `boolean` | No | Add a vertical slide from `translateY(-10px)` to `none`. |
| **`options.rotate`** | `boolean` | No | Add a small rotation from `rotate(-2deg)` to `none`. |
| **`options.blur`** | `boolean` | No | Add a blur filter from `blur(4px)` to `none`. |
| **`child`** | `Node` or `() => Node` | Yes | The element to animate. If a function is passed, it is called to obtain the node. |

**Returns:** The same DOM node (or the child if it is not a `Node`), after applying the animation setup.

> **Availability:** `fx` is exported from the SigPro module. In **ESM** you must import it (`import { fx } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, it is automatically available on `window`. The examples below assume the function is already in scope.

---

## Usage Patterns

### 1. Named CSS Keyframes Animation

Define a `@keyframes` rule in your CSS, for example:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Then apply it with `fx`:

```javascript
const MyComponent = () =>
  fx({ name: "fade", duration: 300 },
    div("I will fade in")
  );
```

> The animation name used is `${name}-in`. In this example: `fade-in`.

### 2. Inline Transition (Scale + Opacity)

No CSS keyframes needed. The element starts with `opacity: 0` and `transform: scale(0.95)`, then transitions to `opacity: 1` and `transform: none`.

```javascript
fx({ scale: true, duration: 200 },
  button({ onClick: () => alert("Hi") }, "Click me")
);
```

### 3. Combining Multiple Effects

You can combine `scale`, `slide`, `rotate`, and `blur` at the same time.

```javascript
fx({ scale: true, slide: true, blur: true, duration: 250 },
  div({ class: "card" }, "Smooth enter")
);
```

### 4. Using with `when` (Conditional Rendering)

Wrap the branch content with `fx` to animate entering elements.

```javascript
when(show,
  () => fx({ slide: true },
    div("This slides in when visible")
  )
);
```

### 5. Using a Function as Child

If the element is created inside a function (e.g. to avoid recreation until needed), pass a function that returns the node.

```javascript
fx({ scale: true },
  () => div("Lazy created and then animated")
);
```

---

## What Happens Under the Hood

### With `name` (CSS animation)

- Sets `el.style.animation = `${name}-in ${duration}ms``.
- The element animates according to your keyframes.
- No further inline style changes are applied.

### Without `name` (transition effects)

- Sets `el.style.transition = `all ${duration}ms ease``.
- Sets initial `opacity: 0`.
- Applies initial transforms (`scale`, `slide`, `rotate`) if selected.
- Applies initial `filter: blur(4px)` if `blur: true`.
- In the next animation frame (via `requestAnimationFrame`), sets:
  - `opacity: 1`
  - `transform: none`
  - `filter: none`
- The element transitions smoothly from the start state to the final state.

> **Important:** The element must be **in the DOM** when the animation starts. `fx` does **not** automatically mount the node – you must already have appended it or be about to mount it. In practice, when you call `fx` inside a component that is being mounted, the element will be added to the DOM shortly after, and the animation runs correctly.

---

## Complete Example

```javascript
const App = () =>
  div([
    fx({ name: "fade", duration: 400 },
      h1("Welcome to SigPro")
    ),
    fx({ scale: true, slide: true, duration: 250 },
      button({ onClick: () => alert("Animated!") }, "Animated button")
    )
  ]);

mount(App, "#app");
```

With accompanying CSS:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Notes

- `fx` is **not** required for basic reactivity – it is purely a visual helper for enter animations.
- For exit animations (when an element is removed), use CSS transitions on the element itself combined with `when` – or consider adding a wrapper that delays removal. SigPro does not include built‑in exit animations.
- The function returns the same node you passed, so you can inline it inside `h` or tag helpers:

```javascript
div([
  fx({ scale: true }, span("Hello"))
])
```

- If `child` is not a DOM node (e.g., a string or number), `fx` returns it unchanged – no animation is applied.

---

## Summary

| Option | Effect |
| :--- | :--- |
| `name` | Uses `@keyframes ${name}-in` CSS animation. |
| `duration` | Controls animation/transition length (ms). |
| `scale` | Start scale `0.95` → `none`. |
| `slide` | Start `translateY(-10px)` → `none`. |
| `rotate` | Start `rotate(-2deg)` → `none`. |
| `blur` | Start `blur(4px)` → `none`. |

Combine options to create smooth, modern entrance effects without writing extra CSS.