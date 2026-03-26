# 🎨 Global Tag Helpers

In **SigPro**, you don't need to manually type `$.html('div', ...)` for every element. To keep your code declarative and readable, the engine automatically generates **Global Helper Functions** for all standard HTML5 tags upon initialization.

## 1. How it Works

SigPro iterates through a manifest of standard HTML tags and attaches a wrapper function for each one directly to the `window` object. This creates a specialized **DSL** (Domain Specific Language) that looks like a template engine but is **100% standard JavaScript**.

* **Under the hood:** `$.html('button', { onclick: ... }, 'Click')`
* **SigPro Style:** `Button({ onclick: ... }, 'Click')`

---

## 2. The Complete Global Registry

The following functions are injected into the global scope using **PascalCase** to prevent naming collisions with common JS variables:

| Category | Available Global Functions |
| :--- | :--- |
| **Structure** | `Div`, `Span`, `P`, `Section`, `Nav`, `Main`, `Header`, `Footer`, `Article`, `Aside` |
| **Typography** | `H1` to `H6`, `Ul`, `Ol`, `Li`, `Dl`, `Dt`, `Dd`, `Strong`, `Em`, `Code`, `Pre`, `Small`, `B`, `U`, `Mark` |
| **Interactive** | `Button`, `A`, `Label`, `Br`, `Hr`, `Details`, `Summary`, `Dialog` |
| **Forms** | `Form`, `Input`, `Select`, `Option`, `Textarea`, `Fieldset`, `Legend` |
| **Tables** | `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`, `Tfoot`, `Caption` |
| **Media** | `Img`, `Canvas`, `Video`, `Audio`, `Svg`, `Iframe`, `Picture`, `Source` |

---

## 3. Usage Patterns (Smart Arguments)

SigPro tag helpers are flexible. They automatically detect if you are passing attributes, children, or both.

### A. Attributes + Children
```javascript
Div({ class: 'container', id: 'main' }, [
  H1("Welcome to SigPro"),
  P("The zero-VDOM framework.")
]);
```

### B. Children Only (The "Skipper")
If you don't need attributes, you can pass the content directly as the first argument.
```javascript
Section([
  H2("Clean Syntax"),
  Button("I have no props!")
]);
```

---

## 4. Reactive Power

These helpers are natively wired into SigPro's **`$.watch`** engine.

### Reactive Attributes (One-Way)
Simply pass a Signal (function) to any attribute. SigPro creates an internal `$.watch` to keep the DOM in sync.
```javascript
const theme = $("light");

Div({ 
  class: () => `app-box ${theme()}` 
}, "Themeable Box");
```

### Smart Two-Way Binding (Automatic)
SigPro automatically bridges the **Signal** and the **Input** element bi-directionally when you assign a Signal to `value` or `checked`. No special operators are required.

```javascript
const search = $("");

// UI updates Signal AND Signal updates UI automatically
Input({ 
  type: "text", 
  placeholder: "Search...",
  value: search 
});
```

> **Pro Tip:** If you want an input to be **read-only** but still reactive, wrap the signal in an anonymous function: `value: () => search()`. This prevents the "backwards" synchronization.

### Dynamic Flow & Cleanup
Combine tags with Core controllers. SigPro automatically cleans up the `$.watch` instances and event listeners when nodes are removed from the DOM.
```javascript
const items = $(["Apple", "Banana", "Cherry"]);

Ul({ class: "list-disc" }, [
  $.for(items, (item) => Li(item), (item) => item)
]);
```

---

::: danger
## ⚠️ Important: Naming Conventions

1.  **Avoid Shadowing**: Don't name your local variables like the tags (e.g., `const Div = ...`). This will "hide" the global SigPro helper.
2.  **Custom Components**: Always use **PascalCase** for your own component functions (e.g., `UserCard`, `NavMenu`) to distinguish them from built-in Tag Helpers.
:::

---

## 5. Logic to UI Comparison

Here is how a dynamic **User Status** component translates from SigPro logic to the final DOM structure.

```javascript
const UserStatus = (name, online) => (
  Div({ class: 'flex items-center gap-2' }, [
    Span({ 
      hidden: () => !online(), 
      class: 'w-3 h-3 bg-green-500 rounded-full' 
    }),
    P({ 
      class: () => online() ? "text-bold" : "text-gray-400" 
    }, name)
  ])
);
```

| State (`online`) | Rendered HTML | Memory Management |
| :--- | :--- | :--- |
| **`true`** | `<div class="flex..."><span class="w-3..."></span><p class="text-bold">John</p></div>` | Watcher active |
| **`false`** | `<div class="flex..."><span hidden class="w-3..."></span><p class="text-gray-400">John</p></div>` | Attribute synced |

