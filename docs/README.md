<div class="w-full -mt-10"><section class="relative py-20 overflow-hidden border-b border-base-200/30 text-center flex flex-col items-center"><div class="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center"><div class="flex justify-center mb-10"><img src="logo.svg" alt="SigPro Logo" class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl"></div><h1 class="text-7xl md:text-9xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-linear-to-r from-primary via-secondary to-accent !text-center w-full">SigPro</h1><div class="text-2xl md:text-3xl font-bold text-base-content/90 mb-4 !text-center w-full">Atomic Unified Reactive Engine</div><div class="text-xl text-base-content/60 max-w-3xl mx-auto mb-10 leading-relaxed italic text-balance font-light !text-center w-full">"The efficiency of direct DOM manipulation with the elegance of functional reactivity."</div><div class="flex flex-wrap justify-center gap-4 w-full"><a href="#/install" class="btn btn-primary btn-lg shadow-xl shadow-primary/20 group px-10 border-none">Get Started <span class="group-hover:translate-x-1 transition-transform inline-block">→</span></a><button onclick="window.open('https://github.com/natxocc/sigpro')" class="btn btn-outline btn-lg border-base-300 hover:bg-base-300 hover:text-base-content">GitHub</button></div></div><div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-10 pointer-events-none"><div class="absolute top-10 left-1/4 w-96 h-96 bg-primary filter blur-3xl rounded-full animate-pulse"></div><div class="absolute bottom-10 right-1/4 w-96 h-96 bg-accent filter blur-3xl rounded-full animate-pulse" style="animation-delay: 2.5s"></div></div></section></div>

<section class="max-w-6xl mx-auto px-6 py-16"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch"><div class="card bg-base-200/30 border border-base-300 hover:border-primary/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-primary italic">FUNCTIONAL</h3><p class="text-sm opacity-70">No strings. No templates. Pure JS function calls for instant DOM mounting.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-secondary/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-secondary italic">ATOMIC</h3><p class="text-sm opacity-70">Fine‑grained signals update exactly what changes. No V‑DOM diffing overhead.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-accent/40 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black text-accent italic">ULTRA‑THIN</h3><p class="text-sm opacity-70">Sub‑2KB runtime. Infinitely smaller bundle than React, Vue or even Svelte.</p></div></div><div class="card bg-base-200/30 border border-base-300 hover:border-base-content/20 transition-all p-1"><div class="card-body p-6"><h3 class="card-title text-xl font-black italic text-base-content">COMPILER‑FREE</h3><p class="text-sm opacity-70">Standard Vanilla JS. What you write is what the browser executes. Period.</p></div></div></div></section>

<div class="max-w-6xl mx-auto px-6 py-8"><h2 class="text-4xl font-black mb-6">Functional DOM Construction</h2><p class="text-lg opacity-80 mb-6">SigPro replaces slow "Template Parsing" with <strong>High‑Efficiency Function Calls</strong>. While other frameworks force the browser to parse strings of HTML or execute complex JSX transformations, SigPro uses a direct functional approach.</p>

<table class="table w-full mb-12">
 <thead><tr><th>Feature</th><th>Standard HTML / JSX</th><th>SigPro Functional</th></tr></thead>
 <tbody>
  <tr><td>Syntax</td><td><code>&lt;div&gt;Hello&lt;/div&gt;</code></td><td><code>div("Hello")</code> (or <code>h('div', "Hello")</code>)</td></tr>
  <tr><td>Processing</td><td>Parse → Diff → Patch</td><td>Direct API Call</td></tr>
  <tr><td>Overhead</td><td>High (V‑DOM / Parser)</td><td><strong>Zero</strong></td></tr>
  <tr><td>Reactivity</td><td>Component‑wide</td><td><strong>Atomic (Node‑level)</strong></td></tr>
 </tbody>
</table>

