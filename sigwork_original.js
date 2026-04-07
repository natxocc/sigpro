/*
* Sigwork - Optimized & Leak-free
*/

const isFn = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;

// --- Sistema de Programación ---
let isScheduled = false;
const queue = new Set();
const tick = () => {
   queue.forEach(fn => fn());
   queue.clear();
   isScheduled = false;
}

// --- Efectos y Alcance ---
let activeEffect = null;
export const effect = (fn, is_scope = false) => {
   let cleanup;
   const run = () => {
      stop(); // Limpia suscripciones y ejecuciones previas
      const prev = activeEffect;
      activeEffect = run;
      try { cleanup = fn(); } finally { activeEffect = prev; }
   }
   const stop = () => {
      run.e.forEach(subs => subs.delete(run));
      run.e.clear();
      if (isFn(cleanup)) cleanup();
      if (run.c) {
         run.c.forEach(s => s());
         run.c.length = 0;
      }
   }
   run.e = new Set(); // Suscripciones (Signals)
   if (is_scope) run.c = []; // Efectos hijos
   run();
   
   // Registro en el padre para evitar fugas
   if (activeEffect?.c) activeEffect.c.push(stop);
   return stop;
}

export const scope = f => effect(f, true);

const track = (subs) => {
   if (activeEffect) {
      subs.add(activeEffect);
      activeEffect.e.add(subs);
   }
};

// --- Signals ---
export const signal = (value) => {
   const subs = new Set();
   return {
      get value() { track(subs); return value; },
      set value(nv) {
         if (nv === value) return;
         value = nv;
         subs.forEach(fn => queue.add(fn));
         if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
      }
   }
}

export const computed = (fn) => {
   const sig = signal();
   effect(() => sig.value = fn());
   return { get value() { return sig.value; } };
}

// --- Rendering Core ---
let context = null;
export const onMount = (fn) => context?.m.push(fn);
export const onUnmount = (fn) => context?.u.push(fn);

const remove = (node) => {
   if (Array.isArray(node)) return node.forEach(remove);
   node.$s?.(); // Detener efectos del nodo
   if (node.$c) node.$c.u.forEach(f => f()); // Ejecutar onUnmount
   const done = () => node.remove();
   node.$l ? node.$l(done) : done();
}

export const h = (tag, props = {}, ...children) => {
   children = children.flat(Infinity);

   if (isFn(tag)) {
      const prev = context;
      const ctx = context = { m: [], u: [], p: { ...(prev?.p || {}) } };
      let res;
      const stop = effect(() => {
         res = tag(props, { children, emit: (e, ...a) => props[`on${e[0].toUpperCase()}${e.slice(1)}`]?.(...a) });
         return () => ctx.u.forEach(f => f());
      }, true);
      
      // Si el componente devuelve un array, necesitamos un ancla para colgar el ciclo de vida
      const out = isNode(res) ? res : document.createTextNode(String(res));
      out.$c = ctx;
      out.$s = stop;
      context = prev;
      return out;
   }

   if (!tag) return children; // Fragment (manejo simple)

   const isSvg = tag === 'svg' || tag === 'path' || tag === 'circle'; // Simplificado
   const el = isSvg 
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);

   for (const key in props) {
      const val = props[key];
      if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
      else if (key === "ref") isFn(val) ? val(el) : (val.value = el);
      else if (isFn(val)) effect(() => el[key] = val()); // Atribución reactiva
      else el[key] = val;
   }

   children.forEach(child => append(el, child));
   return el;
}

const append = (parent, child) => {
   if (child == null) return;
   if (isFn(child)) {
      const anchor = document.createTextNode('');
      parent.appendChild(anchor);
      let nodes = [];
      effect(() => {
         const raw = [child()].flat(Infinity).filter(v => v != null);
         const newNodes = raw.map(n => isNode(n) ? n : document.createTextNode(String(n)));
         
         // Cleanup de nodos antiguos que ya no están
         nodes.forEach(n => { if (!newNodes.includes(n)) remove(n); });
         
         // Reconciliación simple
         newNodes.forEach((n, i) => {
            if (!nodes.includes(n)) {
               parent.insertBefore(n, newNodes[i+1] || anchor);
               if (n.$c) n.$c.m.forEach(f => f());
            }
         });
         nodes = newNodes;
      }, true);
   } else {
      parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
   }
}

// --- Helpers ---
export const For = (list, key, renderFn) => {
   let cache = new Map();
   return () => {
      const next = new Map();
      const items = isFn(list) ? list() : list.value || list;
      const res = items.map((item, i) => {
         const id = isFn(key) ? key(item, i) : (key ? item[key] : item);
         let node = cache.get(id);
         if (!node) node = h(() => renderFn(item, i));
         next.set(id, node);
         return node;
      });
      // Limpiar nodos que salen de la lista
      cache.forEach((node, id) => { if (!next.has(id)) remove(node); });
      cache = next;
      return res;
   }
}