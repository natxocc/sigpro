export const isF = f => typeof f == "function";
export const isO = o => o && typeof o == "object";
export const isA = Array.isArray;
const doc = typeof document < "u" ? document : null;
const txt = s => doc.createTextNode(s == null ? "" : String(s));
const toNd = n => n?._rt ? n._cnt : (n instanceof Node ? n : txt(n));
export const fragment = p => p.children;
export const val = v => isF(v) ? v() : v;

let curEffect = null, curOwner = null, flushing = 0, batchDepth = 0;
const effectQueue = new Set(), MOUNTED = new WeakMap();

const SVG_NS = "http://www.w3.org/2000/svg", XLINK = "http://www.w3.org/1999/xlink";
const SVG_TAGS = new Set("svg,path,circle,rect,line,polyline,polygon,g,defs,text,textPath,tspan,use,symbol,image,marker,ellipse".split(","));
const DANG_ATTR = new Set(["src", "href", "formaction", "action", "background", "code", "archive"]);

const clr = s => { if (s) { s.forEach(f => f()); s.clear(); } };
const dispose = e => {
  if (!e || e._dead) return;
  e._dead = 1;
  let stack = [e], c;
  while ((c = stack.pop())) {
    clr(c._cln);
    if (c._kids) { c._kids.forEach(x => stack.push(x)); c._kids.clear(); }
    if (c._deps) { c._deps.forEach(d => d.delete(c)); c._deps.clear(); }
  }
};

export const onUnmount = f => curOwner && ((curOwner._cln ||= new Set()).add(f));
const untrack = f => { let p = curEffect; curEffect = null; try { return f() } finally { curEffect = p } };

const createEffect = (fn, isComputed = 0) => {
  const eff = () => {
    if (eff._dead) return;
    eff._deps?.forEach(s => s.delete(eff));
    clr(eff._cln);
    let pE = curEffect, pO = curOwner;
    curEffect = curOwner = eff;
    try { return eff._res = fn(); }
    catch (err) { console.error("[SigPro]", err); }
    finally { curEffect = pE; curOwner = pO; }
  };
  eff._deps = eff._cln = eff._kids = null;
  eff._dead = 0; eff._comp = isComputed;
  eff._depth = curEffect ? curEffect._depth + 1 : 0;
  eff._mnt = []; eff._parent = curOwner;
  if (curOwner) (curOwner._kids ||= new Set()).add(eff);
  return eff;
};

const flush = () => {
  if (flushing) return;
  flushing = 1;
  let q = [...effectQueue].sort((a, b) => a._depth - b._depth);
  effectQueue.clear();
  for (let e of q) if (!e._dead) e();
  flushing = 0;
};

export const batch = f => {
  batchDepth++;
  try { return f() } finally { if (!--batchDepth && effectQueue.size && !flushing) flush() }
};

const track = (signal, trigger = 0) => {
  if (!trigger && curEffect && !curEffect._dead) {
    signal.add(curEffect);
    (curEffect._deps ||= new Set()).add(signal);
  } else if (trigger && signal.size) {
    let q = 0;
    for (let e of signal) {
      if (e === curEffect || e._dead) continue;
      if (e._comp) { e._stale = 1; e._sub && track(e._sub, 1); }
      else { effectQueue.add(e); q = 1; }
    }
    if (q && !flushing && !batchDepth) queueMicrotask(flush);
  }
};

export const $ = (val, key = null) => {
  const subs = new Set();
  if (isF(val)) {
    let cached, deps = new Set();
    const get = () => {
      if (get._stale) {
        for (let dep of deps) dep.delete(get);
        deps.clear();

        let p = curEffect; curEffect = get;
        try {
          let n = val();
          if (!Object.is(cached, n)) {
            cached = n;
            track(subs, 1);
          }
        } finally { curEffect = p; }
        get._stale = 0;
      }
      track(subs);
      return cached;
    };
    get._comp = get._stale = 1;
    get._sub = subs;
    get._deps = deps;
    get._dead = 0;
    return get;
  }
  if (key) try { val = JSON.parse(localStorage.getItem(key)) ?? val } catch { }
  return (...args) => {
    if (args.length) {
      let n = isF(args[0]) ? args[0](val) : args[0];
      if (!Object.is(val, n)) {
        val = n;
        if (key) localStorage.setItem(key, JSON.stringify(val));
        track(subs, 1);
      }
    }
    track(subs);
    return val;
  };
};

