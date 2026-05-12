const { $, h, mount, val, isF, isO } = window.SigPro;

export const hide = () => document.activeElement?.blur();

export const ui = {
  _label: (p, c) => h("label", { class: "floating-label" }, [h("span", {}, p.label ?? null), c]),
  accordion: (p, c) => h("div", { ...p, class: `collapse ${p.class || ''}` }, [h("input", { type: "radio", name: p.name, checked: p.checked }), c]),
  accordionTitle: (p, c) => h("div", { ...p, class: `collapse-title ${p.class || ''}` }, c),
  accordionContent: (p, c) => h("div", { ...p, class: `collapse-content ${p.class || ''}` }, c),
  alert: (p, c) => h("div", { ...p, class: `alert ${p.class || ''}` }, c),
  autocomplete: (p) => ui.combo(p, ({ query, close, setValue }) =>
    h("ul", { class: "menu bg-base-100 w-full" }, () => {
      const q = String(val(query)).toLowerCase();
      const list = (val(p.items) || []).filter(i =>
        (isO(i) ? (i.label ?? i.value) : String(i)).toLowerCase().includes(q)
      );
      return list.length
        ? list.map((item, idx) =>
          h("li", { key: item.value ?? idx },
            h("a", {
              onclick: e => {
                e.preventDefault();
                const v = item?.value ?? item;
                setValue(isO(item) ? (item.label ?? item.value) : String(item));
                if (isF(p.value)) p.value(v); else p.onChange?.(v);
                close();
              }
            }, isO(item) ? (item.label ?? item.value) : item)
          )
        )
        : [h("li", { class: "disabled" }, h("a", {}, "Sin resultados"))];
    })
  ),
  avatar: (p, c) => h("div", { ...p, class: `avatar ${p.class || ''}` }, h("div", { class: p.innerClass || '' }, c)),
  avatarGroup: (p, c) => h("div", { ...p, class: `avatar-group -space-x-6 ${p.class || ''}` }, c),
  badge: (p, c) => h("span", { ...p, class: `badge ${p.class || ''}` }, c),
  breadcrumbs: (p, c) => h("div", { ...p, class: `breadcrumbs ${p.class || ''}` }, c),
  button: (p, c) => h("button", { ...p, class: `btn ${p.class || ''}` }, c),
  card: (p, c) => h("div", { ...p, class: `card ${p.class || ''}` }, c),
  cardTitle: (p, c) => h("div", { ...p, class: `card-title ${p.class || ''}` }, c),
  cardBody: (p, c) => h("div", { ...p, class: `card-body ${p.class || ''}` }, c),
  cardActions: (p, c) => h("div", { ...p, class: `card-actions ${p.class || ''}` }, c),
  carousel: (p, c) => h("div", { ...p, class: `carousel ${p.class || ''}` }, c),
  carouselItem: (p, c) => h("div", { ...p, class: `carousel-item ${p.class || ''}` }, c),
  chat: (p, c) => h("div", { ...p, class: `chat ${p.class || ''}` }, c),
  chatImage: (p, c) => h("div", { ...p, class: `chat-image avatar ${p.class || ''}` }, c),
  chatHeader: (p, c) => h("div", { ...p, class: `chat-header ${p.class || ''}` }, c),
  chatBubble: (p, c) => h("div", { ...p, class: `chat-bubble ${p.class || ''}` }, c),
  chatFooter: (p, c) => h("div", { ...p, class: `chat-footer ${p.class || ''}` }, c),
  checkbox: (p) => h("input", { ...p, type: "checkbox", class: `checkbox ${p.class || ''}` }),
  colorpicker: (p) => ui.combo({ ...p, style: ()=>`background:${val(p.value) || '#000'}`, custom: () => h("span", {
      class: "w-4 h-4 rounded border border-base-300",
      style: `background:${val(p.value) || '#000'}`
    })
  }, ({ close, setValue }) =>
    pallete({ ...p, onchange: (c) => { setValue(c); close(); } })
  ),
  combo: (p, c) => {
    const { placeholder = "", class: cls = "" } = p;
    const query = $("");
    let inputEl, open = $(false);

    return ui._label({ label: p.label }, [
      h("div", { class: `dropdown ${cls} ${val(open) ? "dropdown-open" : ""}` }, [
        h("label", { class: "input" }, [
          h("span", { class: p.icon ?? "icon-[lucide--search]" }),
          p.custom ?? null,
          h("input", {
            type: "search", placeholder, tabindex: "0",
            value: query,
            onfocus: () => open(true),
            ref: el => inputEl = el
          })
        ]),
        h("div", {
          class: "dropdown-content bg-base-100 rounded-box z-50 w-full p-2 shadow-sm",
          onmousedown: e => e.preventDefault()
        }, () => val(open) && typeof c === "function"
          ? c({ query, open, close: () => { open(false); inputEl?.blur(); }, setValue: v => query(v) })
          : null
        )
      ])
    ]);
  },
  datepicker: (p) => ui.combo(p, ({ close, setValue }) => {
    const range = p.range;
    return h("div", { class: "w-80" }, [
      calendar({
        ...p,
        class: "w-full",
        onChange: (v) => {
          if (isF(p.value)) p.value(v);
          if (!range) { setValue(v); close(); }
          else if (v.start && v.end) { setValue(`${v.start} → ${v.end}`); close(); }
          else if (v.start) setValue(`${v.start} → ...`);
        }
      })
    ]);
  }),
  divider: (p) => h("div", { ...p, class: `divider ${p.class || ''}` }),
  drawer: (p, c) => h("div", { ...p, class: `drawer ${p.class || ''}` }, c),
  drawerToggle: (p) => h("input", { ...p, type: "checkbox", class: `drawer-toggle ${p.class || ''}` }),
  drawerContent: (p, c) => h("div", { ...p, class: `drawer-content ${p.class || ''}` }, c),
  drawerSide: (p, c) => h("div", { ...p, class: `drawer-side ${p.class || ''}` }, c),
  drawerOverlay: (p) => h("label", { ...p, class: `drawer-overlay ${p.class || ''}` }),
  dropdown: (p, c) => h("div", { ...p, class: `dropdown ${p.class || ''}` }, c),
  dropdownButton: (p, c) => h("div", { ...p, tabindex: "0", role: "button", class: `btn ${p.class || ''}` }, c),
  dropdownContent: (p, c) => h("div", { ...p, tabindex: "0", class: `dropdown-content ${p.class || ''}` }, c),
  fab: (p, c) => h("div", { ...p, class: `fab ${p.class || ''}` }, c),
  fabButton: (p, c) => h("div", { ...p, tabindex: "0", role: "button", class: `btn ${p.class || ''}` }, c),
  fieldset: (p, c) => h("fieldset", { class: `fieldset ${p.class || ''}` }, [h("legend", { class: "fieldset-legend" }, p.label), c]),
  fileInput: (p) => h("input", { ...p, type: "file", class: `file-input ${p.class || ''}` }),
  fileDrag: (p, c) => h("label", {
    class: () => `relative flex items-center justify-between h-12 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${p.drag ? 'border-primary bg-primary/10' : 'border-base-content/20 bg-base-100'} ${p.class || ''}`,
    ondragover: (e) => { e.preventDefault(); p.ondrag?.(true); },
    ondragleave: () => p.ondrag?.(false),
    ondrop: (e) => { e.preventDefault(); p.ondrag?.(false); p.ondrop?.(e.dataTransfer.files); }
  }, c),
  filePreview: (p) => h("ul", { class: `mt-2 space-y-1 ${p.class || ''}` },
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
  fileError: (p) => h("div", { class: `text-[10px] text-error mt-1 px-1 ${p.class || ''}` }, p.message),
  icon: (p) => h("span", { class: p || '' }),
  indicator: (p, c) => h("div", { ...p, class: `indicator ${p.class || ''}` }, [p.value && h("span", { class: `indicator-item badge ${p.badgeClass || ''}` }, p.value), c]),
  input: (p) => h("input", { ...p, class: `input ${p.class || ''}` }),
  inputPass: (p) => {
    const show = $(false);
    return [
      ui.input({ ...p, type: () => val(show) ? "text" : "password" }),
      ui.swap({ class: "ml-2 swap-rotate" }, [
        ui.checkbox({ checked: show }),
        ui.swapOn({}, ui.icon("icon-[lucide--eye]")),
        ui.swapOff({}, ui.icon("icon-[lucide--eye-off]"))
      ])
    ];
  },
  kbd: (p, c) => h("kbd", { ...p, class: `kbd ${p.class || ''}` }, c),
  label: (p, c) => h("span", { ...p, class: `label ${p.class || ''}` }, c),
  loading: (p) => h("span", { ...p, class: `loading loading-spinner ${p.class || ''}` }),
  menu: (p, c) => h("ul", { ...p, class: `menu ${p.class || ''}` }, c),
  menuItems: (p) => (p.items || []).map((i) => {
    if (i.items) {
      return h('li', {}, [
        h('details', { open: i.open || false }, [
          h('summary', {}, i.label),
          h('ul', { class: i.submenuClass || '' }, menuItems({ items: i.items }))
        ])
      ]);
    }
    return h('li', {}, i.href ? h('a', { href: i.href }, i.label) : i.label);
  }),
  modal: (p, c) => h("dialog", { ...p, class: `modal ${p.class || ''}` }, [c, h("form", { method: "dialog", class: "modal-backdrop" }, h("button", {}, "close"))]),
  modalBox: (p, c) => h("div", { ...p, class: `modal-box ${p.class || ''}` }, [h("form", { method: "dialog" }, h("button", { class: "btn btn-sm btn-circle btn-ghost absolute right-2 top-2" }, "✕")), c]),
  modalAction: (p, c) => h("div", { ...p, class: `modal-action ${p.class || ''}` }, c),
  navbar: (p, c) => h("div", { ...p, class: `navbar ${p.class || ''}` }, c),
  option: (p, c) => h("option", { ...p }, c),
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
  search: (p) => ui.text({ ...p, type: "search", icon: p.icon ?? "icon-[lucide--search]" }),
  select: (p, c) => h("select", { ...p, class: `select ${p.class || ''}` }, c),
  stack: (p, c) => h("div", { ...p, class: `stack ${p.class || ''}` }, c),
  stat: (p, c) => h("div", { ...p, class: `stat ${p.class || ''}` }, c),
  statFigure: (p, c) => h("div", { ...p, class: `stat-figure ${p.class || ''}` }, c),
  statTitle: (p, c) => h("div", { ...p, class: `stat-title ${p.class || ''}` }, c),
  statValue: (p, c) => h("div", { ...p, class: `stat-value ${p.class || ''}` }, c),
  statDesc: (p, c) => h("div", { ...p, class: `stat-desc ${p.class || ''}` }, c),
  steps: (p, c) => h("ul", { ...p, class: `steps ${p.class || ''}` }, c),
  step: (p, c) => h("li", { ...p, class: `step ${p.class || ''}`, "data-content": p.dataContent }, c),
  swap: (p, c) => h("label", { ...p, class: `swap ${p.class || ''}` }, c),
  swapOn: (p, c) => h("div", { ...p, class: `swap-on ${p.class || ''}` }, c),
  swapOff: (p, c) => h("div", { ...p, class: `swap-off ${p.class || ''}` }, c),
  table: (p, c) => h("table", { ...p, class: `table ${p.class || ''}` }, c),
  tableHead: (p, c) => h("thead", { ...p, class: p.class || '' }, c),
  tableBody: (p, c) => h("tbody", { ...p, class: p.class || '' }, c),
  tableFoot: (p, c) => h("tfoot", { ...p, class: p.class || '' }, c),
  tableRow: (p, c) => h("tr", { ...p, class: p.class || '' }, c),
  tableTh: (p, c) => h("th", { ...p, class: p.class || '' }, c),
  tableTd: (p, c) => h("td", { ...p, class: p.class || '' }, c),
  tabs: (p) => h("div", { style: "display:contents" },
    h("div", { class: `tabs ${p.class || ''}` },
      (p.items || []).map((item, i) => [
        h("input", {
          type: "radio",
          name: p.name,
          class: `tab ${item.class || ''}`,
          "aria-label": item.label,
          checked: () => val(p.value) === i,
          onclick: () => isF(p.value) ? p.value(i) : p.onChange?.(i)
        }),
        item.closable && h("span", {
          class: "cursor-pointer text-xs",
          onclick: (e) => { e.stopPropagation(); isF(p.items) && p.items(p.items().filter((_, idx) => idx !== i)); }
        }, " ✕")
      ])
    ),
    h("div", { class: `tab-content ${p.contentClass || ''}` }, p.items[val(p.value)]?.content)
  ),
  textarea: (p) => h("textarea", { ...p, class: `textarea ${p.class || ''}` }),
  textrotate: (p, c) => h("span", { ...p, class: `text-rotate ${p.class || ''}` }, h("span", {}, c)),
  theme: (p) => ui.toggle({ value: p?.value || "spdark", class: "theme-controller" }),
  timeline: (p, c) => h("ul", { ...p, class: `timeline ${p.class || ''}` }, c),
  timelineStart: (p, c) => h("div", { ...p, class: `timeline-start ${p.class || ''}` }, c),
  timelineMiddle: (p, c) => h("div", { ...p, class: `timeline-middle ${p.class || ''}` }, c),
  timelineEnd: (p, c) => h("div", { ...p, class: `timeline-end ${p.class || ''}` }, c),
  toggle: (p) => h("input", { ...p, type: "checkbox", class: `toggle ${p.class || ''}` }),
  tooltip: (p, c) => h('div', { class: `tooltip ${p.class || ''}`, "data-tip": p.tip }, c),
  validator: (p, c) => h("div", { ...p, class: `validator-hint ${p.class || ''}` }, c),
};

export const calendar = p => {
  let [d, hv, sh, eh] = [$(new Date()), $(0), $(0), $(0)], now = new Date(),
    F = v => v?.toISOString().slice(0, 10),
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

  return h('div', { class: `p-4 bg-base-100 border shadow-2xl rounded-box w-80 select-none ${p.class || ''}` }, [
    h('div', { class: 'flex justify-between items-center mb-4' }, [
      h('div', { class: 'flex' }, [['-1y', -1, 1], ['-1m', -1, 0]].map(([_, m, y]) => h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(m, y) }, h('span', { class: `icon-[lucide--chevron${y ? 's' : ''}-left]` })))),
      h('span', { class: 'font-bold uppercase' }, () => d().toLocaleString('es', { month: 'short', year: 'numeric' })),
      h('div', { class: 'flex' }, [[1, 0], [1, 1]].map(([m, y]) => h('button', { class: 'btn btn-ghost btn-xs', onclick: () => M(m, y) }, h('span', { class: `icon-[lucide--chevron${y ? 's' : ''}-right]` }))))
    ]),
    h('div', { class: 'grid grid-cols-7 gap-1', onmouseleave: () => hv(null) }, [
      ...'LMXJVSD'.split('').map(l => h('div', { class: 'text-[10px] opacity-40 font-bold text-center' }, l)),
      () => {
        let y = d().getFullYear(), m = d().getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7;
        return [...Array(first).fill(h('div')), ...Array(new Date(y, m + 1, 0).getDate()).keys()].map(i => {
          if (typeof i != 'number') return i;
          let day = i + 1, ds = F(new Date(y, m, day)), today = F(now) == ds;
          return h('button', {
            type: 'button', onclick: () => L(new Date(y, m, day)), onmouseenter: () => G() && hv(ds),
            class: () => {
              let v = V(), hov = hv(), s = v?.start || (typeof v == 'string' ? v.slice(0, 10) : 0),
                isE = v?.end == ds, isS = s == ds,
                inR = G() && v?.start && (v.end ? (ds > v.start && ds < v.end) : (hov && ((ds > s && ds <= hov) || (ds < s && ds >= hov))));
              return `btn btn-xs p-0 aspect-square min-h-0 h-auto font-normal relative ${isS || isE ? 'btn-primary z-10' : inR ? 'bg-primary/20 border-none rounded-none' : 'btn-ghost'} ${today ? 'ring-1 ring-primary font-black' : ''}`
            }
          }, day)
        })
      }
    ]),
    p.hour && h('div', { class: 'mt-3 pt-2 border-t flex gap-4' }, G() ? [I({ v: sh, on: sh }), I({ v: eh, on: eh })] : [I({ v: sh, on: sh })])
  ])
}

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

  const i = mount(() => {
    let v = $(0), l = $(0);
    E = () => l() || (l(1), clearTimeout(T), setTimeout(() => (i.destroy(), w.remove(), C.firstChild || C.remove()), 300));
    setTimeout(() => v(1));
    return h("div", {
      class: () => `alert alert-soft ${t} shadow-lg transition-all duration-300 inline-flex w-auto pointer-events-auto ${l() ? 'translate-x-full opacity-0' : v() ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`
    }, [
      typeof m == 'function' ? m() : typeof m == 'string' ? h("span", m) : m,
      h("button", { class: "btn btn-xs btn-circle btn-ghost", onclick: E }, h("span", { class: "icon-[lucide--x]" }))
    ])
  }, w);

  if (d > 0) T = setTimeout(E, d);
  return E;
};

window.ui = ui;
window.toast = toast;
window.calendar = calendar;
window.pallete = pallete