Blazing fast, zero-overhead, vanilla JS renderer with atomic reactivity.

# `SigPro` ⚛️

[![npm version](https://img.shields.io/npm/v/sigpro.svg)](https://www.npmjs.com/package/sigpro)
[![bundle size](https://img.shields.io/bundlephobia/minzip/sigpro)](https://bundlephobia.com/package/sigpro)
[![license](https://img.shields.io/npm/l/sigpro)](https://github.com/natxocc/sigpro/blob/main/LICENSE)

[**Explore the Docs →**](https://sigpro.natxocc.com/#/)

---

## Why SigPro?

After years of building within closed ecosystems like **React, Vue, or Svelte**—spending countless hours mastering their internal rules and extra development time on abstractions—we must face an inevitable truth: all those complex "wrappers" must ultimately be translated back into Pure JavaScript for the browser to understand.

That extra development time and the cognitive load of "learning the framework" instead of "learning the language" is exactly what **SigPro** eliminates. If the final destination is always JS, why not use a Pure JS-based system that drastically simplifies coding with a readable, vanilla, and remarkably fast architecture?

* 🎯 **Atomic Precision:** Powered by a *Signal-based* architecture. State is bound directly to DOM nodes—when a value changes, **only that specific node updates**.
* 🚀 **Zero-Hydration Bottlenecks:** No 100KB bundles or complex build steps. SigPro is pure, optimized JavaScript tailored for the browser's native engine.
* 🍦 **Pure Vanilla JS Performance:** High-octane performance without the need for transpilers or heavy transformations. It runs natively in the browser just as well as it does in complex build pipelines.
* 🛠️ **Build-Tool Agnostic:** Total freedom. Use it with **Vite, Webpack, or Rollup** for enterprise projects, or simply import it via a **`<script>` tag** for rapid prototyping. No tooling required.
* 🚀 **Vite-Powered DX:** First-class Vite support with **file-based routing** out of the box. The official `sigpro/vite` plugin automatically scans your `src/pages` directory and generates reactive routes—no manual route configuration needed.
* 📈 **Zero-Scale Bloat:** Unlike other frameworks where the bundle grows exponentially, SigPro's footprint remains **flat and predictable**. You only pay for the code you write.
* 💎 **Premium DX (Developer Experience):** Forget boilerplate imports. SigPro injects an elegant, functional syntax (`div()`, `button()`, `span()`) directly into your scope for a **"Zero-Import"** workflow.
* 📦 **Fully Loaded:** Built-in Hash Routing, native **`localStorage` persistence**, and automatic lifecycle management (cleanups) included in less than 2KB.
* 🌳 **Tree-Shakable:** Optimized for modern bundlers. Import only what you use, or load the full engine for rapid prototyping.

-----

## ⚡ Real-World Benchmarks

SigPro isn't just "fast on paper." In the industry-standard **JS Framework Benchmark**, it consistently outperforms the most popular libraries by operating at near-native speeds with almost zero memory overhead.

### 🚀 Execution Speed (CPU)
*Lower is better. Measured in milliseconds (ms).*

| Benchmark Test | **SigPro** | SolidJS | Vue 3 | React 18 |
| :--- | :--- | :--- | :--- | :--- |
| **Surgical Update** (10th row) | **46.8ms** | ~48ms | ~75ms | ~158ms |
| **Direct Selection** (on click) | **17.5ms** | ~18ms | ~32ms | ~65ms |
| **Initial Render** (1k rows) | **~35ms** | ~32ms | ~45ms | ~70ms |

### 🧠 Memory Footprint
*Lower is better. Measured in Megabytes (MB) after 1k rows.*

| Metric | **SigPro** | Vanilla JS | Svelte | React |
| :--- | :--- | :--- | :--- | :--- |
| **Ready Memory** (Idle) | **1.05 MB** | 1.01 MB | ~2.8 MB | ~10.4 MB |
| **Run Memory** (1k rows) | **4.90 MB** | 4.25 MB | ~10.2 MB | ~28.5 MB |

> **The Verdict:** SigPro delivers **Vanilla-like memory consumption** while maintaining **Surgical reactivity** that rivals (and often beats) SolidJS in granular updates.

-----

## Elegance in Action

Create reactive, persistent components with a syntax that feels like Vanilla JS, but works like magic:

```html
<div id="app"></div>
```

```javascript
import { sigpro } from "sigpro";
sigpro(); // All functions and tags are available in window

const Counter = () => {
  // Simple signal
  const value = $(100);
  // One-line persistence: state survives page reloads automatically
  const count = $(0, "user-counter-pref");
  // Computed: automatically updated when count() or value() changes
  const doubleValue = $(()=> value() * count());

  // Create fast HTML with pure JS
  return div({ class: "card" }, [
    h1(() => `Count: ${count()}, Reference: ${value()}, Double x Ref: ${doubleValue()}`),
    p("Atomic updates. Zero re-renders of the parent tree."),
    button({ onclick: () => count(c => c + 1)}, "Increment +1")
  ]);
};

mount(Counter, "#app");
```

-----

## Performance Without Compromise

| Feature | **SigPro** | React / Vue | Svelte |
| :--- | :--- | :--- | :--- |
| **Payload (Gzipped)** | **~3KB** | ~30KB - 50KB | ~5KB (Compiled Runtime) |
| **State Logic** | **Atomic Signals** | Virtual DOM Diffing | Compiler Dirty Bits |
| **Update Speed** | **Direct Node Access** | Component Re-render | Block Reconciliation |
| **Native Persistence** | **Included ($)** | Requires Plugins | Manual |
| **Dependencies** | **Zero** | Many | Build Toolchain |
| **Lifecycle Mgmt** | **Automatic (Cleanup Root)** | Manual / Hook-based | Manual / Hook-based |
| **Routing** | **Reactive Hash (Router) + File-based (Vite)** | Virtual Router (External) | File-based / External |
| **Learning Curve** | **Zero (Vanilla JS)** | Steep (JSX/Templates) | Medium (Directives) |

**~3KB** with full functions, less than **1KB** with minimal tree shaking
-----

## Scalable Architecture with Vite

SigPro scales from micro-widgets to full enterprise dashboards. With the official Vite plugin, routing becomes effortless:

```text
src/
├── 📂 pages/              # File-based routing (auto-scanned)
│   ├── index.js           # → /
│   ├── about.js           # → /about
│   ├── blog/
│   │   ├── index.js       # → /blog
│   │   └── [slug].js      # → /blog/:slug
│   └── docs/
│       └── [...all].js    # → /docs/*
├── 📂 components/         # Reusable components
└── 📄 main.js             # App Entry & Mounting
```

**Vite Plugin Setup:**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { sigproRouter } from 'sigpro/vite';

export default defineConfig({
  plugins: [sigproRouter()]
});
```

The plugin automatically:
- Scans your `src/pages` directory recursively
- Generates route definitions from file paths
- Supports dynamic segments (`[param]`) and catch-all routes (`[...param]`)
- Provides automatic 404 fallback
- Enables lazy-loading out of the box

-----

## Quick Start

```bash
npm install sigpro
```

**With Vite (Recommended for larger apps):**
```bash
npm create vite@latest my-app -- --template vanilla
cd my-app
npm install sigpro
```

**Or without build tools:**
```html
<script src="https://unpkg.com/sigpro"></script>
```

-----

## License

MIT © 2026 **SigPro Team**.
*Engineered for speed, designed for clarity, built for the modern web.*
