// drag.js — un único drag() para sigpro (move + sort + nested)
import { signal, effect } from './sigpro.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const isEl  = v => typeof Element !== 'undefined' && v instanceof Element;

function matchHandle(root, handle, target) {
  if (!handle) return true;
  if (typeof handle === 'function') return !!handle(target, root);
  if (isEl(handle)) return handle === target || handle.contains(target);
  if (typeof handle === 'string') {
    const hit = target.closest?.(handle);
    return !!hit && root.contains(hit);
  }
  return true;
}

/* ================================================================== */
/*  API PÚBLICA                                                        */
/* ================================================================== */
export function drag(el, opts = {}) {
  if (!el || typeof el.addEventListener !== 'function') return null;
  return opts.items ? sortDrag(el, opts) : moveDrag(el, opts);
}

/** helper para usar como `ref` en h() y autolimpiarse */
export const vDrag = (opts = {}) => (el) => {
  const d = drag(el, opts);
  if (d) (el._cln || (el._cln = [])).push(d.destroy);
  return d;
};

/* ================================================================== */
/*  MODO MOVE                                                          */
/* ================================================================== */
function moveDrag(el, opts) {
  const {
    handle, disabled = false, threshold = 4, bounds = null,
    axis = 'both', grid = null, useTransform = true,
    cursor = 'grab', activeCursor = 'grabbing', dragClass = 'dragging',
    initial = { x: 0, y: 0 }, stopPropagation = true,
    onStart, onMove, onEnd,
  } = opts;

  const x = signal(initial.x ?? 0);
  const y = signal(initial.y ?? 0);
  const dragging = signal(false);

  let session = null, minDx, maxDx, minDy, maxDy;

  // aplicar posición de forma reactiva (una sola suscripción)
  effect(() => {
    if (useTransform) el.style.translate = `${x()}px ${y()}px`;
    else { el.style.left = x() + 'px'; el.style.top = y() + 'px'; }
  });
  if (!useTransform && getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const isDisabled = typeof disabled === 'function' ? disabled : () => disabled === true;

  function measure() {
    minDx = minDy = -Infinity; maxDx = maxDy = Infinity;
    const c = bounds === 'window' ? window
            : bounds === 'parent' ? el.parentElement
            : typeof bounds === 'string' ? document.querySelector(bounds)
            : isEl(bounds) ? bounds : null;
    if (!c) return;
    const cr = c === window
      ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
      : c.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const bx = er.left - x(), by = er.top - y();
    minDx = cr.left - bx;               maxDx = cr.right - bx - er.width;
    minDy = cr.top  - by;               maxDy = cr.bottom - by - er.height;
    if (minDx > maxDx) minDx = maxDx;
    if (minDy > maxDy) minDy = maxDy;
  }

  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isDisabled()) return;
    if (!matchHandle(el, handle, e.target)) return;
    if (session) return;

    session = {
      pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
      ox: x(), oy: y(), started: false, el,
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    if (stopPropagation) e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!session || e.pointerId !== session.pointerId) return;
    const dx = e.clientX - session.startX, dy = e.clientY - session.startY;

    if (!session.started) {
      if (Math.hypot(dx, dy) < threshold) return;
      session.started = true;
      measure();
      try { el.setPointerCapture(e.pointerId); } catch {}
      if (dragClass) el.classList.add(dragClass);
      el.style.cursor = activeCursor;
      dragging(true);
      if (onStart?.({ x: x(), y: y() }, el) === false) return end(e);
    }
    e.preventDefault();

    let nx = axis === 'y' ? session.ox : session.ox + dx;
    let ny = axis === 'x' ? session.oy : session.oy + dy;
    if (grid) {
      const [gx = 0, gy = gx] = Array.isArray(grid) ? grid : [grid, grid];
      if (gx) nx = Math.round(nx / gx) * gx;
      if (gy) ny = Math.round(ny / gy) * gy;
    }
    nx = clamp(nx, minDx, maxDx);
    ny = clamp(ny, minDy, maxDy);
    x(nx); y(ny);
    onMove?.({ x: nx, y: ny }, el);
  }

  function onPointerUp(e) { if (session && e.pointerId === session.pointerId) end(e); }

  function end(e) {
    if (!session) return;
    if (session.started) {
      try { el.releasePointerCapture?.(session.pointerId); } catch {}
      if (dragClass) el.classList.remove(dragClass);
      el.style.cursor = cursor;
      dragging(false);
      onEnd?.({ x: x(), y: y() }, el);
    }
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    session = null;
  }

  el.addEventListener('pointerdown', onDown);
  el.style.cursor = cursor;
  el.style.userSelect = 'none';
  el.style.touchAction = 'none';

  return {
    x, y, dragging,
    setPosition(nx, ny) { measure(); x(clamp(nx, minDx, maxDx)); y(clamp(ny, minDy, maxDy)); },
    destroy() { el.removeEventListener('pointerdown', onDown); },
  };
}

/* ================================================================== */
/*  MODO SORT                                                          */
/* ================================================================== */
const ITEM_ATTR = 'data-drag-item';
const KEY_ATTR  = 'data-drag-key';
const KEY_OF    = 'data-drag-key-of';

const registry = new WeakMap(); // container → cfg

function findContainerAt(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (registry.has(el)) return el;
    const p = el.parentElement;
    if (p && registry.has(p)) return p;
  }
  return null;
}

