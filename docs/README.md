<div class="w-full -mt-10"><section class="relative py-20 overflow-hidden border-b border-base-200/30 text-center flex flex-col items-center"><div class="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center"><div class="flex justify-center mb-10"><img src="logo.svg" alt="SigPro Logo" class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl"></div><h1 class="text-7xl md:text-9xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-linear-to-r from-primary via-secondary to-accent !text-center w-full">SigPro</h1><div class="text-2xl md:text-3xl font-bold text-base-content/90 mb-4 !text-center w-full">Atomic Unified Reactive Engine</div><div class="text-xl text-base-content/60 max-w-3xl mx-auto mb-10 leading-relaxed italic text-balance font-light !text-center w-full">"The efficiency of direct DOM manipulation with the elegance of functional reactivity."</div><div class="flex flex-wrap justify-center gap-4 w-full"><a href="#/install" class="btn btn-primary btn-lg shadow-xl shadow-primary/20 group px-10 border-none">Get Started <span class="group-hover:translate-x-1 transition-transform inline-block">→</span></a><button onclick="window.open('https://github.com/natxocc/sigpro')" class="btn btn-outline btn-lg border-base-300 hover:bg-base-300 hover:text-base-content">GitHub</button></div></div><div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-10 pointer-events-none"><div class="absolute top-10 left-1/4 w-96 h-96 bg-primary filter blur-3xl rounded-full animate-pulse"></div><div class="absolute bottom-10 right-1/4 w-96 h-96 bg-accent filter blur-3xl rounded-full animate-pulse" style="animation-delay: 2.5s"></div></div></section></div>

<section class="max-w-6xl mx-auto px-6 py-16"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch"><div class="card bg-base-200/30 border border-base-300 hover:border-primary/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-primary italic">FUNCTIONAL</h3><p class="text-sm opacity-70">No strings. No templates. Pure JS function calls for instant DOM mounting.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-secondary/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-secondary italic">ATOMIC</h3><p class="text-sm opacity-70">Fine-grained signals update exactly what changes. No V-DOM diffing overhead.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-accent/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-accent italic">ULTRA-THIN</h3><p class="text-sm opacity-70">Sub-2KB runtime. Infinitely smaller bundle than React, Vue or even Svelte.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-base-content/20 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black italic text-base-content">COMPILER-FREE</h3><p class="text-sm opacity-70">Standard Vanilla JS. What you write is what the browser executes. Period.</p></div></div></div></section></div>

## Functional DOM Construction

SigPro replaces the slow "Template Parsing" with **High-Efficiency Function Calls**. 

While other frameworks force the browser to parse strings of HTML or execute complex JSX transformations, SigPro uses a direct functional approach:

| Feature | Standard HTML / JSX | SigPro Functional |
| :--- | :--- | :--- |
| **Syntax** | `<div>Hello</div>` | `Div("Hello")` |
| **Processing** | Parse → Diff → Patch | Direct API Call |
| **Overhead** | High (V-DOM / Parser) | **Zero** |
| **Reactivity** | Component-wide | **Atomic (Node-level)** |

### Less Code, More Power
By sharing a miniscule runtime, your final application bundle is **infinitely smaller**.

* **React/Vue:** You ship a heavy orchestrator (~30-90KB) just to say "Hello World".
* **Solid/Svelte:** You still depend on a compilation step that generates extra boilerplate.
* **SigPro:** You ship **Pure Vanilla JS**. The runtime is so small that it often costs less than a single high-res icon.

---

## Precision Engineering

### 1. Functional Efficiency
`Div()`, `Button()`, `Span()`... These aren't just wrappers; they are pre-optimized constructors. When you call `Div({ class: 'btn' }, "Click")`, SigPro creates the element and attaches its reactive listeners in a single, surgical operation.

### 2. The "No-Bundle" Bundle
Because SigPro is so small, it is the only engine where **the more code you write, the more the efficiency gap grows**. While others grow linearly with components and framework overhead, SigPro stays flat, leveraging the native power of modern browser engines.

### 3. Shared Runtime
All components share the same atomic engine. One signal can update a single character in a paragraph across 100 components without ever re-evaluating the component functions themselves.

---

<div class="bg-base-200/50 rounded-3xl p-10 my-16 border border-base-300 shadow-inner"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center"><div class="lg:col-span-2"><h2 class="text-4xl font-black mb-4 mt-0 tracking-tight italic text-primary">Kill the Bloat.</h2><p class="text-xl opacity-80 leading-relaxed">Stop shipping 100KB of "Framework" for 2KB of business logic. SigPro gives you the tools to build ultra-fast, modern apps with <strong>True Vanilla Performance</strong>.</p></div></div></div>

<div class="text-center py-10 opacity-30 font-mono text-xs tracking-widest uppercase">Precision Reactive Engine — NatxoCC</div>
