// sigpro.router.js

import { signal, effect, cleanupNode } from 'sigpro';

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

export const hmrTick = signal(0);
const hmrRegistry = new Map();

if (typeof window !== 'undefined') {
  window.__sigpro_hmr_page__ = (url, component) => {
    hmrRegistry.set(url, component);
    hmrTick(hmrTick() + 1);
  };
}

export const router = routes => () => {
  routes = [...routes].sort((a, b) =>
    (a.path === '*') - (b.path === '*') ||
    a.path.split('/').filter(p => p[0] === ':').length -
    b.path.split('/').filter(p => p[0] === ':').length
  );

  const DOC = typeof document !== 'undefined' ? document : null;

  const hook = DOC.createElement('div');
  hook.classList.add('router-hook');
  let scopeStop;
  let lastPath;
  let lastComponent;

  const clearHook = () => {
    for (const child of hook.childNodes) cleanupNode(child);
    hook.replaceChildren();
  };

  const effectStop = effect(() => {
    hmrTick();
    const path = currentPath();
    const pathname = path.split(/[?#]/)[0];
    const p2 = pathname.split('/').filter(Boolean);

    const route = routes.find(r => {
      const p1 = r.path.split('/').filter(Boolean);
      return (
        p1.length === p2.length &&
        p1.every((p, i) => p[0] === ':' || p === p2[i])
      );
    }) || routes.find(r => r.path === '*');

    if (!route) {
      if (scopeStop) { scopeStop(); scopeStop = undefined; }
      clearHook();
      lastPath = lastComponent = undefined;
      return;
    }

    const params = {};
    route.path.split('/').filter(Boolean).forEach((p, i) => {
      if (p[0] === ':') {
        try { params[p.slice(1)] = decodeURIComponent(p2[i]); }
        catch { params[p.slice(1)] = p2[i]; }
      }
    });

    const component = hmrRegistry.get(route.path) ?? route.component;

    if (path === lastPath && component === lastComponent) return;
    lastPath = path;
    lastComponent = component;

    if (scopeStop) { scopeStop(); scopeStop = undefined; }

    clearHook();

    routerParams(params);

    scopeStop = effect(() => {
      const node = typeof component === 'function'
        ? component(params)
        : component;
      const nodes = node == null ? [] : Array.isArray(node) ? node : [node];
      hook.replaceChildren(...nodes);
    });
  });

  hook._stopScope = () => {
    if (scopeStop) { scopeStop(); scopeStop = undefined; }
    effectStop();
  };

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

export { hmrRegistry };
