const { $, div, isF } = window.SigPro;

const getHash = () => window.location.hash.slice(1) || "/";
export const currentPath = $(getHash());
export const routerParams = $({});

window.addEventListener("hashchange", () => currentPath(getHash()));

export const router = routes => {
  return div({ class: "router-hook" }, [
    () => {
      const cur = currentPath();
      const p2 = cur.split("/").filter(Boolean);

      const route = routes.find(r => {
        const p1 = r.path.split("/").filter(Boolean);
        return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
      }) || routes.find(r => r.path === "*");

      if (!route) return null;

      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => {
        if (p[0] === ":") params[p.slice(1)] = p2[i];
      });

      routerParams(params);

      return isF(route.component) ? route.component(params) : route.component;
    }
  ]);
};

router.params = routerParams;
router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/");
router.back = () => window.history.back();
router.path = () => currentPath();