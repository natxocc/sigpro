// src/sigpro.vite.js
function sigproRouter() {
  const virtualModuleId = "virtual:sigpro-routes";
  const resolvedVirtualModuleId = "\x00" + virtualModuleId;
  const getFiles = (dir) => {
    if (!fs.existsSync(dir))
      return [];
    return fs.readdirSync(dir, { recursive: true }).filter((file) => /\.(js|jsx)$/.test(file) && !path.basename(file).startsWith("_")).map((file) => path.resolve(dir, file));
  };
  const pathToUrl = (pagesDir, filePath) => {
    let relative = path.relative(pagesDir, filePath).replace(/\\/g, "/").replace(/\.(js|jsx)$/, "").replace(/\/index$/, "").replace(/^index$/, "");
    return ("/" + relative).replace(/\/+/g, "/").replace(/\[\.\.\.([^\]]+)\]/g, "*").replace(/\[([^\]]+)\]/g, ":$1").replace(/\/$/, "") || "/";
  };
  return {
    name: "sigpro-router",
    resolveId(id) {
      if (id === virtualModuleId)
        return resolvedVirtualModuleId;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId)
        return;
      const root = process.cwd();
      const pagesDir = path.resolve(root, "src/pages");
      const files = getFiles(pagesDir).sort((a, b) => {
        const urlA = pathToUrl(pagesDir, a);
        const urlB = pathToUrl(pagesDir, b);
        if (urlA.includes(":") && !urlB.includes(":"))
          return 1;
        if (!urlA.includes(":") && urlB.includes(":"))
          return -1;
        return urlB.length - urlA.length;
      });
      let routeEntries = "";
      files.forEach((fullPath) => {
        const urlPath = pathToUrl(pagesDir, fullPath);
        const relativeImport = "./" + path.relative(root, fullPath).replace(/\\/g, "/");
        routeEntries += `  { path: '${urlPath}', component: () => import('/${relativeImport}') },
`;
      });
      if (!routeEntries.includes("path: '*'")) {
        routeEntries += `  { path: '*', component: () => ({ default: () => document.createTextNode('404 - Not Found') }) },
`;
      }
      return `export const routes = [
${routeEntries}];`;
    }
  };
}
export {
  sigproRouter
};
