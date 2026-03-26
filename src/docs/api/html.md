# 🏗️ The DOM Factory: `$.html( )`

`$.html` is the internal engine that creates, attributes, and attaches reactivity to DOM elements. It uses `$.watch` to maintain a live, high-performance link between your Signals and the Document Object Model.

## 🛠 Function Signature

```typescript
$.html(tagName: string, props?: Object, children?: any[] | any): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`tagName`** | `string` | Yes | Valid HTML tag name (e.g., `"div"`, `"button"`). |
| **`props`** | `Object` | No | HTML attributes, event listeners, and reactive bindings. |
| **`children`** | `any` | No | Nested elements, text strings, or reactive functions. |

---

## 📖 Key Features

### 1. Attribute Handling
SigPro intelligently decides how to apply each property:
* **Standard Props**: Applied via `setAttribute` or direct property assignment.
* **Boolean Props**: Uses `toggleAttribute` (e.g., `checked`, `disabled`, `hidden`).
* **Class Names**: Supports `class` or `className` interchangeably.

### 2. Event Listeners & Modifiers
Events are defined by the `on` prefix. SigPro supports **Dot Notation** for common event operations:

```javascript
$.html("button", {
  // e.preventDefault() is called automatically
  "onsubmit.prevent": (e) => save(e), 
  
  // e.stopPropagation() is called automatically
  "onclick.stop": () => console.log("No bubbling"),
  
  // { once: true } listener option
  "onclick.once": () => console.log("Runs only once")
}, "Click Me");
```

### 3. Reactive Attributes
If an attribute value is a **function** (like a Signal), `$.html` creates an internal **`$.watch`** to keep the DOM in sync with the state.

```javascript
$.html("div", {
  // Updates the class whenever 'theme()' changes
  class: () => theme() === "dark" ? "bg-black" : "bg-white"
});
```

### 4. Reactive Children
Children can be static or dynamic. When a child is a function, SigPro creates a reactive boundary using `$.watch` for that specific part of the DOM.

```javascript
$.html("div", {}, [
  H1("Static Title"),
  // Only this text node re-renders when 'count' changes
  () => `Current count: ${count()}`
]);
```

---

## 🔄 Two-Way Binding Operator (`$`)

When a property starts with `$`, `$.html` enables bidirectional synchronization. This is primarily used for form inputs.

```javascript
$.html("input", {
  type: "text",
  $value: username // Syncs input value <-> signal
});
```

## 🧹 Memory Management (Internal)
Every element created with `$.html` is "self-aware" regarding its reactive dependencies.
* **`._cleanups`**: A hidden `Set` attached to the element that stores all `stop()` functions from its internal `$.watch` calls and event listeners.
* **Lifecycle**: When an element is removed by a Controller (`$.If`, `$.For`, or `$.router`), SigPro performs a recursive "sweep" to execute these cleanups, ensuring **zero memory leaks**.

---

## 💡 Tag Constructors (The Shortcuts)

Instead of writing `$.html("div", ...)` every time, SigPro provides PascalCase global functions:

```javascript
// This:
Div({ class: "wrapper" }, [ Span("Hello") ])

// Is exactly equivalent to:
$.html("div", { class: "wrapper" }, [ $.html("span", {}, "Hello") ])
```
