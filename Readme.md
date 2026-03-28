# `SigPro` 

### **The Atomic Reactivity Engine for the Modern Web.**

[](https://opensource.org/licenses/MIT)
[](https://www.google.com/search?q=https://github.com/natxocc/sigpro)
[](https://www.google.com/search?q=https://github.com/natxocc/sigpro)

**SigPro** is an ultra-lightweight reactive rendering engine that redefines efficiency. No Virtual DOM, no heavy compilers, and zero dependencies. Just **surgical reactivity** packed into less than 2KB.

[**Explore the Docs →**](https://www.google.com/search?q=https://natxocc.github.io/sigpro/)

-----

## The SigPro Manifesto

SigPro isn't just another framework; it’s a precision tool. While other frameworks try to guess what changed by comparing trees (Diffing), SigPro **already knows**.

  * ** Atomic Reactivity:** Powered by a *Signal-based* architecture, SigPro binds state directly to DOM nodes. When a value changes, only that specific node reacts.
  * ** Zero Overhead:** Forget hydration bottlenecks and 100KB bundles. SigPro is pure, optimized JavaScript tailored for the browser's engine.
  * ** Next-Gen DX:** Say goodbye to endless imports. SigPro injects smart helpers like `Div()`, `Button()`, and `Span()` directly into your environment for a clean, functional syntax.
  * ** Batteries Included:** Hash-based Routing, native `localStorage` persistence, and automatic lifecycle management (cleanups) come standard.

-----

## A Glimpse of the Code

Elegance stems from simplicity. Here is how you create a reactive, persistent component:

```javascript
// main.js
const Counter = () => {
  // Persistent Signal: automatically restores state after reload
  const count = $(0, "user-counter-pref"); 

  return Div({ class: "card-container" }, [
    H1(`Count: ${count()}`),
    P("Click below to trigger an atomic update."),
    Button({ 
      onclick: () => count(c => c + 1),
      class: "btn-primary" 
    }, "Increment +1")
  ]);
};

$mount(Counter, "#app");
```

-----

## Performance Breakdown

| Metric | **SigPro** | React / Vue | Svelte |
| :--- | :--- | :--- | :--- |
| **Weight (Gzipped)** | **\< 1.8KB** | \~30KB - 50KB | \~2KB (Runtime) |
| **Strategy** | **Atomic Signals** | Virtual DOM Diffing | Compiler Dirty Bits |
| **Update Mechanism** | **Direct Node Access** | Branch Re-rendering | Block Update |
| **Persistence** | **Native ($)** | Manual / Plugins | Manual |
| **Learning Curve** | **Flat (Vanilla JS)** | Medium / High | Medium |

-----

## Recommended Architecture

SigPro scales beautifully with modern project structures:

```text
app/
├── 📂 components/   # UI Atoms (Button.js, Input.js)
├── 📂 pages/        # Main Views (Home.js, Dashboard.js)
├── 📂 store/        # Shared Global Signals
├── 📄 App.js        # Layout, Router & Navigation
└── 📄 index.js      # Entry Point & Mounting
```

-----

## Quick Install

Install via your preferred package manager:

```bash
bun add natxocc/sigpro
# or
npm install sigpro
```

-----

## License

MIT © 2026 **SigPro Team**. Engineered for speed, designed for clarity.
