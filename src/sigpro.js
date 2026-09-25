const None = 0, Mutable = 1, Watching = 2, RecursedCheck = 4,
      Recursed = 8, Dirty = 16, Pending = 32, HasChildEffect = 64;

function createReactiveSystem({ update, notify, unwatched }) {
  return { link, unlink, propagate, checkDirty, shallowPropagate };

  function link(dep, sub, version) {
    const prevDep = sub.depsTail;
    if (prevDep !== undefined && prevDep.dep === dep) return;
    const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
    if (nextDep !== undefined && nextDep.dep === dep) {
      nextDep.version = version; sub.depsTail = nextDep; return;
    }
    const prevSub = dep.subsTail;
    if (prevSub !== undefined && prevSub.version === version && prevSub.sub === sub) return;
    const newLink = sub.depsTail = dep.subsTail = {
      version, dep, sub, prevDep, nextDep, prevSub, nextSub: undefined,
    };
    if (nextDep !== undefined) nextDep.prevDep = newLink;
    if (prevDep !== undefined) prevDep.nextDep = newLink; else sub.deps = newLink;
    if (prevSub !== undefined) prevSub.nextSub = newLink; else dep.subs = newLink;
  }

  function unlink(link, sub = link.sub) {
    const { dep, prevDep, nextDep, nextSub, prevSub } = link;
    if (nextDep !== undefined) nextDep.prevDep = prevDep; else sub.depsTail = prevDep;
    if (prevDep !== undefined) prevDep.nextDep = nextDep; else sub.deps = nextDep;
    if (nextSub !== undefined) nextSub.prevSub = prevSub; else dep.subsTail = prevSub;
    if (prevSub !== undefined) prevSub.nextSub = nextSub;
    else if ((dep.subs = nextSub) === undefined) unwatched(dep);
    return nextDep;
  }

  function propagate(link, innerWrite) {
    let next = link.nextSub, stack;
    top: do {
      const sub = link.sub;
      let flags = sub.flags;
      if (!(flags & (RecursedCheck | Recursed | Dirty | Pending))) {
        sub.flags = flags | Pending;
        if (innerWrite) sub.flags |= Recursed;
      } else if (!(flags & (RecursedCheck | Recursed))) {
        flags = None;
      } else if (!(flags & RecursedCheck)) {
        sub.flags = (flags & ~Recursed) | Pending;
      } else if (!(flags & (Dirty | Pending)) && isValidLink(link, sub)) {
        sub.flags = flags | Recursed | Pending;
        flags &= Mutable;
      } else flags = None;
      if (flags & Watching) notify(sub);
      if (flags & Mutable) {
        const subSubs = sub.subs;
        if (subSubs !== undefined) {
          const nextSub = (link = subSubs).nextSub;
          if (nextSub !== undefined) { stack = { value: next, prev: stack }; next = nextSub; }
          continue;
        }
      }
      if ((link = next) !== undefined) { next = link.nextSub; continue; }
      while (stack !== undefined) {
        link = stack.value; stack = stack.prev;
        if (link !== undefined) { next = link.nextSub; continue top; }
      }
      break;
    } while (true);
  }

  function checkDirty(link, sub) {
    let stack, checkDepth = 0, dirty = false;
    top: do {
      const dep = link.dep, flags = dep.flags;
      if (sub.flags & Dirty) dirty = true;
      else if ((flags & (Mutable | Dirty)) === (Mutable | Dirty)) {
        const subs = dep.subs;
        if (update(dep)) {
          if (subs.nextSub !== undefined) shallowPropagate(subs);
          dirty = true;
        }
      } else if ((flags & (Mutable | Pending)) === (Mutable | Pending)) {
        stack = { value: link, prev: stack };
        link = dep.deps; sub = dep; ++checkDepth; continue;
      }
      if (!dirty) {
        const nextDep = link.nextDep;
        if (nextDep !== undefined) { link = nextDep; continue; }
      }
      while (checkDepth--) {
        link = stack.value; stack = stack.prev;
        if (dirty) {
          const subs = sub.subs;
          if (update(sub)) {
            if (subs.nextSub !== undefined) shallowPropagate(subs);
            sub = link.sub; continue;
          }
          dirty = false;
        } else sub.flags &= ~Pending;
        sub = link.sub;
        const nextDep = link.nextDep;
        if (nextDep !== undefined) { link = nextDep; continue top; }
      }
      return dirty && !!sub.flags;
    } while (true);
  }

  function shallowPropagate(link) {
    do {
      const sub = link.sub, flags = sub.flags;
      if ((flags & (Pending | Dirty)) === Pending) {
        sub.flags = flags | Dirty;
        if ((flags & (Watching | RecursedCheck)) === Watching) notify(sub);
      }
    } while ((link = link.nextSub) !== undefined);
  }

  function isValidLink(checkLink, sub) {
    let link = sub.depsTail;
    while (link !== undefined) {
      if (link === checkLink) return true;
      link = link.prevDep;
    }
    return false;
  }
}