export const watch = (src, cb) => {
  let eff = createEffect(cb ? () => { let v = isA(src) ? src.map(s => s()) : src(); untrack(() => cb(v)); } : src);
  eff();
  return () => dispose(eff);
};

const cleanNode = (n) => {
  if (!n) return;
  const stack = [n];
  while (stack.length) {
    const node = stack.pop();
    clr(node._cln);
    if (node._ownEff) dispose(node._ownEff);
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        stack.push(node.childNodes[i]);
      }
    }
  }
};
const safeAttr = (k, v) =>
  v == null || v === false ? null :
    (DANG_ATTR.has(k) || k.startsWith("on")) && /^\s*(javascript|data|vbscript):/i.test(String(v)) ? '#' : v;

export const h = (tag, props = {}, children = []) => {
  if (props instanceof Node || isA(props) || !isO(props)) { children = props; props = {}; }

  if (isF(tag)) {
    let eff = createEffect(() => eff._res = tag(props, { children, emit: (ev, ...a) => props[`on${ev[0].toUpperCase()}${ev.slice(1)}`]?.(...a) }));
    eff();
    if (eff._res == null) return null;
    let node = eff._res instanceof Node || (isA(eff._res) && eff._res.every(n => n instanceof Node)) ? eff._res : txt(eff._res);
    const runMount = n => {
      if (n && n._mnt) {
        n._mnt.forEach(f => f());
        n._mnt = null;
      }
    };
    if (isA(node)) node.forEach(runMount); else runMount(node);
    const mark = n => { if (isO(n) && !n._rt) { n._mnt = eff._mnt || []; n._cln = eff._cln || new Set(); n._ownEff = eff; } };
    isA(node) ? node.forEach(mark) : mark(node);
    return node;
  }

  let isSVG = SVG_TAGS.has(tag),
    el = isSVG ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
  el._cln = new Set();

  for (let k in props) {
    let v = props[k];
    if (k === "ref") { isF(v) ? v(el) : (v.current = el); continue; }
    if (isSVG && k.startsWith("xlink:")) {
      let cv = safeAttr(k.slice(6), v);
      cv == null ? el.removeAttributeNS(XLINK, k.slice(6)) : el.setAttributeNS(XLINK, k.slice(6), cv);
      continue;
    }
    if (k.startsWith("on")) {
      let ev = k.slice(2).toLowerCase(); el.addEventListener(ev, v);
      let off = () => el.removeEventListener(ev, v);
      el._cln.add(off);
    } else if (isF(v)) {
      let eff = createEffect(() => {
        let r = safeAttr(k, v());
        if (k === "class") el.className = r || "";
        else if (r == null) el.removeAttribute(k);
        else if (k === "style" && typeof r == "string") el.setAttribute("style", r);
        else if (k in el && !isSVG) el[k] = r;
        else el.setAttribute(k, r === true ? "" : r);
      });
      eff();
      el._cln.add(() => dispose(eff));
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        const eventType = k === "checked" ? "change" : "input";
        const handler = ev => v(ev.target[k]);
        el.addEventListener(eventType, handler);
        el._cln.add(() => el.removeEventListener(eventType, handler));
      }
    } else {
      let r = safeAttr(k, v);
      if (r != null) {
        if (k === "style" && typeof r == "string") el.setAttribute("style", r);
        else if (k in el && !isSVG) el[k] = r;
        else el.setAttribute(k, r === true ? "" : r);
      }
    }
  }

  const append = c => {
    if (isA(c)) return c.forEach(append);
    if (isF(c)) {
      let anchor = txt(""), cur = []; el.appendChild(anchor);
      let eff = createEffect(() => {
        let res = c(), next = (isA(res) ? res : [res]).map(toNd), ref = anchor;
        cur.forEach(n => { n._rt ? n.destroy() : cleanNode(n); n.parentNode && n.remove(); });
        for (let i = next.length - 1; i >= 0; i--) {
          let nd = next[i];
          if (nd.parentNode !== ref.parentNode) ref.parentNode?.insertBefore(nd, ref);
          nd._mnt && nd._mnt.forEach(f => f());
          ref = nd;
        }
        cur = next;
      });
      eff(); el._cln.add(() => dispose(eff));
    } else {
      let nd = toNd(c); el.appendChild(nd);
      nd._mnt && nd._mnt.forEach(f => f());
    }
  };
  append(children);
  return el;
};

