(() => {
  // src/sigpro.js
  var isFunc = (f) => typeof f == "function";
  var isObj = (o) => o && typeof o == "object";
  var isArr = Array.isArray;
  var doc = typeof document < "u" ? document : null;
  var txt = (s) => doc.createTextNode(s == null ? "" : String(s));
  var toNd = (n) => n?._rt ? n._cnt : n instanceof Node ? n : txt(n);
  var Fragment = (p) => p.children;
  var val = (v) => isFunc(v) ? v() : v;
  var aEff = null;
  var aOwn = null;
  var isFlushing = 0;
  var bDepth = 0;
  var eQ = new Set;
  var MOUNTED = new WeakMap;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var XLINK = "http://www.w3.org/1999/xlink";
  var SVG_TAGS = new Set("svg,path,circle,rect,line,polyline,polygon,g,defs,text,textPath,tspan,use,symbol,image,marker,ellipse".split(","));
  var DANG_ATTR = new Set(["src", "href", "formaction", "action", "background", "code", "archive"]);
  var clr = (s) => {
    if (s) {
      s.forEach((f) => f());
      s.clear();
    }
  };
  var dispose = (e) => {
    if (!e || e._x)
      return;
    e._x = 1;
    let st = [e], c;
    while (c = st.pop()) {
      clr(c._c);
      if (c._ch) {
        c._ch.forEach((x) => st.push(x));
        c._ch.clear();
      }
      if (c._d) {
        c._d.forEach((d) => d.delete(c));
        c._d.clear();
      }
    }
  };
  var onUnmount = (f) => aOwn && (aOwn._c ||= new Set).add(f);
  var untrack = (f) => {
    let p = aEff;
    aEff = null;
    try {
      return f();
    } finally {
      aEff = p;
    }
  };
  var createEffect = (f, isC = 0) => {
    const e = () => {
      if (e._x)
        return;
      if (e._d)
        e._d.forEach((s) => s.delete(e));
      clr(e._c);
      let pE = aEff, pO = aOwn;
      aEff = aOwn = e;
      try {
        return e._res = f();
      } catch (err) {
        console.error("[SigPro]", err);
      } finally {
        aEff = pE;
        aOwn = pO;
      }
    };
    e._d = e._c = e._ch = null;
    e._x = 0;
    e._iC = isC;
    e._dp = aEff ? aEff._dp + 1 : 0;
    e._m = [];
    e._p = aOwn;
    if (aOwn)
      (aOwn._ch ||= new Set).add(e);
    return e;
  };
  var flush = () => {
    if (isFlushing)
      return;
    isFlushing = 1;
    let q = [...eQ].sort((a, b) => a._dp - b._dp);
    eQ.clear();
    for (let e of q)
      if (!e._x)
        e();
    isFlushing = 0;
  };
  var batch = (f) => {
    bDepth++;
    try {
      return f();
    } finally {
      if (!--bDepth && eQ.size && !isFlushing)
        flush();
    }
  };
  var trkUpd = (s, trg = 0) => {
    if (!trg && aEff && !aEff._x) {
      s.add(aEff);
      (aEff._d ||= new Set).add(s);
    } else if (trg && s.size) {
      let q = 0;
      for (let e of s) {
        if (e === aEff || e._x)
          continue;
        if (e._iC) {
          e._dt = 1;
          if (e._sb)
            trkUpd(e._sb, 1);
        } else {
          eQ.add(e);
          q = 1;
        }
      }
      if (q && !isFlushing && !bDepth)
        queueMicrotask(flush);
    }
  };
  var $ = (v, k = null) => {
    let s = new Set;
    if (isFunc(v)) {
      let c, cp = () => {
        if (cp._dt) {
          let p = aEff;
          aEff = cp;
          try {
            let n = v();
            if (!Object.is(c, n)) {
              c = n;
              trkUpd(s, 1);
            }
          } finally {
            aEff = p;
          }
          cp._dt = 0;
        }
        trkUpd(s);
        return c;
      };
      cp._iC = cp._dt = 1;
      cp._sb = s;
      cp._d = null;
      cp._x = 0;
      return cp;
    }
    if (k)
      try {
        v = JSON.parse(localStorage.getItem(k)) ?? v;
      } catch (e) {}
    return (...a) => {
      if (a.length) {
        let n = isFunc(a[0]) ? a[0](v) : a[0];
        if (!Object.is(v, n)) {
          v = n;
          if (k)
            localStorage.setItem(k, JSON.stringify(v));
          trkUpd(s, 1);
        }
      }
      trkUpd(s);
      return v;
    };
  };
  var watch = (src, cb) => {
    let e = createEffect(cb ? () => {
      let v = isArr(src) ? src.map((s) => s()) : src();
      untrack(() => cb(v));
    } : src);
    e();
    return () => dispose(e);
  };
  var clnNd = (n) => {
    if (!n)
      return;
    clr(n._c);
    if (n._oE)
      dispose(n._oE);
    if (n.childNodes)
      n.childNodes.forEach(clnNd);
  };
  var valAtt = (k, v) => v == null || v === false ? null : (DANG_ATTR.has(k) || k.startsWith("on")) && /^\s*(javascript|data|vbscript):/i.test(String(v)) ? "#" : v;
  var h = (tag, prp = {}, ch = []) => {
    if (prp instanceof Node || isArr(prp) || !isObj(prp)) {
      ch = prp;
      prp = {};
    }
    if (isFunc(tag)) {
      let e = createEffect(() => e._res = tag(prp, { children: ch, emit: (ev, ...a) => prp[`on${ev[0].toUpperCase()}${ev.slice(1)}`]?.(...a) }));
      e();
      if (e._res == null)
        return null;
      let nd = e._res instanceof Node || isArr(e._res) && e._res.every((n) => n instanceof Node) ? e._res : txt(e._res);
      let att = (n) => {
        if (isObj(n) && !n._rt) {
          n._m = e._m || [];
          n._c = e._c || new Set;
          n._oE = e;
        }
      };
      isArr(nd) ? nd.forEach(att) : att(nd);
      return nd;
    }
    let isS = SVG_TAGS.has(tag), el = isS ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
    el._c = new Set;
    for (let k in prp) {
      let v = prp[k];
      if (k === "ref") {
        isFunc(v) ? v(el) : v.current = el;
        continue;
      }
      if (isS && k.startsWith("xlink:")) {
        let cv = valAtt(k.slice(6), v);
        cv == null ? el.removeAttributeNS(XLINK, k.slice(6)) : el.setAttributeNS(XLINK, k.slice(6), cv);
        continue;
      }
      if (k.startsWith("on")) {
        let ev = k.slice(2).toLowerCase();
        el.addEventListener(ev, v);
        let off = () => el.removeEventListener(ev, v);
        el._c.add(off);
        onUnmount(off);
      } else if (isFunc(v)) {
        let e = createEffect(() => {
          let r = valAtt(k, v());
          if (k === "class")
            el.className = r || "";
          else if (r == null)
            el.removeAttribute(k);
          else if (k === "style" && typeof r == "string")
            el.setAttribute("style", r);
          else if (k in el && !isS)
            el[k] = r;
          else
            el.setAttribute(k, r === true ? "" : r);
        });
        e();
        el._c.add(() => dispose(e));
        onUnmount(() => dispose(e));
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
          el.addEventListener(k === "checked" ? "change" : "input", (ev) => v(ev.target[k]));
        }
      } else {
        let r = valAtt(k, v);
        if (r != null) {
          if (k === "style" && typeof r == "string")
            el.setAttribute("style", r);
          else if (k in el && !isS)
            el[k] = r;
          else
            el.setAttribute(k, r === true ? "" : r);
        }
      }
    }
    const app = (c) => {
      if (isArr(c))
        return c.forEach(app);
      if (isFunc(c)) {
        let anc = txt(""), cur = [];
        el.appendChild(anc);
        let e = createEffect(() => {
          let r = c(), nxt = (isArr(r) ? r : [r]).map(toNd), ref = anc;
          cur.forEach((n) => {
            n._rt ? n._del() : clnNd(n);
            if (n.parentNode)
              n.remove();
          });
          for (let i = nxt.length - 1;i >= 0; i--) {
            let nd = nxt[i];
            if (nd.parentNode !== ref.parentNode)
              ref.parentNode?.insertBefore(nd, ref);
            if (nd._m)
              nd._m.forEach((f) => f());
            ref = nd;
          }
          cur = nxt;
        });
        e();
        el._c.add(() => dispose(e));
        onUnmount(() => dispose(e));
      } else {
        let nd = toNd(c);
        el.appendChild(nd);
        if (nd._m)
          nd._m.forEach((f) => f());
      }
    };
    app(ch);
    return el;
  };
  var render = (rFn) => {
    let c = new Set, pO = aOwn, pE = aEff, cnt = doc.createElement("div");
    cnt.style.display = "contents";
    cnt.setAttribute("role", "presentation");
    aOwn = { _c: c };
    aEff = null;
    const pRes = (r) => {
      if (!r)
        return;
      if (r._rt) {
        c.add(r._del);
        cnt.appendChild(r._cnt);
      } else if (isArr(r))
        r.forEach(pRes);
      else
        cnt.appendChild(r instanceof Node ? r : txt(r));
    };
    try {
      pRes(rFn({ onCleanup: (f) => c.add(f) }));
    } finally {
      aOwn = pO;
      aEff = pE;
    }
    return { _rt: 1, _cnt: cnt, _del: () => {
      clr(c);
      clnNd(cnt);
      cnt.remove();
    } };
  };
  var when = (c, Y, N = null) => {
    let anc = txt(""), rt = h("div", { style: "display:contents" }, [anc]), v;
    watch(() => !!val(c), (s) => {
      if (v) {
        v._del();
        v = null;
      }
      let ct = s ? Y : N;
      if (ct) {
        v = render(() => val(ct));
        rt.insertBefore(v._cnt, anc);
      }
    });
    onUnmount(() => v?._del());
    return rt;
  };
  var each = (s, fn, kF) => {
    let anc = txt(""), rt = h("div", { style: "display:contents" }, [anc]), cch = new Map;
    watch(() => val(s) || [], (it) => {
      let nCc = new Map, nOd = [];
      for (let i = 0, l = (it || []).length;i < l; i++) {
        let t = it[i], k = kF ? t?.[kF] ?? i : t?.id ?? i, v = cch.get(k);
        if (!v)
          v = render(() => fn(t, i));
        else
          cch.delete(k);
        nCc.set(k, v);
        nOd.push(v);
      }
      cch.forEach((v) => v._del());
      let ref = anc;
      for (let i = nOd.length - 1;i >= 0; i--) {
        let nd = nOd[i]._cnt;
        if (nd.nextSibling !== ref)
          rt.insertBefore(nd, ref);
        ref = nd;
      }
      cch = nCc;
    });
    return rt;
  };
  var mount = (c, tgt) => {
    let t = typeof tgt == "string" ? doc.querySelector(tgt) : tgt;
    if (!t)
      return;
    if (MOUNTED.has(t))
      MOUNTED.get(t)._del();
    let i = render(isFunc(c) ? c : () => c);
    t.replaceChildren(i._cnt);
    MOUNTED.set(t, i);
    return i;
  };
  if (typeof window < "u") {
    "a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup svg table tbody td template textarea tfoot th thead time tr u ul video".split(" ").forEach((t) => window[t] = (p, c) => h(t, p, c));
  }

  // src/sigpro.utils.js
  var router = (routes) => {
    const getHash = () => window.location.hash.slice(1) || "/";
    const path = $(getHash());
    const handler = () => path(getHash());
    window.addEventListener("hashchange", handler);
    const hook = h("div", { class: "router-hook" });
    let currentView = null;
    watch([path], () => {
      const cur = path();
      const route = routes.find((r) => {
        const p1 = r.path.split("/").filter(Boolean);
        const p2 = cur.split("/").filter(Boolean);
        return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
      }) || routes.find((r) => r.path === "*");
      if (route) {
        currentView?.destroy();
        const params = {};
        route.path.split("/").filter(Boolean).forEach((p, i) => {
          if (p[0] === ":")
            params[p.slice(1)] = cur.split("/").filter(Boolean)[i];
        });
        router.params(params);
        currentView = render(() => isFunc(route.component) ? route.component(params) : route.component);
        hook.replaceChildren(currentView.container);
      }
    });
    hook.destroy = () => {
      window.removeEventListener("hashchange", handler);
      currentView?.destroy();
    };
    return hook;
  };
  router.params = $({});
  router.to = (p) => window.location.hash = p.replace(/^#?\/?/, "#/");
  router.back = () => window.history.back();
  router.path = () => window.location.hash.replace(/^#/, "") || "/";
  var currentLocale = $("en");
  var translations = {};
  var addLang = (obj) => {
    for (const locale of Object.keys(obj)) {
      if (!translations[locale])
        translations[locale] = {};
      Object.assign(translations[locale], obj[locale]);
    }
  };
  var t = (key) => {
    return () => translations[currentLocale()]?.[key] ?? key;
  };

  // src/build_umd.js
  if (typeof window !== "undefined") {
    Object.assign(window, { $, watch, h, Fragment, when, each, router, addLang, t, mount, batch, isArr, isFunc, isObj });
  }
})();