let cycle = 0, runDepth = 0, batchDepth = 0, notifyIndex = 0, queuedLength = 0;
let activeSub;
const queued = [];

const contextStack = [];

export function provide(key, value) {
  const ctx = contextStack[contextStack.length - 1];
  if (ctx) ctx.set(key, value);
}

export function inject(key, fallback) {
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].has(key)) return contextStack[i].get(key);
  }
  return fallback;
}

const { link, unlink, propagate, checkDirty, shallowPropagate } = createReactiveSystem({
  update(node) {
    if ('getter' in node) return updateComputed(node);
    if ('currentValue' in node) return updateSignal(node);
    node.flags = Mutable; return true;
  },
  notify(effect) {
    let insertIndex = queuedLength, firstInsertedIndex = insertIndex;
    do {
      queued[insertIndex++] = effect;
      effect.flags &= ~Watching;
      effect = effect.subs?.sub;
      if (effect === undefined || !(effect.flags & Watching)) break;
    } while (true);
    queuedLength = insertIndex;
    while (firstInsertedIndex < --insertIndex) {
      const left = queued[firstInsertedIndex];
      queued[firstInsertedIndex++] = queued[insertIndex];
      queued[insertIndex] = left;
    }
  },
  unwatched(node) {
    if ('getter' in node) {
      if (node.depsTail !== undefined) {
        node.flags = Mutable | Dirty;
        disposeAllDepsInReverse(node);
      }
    } else if ('currentValue' in node) {
    } else if ('fn' in node) {
      effectOper.call(node);
    } else {
      effectScopeOper.call(node);
    }
  },
});

export function signal(initialValue) {
  return signalOper.bind({
    currentValue: initialValue, pendingValue: initialValue,
    subs: undefined, subsTail: undefined, flags: Mutable,
  });
}

export function computed(getter) {
  return computedOper.bind({
    value: undefined, subs: undefined, subsTail: undefined,
    deps: undefined, depsTail: undefined, flags: None, getter,
  });
}

export function effect(fn) {
  const e = {
    fn, cleanup: undefined,
    subs: undefined, subsTail: undefined,
    deps: undefined, depsTail: undefined,
    flags: Watching | RecursedCheck,
  };
  const prevSub = activeSub;
  activeSub = e;
  if (prevSub !== undefined) { link(e, prevSub, 0); prevSub.flags |= HasChildEffect; }
  contextStack.push(new Map());
  try { ++runDepth; const r = e.fn(); e.cleanup = typeof r === 'function' ? r : undefined; }
  finally {
    --runDepth; activeSub = prevSub;
    contextStack.pop();
    e.flags &= ~RecursedCheck;
  }
  return effectOper.bind(e);
}

export function effectScope(fn) {
  const e = {
    deps: undefined, depsTail: undefined,
    subs: undefined, subsTail: undefined, flags: Mutable,
  };
  const prevSub = activeSub;
  activeSub = e;
  if (prevSub !== undefined) { link(e, prevSub, 0); prevSub.flags |= HasChildEffect; }
  contextStack.push(new Map());
  try { fn(); }
  finally {
    contextStack.pop();
    activeSub = prevSub;
  }
  return effectScopeOper.bind(e);
}

export function batch(fn) {
  ++batchDepth;
  try { return fn(); }
  finally { if (!--batchDepth) flush(); }
}

function updateComputed(c) {
  if (c.flags & HasChildEffect) {
    let link = c.depsTail;
    while (link !== undefined) {
      const prev = link.prevDep, dep = link.dep;
      if (!('getter' in dep) && !('currentValue' in dep)) unlink(link, c);
      link = prev;
    }
  }
  c.depsTail = undefined;
  c.flags = Mutable | RecursedCheck;
  const prevSub = activeSub;
  activeSub = c;
  try {
    ++cycle;
    const oldValue = c.value;
    return oldValue !== (c.value = c.getter(oldValue));
  } finally {
    activeSub = prevSub;
    c.flags &= ~RecursedCheck;
    purgeDeps(c);
  }
}

