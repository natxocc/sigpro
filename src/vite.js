/**
 * SigPro Vite Plugin - File-based Routing
 * @module sigpro/vite
 */
import fs from 'node:fs';
import path from 'node:path';

export default function sigproRouter() {
  const virtualModuleId = 'virtual:sigpro-routes';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  // Helper para escanear archivos
  const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { recursive: true })
      .filter(file => /\.(js|jsx)$/.test(file) && !path.basename(file).startsWith('_'))
      .map(file => path.resolve(dir, file));
  };

  // Transformador de ruta de archivo a URL de router
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
      
      // Obtenemos y ordenamos archivos (rutas estáticas primero, luego dinámicas)
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
        // Hacemos la ruta relativa al proyecto para que el import de Vite sea limpio
        const relativeImport = './' + path.relative(root, fullPath).replace(/\\/g, '/');
        
        routeEntries += `  { path: '${urlPath}', component: async () => (await import('/${relativeImport}')).default },\n`;
      });

      // Fallback 404 si no existe una ruta comodín
      if (!routeEntries.includes("path: '*'")) {
        routeEntries += `  { path: '*', component: () => document.createTextNode('404 - Not Found') },\n`;
      }

      return `export const routes = [\n${routeEntries}];`;
    }
  };
}

export { sigproRouter };