export const render = fn => {
  let cln = new Set(), pO = curOwner, pE = curEffect,
    cnt = doc.createElement("div");
  cnt.style.display = "contents"; cnt.setAttribute("role", "presentation");
  curOwner = { _cln: cln }; curEffect = null;
  const place = r => {
    if (!r) return;
    if (r._rt) { cln.add(r.destroy); cnt.appendChild(r._cnt); }
    else if (isA(r)) r.forEach(place);
    else cnt.appendChild(r instanceof Node ? r : txt(r));
  };
  try { place(fn({ onCleanup: f => cln.add(f) })); } finally { curOwner = pO; curEffect = pE; }
  return { _rt: 1, _cnt: cnt, destroy: () => { clr(cln); cleanNode(cnt); cnt.remove(); } };
};
export const when = (cond, onTrue, onFalse = null) => {
  let anchor = txt(""), root = h("div", { style: "display:contents" }, [anchor]), current;
  const stopWatch = watch(() => !!val(cond), v => {
    current?.destroy(); current = null;
    let template = v ? onTrue : onFalse;
    if (template) { current = render(() => val(template)); root.insertBefore(current._cnt, anchor); }
  });
  onUnmount(() => { stopWatch(); current?.destroy(); });
  return root;
};

export const each = (src, mapFn, keyFn) => {
  let anchor = txt(""), root = h("div", { style: "display:contents" }, [anchor]),
    cache = new Map();
  const stopWatch = watch(() => val(src) || [], items => {
    let newCache = new Map(), order = [];
    for (let i = 0; i < items.length; i++) {
      let item = items[i], k = keyFn ? (item?.[keyFn] ?? i) : (item?.id ?? i), v = cache.get(k);
      if (!v) v = render(() => mapFn(item, i)); else cache.delete(k);
      newCache.set(k, v); order.push(v);
    }
    cache.forEach(v => v.destroy());
    let ref = anchor;
    for (let i = order.length - 1; i >= 0; i--) {
      let nd = order[i]._cnt;
      if (nd.nextSibling !== ref) root.insertBefore(nd, ref);
      ref = nd;
    }
    cache = newCache;
  });
  onUnmount(stopWatch);
  return root;
};

export const mount = (component, target) => {
  let el = typeof target === "string" ? doc.querySelector(target) : target;
  if (!el) return;
  if (MOUNTED.has(el)) MOUNTED.get(el).destroy();
  let instance = render(isF(component) ? component : () => component);
  el.replaceChildren(instance._cnt);
  MOUNTED.set(el, instance);
  return instance;
};

const htmlTags = "a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup svg table tbody td template textarea tfoot th thead time tr u ul video";

export const SigPro = { $, watch, batch, h, fragment, render, mount, when, each, onUnmount, val, isA, isF, isO };

if (typeof window !== "undefined") {
  window.SigPro = SigPro;
  htmlTags.split(" ").forEach(tag => {
    window[tag] = (props, children) => h(tag, props, children);
  });
}