function updateSignal(s) {
  s.flags = Mutable;
  return s.currentValue !== (s.currentValue = s.pendingValue);
}

function run(e) {
  const flags = e.flags;
  if (flags & Dirty || (flags & Pending && checkDirty(e.deps, e))) {
    if (flags & HasChildEffect) {
      let link = e.depsTail;
      while (link !== undefined) {
        const prev = link.prevDep, dep = link.dep;
        if (!('getter' in dep) && !('currentValue' in dep)) unlink(link, e);
        link = prev;
      }
    }
    if (e.cleanup) { runCleanup(e); if (!e.flags) return; }
    e.depsTail = undefined;
    e.flags = Watching | RecursedCheck;
    const prevSub = activeSub;
    activeSub = e;
    contextStack.push(new Map());
    try {
      ++cycle; ++runDepth;
      const r = e.fn();
      e.cleanup = typeof r === 'function' ? r : undefined;
    }
    finally {
      --runDepth; activeSub = prevSub;
      contextStack.pop();
      e.flags &= ~RecursedCheck;
      purgeDeps(e);
    }
  } else if (e.deps !== undefined) {
    e.flags = Watching | (flags & HasChildEffect);
  }
}

function flush() {
  try {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex];
      queued[notifyIndex++] = undefined;
      run(effect);
    }
  } finally {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex];
      queued[notifyIndex++] = undefined;
      effect.flags |= Watching | Recursed;
    }
    notifyIndex = 0;
    queuedLength = 0;
  }
}

function computedOper() {
  const flags = this.flags;
  if (flags & Dirty || (flags & Pending && (checkDirty(this.deps, this) || (this.flags = flags & ~Pending, false)))) {
    if (updateComputed(this)) {
      const subs = this.subs;
      if (subs !== undefined) shallowPropagate(subs);
    }
  } else if (!flags) {
    this.flags = Mutable | RecursedCheck;
    const prevSub = activeSub;
    activeSub = this;
    try { this.value = this.getter(); }
    finally { activeSub = prevSub; this.flags &= ~RecursedCheck; }
  }
  const sub = activeSub;
  if (sub !== undefined) link(this, sub, cycle);
  return this.value;
}

function signalOper(...value) {
  if (value.length) {
    if (this.pendingValue !== (this.pendingValue = value[0])) {
      this.flags = Mutable | Dirty;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs, !!runDepth);
        if (!batchDepth) flush();
      }
    }
  } else {
    if (this.flags & Dirty) {
      if (updateSignal(this)) {
        const subs = this.subs;
        if (subs !== undefined) shallowPropagate(subs);
      }
    }
    const sub = activeSub;
    if (sub !== undefined) link(this, sub, cycle);
    return this.currentValue;
  }
}

function runCleanup(e) {
  const cleanup = e.cleanup;
  e.cleanup = undefined;
  const prevSub = activeSub;
  activeSub = undefined;
  try { cleanup(); }
  finally { activeSub = prevSub; }
}

function effectOper() {
  effectScopeOper.call(this);
  if (this.cleanup) runCleanup(this);
}

function effectScopeOper() {
  this.flags = None;
  disposeAllDepsInReverse(this);
  const sub = this.subs;
  if (sub !== undefined) unlink(sub);
}

function disposeAllDepsInReverse(sub) {
  let link = sub.depsTail;
  while (link !== undefined) {
    const prev = link.prevDep;
    unlink(link, sub);
    link = prev;
  }
}

function purgeDeps(sub) {
  const depsTail = sub.depsTail;
  let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;
  while (dep !== undefined) dep = unlink(dep, sub);
}

export function untrack(fn) {
  const prev = activeSub;
  activeSub = undefined;
  try { return fn(); }
  finally { activeSub = prev; }
}

export function watch(source, cb, { immediate = false } = {}) {
  let prev, first = true;
  return effect(() => {
    const value = source();
    if (first) {
      first = false;
      prev = value;
      if (immediate) untrack(() => cb(value, undefined));
      return;
    }
    if (Object.is(prev, value)) return;
    const old = prev;
    prev = value;
    untrack(() => cb(value, old));
  });
}

