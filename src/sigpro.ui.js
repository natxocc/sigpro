import { signal, effect, h, mount } from './sigpro.js';

// — helpers que sigpro no exporta —
const isF = v => typeof v === 'function';
const isA = Array.isArray;
const isO = v => v !== null && typeof v === 'object' && !isA(v);
const val = v => (isF(v) ? v() : v);

export const hide = () => document.activeElement?.blur();

export const ui = {
  accordion: (p, c) => h("div", { ...p, class: `collapse ${p.class || ''}` }, [h("input", { type: "radio", name: p.name, checked: p.checked }), c]),
  accordion_title: (p, c) => h("div", { ...p, class: `collapse-title ${p.class || ''}` }, c),
  accordion_content: (p, c) => h("div", { ...p, class: `collapse-content ${p.class || ''}` }, c),
  alert: (p, c) => h("div", { ...p, class: `alert ${p.class || ''}` }, c),

  autocomplete: (p) => {
    const display = signal("");

    const labelOf = (item) => isO(item) ? (item.label ?? item.value) : String(item);
    const valueOf = (item) => isO(item) ? item.value : item;

    const findLabel = (v) => {
      const found = (val(p.items) || []).find(i => valueOf(i) === v);
      return found ? labelOf(found) : (v ?? "");
    };
    display(findLabel(isF(p.value) ? p.value() : p.value));

    const commit = (text) => {
      const items = val(p.items) || [];
      const idx = items.findIndex(i => labelOf(i) === text);
      const value = idx >= 0 ? valueOf(items[idx]) : text;
      if (isF(p.value)) p.value(value); else p.onChange?.(value);
    };

    return ui.combo({ ...p, display, onCommit: commit }, ({ query, close, setValue }) =>
      h("ul", { class: "menu bg-base-100 w-full" }, () => {
        const q = String(val(query)).toLowerCase();
        const list = (val(p.items) || []).filter(i =>
          labelOf(i).toLowerCase().includes(q)
        );
        return list.length
          ? list.map((item) => {
            const label = labelOf(item);
            const value = valueOf(item);
            return h("li", {},
              h("a", {
                onclick: e => {
                  e.preventDefault();
                  setValue(label);
                  if (isF(p.value)) p.value(value); else p.onChange?.(value);
                  close();
                }
              }, label)
            );
          })
          : [h("li", { class: "disabled" }, h("a", {}, "Sin resultados"))];
      })
    );
  },

  avatar: (p, c) => h("div", { ...p, class: `avatar ${p.class || ''}` }, h("div", { class: p.innerClass || '' }, c)),
  avatar_group: (p, c) => h("div", { ...p, class: `avatar-group -space-x-6 ${p.class || ''}` }, c),
  badge: (p, c) => h("span", { ...p, class: `badge ${p.class || ''}` }, c),
  breadcrumbs: (p, c) => h("div", { ...p, class: `breadcrumbs ${p.class || ''}` }, c),
  button: (p, c) => h("button", { ...p, class: `btn ${p.class || ''}` }, c),
  card: (p, c) => h("div", { ...p, class: `card ${p.class || ''}` }, c),
  card_title: (p, c) => h("div", { ...p, class: `card-title ${p.class || ''}` }, c),
  card_body: (p, c) => h("div", { ...p, class: `card-body ${p.class || ''}` }, c),
  card_actions: (p, c) => h("div", { ...p, class: `card-actions ${p.class || ''}` }, c),
  carousel: (p, c) => h("div", { ...p, class: `carousel ${p.class || ''}` }, c),
  carousel_item: (p, c) => h("div", { ...p, class: `carousel-item ${p.class || ''}` }, c),
  chat: (p, c) => h("div", { ...p, class: `chat ${p.class || ''}` }, c),
  chat_image: (p, c) => h("div", { ...p, class: `chat-image avatar ${p.class || ''}` }, c),
  chat_header: (p, c) => h("div", { ...p, class: `chat-header ${p.class || ''}` }, c),
  chat_bubble: (p, c) => h("div", { ...p, class: `chat-bubble ${p.class || ''}` }, c),
  chat_footer: (p, c) => h("div", { ...p, class: `chat-footer ${p.class || ''}` }, c),
  checkbox: (p) => h("input", { ...p, type: "checkbox", class: `checkbox ${p.class || ''}` }),

  colorpicker: (p) => ui.combo({
    ...p, custom: () => h("span", {
      class: "w-4 h-4 rounded border border-base-300",
      style: `background:${val(p.value) || '#000'}`
    })
  }, ({ close, setValue }) =>
    pallete({ ...p, onchange: (c) => { setValue(c); close(); } })
  ),

  combo: (p, c) => {
    const { placeholder = "", class: cls = "" } = p;

    const query = isF(p.display) ? p.display
      : isF(p.value) ? p.value
        : signal(p.value ?? "");
    let inputEl;
    const open = signal(false);

    const commit = () => { p.onCommit?.(val(query)); open(false); };

    return ui.float({ label: p.label }, [
      h("div", { class: () => `dropdown w-full ${cls} ${val(open) ? "dropdown-open" : ""}` }, [
        h("label", { class: "input w-full" }, [
          h("span", { class: p.icon ?? "icon-[lucide--search]" }),
          p.custom ?? null,
          h("input", {
            type: "search",
            placeholder,
            tabindex: "0",
            value: query,
            disabled: p.disabled,
            readonly: p.readonly,
            name: p.name,
            oninput: e => { query(e.target.value); open(true); },
            onfocus: () => open(true),
            onkeydown: e => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              else if (e.key === 'Tab') { commit(); }
              else if (e.key === 'Escape') { open(false); }
            },
            ref: el => inputEl = el
          })
        ]),
        h("div", {
          class: "dropdown-content bg-base-100 rounded-box z-50 max-w-80 shadow-sm",
          onmousedown: e => e.preventDefault()
        }, () => val(open) && typeof c === "function"
          ? c({ query, open, close: () => { open(false); inputEl?.blur(); }, setValue: v => query(v) })
          : null
        )
      ])
    ]);
  },

  datepicker: (p) => {
    const range = isF(p.range) ? p.range() : p.range;

    if (!range) return ui.combo(
      { ...p, value: (isF(p.value) ? p.value() : p.value) || '', readonly: true },
      ({ close, setValue }) => h("div", { class: "w-80" },
        calendar({ ...p, class: "w-full", onChange: v => { setValue(v); close(); if (isF(p.value)) p.value(v); } })
      )
    );

    const v = signal(isF(p.value) ? p.value() : p.value || { start: null, end: null });
    const start = signal((v() || {}).start || '');
    const end = signal((v() || {}).end || '');

    const cal = (key, sig, ph, dis) => ui.combo(
      { value: sig, placeholder: ph, class: "flex-1", disabled: dis, readonly: true },
      ({ close, setValue }) => h("div", { class: "w-72" },
        calendar({
          ...p, class: "w-full", value: v, range: true,
          onChange: r => {
            v(r);
            start(r?.start || '');
            end(r?.end || '');
            setValue(r?.[key] || '');
            if (r?.end) close();
            if (isF(p.value)) p.value(r);
          }
        })
      )
    );

    return h("div", { class: `flex gap-1 ${p.class || ''}` }, [
      cal('start', start, p.fromPlaceholder || "Inicio"),
      cal('end', end, p.toPlaceholder || "Fin", () => !v()?.start)
    ]);
  },

  dialog: (p, c) => {
    const MIN_W = p.minWidth ?? 200;
    const MIN_H = p.minHeight ?? 120;

    const innerW = () => typeof window !== 'undefined' ? window.innerWidth : 1920;
    const innerH = () => typeof window !== 'undefined' ? window.innerHeight : 1080;

    const clamp = (x, y, w, h) => ({
      x: Math.max(0, Math.min(x, innerW() - w)),
      y: Math.max(0, Math.min(y, innerH() - h)),
    });

    // x/y: si no se pasan, se centran tras el primer render.
    // width/height: si no se pasan, null = auto (tamaño del contenido con tope 90vw/90vh).
    const autoX = p.x === undefined;
    const autoY = p.y === undefined;

    const _x = isF(p.x) ? p.x : signal(p.x ?? 0);
    const _y = isF(p.y) ? p.y : signal(p.y ?? 0);
    const _w = isF(p.width) ? p.width : signal(p.width ?? null);
    const _h = isF(p.height) ? p.height : signal(p.height ?? null);
    const show = isF(p.show) ? p.show : signal(p.show || false);

    let containerEl;
    let centered = false;
    const rect = () => containerEl?.getBoundingClientRect() ?? { width: 0, height: 0 };

    const center = () => {
      const r = rect();
      if (!r.width || !r.height) return;
      if (autoX) _x(Math.max(0, (innerW() - r.width) / 2));
      if (autoY) _y(Math.max(0, (innerH() - r.height) / 3));
    };

    // Centrar la primera vez que se muestra
    effect(() => {
      if (!show() || centered) return;
      requestAnimationFrame(() => { center(); centered = true; });
    });

    // Re-clamp al redimensionar la ventana
    effect(() => {
      if (typeof window === 'undefined') return;
      const onResize = () => {
        const r = rect();
        const w = _w() ?? r.width;
        const h = _h() ?? r.height;
        const c2 = clamp(_x(), _y(), w, h);
        _x(c2.x); _y(c2.y);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    });

    const startDrag = (e, mode) => {
      e.preventDefault();

      // Congelar tamaño auto al empezar a redimensionar o mover
      const r0 = rect();
      if (_w() === null) _w(Math.max(MIN_W, r0.width));
      if (_h() === null) _h(Math.max(MIN_H, r0.height));

      const s = { mx: e.clientX, my: e.clientY, x: _x(), y: _y(), w: _w(), h: _h() };

      const onMove = (ev) => {
        const dx = ev.clientX - s.mx;
        const dy = ev.clientY - s.my;

        if (mode === 'move') {
          const c2 = clamp(s.x + dx, s.y + dy, s.w, s.h);
          _x(c2.x); _y(c2.y);
          return;
        }

        let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

        if (mode.includes('e')) nw = s.w + dx;
        if (mode.includes('s')) nh = s.h + dy;
        if (mode.includes('w')) { nw = s.w - dx; nx = s.x + dx; }
        if (mode.includes('n')) { nh = s.h - dy; ny = s.y + dy; }

        if (nw < MIN_W) { if (mode.includes('w')) nx -= (MIN_W - nw); nw = MIN_W; }
        if (nh < MIN_H) { if (mode.includes('n')) ny -= (MIN_H - nh); nh = MIN_H; }

        if (nx < 0) { nw += nx; nx = 0; }
        if (ny < 0) { nh += ny; ny = 0; }
        if (nx + nw > innerW()) nw = innerW() - nx;
        if (ny + nh > innerH()) nh = innerH() - ny;

        _w(nw); _h(nh); _x(nx); _y(ny);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor =
        mode === 'move' ? 'grabbing' :
          mode === 'n' || mode === 's' ? 'ns-resize' :
            mode === 'e' || mode === 'w' ? 'ew-resize' :
              mode === 'ne' || mode === 'sw' ? 'nesw-resize' : 'nwse-resize';
    };

    const H = 6;
    const handles = [
      ['n', { top: `-${H / 2}px`, left: `${H}px`, right: `${H}px`, height: `${H}px`, cursor: 'ns-resize' }],
      ['s', { bottom: `-${H / 2}px`, left: `${H}px`, right: `${H}px`, height: `${H}px`, cursor: 'ns-resize' }],
      ['e', { right: `-${H / 2}px`, top: `${H}px`, bottom: `${H}px`, width: `${H}px`, cursor: 'ew-resize' }],
      ['w', { left: `-${H / 2}px`, top: `${H}px`, bottom: `${H}px`, width: `${H}px`, cursor: 'ew-resize' }],
      ['ne', { right: `-${H / 2}px`, top: `-${H / 2}px`, width: `${H * 2}px`, height: `${H * 2}px`, cursor: 'nesw-resize' }],
      ['nw', { left: `-${H / 2}px`, top: `-${H / 2}px`, width: `${H * 2}px`, height: `${H * 2}px`, cursor: 'nwse-resize' }],
      ['se', { right: `-${H / 2}px`, bottom: `-${H / 2}px`, width: `${H * 2}px`, height: `${H * 2}px`, cursor: 'nwse-resize' }],
      ['sw', { left: `-${H / 2}px`, bottom: `-${H / 2}px`, width: `${H * 2}px`, height: `${H * 2}px`, cursor: 'nesw-resize' }],
    ];

    return h("div", {
      ref: el => containerEl = el,
      class: () => `fixed z-50 transition-opacity duration-300 ${show() ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`,
      style: () => {
        let s = `left: ${_x()}px; top: ${_y()}px;`;
        if (_w() !== null) s += ` width: ${_w()}px;`;
        if (_h() !== null) s += ` height: ${_h()}px;`;
        if (_w() === null) s += ` max-width: 90vw;`;
        if (_h() === null) s += ` max-height: 90vh;`;
        return s;
      }
    }, [
      h("div", { class: `relative bg-base-100 rounded-box shadow-2xl border w-full h-full flex flex-col ${p.class || ''}` }, [
        p.title && h("div", {
          class: "flex justify-between items-center cursor-grab p-2 border-b select-none bg-base-200 rounded-t-box shrink-0",
          onmousedown: e => { if (e.target.closest('button')) return; startDrag(e, 'move'); }
        }, [
          h("span", { class: "font-bold" }, p.title),
          h("button", { class: "btn btn-sm btn-circle btn-ghost", onclick: () => show(false) }, "✕")
        ]),
        h("div", { class: "p-4 flex-1 overflow-auto" }, c),
        p.footer && h("div", { class: "p-2 border-t flex justify-end gap-2 shrink-0" }, p.footer),
        ...handles.map(([mode, style]) =>
          h("div", {
            class: "absolute z-10",
            style: `${Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join('; ')};`,
            onmousedown: e => startDrag(e, mode)
          })
        )
      ])
    ]);
  },

  divider: (p) => h("div", { ...p, class: `divider ${p.class || ''}` }),
  drawer: (p, c) => h("div", { ...p, class: `drawer ${p.class || ''}` }, c),
  drawer_toggle: (p) => h("input", { ...p, type: "checkbox", class: `drawer-toggle ${p.class || ''}` }),
  drawer_content: (p, c) => h("div", { ...p, class: `drawer-content ${p.class || ''}` }, c),
  drawer_side: (p, c) => h("div", { ...p, class: `drawer-side ${p.class || ''}` }, c),
  drawer_overlay: (p) => h("label", { ...p, class: `drawer-overlay ${p.class || ''}` }),
  dropdown: (p, c) => h("div", { ...p, class: `dropdown ${p.class || ''}` }, c),
  dropdown_button: (p, c) => h("div", { ...p, tabindex: "0", role: "button", class: `btn ${p.class || ''}` }, c),
  dropdown_content: (p, c) => h("div", { ...p, tabindex: "0", class: `dropdown-content ${p.class || ''}` }, c),
  fab: (p, c) => h("div", { ...p, class: `fab ${p.class || ''}` }, c),
  fab_button: (p, c) => h("div", { ...p, tabindex: "0", role: "button", class: `btn ${p.class || ''}` }, c),
  fieldset: (p, c) => h("fieldset", { class: `fieldset ${p.class || ''}` }, [h("legend", { class: "fieldset-legend" }, p.label), c]),
  file: (p) => h("input", { ...p, type: "file", class: `file-input ${p.class || ''}` }),
  file_drag: (p, c) => h("label", {
    class: () => `relative flex items-center justify-between h-12 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${p.drag ? 'border-primary bg-primary/10' : 'border-base-content/20 bg-base-100'} ${p.class || ''}`,
    ondragover: (e) => { e.preventDefault(); p.ondrag?.(true); },
    ondragleave: () => p.ondrag?.(false),
    ondrop: (e) => { e.preventDefault(); p.ondrag?.(false); p.ondrop?.(e.dataTransfer.files); }
  }, c),
  file_preview: (p) => h("ul", { class: `mt-2 space-y-1 ${p.class || ''}` },
    (p.files || []).map((f, i) =>
      h("li", { class: "flex items-center justify-between p-1.5 pl-3 text-xs bg-base-200/50 rounded-md border" }, [
        h("div", { class: "flex items-center gap-2 truncate opacity-70" }, [
          h("span", {}, "📄"),
          h("span", { class: "truncate max-w-[180px]" }, f.name),
          h("span", { class: "text-[9px] opacity-50" }, `(${~~(f.size / 1024)}KB)`)
        ]),
        h("button", { class: "btn btn-ghost btn-xs btn-circle", onclick: () => p.onremove?.(i) }, h("span", { class: "icon-[lucide--x]" }))
      ])
    )
  ),
  file_error: (p) => h("div", { class: `text-[10px] text-error mt-1 px-1 ${p.class || ''}` }, p.message),
  float: (p, c) => h("label", { class: "floating-label" }, [h("span", {}, p.label ?? null), c]),
  indicator: (p, c) => h("div", { ...p, class: `indicator ${p.class || ''}` }, [p.value && h("span", { class: `indicator-item badge ${p.badgeClass || ''}` }, p.value), c]),
  input: (p) => ui.float({ label: p.label }, [
    h("label", { class: "input w-full" }, [
      h("span", { class: p.icon ?? '' }),
      h("input", { ...p, class: `w-full ${p.class || ''}` }),
      p.right || null
    ])
  ]),
  kbd: (p, c) => h("kbd", { ...p, class: `kbd ${p.class || ''}` }, c),
  label: (p, c) => h("span", { ...p, class: `label ${p.class || ''}` }, c),
  loading: (p) => h("span", { ...p, class: `loading loading-spinner ${p.class || ''}` }),
  menu: (p, c) => h("ul", { ...p, class: `menu ${p.class || ''}` }, c),
  menu_title: (p, c) => h('li', { ...p, class: "menu-title" }, c),
  menu_item: (p) =>
    p.items
      ? h('li', {}, [h('details', { open: p.open || false }, [h('summary', {}, p.label), h('ul', { class: p.submenuClass || '' }, p.items.map(i => ui.menu_item(i)))])])
      : h('li', {}, p.href || p.onclick
        ? h('a', { ...(p.href ? { href: p.href } : {}), onclick: p.onclick }, p.label)
        : p.label),
  modal: (p, c) => h("dialog", { ...p, class: `modal ${p.class || ''}` }, [c, h("form", { method: "dialog", class: "modal-backdrop" }, h("button", {}, "close"))]),
  modal_box: (p, c) => h("div", { ...p, class: `modal-box ${p.class || ''}` }, [h("form", { method: "dialog" }, h("button", { class: "btn btn-sm btn-circle btn-ghost absolute right-2 top-2" }, "✕")), c]),
  modal_action: (p, c) => h("div", { ...p, class: `modal-action ${p.class || ''}` }, c),
  navbar: (p, c) => h("div", { ...p, class: `navbar ${p.class || ''}` }, c),
  option: (p, c) => h("option", { ...p }, c),

  password: (p) => {
    const show = signal(false);
    const { right, ...rest } = p;
    return ui.input({
      ...rest,
      type: () => val(show) ? "text" : "password",
      icon: "icon-[lucide--lock]",
      right: ui.swap({ value: show, class: "swap-rotate" }, [
        ui.swap_on({}, h("span", { class: "icon-[lucide--eye]" })),
        ui.swap_off({}, h("span", { class: "icon-[lucide--eye-off]" }))
      ])
    });
  },

  progress: (p) => h("progress", { ...p, class: `progress ${p.class || ''}` }),
  radial: (p) => h("div", { ...p, class: `radial-progress ${p.class || ''}`, style: `--value:${val(p.value) ?? 0}`, role: "progressbar" }, p.value ?? ""),
  radio: (p) => h("input", { ...p, type: "radio", class: `radio ${p.class || ''}` }),
  range: (p) => h("input", { ...p, type: "range", class: `range ${p.class || ''}` }),
  rating: (p) => h("div", { class: `rating ${p.class || ''}` },
    [...Array(p.count || 5)].map((_, i) =>
      h("input", {
        class: `mask ${p.mask || 'mask-star'} ${p.itemClass || ''}`,
        name: p.name,
        type: "radio",
        checked: () => val(p.value) === (p.offset ? i + p.offset : i),
        onclick: () => isF(p.value) ? p.value(i) : p.onChange?.(i)
      })
    )
  ),
  search: (p) => ui.input({ ...p, type: "search", icon: p.icon ?? "icon-[lucide--search]" }),
  select: (p, c) => h("select", { ...p, class: `select ${p.class || ''}` }, c),
  stack: (p, c) => h("div", { ...p, class: `stack ${p.class || ''}` }, c),
  stat: (p, c) => h("div", { ...p, class: `stat ${p.class || ''}` }, c),
  stat_figure: (p, c) => h("div", { ...p, class: `stat-figure ${p.class || ''}` }, c),
  stat_title: (p, c) => h("div", { ...p, class: `stat-title ${p.class || ''}` }, c),
  stat_value: (p, c) => h("div", { ...p, class: `stat-value ${p.class || ''}` }, c),
  stat_desc: (p, c) => h("div", { ...p, class: `stat-desc ${p.class || ''}` }, c),
  steps: (p, c) => h("ul", { ...p, class: `steps ${p.class || ''}` }, c),
  step: (p, c) => h("li", { ...p, class: `step ${p.class || ''}`, "data-content": p.dataContent }, c),
  swap: (p, c) => h("label", { class: `swap ${p.class || ''}` }, [h("input", { type: "checkbox", checked: p.value }), ...(isA(c) ? c : [c])]),
  swap_on: (p, c) => h("div", { ...p, class: `swap-on ${p.class || ''}` }, c),
  swap_off: (p, c) => h("div", { ...p, class: `swap-off ${p.class || ''}` }, c),
  table: (p, c) => h("table", { ...p, class: `table ${p.class || ''}` }, c),
  thead: (p, c) => h("thead", { ...p, class: p.class || '' }, c),
  tbody: (p, c) => h("tbody", { ...p, class: p.class || '' }, c),
  tfoot: (p, c) => h("tfoot", { ...p, class: p.class || '' }, c),
  tr: (p, c) => h("tr", { ...p, class: p.class || '' }, c),
  th: (p, c) => h("th", { ...p, class: p.class || '' }, c),
  td: (p, c) => h("td", { ...p, class: p.class || '' }, c),
  tabs: (p, c) => h("div", { ...p, class: `tabs ${p.class || ''}` }, c),
  tab: (p) => {
    const close = (e) => {
      e.stopPropagation();

      const arr = p.tabs?.() || [];
      const next = arr.filter((_, idx) => idx !== p.index);
      p.tabs?.(next);

      const currentActive = val(p.activeIndex);

      if (p.index === currentActive) {
        if (next.length === 0) p.onSelect?.(-1);
        else p.onSelect?.(Math.min(p.index, next.length - 1));
      } else if (p.index < currentActive) {
        p.onSelect?.(currentActive - 1);
      }
    };

    return [
      h('label', { class: () => `tab ${p.class || ''}` }, [
        h('input', {
          type: 'radio',
          name: p.name,
          checked: () => val(p.checked) === true,
          onchange: () => p.onSelect?.(p.index),
        }),
        p.label,
        p.closable ? h('span', {
          class: 'ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content cursor-pointer',
          onclick: close,
        }, h('span', { class: 'icon-[lucide--x] w-3 h-3' })) : null,
      ]),
      h("div", { class: `tab-content bg-base-100 border-base-300 p-6 ${p?.classContent || ''}` }, p.content),
    ];
  },
  textarea: (p) => h("textarea", { ...p, class: `textarea ${p.class || ''}` }),
  textrotate: (p, c) => h("span", { ...p, class: `text-rotate ${p.class || ''}` }, h("span", {}, c)),
  theme: (p) => ui.swap({ class: `text-xl ${p.class || ''}`, value: p.value }, [
    ui.swap_on({}, h("span", { class: "icon-[lucide--moon]" })),
    ui.swap_off({}, h("span", { class: "icon-[lucide--sun]" }))
  ]),
  timeline: (p, c) => h("ul", { ...p, class: `timeline ${p.class || ''}` }, c),
  timeline_start: (p, c) => h("div", { ...p, class: `timeline-start ${p.class || ''}` }, c),
  timeline_middle: (p, c) => h("div", { ...p, class: `timeline-middle ${p.class || ''}` }, c),
  timeline_end: (p, c) => h("div", { ...p, class: `timeline-end ${p.class || ''}` }, c),
  toggle: (p) => h("input", { ...p, type: "checkbox", class: `toggle ${p.class || ''}` }),
  tooltip: (p, c) => h('div', { class: `tooltip ${p.class || ''}`, "data-tip": p.tip }, c),
  validator: (p, c) => h("div", { ...p, class: `validator-hint ${p.class || ''}` }, c),
};

export const calendar = p => {
  let [d, hv, sh, eh] = [signal(new Date()), signal(0), signal(0), signal(0)],
    now = new Date(),
    F = v => v ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : '',
    P = n => (n < 10 ? '0' : '') + n,
    M = (m, y = 0) => d(new Date(d().getFullYear() + y, d().getMonth() + m, 1)),
    V = () => typeof p.value == 'function' ? p.value() : p.value,
    G = () => typeof p.range == 'function' ? p.range() : p.range,
    L = dt => {
      let s = F(dt), v = V(), r = G();
      if (!r) return p.onChange?.(p.hour ? `${s}T${P(sh())}:00:00` : s);
      if (!v?.start || v.end) return p.onChange?.({ start: s, end: null, ...(p.hour && { startHour: sh() }) });
      let nv = s < v.start ? { start: s, end: v.start } : { start: v.start, end: s };
      p.onChange?.({ ...nv, ...(p.hour && { startHour: v.startHour ?? sh(), endHour: eh() }) });
    },
    I = ({ v, on }) => h('div', { class: 'flex-1 flex gap-2 items-center' }, [
      h('input', { type: 'range', min: 0, max: 23, value: v, class: 'range range-xs', oninput: e => on(+e.target.value) }),
      h('span', { class: 'text-sm font-mono' }, () => P(v()) + ':00')
    ]);

  return h('div', { class: `p-4 bg-base-100 rounded-box w-80 select-none ${p.class || ''}` }, [
    h('div', { class: 'flex justify-between items-center mb-4' }, [
      h('div', { class: 'flex gap-1' }, [
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(0, -1) }, h('span', { class: 'icon-[lucide--chevrons-left]' })),
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(-1, 0) }, h('span', { class: 'icon-[lucide--chevron-left]' }))
      ]),
      h('span', { class: 'font-bold uppercase' }, () => d().toLocaleString('es', { month: 'short', year: 'numeric' })),
      h('div', { class: 'flex gap-1' }, [
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(1, 0) }, h('span', { class: 'icon-[lucide--chevron-right]' })),
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(0, 1) }, h('span', { class: 'icon-[lucide--chevrons-right]' }))
      ])
    ]),
    h('div', { class: 'grid grid-cols-7 gap-1', onmouseleave: () => hv(null) }, [
      ...'LMXJVSD'.split('').map(l => h('div', { class: 'text-[10px] opacity-40 font-bold text-center' }, l)),
      () => {
        let y = d().getFullYear(), m = d().getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7;
        return [...Array(first).fill(h('div')), ...Array(new Date(y, m + 1, 0).getDate()).keys()].map(i => {
          if (typeof i != 'number') return i;
          let day = i + 1, ds = F(new Date(y, m, day)), today = F(now) == ds;
          return h('button', {
            type: 'button',
            onclick: () => L(new Date(y, m, day)),
            onmouseenter: () => G() && hv(ds),
            class: () => {
              let v = V(), hov = hv(), s = v?.start || (typeof v == 'string' ? v.slice(0, 10) : 0),
                isE = v?.end == ds, isS = s == ds,
                inR = G() && v?.start && (v.end ? (ds > v.start && ds < v.end) : (hov && ((ds > s && ds <= hov) || (ds < s && ds >= hov))));
              return `btn btn-xs p-0 aspect-square min-h-0 h-auto font-normal relative ${isS || isE ? 'btn-primary z-10' : inR ? 'bg-primary/20 border-none rounded-none' : 'btn-ghost'} ${today ? 'ring-1 ring-primary font-black' : ''}`;
            }
          }, day);
        });
      }
    ]),
    p.hour && h('div', { class: 'mt-3 pt-2 border-t flex gap-4' }, G() ? [I({ v: sh, on: sh }), I({ v: eh, on: eh })] : [I({ v: sh, on: sh })])
  ]);
};

