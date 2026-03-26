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
* **Class Names**: Supports `class` or `className` interchangeably.
* **Boolean Props**: Automatic handling for `checked`, `disabled`, `hidden`, etc.

### 2. Event Listeners
Events are defined by the `on` prefix. SigPro automatically registers the listener and ensures it is cleaned up when the element is destroyed.

```javascript
Button({
  onclick: (e) => console.log("Clicked!", e),
}, "Click Me");
```

### 3. Reactive Attributes (One-Way)
If an attribute value is a **function** (like a Signal), `$.html` creates an internal **`$.watch`** to keep the DOM in sync with the state.

```javascript
Div({
  // Updates the class whenever 'theme()' changes
  class: () => theme() === "dark" ? "bg-black" : "bg-white"
});
```

### 4. Smart Two-Way Binding (Automatic)
SigPro automatically enables **bidirectional synchronization** when it detects a **Signal** assigned to a form-capable attribute (`value` or `checked`) on an input element (`input`, `textarea`, `select`).



```javascript
// Syncs input value <-> signal automatically
Input({ 
  type: "text", 
  value: username // No special symbols needed!
})
```

> **Note:** To use a Signal as **read-only** in an input, wrap it in an anonymous function: `value: () => username()`.

### 5. Reactive Children
Children can be static or dynamic. When a child is a function, SigPro creates a reactive boundary using `$.watch` for that specific part of the DOM.

```javascript
Div({}, [
  H1("Static Title"),
  // Only this text node re-renders when 'count' changes
  () => `Current count: ${count()}`
]);
```

---

## 🧹 Memory Management (Internal)
Every element created with `$.html` is "self-aware" regarding its reactive dependencies.
* **`._cleanups`**: A hidden `Set` attached to the element that stores all `stop()` functions from its internal `$.watch` calls and event listeners.
* **Lifecycle**: When an element is removed by a Controller (`$.if`, `$.for`, or `$.router`), SigPro performs a recursive **"sweep"** to execute these cleanups, ensuring **zero memory leaks**.

---

## 💡 Tag Constructors (The Shortcuts)

Instead of writing `$.html("div", ...)` every time, SigPro provides PascalCase global functions for all standard HTML tags:

```javascript
// This:
Div({ class: "wrapper" }, [ Span("Hello") ])

// Is exactly equivalent to:
$.html("div", { class: "wrapper" }, [ $.html("span", {}, "Hello") ])
```