export function local(key, initial) {
  let value = initial;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) value = JSON.parse(raw);
    } catch {}
  }

  const s = signal(value);

  effect(() => {
    const v = s();
    if (typeof localStorage !== 'undefined') {
      try {
        const json = JSON.stringify(v);
        if (localStorage.getItem(key) !== json) localStorage.setItem(key, json);
      } catch {}
    }
  });

  return s;
}

const DOC = typeof document !== 'undefined' ? document : null;

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(
  ('svg path circle rect line polyline polygon g defs text textPath tspan use symbol image marker ellipse ' +
   'foreignObject clipPath mask linearGradient radialGradient pattern filter stop ' +
   'animate animateMotion animateTransform view desc metadata title switch ' +
   'feGaussianBlur feOffset feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix ' +
   'feDiffuseLighting feDisplacementMap feDistantLight feFlood feFuncA feFuncB feFuncG feFuncR ' +
   'feImage feMerge feMergeNode feMorphology fePointLight feSpecularLighting feSpotLight feTile feTurbulence'
  ).split(' ')
);

function setAttr(el, key, res, isSVG) {
  if (key === 'class' || key === 'className') {
    if (isSVG) {
      if (res == null || res === false) el.removeAttribute('class');
      else el.setAttribute('class', res === true ? '' : res);
    } else {
      el.className = res ?? '';
    }
    return;
  }
  if (res == null || res === false) {
    el.removeAttribute(key);
    return;
  }
  if (key === 'style' && typeof res === 'string') {
    el.setAttribute('style', res);
    return;
  }
  if (isSVG) {
    el.setAttribute(key, res === true ? '' : res);
    return;
  }
  if (key in el && typeof el[key] !== 'function') el[key] = res;
  else el.setAttribute(key, res === true ? '' : res);
}

// Limpieza recursiva de un nodo (scopes + listeners)
function cleanupNode(n) {
  const stack = [n];
  while (stack.length) {
    const node = stack.pop();
    if (node._stopScope) { node._stopScope(); node._stopScope = null; }
    if (node._cln) { for (const f of node._cln) f(); node._cln = null; }
    for (let i = 0; i < node.childNodes.length; i++) stack.push(node.childNodes[i]);
  }
}

export function h(tag, props = {}, ...children) {
  if (typeof tag === 'function') {
    let element;
    const stop = effectScope(() => { element = tag(props, children); });
    const mark = (n) => {
      if (n instanceof Node) n._stopScope = stop;
      else if (Array.isArray(n)) n.forEach(mark);
    };
    mark(element);
    return element;
  }

  if (
    props instanceof Node ||
    Array.isArray(props) ||
    (props !== null && typeof props !== 'object') ||
    props === undefined
  ) {
    children = [props, ...children];
    props = {};
  }

  const isSVG = SVG_TAGS.has(tag);
  const el = isSVG ? DOC.createElementNS(SVG_NS, tag) : DOC.createElement(tag);

  let deferredSelectValue;
  let hasHTML = false;

  for (const key in props) {
    const val = props[key];

    if (key === 'ref') {
      if (typeof val === 'function') val(el);
      else if (val != null && typeof val === 'object') val.current = el;
      continue;
    }

    if (tag === 'select' && key === 'value') {
      deferredSelectValue = val;
      continue;
    }

    if (key === 'html') {
      hasHTML = true;
      if (typeof val === 'function') effect(() => { el.innerHTML = val() ?? ''; });
      else el.innerHTML = val ?? '';
      continue;
    }

    if (key.startsWith('on') && typeof val === 'function') {
      const ev = key.slice(2).toLowerCase();
      el.addEventListener(ev, val);
      (el._cln || (el._cln = [])).push(() => el.removeEventListener(ev, val));
    } else if (typeof val === 'function') {
      effect(() => setAttr(el, key, val(), isSVG));
    } else {
      setAttr(el, key, val, isSVG);
    }
  }

  if (!hasHTML) {
    const append = (c) => {
      if (Array.isArray(c)) { for (const x of c) append(x); return; }
      if (c == null || c === false || c === true) return;

      if (typeof c === 'function') {
        const anchor = DOC.createComment('');
        el.appendChild(anchor);
        effect(() => {
          const res = c();
          const list = Array.isArray(res) ? res : [res];
          const nodes = [];
          for (const item of list) {
            if (item == null || item === false || item === true) continue;
            nodes.push(item instanceof Node ? item : DOC.createTextNode(String(item)));
          }
          for (const n of nodes) el.insertBefore(n, anchor);
          return () => {
            for (const n of nodes) {
              cleanupNode(n);
              n.remove();
            }
          };
        });
        return;
      }

      el.appendChild(c instanceof Node ? c : DOC.createTextNode(String(c)));
    };
    append(children);
  }

  // select.value diferido hasta que existan los <option>
  if (deferredSelectValue !== undefined) {
    if (typeof deferredSelectValue === 'function') {
      effect(() => setAttr(el, 'value', deferredSelectValue(), isSVG));
    } else {
      setAttr(el, 'value', deferredSelectValue, isSVG);
    }
  }

  return el;
}

