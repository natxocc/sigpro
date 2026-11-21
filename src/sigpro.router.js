// sigpro.router.js
import { signal, effect } from 'sigpro';

export const currentPath = signal(typeof window !== 'undefined' ? location.hash.slice(1) || '/' : '/');
export const routerParams = signal({});

if (typeof window !== 'undefined') {
  addEventListener('hashchange', () => currentPath(location.hash.slice(1) || '/'));
}

const hmrTick = signal(0);
const hmrRegistry = new Map();
window.__sigpro_hmr_page__ = (url, component) => { hmrRegistry.set(url, component); hmrTick(hmrTick() + 1); };

export const router = routes => {
  const sorted = [...routes].sort((a, b) => a.path.split('/').filter(p => p[0] === ':').length -
    b.path.split('/').filter(p => p[0] === ':').length || (b.path === '*') - (a.path === '*'));

  const hook = document.createElement('div');
  hook.classList.add('router-hook');
  let scopeStop, lastPath, lastComponent;

  const clearHook = () => {
    const stack = [...hook.childNodes];
    while (stack.length) {
      const n = stack.pop();
      if (n._stopScope) { n._stopScope(); n._stopScope = null; }
      if (n._cln) { for (const f of n._cln) f(); n._cln = null; }
      stack.push(...n.childNodes);
    }
    hook.replaceChildren();
  };

  const effectStop = effect(() => {
    hmrTick();
    const hash = currentPath().split(/[?#]/)[0];
    const p2 = hash.split('/').filter(Boolean);

    let route = sorted.find(r => r.path.split('/').filter(Boolean).length === p2.length &&
      r.path.split('/').every((p, i) => p[0] === ':' || p === p2[i]));
    if (!route) route = sorted[sorted.length - 1];

    const params = {};
    route.path.split('/').filter(Boolean).reduce((acc, p, i) => {
      if (p[0] === ':') try { params[p.slice(1)] = decodeURIComponent(p2[i]); } catch { params[p.slice(1)] = p2[i]; }
      return acc;
    }, null);

    const component = hmrRegistry.get(route.path) ?? route.component;
    if (hash === lastPath && component === lastComponent) return;
    lastPath = hash; lastComponent = component;

    if (scopeStop) { scopeStop(); scopeStop = undefined; }
    clearHook();
    routerParams(params);
    scopeStop = effect(() => {
      const node = typeof component === 'function' ? component(params) : component;
      hook.replaceChildren(...(node == null ? [] : Array.isArray(node) ? node : [node]));
    });
  });

  hook._stopScope = () => { if (scopeStop) { scopeStop(); scopeStop = undefined; } effectStop(); };
  return hook;
};

router.to = path => location.hash = '#/' + path.replace(/^\//, '');
router.back = () => history.back();
router.path = () => currentPath();
