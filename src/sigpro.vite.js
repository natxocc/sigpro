// sigpro.vite.js
import fs from "fs";
import path from "path";

export function sigproRouter({ pagesDir = "src/pages" } = {}) {
  const virtualModuleId = "virtual:sigpro-routes";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  const root = process.cwd();
  const pagesRoot = path.resolve(root, pagesDir);
  const pagesRootPosix = pagesRoot.split(path.sep).join("/");

  const isPage = (f) =>
    /\.(js|jsx)$/.test(f) && !path.basename(f).startsWith("_");

  const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { recursive: true })
      .filter(isPage)
      .map((file) => path.resolve(dir, file));
  };

  const pathToUrl = (dir, filePath) => {
    const relative = path
      .relative(dir, filePath)
      .replace(/\\/g, "/")
      .replace(/\.(js|jsx)$/, "")
      .replace(/\/index$/, "")
      .replace(/^index$/, "");
    return (
      ("/" + relative)
        .replace(/\/+/g, "/")
        .replace(/\[\.\.\.([^\]]+)\]/g, "*")
        .replace(/\[([^\]]+)\]/g, ":$1")
        .replace(/\/$/, "") || "/"
    );
  };

  const sortRoutes = (dir, files) =>
    files.slice().sort((a, b) => {
      const ua = pathToUrl(dir, a),
        ub = pathToUrl(dir, b);
      const wa = ua.includes(":") || ua.includes("*");
      const wb = ub.includes(":") || ub.includes("*");
      if (wa !== wb) return wa ? 1 : -1;
      return ub.length - ua.length;
    });

  const generateModule = () => {
    const dir = pagesRoot;
    const files = sortRoutes(dir, getFiles(dir));

    let imports = "";
    let routes = "";

    files.forEach((fullPath, i) => {
      const url = pathToUrl(dir, fullPath);
      const importPath =
        "/" + path.relative(root, fullPath).replace(/\\/g, "/");
      const name = `Page${i}`;
      imports += `import ${name} from '${importPath}';\n`;
      routes += `  { path: '${url}', component: ${name} },\n`;
    });

    routes += `  { path: '*', component: () => { const d = document.createElement('div'); d.className = 'not-found'; d.textContent = '404 - Not Found'; return d; } },\n`;

    return `${imports}\nexport const routes = [\n${routes}];`;
  };

  return {
    name: "sigpro-router",

    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
    },

    load(id) {
      if (id !== resolvedVirtualModuleId) return;
      return generateModule();
    },

    transform(code, id) {
      const clean = id.split("?")[0];
      const cleanPosix = clean.split(path.sep).join("/");

      if (!cleanPosix.startsWith(pagesRootPosix + "/")) return;
      if (!/\.(js|jsx)$/.test(cleanPosix)) return;
      if (path.basename(cleanPosix).startsWith("_")) return;

      const url = pathToUrl(pagesRoot, clean);

      const hmr = `
;
if (import.meta.hot) {
  import.meta.hot.accept((newMod) => {
    if (newMod && typeof window !== 'undefined' && window.__sigpro_hmr_page__) {
      window.__sigpro_hmr_page__(${JSON.stringify(url)}, newMod.default ?? newMod);
    }
  });
}
`;
      return { code: code + hmr, map: null };
    },

    configureServer(server) {
      const onChange = (file) => {
        const posix = file.split(path.sep).join("/");
        if (!posix.startsWith(pagesRootPosix + "/")) return;
        if (!isPage(posix)) return;
        const vm = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (vm) server.moduleGraph.invalidateModule(vm);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

/* Vite Config

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { sigproRouter } from "./sigpro.vite.js";

const dev = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [sigproRouter({ pagesDir: "src/pages" }), tailwindcss()],
  base: dev ? "/absproxy/5173/" : "/",
  server: { host: "0.0.0.0", allowedHosts: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});

*/

/* main.js 
if (import.meta.hot) {
  import.meta.hot.accept(["./App.js"], ([newApp]) => {
    dispose?.();
    dispose = mount(newApp.App, "#app");
  });
}
  */
