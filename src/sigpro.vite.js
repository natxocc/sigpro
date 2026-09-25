import fs from 'fs';
import path from 'path';

export function sigproRouter({ pagesDir = 'src/pages' } = {}) {
  const virtualModuleId = 'virtual:sigpro-routes';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { recursive: true })
      .filter(file => /\.(js|jsx)$/.test(file) && !path.basename(file).startsWith('_'))
      .map(file => path.resolve(dir, file));
  };

  const pathToUrl = (dir, filePath) => {
    const relative = path.relative(dir, filePath)
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
      const dir = path.resolve(root, pagesDir);
      const files = getFiles(dir).sort((a, b) => {
        const urlA = pathToUrl(dir, a);
        const urlB = pathToUrl(dir, b);
        if (urlA.includes(':') && !urlB.includes(':')) return 1;
        if (!urlA.includes(':') && urlB.includes(':')) return -1;
        return urlB.length - urlA.length;
      });

      let imports = '';
      let routes = '';

      files.forEach((fullPath, i) => {
        const url = pathToUrl(dir, fullPath);
        const importPath = '/' + path.relative(root, fullPath).replace(/\\/g, '/');
        const name = `Page${i}`;
        imports += `import ${name} from '${importPath}';\n`;
        routes += `  { path: '${url}', component: ${name} },\n`;
      });

      routes += `  { path: '*', component: () => { const d = document.createElement('div'); d.className = 'not-found'; d.textContent = '404 - Not Found'; return d; } },\n`;

      return `${imports}\nexport const routes = [\n${routes}];`;
    }
  };
}