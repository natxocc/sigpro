# 🎨 Global Tag Helpers

In **SigPro**, you don't need to manually type `$.html('div', ...)` for every element. To keep your code declarative and readable, the engine automatically generates **Global Helper Functions** for all standard HTML5 tags upon initialization.

## 1. How it Works

SigPro iterates through a manifest of standard HTML tags and attaches a wrapper function for each one directly to the `window` object. This creates a specialized **DSL** (Domain Specific Language) that looks like a template engine but is **100% standard JavaScript**.

* **Under the hood:** `$.html('button', { onclick: ... }, 'Click')`
* **SigPro Style:** `Button({ onclick: ... }, 'Click')`

---

## 2. The Complete Global Registry

The following functions are injected into the global scope (using **PascalCase** to prevent naming collisions with common JS variables) and are ready to use:

| Category | Available Global Functions |
| :--- | :--- |
| **Structure** | `Div`, `Span`, `P`, `Section`, `Nav`, `Main`, `Header`, `Footer`, `Article`, `Aside` |
| **Typography** | `H1` to `H6`, `Ul`, `Ol`, `Li`, `Dl`, `Dt`, `Dd`, `Strong`, `Em`, `Code`, `Pre`, `Small`, `B`, `U`, `Mark` |
| **Interactive** | `Button`, `A`, `Label`, `Br`, `Hr`, `Details`, `Summary`, `Dialog` |
| **Forms** | `Form`, `Input`, `Select`, `Option`, `Textarea`, `Fieldset`, `Legend` |
| **Tables** | `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`, `Tfoot`, `Caption` |
| **Media** | `Img`, `Canvas`, `Video`, `Audio`, `Svg`, `Iframe`, `Picture`, `Source` |

> **The SigPro Philosophy:** Tags are not "magic strings" handled by a compiler. They are **functional constructors**. Every time you call `Div()`, you execute a pure JS function that returns a real, reactive DOM element.

---

## 3. Usage Patterns (Smart Arguments)

SigPro tag helpers are flexible. They automatically detect if you are passing attributes, children, or both.

### A. Attributes + Children
The standard way to build structured UI.
```javascript
Div({ class: 'container', id: 'main' }, [
  H1("Welcome to SigPro"),
  P("The zero-VDOM framework.")
]);
```

### B. Children Only (The "Skipper")
If you don't need attributes, you can skip the object and pass the content (string, array, or function) directly as the first argument.
```javascript
Section([
  H2("Clean Syntax"),
  Button("I have no props!")
]);
```

### C. Primitive Content
For simple tags, just pass a string or a number.
```javascript
H1("Hello World"); 
Span(42);
```

---

## 4. Reactive Power

These helpers are natively wired into SigPro's **`$.watch`** engine. No manual effect management is needed; the lifecycle is tied to the DOM node.

### Reactive Attributes
Simply pass a Signal (function) to any attribute. SigPro creates an internal `$.watch` to keep the DOM in sync.
```javascript
const theme = $("light");

Div({ 
  // Updates 'class' automatically via internal $.watch
  class: () => `app-box ${theme()}` 
}, "Themeable Box");
```

### The Binding Operator (`$`)
Use the `$` prefix for **Two-Way Binding** on inputs. This bridges the Signal and the Input element bi-directionally.
```javascript
const search = $("");

Input({ 
  type: "text", 
  placeholder: "Search...",
  $value: search // UI updates Signal AND Signal updates UI
});
```

### Dynamic Flow & Saneamiento
Combine tags with Core controllers for high-performance rendering. SigPro automatically cleans up the `$.watch` instances when nodes are removed.
```javascript
const items = $(["Apple", "Banana", "Cherry"]);

Ul({ class: "list-disc" }, [
  $.For(items, (item) => Li(item))
]);
```

---
::: danger
## ⚠️ Important: Naming Conventions

Since SigPro injects these helpers into the global `window` object, follow these rules to avoid bugs:

1.  **Avoid Shadowing**: Don't name your local variables like the tags (e.g., `const Div = ...`). This will "hide" the SigPro helper.
2.  **Custom Components**: Always use **PascalCase** for your own component functions (e.g., `UserCard`, `NavMenu`) to distinguish them from the built-in Tag Helpers and maintain architectural clarity.
:::
---

## 5. Logic to UI Comparison

Here is how a dynamic **User Status** component translates from SigPro logic to the final DOM structure, handled by the engine.

```javascript
// SigPro Component
const UserStatus = (name, $online) => (
  Div({ class: 'flex items-center gap-2' }, [
    Span({ 
      // Boolean toggle for 'hidden' attribute
      hidden: () => !$online(), 
      class: 'w-3 h-3 bg-green-500 rounded-full' 
    }),
    P({ 
      // Reactive text content via automatic $.watch
      class: () => $online() ? "text-bold" : "text-gray-400" 
    }, name)
  ])
);
```

| State (`$online`) | Rendered HTML | Memory Management |
| :--- | :--- | :--- |
| **`true`** | `<div class="flex..."><span class="w-3..."></span><p class="text-bold">John</p></div>` | Watcher active |
| **`false`** | `<div class="flex..."><span hidden class="w-3..."></span><p class="text-gray-400">John</p></div>` | Attribute synced |
