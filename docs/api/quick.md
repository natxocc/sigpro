# ⚡ Quick API Reference

SigPro is a high-performance micro-framework that updates the **Real DOM** surgically. No Virtual DOM, no unnecessary re-renders, and built-in **Cleanup** (memory cleanup).

## Core Functions

Explore the reactive building blocks of SigPro.

<div class="overflow-x-auto my-8 border border-base-300 rounded-xl shadow-sm">
  <table class="table table-zebra w-full">
    <thead class="bg-base-200 text-base-content">
      <tr>
        <th>Function</th>
        <th>Signature</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code class="text-primary font-bold">$(val, key?)</code></td>
        <td class="font-mono text-xs opacity-70">(any, string?) => Signal</td>
        <td>Creates a <b>Signal</b>. If <code>key</code> is provided, it persists in <code>localStorage</code>.</td>
      </tr>
      <tr>
        <td><code class="text-primary font-bold">$(fn)</code></td>
        <td class="font-mono text-xs opacity-70">(function) => Computed</td>
        <td>Creates a <b>Computed Signal</b> that auto-updates when dependencies change.</td>
      </tr>
      <tr>
        <td><code class="text-secondary font-bold">$watch(fn)</code></td>
        <td class="font-mono text-xs opacity-70">(function) => stopFn</td>
        <td><b>Auto Mode:</b> Tracks any signal touched inside. Returns a stop function.</td>
      </tr>
      <tr>
        <td><code class="text-secondary font-bold">$watch(deps, fn)</code></td>
        <td class="font-mono text-xs opacity-70">(Array, function) => stopFn</td>
        <td><b>Explicit Mode:</b> Only runs when signals in <code>deps</code> change.</td>
      </tr>
      <tr>
        <td><code class="text-accent font-bold">$if(cond, then, else?)</code></td>
        <td class="font-mono text-xs opacity-70">(Signal|bool, fn, fn?) => Node</td>
        <td>Reactive conditional. Automatically destroys "else" branch memory.</td>
      </tr>
      <tr>
        <td><code class="text-accent font-bold">$for(src, render, key)</code></td>
        <td class="font-mono text-xs opacity-70">(Signal, fn, fn) => Node</td>
        <td><b>Keyed Loop:</b> Optimized list renderer. Uses the key function for surgical DOM moves.</td>
      </tr>
      <tr>
        <td><code class="text-info font-bold">$router(routes)</code></td>
        <td class="font-mono text-xs opacity-70">(Array) => Node</td>
        <td><b>SPA Router:</b> Hash-based routing with dynamic params (<code>:id</code>) and auto-cleanup.</td>
      </tr>
      <tr>
        <td><code class="font-bold">$mount(node, target)</code></td>
        <td class="font-mono text-xs opacity-70">(any, string|Node) => Runtime</td>
        <td>Entry point. Cleans the target and mounts the app with full lifecycle management.</td>
      </tr>
    </tbody>
  </table>
</div>

---

## Element Constructors (Tags)

SigPro provides **PascalCase** wrappers for all standard HTML5 tags (e.g., `Div`, `Span`, `Button`).

### Syntax Pattern

<div class="mockup-code bg-base-300 text-base-content my-6">
  <pre data-prefix=">"><code>Tag({ attributes }, [children])</code></pre>
</div>

### Special Attributes & Routing

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
  <div class="card bg-base-200 border border-base-300 shadow-sm">
    <div class="card-body p-5">
      <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Two-way Binding</h3>
      <code class="text-primary font-bold text-sm bg-base-300/50 p-2 rounded-lg">value: mySignal</code>
      <p class="text-xs mt-3 leading-relaxed">Automatic sync for <code>Input</code>, <code>Textarea</code>, and <code>Select</code>. Updates the signal on 'input' or 'change'.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-base-300 shadow-sm">
    <div class="card-body p-5">
      <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Dynamic Routing</h3>
      <code class="text-info font-bold text-sm bg-base-300/50 p-2 rounded-lg">$router.to('/user/1')</code>
      <p class="text-xs mt-3 leading-relaxed">Navigate programmatically. Access params via <code>$router.params().id</code>.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-base-300 shadow-sm">
    <div class="card-body p-5">
      <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Refs & DOM</h3>
      <code class="text-accent font-bold text-sm bg-base-300/50 p-2 rounded-lg">ref: (el) => ...</code>
      <p class="text-xs mt-3 leading-relaxed">Get direct access to the DOM node once it is created.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-base-300 shadow-sm">
    <div class="card-body p-5">
      <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Event Handling</h3>
      <code class="text-secondary font-bold text-sm bg-base-300/50 p-2 rounded-lg">onClick: (e) => ...</code>
      <p class="text-xs mt-3 leading-relaxed">Standard events with automatic <code>removeEventListener</code> on destruction.</p>
    </div>
  </div>
</div>

---

> [!IMPORTANT]
> **Performance Hint:** For lists (`$for`), always provide a unique key function `(item) => item.id` to prevent unnecessary node creation and enable reordering.
>
> > [!TIP]
> **Performance Hint:** Always use functions `() => signal()` for dynamic children to ensure SigPro only updates the specific node and not the whole container.
