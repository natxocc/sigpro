import { $, watch, h, onUnmount, isFunc, render } from './core.js';

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
router.to = p => (window.location.hash = p.replace(/^#?\/?/, "#/"));
router.back = () => window.history.back();
router.path = () => window.location.hash.replace(/^#/, "") || "/";

if (typeof window !== "undefined") {
  window.router = router;
}

export { router };