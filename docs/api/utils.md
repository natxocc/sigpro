# Event Helpers

SigPro passes the native event object straight to your handlers. These helpers wrap handlers to add common behaviors: prevent default, stop propagation, debounce, detect gestures, and more. They compose cleanly and are exported from `sigpro`.

```javascript
import { onPrevent, onSwipe, resize } from 'sigpro';
```

---

## 1. Event Modifiers

Higher-order functions that compose natively — no framework-specific syntax.

```javascript
export const onPrevent  = fn => e => { e.preventDefault(); fn(e); };
export const onStop     = fn => e => { e.stopPropagation(); fn(e); };
export const onSelf     = fn => e => { if (e.target === e.currentTarget) fn(e); };
export const onOnce     = fn => { let c = false; return e => { if (!c) { c = true; fn(e); } }; };
export const onDebounce = (ms, fn) => { let t; return e => { clearTimeout(t); t = setTimeout(() => fn(e), ms); }; };
export const onKey      = (key, fn) => e => { if (e.key === key) fn(e); };
export const onEnter    = fn => onKey("Enter", fn);
export const onEscape   = fn => onKey("Escape", fn);
export const onContextMenu = fn => e => { e.preventDefault(); fn(e); };
export const onRightClick = fn => e => { if (e.button === 2) fn(e); };
```

### Usage

```javascript
// Prevent default form submit and debounce it
form({ onsubmit: onPrevent(onDebounce(500, saveForm)) }, [
  button({ type: "submit" }, "Save")
]);

// Close a modal only when clicking the backdrop (not the content inside it)
div({ class: "modal-overlay", onclick: onSelf(() => closeModal()) }, [
  div({ class: "modal-content" }, "...")
]);

// Block the native context menu and show your own
div({ onContextMenu: onContextMenu(e => openMenu(e.clientX, e.clientY)) }, "Right-click me");
```

---

## 2. Gesture Helpers

`onSwipe` and `onPullRefresh` are **not** attached via `h()` event keys. They return a function that takes the element and wires its own listeners. Call it once on setup.

```javascript
export const onSwipe = (dir, { distance = 50, threshold = 0.7 } = {}, fn) => {
  let sx, sy, active;
  const start = e => { const t = e.changedTouches || [e]; sx = t[0].clientX; sy = t[0].clientY; active = true; };
  const end = e => {
    if (!active) return;
    const t = e.changedTouches || [e];
    const dx = t[0].clientX - sx, dy = t[0].clientY - sy;
    if (dir === 'x' && Math.abs(dx) > distance && Math.abs(dx) > Math.abs(dy) * threshold) { active = false; fn(e); }
    if (dir === 'y' && Math.abs(dy) > distance && Math.abs(dy) > Math.abs(dx) * threshold) { active = false; fn(e); }
  };
  return h => {
    h.addEventListener('touchstart', start, { passive: true });
    h.addEventListener('touchend', end, { passive: true });
    h.addEventListener('mousedown', start);
    h.addEventListener('mouseup', end);
  };
};

export const onPullRefresh = (threshold = 60, fn) => {
  let startY, pulling;
  const start = e => { const t = e.changedTouches || [e]; startY = t[0].clientY; pulling = true; };
  const move = e => {
    if (!pulling) return;
    const t = e.changedTouches || [e];
    if (t[0].clientY - startY > threshold) { pulling = false; fn(e); }
  };
  return h => {
    h.addEventListener('touchstart', start, { passive: true });
    h.addEventListener('touchmove', move, { passive: true });
  };
};
```

### Usage

```javascript
// Swipe left/right to reveal actions
const swipeEl = div({ class: "card" }, "Swipe me");
onSwipe('x', { distance: 50 }, e => console.log('swiped right'));

// Swipe down to dismiss a modal
onSwipe('y', { distance: 60 }, () => closeModal());

// Pull-to-refresh on a scrollable container
const list = div({ class: "scroll-list" }, "...");
onPullRefresh(60, () => refresh());
```

---

## 3. Resize

