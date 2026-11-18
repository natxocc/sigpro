# Userland Helpers

SigPro’s core is deliberately minimal. Instead of bloating the library with utility functions you might not use, the philosophy is to provide the primitives (`signal`, `h`, `db`) and let you write exactly the helpers you need.

Below is a curated set of zero-dependency, pure Vanilla JavaScript helpers. They do **not** import from `sigpro` and don't rely on any framework internals. Copy them into your project's `utils.js` file and import them wherever you need them.

> **Note:** These are not part of the `sigpro` package. They are standard JS functions that work perfectly with SigPro because SigPro uses standard DOM events and signals.

---

## 1. Event Modifiers

A set of higher-order functions to compose event handlers cleanly. Because SigPro just passes the event object directly, these compose natively without any framework-specific syntax.

```javascript
export const onPrevent  = fn => e => { e.preventDefault(); fn(e); };
export const onStop     = fn => e => { e.stopPropagation(); fn(e); };
export const onSelf     = fn => e => { if (e.target === e.currentTarget) fn(e); };
export const onOnce     = fn => { let c = false; return e => { if (!c) { c = true; fn(e); } }; };
export const onDebounce = (ms, fn) => { let t; return e => { clearTimeout(t); t = setTimeout(() => fn(e), ms); }; };
export const onKey      = (key, fn) => e => { if (e.key === key) fn(e); };
export const onEnter    = fn => onKey("Enter", fn);
export const onEscape   = fn => onKey("Escape", fn);
```

### Usage
Because they are just higher-order functions, you can **compose** them:
```javascript
import { onPrevent, onDebounce } from 'sigpro/utils';

// Prevent default form submit and debounce it
form({ onsubmit: onPrevent(onDebounce(500, saveForm)) }, [
  button({ type: "submit" }, "Save")
]);

// Close a modal only when clicking the backdrop (not the content inside it)
div({ class: "modal-overlay", onclick: onSelf(() => closeModal()) }, [
  div({ class: "modal-content" }, "...")
]);
```

---

## 2. Form Binding (`bindvalue` & `bindcheck`)

Wiring a two-way binding is verbose in vanilla JS (`value: () => s()`, `oninput: e => s(e.target.value)`). These helpers condense it to a single object spread, keeping the logic explicit for text inputs and checkboxes/radios.

```javascript
export const bindvalue = s => ({ value: () => s(), oninput: e => s(e.target.value) });
export const bindcheck = s => ({ checked: () => !!s(), onchange: e => s(e.target.checked) });
```

### Usage
Because they return plain objects, you just spread (`...`) them into your props:

```javascript
import { signal } from 'sigpro';
import { bindvalue, bindcheck } from 'sigpro/utils';

const username = signal("");
const isActive = signal(false);

// Text inputs
input({ type: "text", ...bindvalue(username) });

// Checkboxes or Radios
input({ type: "checkbox", ...bindcheck(isActive) });

// Textareas
textarea({ rows: 3, ...bindvalue(bio) });
```

---

## 3. Class Utility (`cls`)

A tiny utility to conditionally join class names. It filters out `false`, `null`, `undefined`, and empty strings. Useful when integrating with CSS frameworks like Tailwind or DaisyUI.

```javascript
export const cls = (...args) => args.filter(Boolean).join(" ");
```

### Usage
```javascript
import { cls } from './utils.js';

button({ 
  class: cls("btn", isActive() && "btn-active", theme() === 'dark' && "btn-neutral")
}, "Click");
```

---

## The Complete Utility File (`utils.js`)

Copy and paste this into your project:

```javascript
export const onPrevent = fn => e => { e.preventDefault(); fn(e); };
export const onStop = fn => e => { e.stopPropagation(); fn(e); };
export const onSelf = fn => e => { if (e.target === e.currentTarget) fn(e); };
export const onOnce = fn => { let c = false; return e => { if (!c) { c = true; fn(e); } }; };
export const onDebounce = (ms, fn) => { let t; return e => { clearTimeout(t); t = setTimeout(() => fn(e), ms); }; };
export const onKey = (key, fn) => e => { if (e.key === key) fn(e); };
export const onEnter = fn => onKey("Enter", fn);
export const onEscape = fn => onKey("Escape", fn);

export const cls = (...args) => args.filter(Boolean).join(" ");

export const bindvalue = s => ({ value: () => s(), oninput: e => s(e.target.value) });
export const bindcheck = s => ({ checked: () => !!s(), onchange: e => s(e.target.checked) });

```

This is the recommended approach for building apps with SigPro: a tiny core for reactivity and DOM creation, and a lightweight set of pure JS utilities for daily ergonomics.