export const pallete = p => {
  let L = s => (s || '').toLowerCase(),
    C = ['#000', '#1A1A1A', '#333', '#4D4D4D', '#666', '#808080', '#B3B3B3', '#FFF', '#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#431407', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#ffedd5', '#713f12', '#a16207', '#ca8a04', '#eab308', '#facc15', '#fde047', '#fef08a', '#fff9c4', '#064e3b', '#065f46', '#059669', '#10b981', '#34d399', '#4ade80', '#84cc16', '#d9f99d', '#082f49', '#075985', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#22d3ee', '#cffafe', '#1e1b4b', '#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff', '#2e1065', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a855f7', '#d946ef', '#fae8ff'];

  return h('div', { class: `p-3 bg-base-100 rounded-box shadow w-64 ${p.class || ''}` },
    h('div', { class: 'grid grid-cols-8 gap-1' },
      C.map(c => h('button', {
        type: 'button',
        style: `background:${c}`,
        onclick: () => (isF(p.value) ? p.value(c) : p.onchange?.(c), hide()),
        class: () => `size-6 rounded-sm transition-all hover:scale-125 hover:z-10 active:scale-95 border border-black/5 p-0 min-h-0 ${L(val(p.value)) == L(c) ? 'ring-2 ring-offset-1 ring-primary z-10 scale-110' : ''}`
      }))
    )
  );
};

export const toast = (m, t = "alert-success", d = 3500) => {
  let C = document.getElementById("stc"), T, E, w = h("div", { style: "display:contents" });
  if (!C) document.body.append(C = h("div", { id: "stc", class: "fixed top-0 right-0 z-[9999] p-4 flex flex-col items-end gap-2 pointer-events-none" }));
  C.append(w);

  let stop;
  stop = mount(() => {
    const v = signal(0);
    const l = signal(0);
    E = () => l() || (l(1), clearTimeout(T), setTimeout(() => (stop(), w.remove(), C.firstChild || C.remove()), 300));
    setTimeout(() => v(1));
    return h("div", {
      class: () => `alert alert-soft ${t} shadow-lg transition-all duration-300 inline-flex w-auto pointer-events-auto ${l() ? 'translate-x-full opacity-0' : v() ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`
    }, [
      typeof m == 'function' ? m() : typeof m == 'string' ? h("span", m) : m,
      h("button", { class: "btn btn-xs btn-circle btn-ghost", onclick: E }, h("span", { class: "icon-[lucide--x]" }))
    ]);
  }, w);

  if (d > 0) T = setTimeout(E, d);
  return E;
};