`resize(el, opts)` attaches pointer listeners to `el` and returns reactive `w()` / `h()` signals. The element's size updates as you drag. The visual handle is your own DOM — this helper only does the interaction.

```javascript
export const resize = (el, opts = {}) => {
  const { axis = 'both', min = 0, max = Infinity, handle, onStart, onResize, onEnd } = opts;
  const w = signal(el.offsetWidth || 0);
  const h = signal(el.offsetHeight || 0);
  let sx, sy, sw, sh, active;
  const start = e => {
    if (handle && !handle.contains(e.target) && handle !== e.target) return;
    const t = e.changedTouches || [e];
    sx = t[0].clientX; sy = t[0].clientY; sw = el.offsetWidth; sh = el.offsetHeight; active = true;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    if (onStart) onStart();
  };
  const move = e => {
    if (!active) return;
    const t = e.changedTouches || [e];
    const dx = t[0].clientX - sx, dy = t[0].clientY - sy;
    if (axis === 'x' || axis === 'both') { const nw = Math.min(max, Math.max(min, sw + dx)); if (nw !== w()) w(nw); }
    if (axis === 'y' || axis === 'both') { const nh = Math.min(max, Math.max(min, sh + dy)); if (nh !== h()) h(nh); }
    if (onResize) onResize({ w: w(), h: h() });
  };
  const end = () => {
    if (!active) return;
    active = false;
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    if (onEnd) onEnd();
  };
  el.addEventListener('mousedown', start);
  return { w, h };
};
```

### Usage

```javascript
import { resize } from 'sigpro';

const box = div({ class: "box" }, "Resize me");
const handle = div({ class: "handle", style: "cursor:nwse-resize" });
box(handle);

const r = resize(box, {
  axis: 'both',
  min: 100,
  max: 800,
  handle: '.handle',
  onResize: ({ w, h }) => console.log('size', w, h),
});

r.w();   // → current width (reactive signal)
r.h();   // → current height (reactive signal)
```

---

## 4. Form Binding (`bindvalue` & `bindcheck`)

Wiring a two-way binding is verbose in vanilla JS (`value: () => s()`, `oninput: e => s(e.target.value)`). These helpers condense it to a single object spread.

```javascript
export const bindvalue = s => ({ value: () => s(), oninput: e => s(e.target.value) });
export const bindcheck = s => ({ checked: () => !!s(), onchange: e => s(e.target.checked) });
```

### Usage

```javascript
import { signal } from 'sigpro';
import { bindvalue, bindcheck } from 'sigpro';

const username = signal("");
const isActive = signal(false);

input({ type: "text", ...bindvalue(username) });
input({ type: "checkbox", ...bindcheck(isActive) });
textarea({ rows: 3, ...bindvalue(bio) });
```

---

## The Complete Helpers File

```javascript
export const onPrevent = fn => e => { e.preventDefault(); fn(e); };
export const onStop = fn => e => { e.stopPropagation(); fn(e); };
export const onSelf = fn => e => { if (e.target === e.currentTarget) fn(e); };
export const onOnce = fn => { let c = false; return e => { if (!c) { c = true; fn(e); } }; };
export const onDebounce = (ms, fn) => { let t; return e => { clearTimeout(t); t = setTimeout(() => fn(e), ms); }; };
export const onKey = (key, fn) => e => { if (e.key === key) fn(e); };
export const onEnter = fn => onKey("Enter", fn);
export const onEscape = fn => onKey("Escape", fn);
export const onContextMenu = fn => e => { e.preventDefault(); fn(e); };
export const onRightClick = fn => e => { if (e.button === 2) fn(e); };

export const onSwipe = (dir, { distance = 50, threshold = 0.7 } = {}, fn) => { /* ... */ };
export const onPullRefresh = (threshold = 60, fn) => { /* ... */ };
export const resize = (el, opts = {}) => { /* ... */ };

export const bindvalue = s => ({ value: () => s(), oninput: e => s(e.target.value) });
export const bindcheck = s => ({ checked: () => !!s(), onchange: e => s(e.target.checked) });
```
