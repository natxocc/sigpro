// src/router.js
import { h, watch, $, render, onUnmount, isFunc } from './sigpro.js';
import fs from 'node:fs';
import path from 'node:path';

const router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/";
  const path = $(getHash());
  const handler = () => path(getHash());
  window.addEventListener("hashchange", handler);
  onUnmount(() => window.removeEventListener("hashchange", handler));
  
  const hook = h("div", { class: "router-hook" });
  let currentView = null;
  
  watch([path], () => {
    const cur = path();
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean);
      const p2 = cur.split("/").filter(Boolean);
      return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
    }) || routes.find(r => r.path === "*");
    
    if (route) {
      currentView?.destroy();
      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => {
        if (p[0] === ":") params[p.slice(1)] = cur.split("/").filter(Boolean)[i];
      });
      router.params(params);
      currentView = render(() => isFunc(route.component) ? route.component(params) : route.component);
      hook.replaceChildren(currentView.container);
    }
  });
  return hook;
};

router.params = $({});
router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/");
router.back = () => window.history.back();
router.path = () => window.location.hash.replace(/^#/, "") || "/";

function sigproRouter() {
  const virtualModuleId = 'virtual:sigpro-routes';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { recursive: true })
      .filter(file => /\.(js|jsx)$/.test(file) && !path.basename(file).startsWith('_'))
      .map(file => path.resolve(dir, file));
  };

  const pathToUrl = (pagesDir, filePath) => {
    let relative = path.relative(pagesDir, filePath)
      .replace(/\\/g, '/')
      .replace(/\.(js|jsx)$/, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '');
    return ('/' + relative)
      .replace(/\/+/g, '/')
      .replace(/\[\.\.\.([^\]]+)\]/g, '*')
      .replace(/\[([^\]]+)\]/g, ':$1')
      .replace(/\/$/, '') || '/';
  };

  return {
    name: 'sigpro-router',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return;
      const root = process.cwd();
      const pagesDir = path.resolve(root, 'src/pages');
      const files = getFiles(pagesDir).sort((a, b) => {
        const urlA = pathToUrl(pagesDir, a);
        const urlB = pathToUrl(pagesDir, b);
        if (urlA.includes(':') && !urlB.includes(':')) return 1;
        if (!urlA.includes(':') && urlB.includes(':')) return -1;
        return urlB.length - urlA.length;
      });

      let routeEntries = '';
      files.forEach((fullPath) => {
        const urlPath = pathToUrl(pagesDir, fullPath);
        const relativeImport = './' + path.relative(root, fullPath).replace(/\\/g, '/');
        routeEntries += `  { path: '${urlPath}', component: () => import('/${relativeImport}') },\n`;
      });
      if (!routeEntries.includes("path: '*'")) {
        routeEntries += `  { path: '*', component: () => ({ default: () => document.createTextNode('404 - Not Found') }) },\n`;
      }
      return `export const routes = [\n${routeEntries}];`;
    }
  };
}

// ============================================================
// Exportación final (lo que se consume desde 'sigpro/router')
// ============================================================
export { router, sigproRouter };