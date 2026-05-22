const { $, h, watch, render, isF } = window.SigPro;

const getHash = () => window.location.hash.slice(1) || "/";
const currentPath = $(getHash());

window.addEventListener("hashchange", () => currentPath(getHash()));

export const routerParams = $({});

export const router = routes => {
  const hook = h("div", { class: "router-hook" });
  let currentView = null;
  
  watch([currentPath], () => {
    const cur = currentPath();
    
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
      
      routerParams(params);
      
      currentView = render(() => isF(route.component) ? route.component(params) : route.component);
      
      hook.replaceChildren(currentView.container);
    }
  });
  
  hook.destroy = () => {
    currentView?.destroy();
  };
  
  return hook;
};

router.params = routerParams;
router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/");
router.back = () => window.history.back();
router.path = () => currentPath();