function sortDrag(container, opts) {
  const {
    handle, disabled = false, threshold = 4, stopPropagation = true,
    items, key = 'id', group = 'default',
    ghostStyle = '', placeholderStyle = '',
    onStart, onMove, onEnd, onChange,
  } = opts;

  const cfg = { items, key, group, onChange };
  registry.set(container, cfg);

  let session = null;

  function itemsEls() {
    return [...container.children].filter(c => c.hasAttribute?.(ITEM_ATTR));
  }

  function indexAt(y, draggedKey) {
    const els = itemsEls().filter(c => c.getAttribute(KEY_ATTR) !== String(draggedKey));
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return els.length;
  }

  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (disabled === true || (typeof disabled === 'function' && disabled())) return;
    if (session) return;

    const itemEl = e.target.closest?.(`[${ITEM_ATTR}]`);
    if (!itemEl || !container.contains(itemEl)) return;
    if (!matchHandle(container, handle, e.target)) return;

    const arr = items();
    const els = itemsEls();
    const idx = els.indexOf(itemEl);
    if (idx < 0) return;
    const item = arr[idx];
    if (item === undefined) return;

    const rect = itemEl.getBoundingClientRect();
    const keyVal = typeof key === 'function' ? key(item, idx) : item?.[key];

    session = {
      pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      item, itemEl, fromList: container, fromIdx: idx,
      targetList: container, targetIdx: idx,
      keyVal, started: false,
      ghost: null, ph: null,
      rect,
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    if (stopPropagation) e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!session || e.pointerId !== session.pointerId) return;
    const s = session;
    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;

    if (!s.started) {
      if (Math.hypot(dx, dy) < threshold) return;
      s.started = true;

      // ghost flotante
      const ghost = s.itemEl.cloneNode(true);
      ghost.style.cssText =
        `position:fixed;left:0;top:0;z-index:9999;pointer-events:none;
         width:${s.rect.width}px;height:${s.rect.height}px;
         transform:translate(${s.rect.left}px,${s.rect.top}px);
         opacity:.85;${ghostStyle}`;
      document.body.appendChild(ghost);

      // placeholder
      const ph = document.createElement('div');
      ph.style.cssText =
        `width:${s.rect.width}px;height:${s.rect.height}px;
         margin:${getComputedStyle(s.itemEl).margin};${placeholderStyle}`;
      s.itemEl.parentElement.insertBefore(ph, s.itemEl);

      s.itemEl.style.visibility = 'hidden';
      s.ghost = ghost; s.ph = ph;

      try { s.itemEl.setPointerCapture(e.pointerId); } catch {}
      document.body.style.userSelect = 'none';
      onStart?.({ item: s.item, from: s.fromIdx, list: s.fromList });
    }

    e.preventDefault();

    s.ghost.style.transform =
      `translate(${e.clientX - s.offsetX}px,${e.clientY - s.offsetY}px)`;

    const hoverContainer = findContainerAt(e.clientX, e.clientY);
    if (!hoverContainer) return;
    const hoverCfg = registry.get(hoverContainer);
    const srcCfg   = registry.get(s.fromList);
    if (!hoverCfg || !srcCfg || hoverCfg.group !== srcCfg.group) return;

    const idx = indexAt(e.clientY, s.keyVal);
    // Nota: indexAt se calcula sobre hoverContainer, no el origen
    // Si es lista distinta, el keyVal no está en hoverContainer, así que cuenta todo
    const sameList = hoverContainer === s.fromList;
    const effectiveIdx = sameList ? idx : (() => {
      const els = [...hoverContainer.children].filter(c => c.hasAttribute?.(ITEM_ATTR));
      for (let i = 0; i < els.length; i++) {
        const r = els[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) return i;
      }
      return els.length;
    })();

    s.targetList = hoverContainer;
    s.targetIdx  = effectiveIdx;

    const siblings = [...hoverContainer.children]
      .filter(c => c.hasAttribute?.(ITEM_ATTR) && c.getAttribute(KEY_ATTR) !== String(s.keyVal));
    hoverContainer.insertBefore(s.ph, siblings[effectiveIdx] ?? null);

    onMove?.({ item: s.item, to: effectiveIdx, list: hoverContainer });
  }

  function onPointerUp(e) { if (session && e.pointerId === session.pointerId) end(); }

  function end() {
    const s = session;
    if (!s) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    document.body.style.userSelect = '';
    session = null;

    if (s.started) commit(s);
    s.ghost?.remove();
    s.ph?.remove();
    s.itemEl.style.visibility = '';
    if (s.started) onEnd?.({ item: s.item });
  }

  function commit(s) {
    const srcCfg = registry.get(s.fromList);
    const dstCfg = registry.get(s.targetList);
    if (!srcCfg || !dstCfg) return;

    if (s.fromList === s.targetList) {
      if (s.fromIdx === s.targetIdx) return;
      const arr = [...srcCfg.items()];
      const [moved] = arr.splice(s.fromIdx, 1);
      arr.splice(s.targetIdx, 0, moved);
      srcCfg.items(arr);
      srcCfg.onChange?.({ item: moved, from: s.fromIdx, to: s.targetIdx,
                          list: s.fromList });
    } else {
      const srcArr = [...srcCfg.items()];
      const [moved] = srcArr.splice(s.fromIdx, 1);
      srcCfg.items(srcArr);

      const dstArr = [...dstCfg.items()];
      dstArr.splice(s.targetIdx, 0, moved);
      dstCfg.items(dstArr);

      srcCfg.onChange?.({ item: moved, from: s.fromIdx, to: -1,
                          list: s.fromList, otherList: s.targetList });
      dstCfg.onChange?.({ item: moved, from: -1, to: s.targetIdx,
                          list: s.targetList, otherList: s.fromList });
    }
  }

  container.addEventListener('pointerdown', onDown);
  return {
    destroy() {
      container.removeEventListener('pointerdown', onDown);
      registry.delete(container);
    },
  };
}