<h3 class="text-2xl font-bold mt-8 mb-4">Less Code, More Power</h3>
<p class="mb-4">By sharing a minuscule runtime, your final application bundle is <strong>infinitely smaller</strong>.</p>
<ul class="list-disc pl-6 space-y-2 mb-8">
 <li><strong>React/Vue:</strong> You ship a heavy orchestrator (~30‑90KB) just to say "Hello World".</li>
 <li><strong>Solid/Svelte:</strong> You still depend on a compilation step that generates extra boilerplate.</li>
 <li><strong>SigPro:</strong> You ship <strong>Pure Vanilla JS</strong>. The runtime is so small that it often costs less than a single high‑res icon.</li>
</ul>

<h3 class="text-2xl font-bold mt-8 mb-4">Two Ways to Use SigPro (v1.2.19+)</h3>
<p class="mb-2"><strong>🎯 Modern ESM (recommended):</strong> Import only the functions you need – zero global pollution.</p>
<pre class="bg-base-300/30 p-4 rounded-lg mb-4"><code>import { $, div, button, mount } from 'sigpro';
const count = $(0);
mount(() => div([ button({ onclick: () => count(count()+1) }, count) ]), '#app');</code></pre>
<p class="mb-2"><strong>🌍 Classic Global (IIFE):</strong> Load the script and everything is automatically on <code>window</code> – no imports needed.</p>
<pre class="bg-base-300/30 p-4 rounded-lg mb-4"><code>&lt;script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.19/dist/sigpro.js"&gt;&lt;/script&gt;
&lt;script&gt;
const count = $(0);
mount(() => div([ button({ onclick: () => count(count()+1) }, count) ]), '#app');
&lt;/script&gt;</code></pre>
<p class="mb-2"><strong>🔧 ESM + Global injection:</strong> If you want the global helpers but still use <code>type="module"</code>, call <code>sigpro()</code>.</p>
<pre class="bg-base-300/30 p-4 rounded-lg"><code>&lt;script type="module"&gt;
import { sigpro } from 'https://cdn.jsdelivr.net/npm/sigpro@1.2.19/+esm';
sigpro();   // now $, div, button, etc. are global
&lt;/script&gt;</code></pre>

<h3 class="text-2xl font-bold mt-10 mb-4">Precision Engineering</h3>
<h4 class="text-xl font-semibold mt-6 mb-2">1. Functional Efficiency</h4>
<p><code>div()</code>, <code>button()</code>, <code>span()</code>… These aren't just wrappers; they are pre‑optimized constructors. When you call <code>div({ class: 'btn' }, "Click")</code>, SigPro creates the element and attaches its reactive listeners in a single, surgical operation.</p>

<h4 class="text-xl font-semibold mt-6 mb-2">2. The "No‑Bundle" Bundle</h4>
<p>Because SigPro is so small, it is the only engine where <strong>the more code you write, the more the efficiency gap grows</strong>. While others grow linearly with components and framework overhead, SigPro stays flat, leveraging the native power of modern browser engines.</p>

<h4 class="text-xl font-semibold mt-6 mb-2">3. Shared Runtime</h4>
<p>All components share the same atomic engine. One signal can update a single character in a paragraph across 100 components without ever re‑evaluating the component functions themselves.</p>
</div>

<div class="bg-base-200/50 rounded-3xl p-10 my-16 border border-base-300 shadow-inner max-w-6xl mx-auto"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center"><div class="lg:col-span-2"><h2 class="text-4xl font-black mb-4 mt-0 tracking-tight italic text-primary">Kill the Bloat.</h2><p class="text-xl opacity-80 leading-relaxed">Stop shipping 100KB of "Framework" for 2KB of business logic. SigPro gives you the tools to build ultra‑fast, modern apps with <strong>True Vanilla Performance</strong>.</p></div></div></div>

<div class="text-center py-10 opacity-30 font-mono text-xs tracking-widest uppercase">Precision Reactive Engine — NatxoCC</div>
