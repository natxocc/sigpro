import { effect, effectScope, reportError } from './sigpro.core.js';
export * from './sigpro.core.js';

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

const BOOLEAN_PROPS = new Set([
  'allowFullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'defer', 'disabled', 'formNoValidate', 'hidden', 'inert', 'loop', 'multiple',
  'muted', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'selected',
]);

function setAttr(el, key, res, isSVG) {
  const k = key.toLowerCase();
  if (k === 'innerhtml' || k === 'outerhtml' || k === 'srcdoc') return;
  if (k.startsWith('on') && res != null && res !== false) return;
  if (/^(href|src|action|formaction|poster|data|xlink:href)$/i.test(key) && res != null && res !== false) {
    if (typeof res !== 'string') return;
    try {
      const proto = new URL(res, 'https://placeholder.invalid/').protocol;
      const safeData = proto === 'data:' && k === 'src' &&
        /^(img|source|video|audio|track|input)$/i.test(el.tagName) &&
        /^data:image\/(png|jpe?g|gif|webp|avif|bmp);/i.test(res.trim());
      if (!/^(https?|mailto|tel|blob):$/.test(proto) && !safeData) return;
    } catch { return; }
  }
  if (key === 'class' || key === 'className') {
    if (isSVG) {
      if (res == null || res === false) el.removeAttribute('class');
      else el.setAttribute('class', res === true ? '' : res);
    } else {
      el.className = res ?? '';
    }
    return;
  }
  if (BOOLEAN_PROPS.has(key) && !isSVG && key in el) {
    const on = res != null && res !== false;
    el[key] = on;
    if (on) el.setAttribute(key, '');
    else el.removeAttribute(key);
    return;
  }
  if (res == null || res === false) {
    if (key === 'style') el._lastStyle = undefined;
    el.removeAttribute(key);
    return;
  }
  if (key === 'style') {
    const prev = el._lastStyle;
    if (typeof res === 'string') {
      if (prev !== undefined) {
        el.removeAttribute('style');
        el._lastStyle = undefined;
      }
      el.setAttribute('style', res);
      return;
    }
    if (typeof res === 'object') {
      if (prev) for (const p in prev) if (!(p in res)) {
        if (p.startsWith('--')) el.style.removeProperty(p);
        else el.style[p] = '';
      }
      for (const p in res) {
        const v = res[p];
        if (p.startsWith('--')) {
          if (v == null || v === false) el.style.removeProperty(p);
          else el.style.setProperty(p, String(v));
        } else {
          el.style[p] = v == null || v === false ? '' : String(v);
        }
      }
      el._lastStyle = res;
      return;
    }
  }
  if (isSVG) {
    el.setAttribute(key, res === true ? '' : res);
    return;
  }
  if (key in el && typeof el[key] !== 'function') el[key] = res;
  else el.setAttribute(key, res === true ? '' : res);
}

function cleanupNode(n) {
  const stack = [n];
  while (stack.length) {
    const node = stack.pop();
    if (node._stopScope) { node._stopScope(); node._stopScope = null; }
    if (node._cln) { for (const f of node._cln) f(); node._cln = null; }
    const children = node.childNodes;
    for (let i = 0, len = children.length; i < len; i++) stack.push(children[i]);
  }
}

export function h(tag, props = {}, ...children) {
  if (tag == null) {
    console.error('[sigpro] h() called with no tag');
    return DOC.createComment('invalid tag');
  }

  if (typeof tag === 'function') {
    let element;
    const stop = effectScope(() => {
      try {
        element = tag(props, children);
      } catch (err) {
        reportError(err, tag);
        element = DOC.createComment('error');
      }
    });
    const mark = (n) => {
      if (n instanceof Node) n._stopScope = stop;
      else if (Array.isArray(n)) n.forEach(mark);
    };
    mark(element);
    return element;
  }

  if (typeof tag !== 'string') {
    console.error('[sigpro] h() tag must be string or function, got', typeof tag);
    return DOC.createComment('invalid tag');
  }

  if (
    props instanceof Node ||
    Array.isArray(props) ||
    (props !== null && typeof props !== 'object')
  ) {
    children = [props, ...children];
    props = {};
  }

  const isSVG = SVG_TAGS.has(tag);
  const el = isSVG ? DOC.createElementNS(SVG_NS, tag) : DOC.createElement(tag);

  let deferredSelectValue;

  for (const key of Object.keys(props || {})) {
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

    if (key.startsWith('on') && typeof val === 'function') {
      const ev = key.slice(2).toLowerCase();
      el.addEventListener(ev, val);
      (el._cln || (el._cln = [])).push(() => el.removeEventListener(ev, val));
    } else if (key.startsWith('on') && val != null && val !== false) {
      console.error(`[sigpro] "${key}" expects a function, got ${typeof val}`);
    } else if (typeof val === 'function') {
      effect(() => setAttr(el, key, val(), isSVG));
    } else {
      setAttr(el, key, val, isSVG);
    }
  }

  if (tag === 'a' && el.target === '_blank' && !el.rel) {
    el.rel = 'noopener noreferrer';
  }

  const append = (c) => {
    if (Array.isArray(c)) { for (const x of c) append(x); return; }
    if (c == null || c === false || c === true) return;

    if (typeof c === 'function') {
      const anchor = DOC.createComment('');
      el.appendChild(anchor);
      const stop = effect(() => {
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
      (el._cln || (el._cln = [])).push(stop);
      return;
    }

    el.appendChild(c instanceof Node ? c : DOC.createTextNode(String(c)));
  };
  append(children);

  if (deferredSelectValue !== undefined) {
    if (typeof deferredSelectValue === 'function') {
      effect(() => setAttr(el, 'value', deferredSelectValue(), isSVG));
    } else {
      setAttr(el, 'value', deferredSelectValue, isSVG);
    }
  }

  return el;
}

export function mount(component, target) {
  const el = typeof target === 'string' ? DOC.querySelector(target) : target;
  if (!el) return () => { };

  let node;
  const stopRoot = effectScope(() => { node = h(component, {}); });

  const nodes = (Array.isArray(node) ? node : [node])
    .filter(n => n != null && n !== false && n !== true)
    .map(n => (n instanceof Node ? n : DOC.createTextNode(String(n))));

  while (el.firstChild) {
    cleanupNode(el.firstChild);
    el.removeChild(el.firstChild);
  }
  for (const n of nodes) el.appendChild(n);

  return () => {
    stopRoot();
    for (const n of nodes) cleanupNode(n);
    el.replaceChildren();
  };
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

export const slots = children => {
  const s = children[0]
  return (
    children.length === 1 && s && typeof s === 'object' &&
      !Array.isArray(s) && !(s instanceof Node)
      ? s
      : { default: () => children }
  )
}

/* HELPERS */
export const onPrevent = fn => e => { e.preventDefault(); fn(e); };
export const onStop = fn => e => { e.stopPropagation(); fn(e); };
export const onSelf = fn => e => { if (e.target === e.currentTarget) fn(e); };
export const onOnce = fn => { let c = false; return e => { if (!c) { c = true; fn(e); } }; };
export const onDebounce = (ms, fn) => { let t; return e => { clearTimeout(t); t = setTimeout(() => fn(e), ms); }; };
export const onKey = (key, fn) => e => { if (e.key === key) fn(e); };
export const onEnter = fn => onKey("Enter", fn);
export const onEscape = fn => onKey("Escape", fn);
export const bindvalue = s => ({ value: () => s(), oninput: e => s(e.target.value) });
export const bindcheck = s => ({ checked: () => !!s(), onchange: e => s(e.target.checked) });