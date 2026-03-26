# ⚡ Quick API Reference (V2)

SigPro is a high-performance micro-framework that updates the **Real DOM** surgically. No Virtual DOM, no unnecessary re-renders, and built-in **Saneamiento** (memory cleanup).

## 🟢 Core Functions

| Function | Signature | Description |
| :--- | :--- | :--- |
| **`$(val, key?)`** | `(any, string?) => Signal` | Creates a **Signal**. If `key` is provided, it persists in `localStorage`. |
| **`$(fn)`** | `(function) => Computed` | Creates a **Computed Signal** that auto-updates when its dependencies change. |
| **`$.watch(fn)`** | `(function) => stopFn` | **Automatic Mode:** Tracks any signal touched inside. Returns a stop function. |
| **`$.watch(deps, fn)`** | `(Array, function) => stopFn` | **Explicit Mode:** Only runs when signals in `deps` change. Used for Saneamiento. |
| **`$.html(tag, props, kids)`** | `(string, obj, any) => Element` | The low-level DOM factory. Attaches `._cleanups` to every element. |
| **`$.If(cond, then, else?)`** | `(Signal, fn, fn?) => Node` | Reactive conditional. Automatically destroys the "else" branch memory. |
| **`$.For(list, itemFn)`** | `(Signal, fn) => Node` | Optimized list renderer. Manages individual item lifecycles. |
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

---

## 🧹 Saneamiento (Memory Management)

In SigPro V2, you rarely need to clean up manually, but the tools are there if you build custom components:

* **Automatic**: Anything inside `$.If`, `$.For`, or `$.router` is "swept" when it disappears.
* **Manual**: Use `instance.destroy()` for apps or `$.cleanup(el)` for manual DOM injections.
* **Internal**: Every element carries a `._cleanups` Set with its own reactive "kill-switches".

