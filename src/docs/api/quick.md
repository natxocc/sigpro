# ⚡ Quick API Reference

SigPro is a high-performance micro-framework that updates the **Real DOM** surgically. No Virtual DOM, no unnecessary re-renders, and built-in **Cleanup** (memory cleanup).

## 🟢 Core Functions

| Function | Signature | Description |
| :--- | :--- | :--- |
| **`$(val, key?)`** | `(any, string?) => Signal` | Creates a **Signal**. If `key` is provided, it persists in `localStorage`. |
| **`$(fn)`** | `(function) => Computed` | Creates a **Computed Signal** that auto-updates when its dependencies change. |
| **`$.watch(fn)`** | `(function) => stopFn` | **Automatic Mode:** Tracks any signal touched inside. Returns a stop function. |
| **`$.watch(deps, fn)`** | `(Array, function) => stopFn` | **Explicit Mode:** Only runs when signals in `deps` change. Used for Cleanup. |
| **`$.html(tag, props, kids)`** | `(string, obj, any) => Element` | The low-level DOM factory. Attaches `._cleanups` to every element. |
| **`$.if(cond, then, else?)`** | `(Signal, fn, fn?) => Node` | Reactive conditional. Automatically destroys the "else" branch memory. |
| **`$.for(list, itemFn)`** | `(Signal, fn) => Node` | Optimized list renderer. Manages individual item lifecycles. |
| **`$.router(routes)`** | `(Array) => Element` | Hash-based SPA router. Uses Explicit Watch to prevent memory leaks. |
| **`$.mount(node, target)`** | `(any, string\|Node) => Runtime` | Entry point. Creates a root instance with `.destroy()` capabilities. |

---

## 🏗️ Element Constructors (Tags)

SigPro provides PascalCase wrappers for all standard HTML5 tags (e.g., `Div`, `Span`, `Button`).

### Syntax Pattern
```javascript
Tag({ attributes }, [children])
```

### Attribute & Content Handling

| Pattern | Code Example | Behavior |
| :--- | :--- | :--- |
| **Static** | `class: "text-red"` | Standard HTML attribute string. |
| **Reactive** | `disabled: isLoading` | Updates automatically via internal `$.watch`. |
| **Two-way** | `$value: username` | **Binding Operator**: Syncs input $\leftrightarrow$ signal both ways. |
| **Text** | `P({}, () => count())` | Updates text node surgically without re-rendering the `P`. |
| **Boolean** | `hidden: isHidden` | Toggles the attribute based on signal truthiness. |
