# `SigPro` ⚛️

### **The Atomic Reactivity Engine for the Modern Web.**

**SigPro** is an ultra-lightweight rendering engine designed for extreme performance. By eliminating the Virtual DOM and heavy compilers, it achieves **surgical reactivity** in less than 2KB.

[**Explore the Docs →**](https://natxocc.github.io/sigpro/) | [**View on GitHub**](https://github.com/natxocc/sigpro)

-----

## Why SigPro?

While other frameworks "guess" what changed by comparing massive DOM trees (Diffing), **SigPro already knows.**

* 🎯 **Atomic Precision:** Powered by a *Signal-based* architecture. State is bound directly to DOM nodes—when a value changes, **only that specific node updates**.
* 🚀 **Zero-Hydration Bottlenecks:** No 100KB bundles or complex build steps. SigPro is pure, optimized JavaScript tailored for the browser's native engine.
* 🍦 **Pure Vanilla JS Performance:** High-octane performance without the need for transpilers or heavy transformations. It runs natively in the browser just as well as it does in complex build pipelines.
* 🛠️ **Build-Tool Agnostic:** Total freedom. Use it with **Vite, Webpack, or Rollup** for enterprise projects, or simply import it via a **`<script>` tag** for rapid prototyping. No tooling required.
* 📈 **Zero-Scale Bloat:** Unlike other frameworks where the bundle grows exponentially, SigPro's footprint remains **flat and predictable**. You only pay for the code you write.
* 💎 **Premium DX (Developer Experience):** Forget boilerplate imports. SigPro injects an elegant, functional syntax (`Div()`, `Button()`, `Span()`) directly into your scope for a **"Zero-Import"** workflow.
* 📦 **Fully Loaded:** Built-in Hash Routing, native **`localStorage` persistence**, and automatic lifecycle management (cleanups) included in less than 2KB.
* 🌳 **Tree-Shakable:** Optimized for modern bundlers. Import only what you use, or load the full engine for rapid prototyping.

-----

## Elegance in Action

Create reactive, persistent components with a syntax that feels like Vanilla JS, but works like magic:

```html
<div id="app"></div>
```

```javascript
const Counter = () => {
  // Simple signal
  const value = $(100);
  // One-line persistence: state survives page reloads automatically
  const count = $(0, "user-counter-pref");
  // Computed: automatically updated when value changes
  const doubleValue = (()=> value() *2);

  // Create fast HTML with pure JS
  return Div({ class: "card" }, [
    H1(`Count: ${count()}`),
    dobleValue()
    P("Atomic updates. Zero re-renders of the parent tree."),
    Button({ 
      onclick: () => count(c => c + 1),
      class: "btn-primary" 
    }, "Increment +1")
  ]);
};

$mount(Counter, "#app");
```

-----

## Performance Without Compromise

| Feature | **SigPro** | React / Vue | Svelte |
| :--- | :--- | :--- | :--- |
| **Payload (Gzipped)** | **\< 1.8KB** | \~30KB - 50KB | \~2KB (Runtime) |
| **State Logic** | **Atomic Signals** | Virtual DOM Diffing | Compiler Dirty Bits |
| **Update Speed** | **Direct Node Access** | Component Re-render | Block Reconciliation |
| **Native Persistence** | **Included ($)** | Requires Plugins | Manual |
| **Dependencies** | **Zero** | Many | Build Toolchain |

-----

## Scalable Architecture

SigPro scales from micro-widgets to full enterprise dashboards:

```text
src/
├── 📂 pages/        # Main Pages (Home.js, Auth.js)
└── 📄 main.js       # App Entry & Mounting
```

-----

## Quick Start

```bash
npm install sigpro
```

-----

## License

MIT © 2026 **SigPro Team**.
*Engineered for speed, designed for clarity, built for the modern web.*
