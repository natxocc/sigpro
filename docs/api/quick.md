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
        <td class="font-mono text-xs opacity-70">(Signal, fn, fn?) => Node</td>
        <td>Reactive conditional. Automatically destroys "else" branch memory.</td>
      </tr>
      <tr>
        <td><code class="text-accent font-bold">$for(list, itemFn)</code></td>
        <td class="font-mono text-xs opacity-70">(Signal, fn) => Node</td>
        <td>Optimized list renderer. Manages individual item lifecycles.</td>
      </tr>
      <tr>
        <td><code class="font-bold">$mount(node, target)</code></td>
        <td class="font-mono text-xs opacity-70">(any, string|Node) => Runtime</td>
        <td>Entry point. Creates a root instance with <code>.destroy()</code> capabilities.</td>
      </tr>
    </tbody>
  </table>
</div>

---

## 🏗️ Element Constructors (Tags)

SigPro provides **PascalCase** wrappers for all standard HTML5 tags (e.g., `Div`, `Span`, `Button`).

### Syntax Pattern

<div class="mockup-code bg-base-300 text-base-content my-6">
  <pre data-prefix=">"><code>Tag({ attributes }, [children])</code></pre>
</div>

### Attribute & Content Handling

Learn how to bind data to your elements effectively.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
  <div class="card bg-base-200 border border-base-300 shadow-sm hover:border-primary/30 transition-colors">
    <div class="card-body p-5">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Static</h3>
        <span class="badge badge-outline badge-xs opacity-50">HTML5</span>
      </div>
      <code class="text-primary font-bold text-sm bg-base-300/50 p-2 rounded-lg">class: "text-red"</code>
      <p class="text-xs mt-3 leading-relaxed">Standard HTML attribute passed as a plain string. No reactivity overhead.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-base-300 shadow-sm hover:border-secondary/30 transition-colors">
    <div class="card-body p-5">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Reactive</h3>
        <span class="badge badge-secondary badge-xs">SIGNAL</span>
      </div>
      <div class="flex flex-col gap-1">
        <code class="text-xs opacity-60 italic">const isLoading = $(false);</code>
        <code class="text-secondary font-bold text-sm bg-base-300/50 p-2 rounded-lg">disabled: isLoading</code>
      </div>
      <p class="text-xs mt-3 leading-relaxed">Updates automatically via internal <code>$watch</code>. Only the attribute changes in the DOM.</p>
    </div>
  </div>

<div class="card bg-base-200 border border-base-300 shadow-sm hover:border-primary/30 transition-colors">
    <div class="card-body p-5">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Two-way Binding</h3>
        <span class="badge badge-primary badge-xs">MAGIC</span>
      </div>
      <code class="text-xs opacity-60 italic">const username = $('Me');</code>
      <code class="text-primary font-bold text-sm bg-base-300/50 p-2 rounded-lg">value: username</code>
      <p class="text-xs mt-3 leading-relaxed font-medium">
        <b>Automatic Sync:</b> Works out-of-the-box for <code>Input</code>, <code>Textarea</code>, and <code>Checkbox</code>. 
        It syncs the element <span class="text-primary">↔</span> signal both ways without manual event listeners.
      </p>
    </div>
  </div>

  <div class="card bg-base-200 border border-base-300 shadow-sm hover:border-accent/30 transition-colors">
    <div class="card-body p-5">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Surgical Text</h3>
        <span class="badge badge-accent badge-xs">FAST</span>
      </div>
      <code class="text-accent font-bold text-sm bg-base-300/50 p-2 rounded-lg">P({}, () => count())</code>
      <p class="text-xs mt-3 leading-relaxed">Updates the specific text node surgically without ever re-rendering the parent <code>P</code> tag.</p>
    </div>
  </div>
</div>

---

> [!TIP]
> **Performance Hint:** Always use functions `() => signal()` for dynamic children to ensure SigPro only updates the specific node and not the whole container.