export const bind = (sig, { prop = 'value', onEvent = 'onInput', parse = (v) => v } = {}) => ({
  [prop]: () => sig(),
  [onEvent]: (e) => sig(parse(e.target[prop])),
});

export function mount(component, target) {
  const el = typeof target === 'string' ? DOC.querySelector(target) : target;
  if (!el) return () => {};

  let node;
  const stopRoot = effectScope(() => { node = h(component, {}); });

  const nodes = Array.isArray(node) ? node.filter(Boolean) : (node ? [node] : []);
  el.replaceChildren(...nodes);

  return () => { stopRoot(); el.replaceChildren(); };
}

export function unmount(node) {
  if (!(node instanceof Node)) return;
  cleanupNode(node);
  if (node.parentNode) node.parentNode.removeChild(node);
}

const htmlTags = "a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup table tbody td template textarea tfoot th thead time tr u ul video";

export const exposeTags = (target = typeof window !== 'undefined' ? window : null) => {
  if (!target) return;
  for (const tag of htmlTags.split(' ')) {
    target[tag] = (props, ...children) => h(tag, props, ...children);
  }
};

export const currentPath = signal(
  typeof window !== 'undefined'
    ? (window.location.hash.slice(1) || '/')
    : '/'
);
export const routerParams = signal({});

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentPath(window.location.hash.slice(1) || '/');
  });
}

export const router = routes => () => {
  const hook = h('div', { class: 'router-hook' });

  effect(() => {
    const path = currentPath();
    const p2 = path.split('/').filter(Boolean);

    return effectScope(() => {
      const route = routes.find(r => {
        const p1 = r.path.split('/').filter(Boolean);
        return (
          p1.length === p2.length &&
          p1.every((p, i) => p[0] === ':' || p === p2[i])
        );
      }) || routes.find(r => r.path === '*');

      if (!route) {
        hook.replaceChildren();
        return;
      }

      const params = {};
      route.path.split('/').filter(Boolean).forEach((p, i) => {
        if (p[0] === ':') params[p.slice(1)] = p2[i];
      });

      routerParams(params);

      const node = typeof route.component === 'function'
        ? h(route.component, params)
        : route.component;

      const nodes = node == null ? [] : Array.isArray(node) ? node : [node];
      hook.replaceChildren(...nodes);
    });
  });

  return hook;
};

router.to = path => {
  if (typeof window !== 'undefined') {
    window.location.hash = path.replace(/^#?\/?/, '#/');
  }
};
router.back = () => {
  if (typeof window !== 'undefined') window.history.back();
};
router.path = () => currentPath();

export const currentLocale = signal('en');
const translations = {};

export const addLang = obj => {
  for (const locale in obj) {
    translations[locale] ||= {};
    Object.assign(translations[locale], obj[locale]);
  }
};

export const setLocale = locale => {
  if (locale && translations[locale]) currentLocale(locale);
};

export const t = key => () =>
  translations[currentLocale()]?.[key] ?? key;

export const tt = key =>
  translations[currentLocale()]?.[key] ?? key;

export const db = async (url, data = null, loading = null, signal = null) => {
  if (loading) loading(true);
  try {
    const res = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
      signal,
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    return await res.json();
  } finally {
    if (loading) loading(false);
  }
};

export const SigPro = {
  signal, computed, effect, effectScope, batch,
  untrack, watch, local,
  provide, inject,
  h, bind, mount, unmount, exposeTags,
  router, currentPath, routerParams,
  currentLocale, addLang, setLocale, t, tt,
  db,
};