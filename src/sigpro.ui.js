// src/sigpro.ui.js
import { signal, effect, h, mount } from './sigpro.js';

// ── Exports (alphabetical) ─────────────────────────────────────
export const Accordion = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `collapse ${cls}` }, [h("input", { type: "radio", name: rest.name, checked: rest.checked }), children]);
export const AccordionContent = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `collapse-content ${cls}` }, children);
export const AccordionTitle = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `collapse-title ${cls}` }, children);
export const Alert = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `alert ${cls}` }, children);
export const Autocomplete = props => {
  const display = signal("");
  const highlighted = signal(-1);

  const labelOf = item => isO(item) ? (item.label ?? item.value) : String(item);
  const valueOf = item => isO(item) ? item.value : item;

  const getMatches = query => {
    const search = String(val(query)).toLowerCase();
    return (val(props.items) || []).filter(item => labelOf(item).toLowerCase().includes(search));
  };

  const findLabel = value => {
    const found = (val(props.items) || []).find(item => valueOf(item) === value);
    return found ? labelOf(found) : (value ?? "");
  };
  display(findLabel(isF(props.value) ? props.value() : props.value));

  const selectItem = item => {
    const value = valueOf(item);
    display(labelOf(item));
    if (isF(props.value)) props.value(value); else props.onChange?.(value);
  };

  const commit = text => {
    const items = val(props.items) || [];
    const index = items.findIndex(item => labelOf(item) === text);
    const value = index >= 0 ? valueOf(items[index]) : text;
    if (isF(props.value)) props.value(value); else props.onChange?.(value);
  };

  return combo(
    {
      ...props,
      display,
      onCommit: commit,
      onKeyDown: event => {
        const matches = getMatches(display);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          highlighted(Math.min(highlighted() + 1, matches.length - 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          highlighted(Math.max(highlighted() - 1, 0));
          return true;
        }
        if (event.key === 'Enter' && highlighted() >= 0 && matches[highlighted()]) {
          event.preventDefault();
          selectItem(matches[highlighted()]);
          highlighted(-1);
          return true;
        }
        if (event.key === 'Escape') highlighted(-1);
        return false;
      },
    },
    ({ query, close, setValue }) =>
      h("ul", { class: "menu bg-base-100 w-full" }, () => {
        const matches = getMatches(query);
        if (!matches.length) return [h("li", { class: "disabled" }, h("a", {}, "Sin resultados"))];
        return matches.map((item, index) => {
          const label = labelOf(item);
          const value = valueOf(item);
          return h("li", {},
            h("a", {
              class: () => index === highlighted() ? 'active' : '',
              onclick: event => {
                event.preventDefault();
                setValue(label);
                if (isF(props.value)) props.value(value); else props.onChange?.(value);
                highlighted(-1);
                close();
              },
            }, label)
          );
        });
      })
  );
};
export const Avatar = ({ class: cls = '', innerClass = '', ...rest }, children) => h("div", { ...rest, class: `avatar ${cls}` }, h("div", { class: innerClass }, children));
export const AvatarGroup = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `avatar-group -space-x-6 ${cls}` }, children);
export const Badge = ({ class: cls = '', ...rest }, children) => h("span", { ...rest, class: `badge ${cls}` }, children);
export const Blur = () => document.activeElement?.blur();
export const Breadcrumbs = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `breadcrumbs ${cls}` }, children);
export const Button = ({ class: cls = '', ...rest }, children) => h("button", { ...rest, class: `btn ${cls}` }, children);
export const Calendar = props => {
  const locale = props.locale ?? 'es';
  let [viewDate, hoverDate, startHour, endHour] = [signal(new Date()), signal(0), signal(0), signal(0)],
    now = new Date(),
    formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '',
    pad = n => (n < 10 ? '0' : '') + n,
    shiftMonth = (m, y = 0) => viewDate(new Date(viewDate().getFullYear() + y, viewDate().getMonth() + m, 1)),
    getValue = () => typeof props.value == 'function' ? props.value() : props.value,
    isRange = () => typeof props.range == 'function' ? props.range() : props.range,
    selectDate = date => {
      let dateStr = formatDate(date), value = getValue(), range = isRange();
      if (!range) return props.onChange?.(props.hour ? `${dateStr}T${pad(startHour())}:00:00` : dateStr);
      if (!value?.start || value.end) return props.onChange?.({ start: dateStr, end: null, ...(props.hour && { startHour: startHour() }) });
      let nextValue = dateStr < value.start ? { start: dateStr, end: value.start } : { start: value.start, end: dateStr };
      props.onChange?.({ ...nextValue, ...(props.hour && { startHour: value.startHour ?? startHour(), endHour: endHour() }) });
    },
    HourSlider = ({ value, on }) => h('div', { class: 'flex-1 flex gap-2 items-center' }, [
      h('input', { type: 'range', min: 0, max: 23, value, class: 'range range-xs', oninput: e => on(+e.target.value) }),
      h('span', { class: 'text-sm font-mono' }, () => pad(value()) + ':00')
    ]);

  return h('div', { class: `p-4 bg-base-100 rounded-box w-80 select-none ${props.class || ''}` }, [
    h('div', { class: 'flex justify-between items-center mb-4' }, [
      h('div', { class: 'flex gap-1' }, [
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => shiftMonth(0, -1) }, Icon({ name: 'chevrons-left' })),
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => shiftMonth(-1, 0) }, Icon({ name: 'chevron-left' }))
      ]),
      h('span', { class: 'font-bold uppercase' }, () => viewDate().toLocaleString(locale, { month: 'short', year: 'numeric' })),
      h('div', { class: 'flex gap-1' }, [
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => shiftMonth(1, 0) }, Icon({ name: 'chevron-right' })),
        h('button', { class: 'btn btn-ghost btn-xs', onclick: () => shiftMonth(0, 1) }, Icon({ name: 'chevrons-right' }))
      ])
    ]),
    h('div', { class: 'grid grid-cols-7 gap-1', onmouseleave: () => hoverDate(null) }, [
      ...'LMXJVSD'.split('').map(label => h('div', { class: 'text-[10px] opacity-40 font-bold text-center' }, label)),
      () => {
        let year = viewDate().getFullYear(), month = viewDate().getMonth(), firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
        return [...Array(firstWeekday).fill(h('div')), ...Array(new Date(year, month + 1, 0).getDate()).keys()].map(i => {
          if (typeof i != 'number') return i;
          let day = i + 1, dateStr = formatDate(new Date(year, month, day)), isToday = formatDate(now) == dateStr;
          return h('button', {
            type: 'button',
            onclick: () => selectDate(new Date(year, month, day)),
            onmouseenter: () => isRange() && hoverDate(dateStr),
            class: () => {
              let value = getValue(), hovered = hoverDate(), start = value?.start || (typeof value == 'string' ? value.slice(0, 10) : 0),
                isEnd = value?.end == dateStr, isStart = start == dateStr,
                inRange = isRange() && value?.start && (value.end ? (dateStr > value.start && dateStr < value.end) : (hovered && ((dateStr > start && dateStr <= hovered) || (dateStr < start && dateStr >= hovered))));
              return `btn btn-xs p-0 aspect-square min-h-0 h-auto font-normal relative ${isStart || isEnd ? 'btn-primary z-10' : inRange ? 'bg-primary/20 border-none rounded-none' : 'btn-ghost'} ${isToday ? 'ring-1 ring-primary font-black' : ''}`;
            }
          }, day);
        });
      }
    ]),
    props.hour && h('div', { class: 'mt-3 pt-2 border-t flex gap-4' }, isRange() ? [HourSlider({ value: startHour, on: startHour }), HourSlider({ value: endHour, on: endHour })] : [HourSlider({ value: startHour, on: startHour })])
  ]);
};
export const Card = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `card ${cls}` }, children);
export const CardActions = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `card-actions ${cls}` }, children);
export const CardBody = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `card-body ${cls}` }, children);
export const CardTitle = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `card-title ${cls}` }, children);
export const Carousel = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `carousel ${cls}` }, children);
export const CarouselItem = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `carousel-item ${cls}` }, children);
export const Chat = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `chat ${cls}` }, children);
export const ChatBubble = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `chat-bubble ${cls}` }, children);
export const ChatFooter = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `chat-footer ${cls}` }, children);
export const ChatHeader = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `chat-header ${cls}` }, children);
export const ChatImage = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `chat-image avatar ${cls}` }, children);
export const Checkbox = ({ class: cls = '', ...rest }) => h("input", { ...rest, type: "checkbox", class: `checkbox ${cls}` });
export const Colorpicker = props => combo(
  {
    ...props,
    custom: () => h("span", {
      class: "w-4 h-4 rounded border border-base-300",
      style: `background:${val(props.value) || '#000'}`
    })
  },
  ({ close, setValue }) =>
    Pallete({ ...props, onchange: color => { setValue(color); close(); } })
);
export const Datepicker = props => {
  const range = isF(props.range) ? props.range() : props.range;

  if (!range) return combo(
    { ...props, value: (isF(props.value) ? props.value() : props.value) || '', readonly: true },
    ({ close, setValue }) => h("div", { class: "w-80" },
      Calendar({ ...props, class: "w-full", onChange: v => { setValue(v); close(); if (isF(props.value)) props.value(v); } })
    )
  );

  const value = signal(isF(props.value) ? props.value() : props.value || { start: null, end: null });
  const start = signal((value() || {}).start || '');
  const end = signal((value() || {}).end || '');

  const buildCombo = (key, sig, placeholder, disabled) => combo(
    { value: sig, placeholder, class: "flex-1", disabled, readonly: true },
    ({ close, setValue }) => h("div", { class: "w-72" },
      Calendar({
        ...props, class: "w-full", value, range: true,
        onChange: r => {
          value(r);
          start(r?.start || '');
          end(r?.end || '');
          setValue(r?.[key] || '');
          if (r?.end) close();
          if (isF(props.value)) props.value(r);
        }
      })
    )
  );

  return h("div", { class: `flex gap-1 ${props.class || ''}` }, [
    buildCombo('start', start, props.fromPlaceholder || "Inicio"),
    buildCombo('end', end, props.toPlaceholder || "Fin", () => !value()?.start)
  ]);
};
export const Divider = ({ class: cls = '', ...rest }) => h("div", { ...rest, class: `divider ${cls}` });
export const Drawer = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `drawer ${cls}` }, children);
export const DrawerContent = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `drawer-content ${cls}` }, children);
export const DrawerOverlay = ({ class: cls = '', ...rest }) => h("label", { ...rest, class: `drawer-overlay ${cls}` });
export const DrawerSide = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `drawer-side ${cls}` }, children);
export const DrawerToggle = ({ class: cls = '', ...rest }) => h("input", { ...rest, type: "checkbox", class: `drawer-toggle ${cls}` });
export const Dropdown = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `dropdown ${cls}` }, children);
export const DropdownButton = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, tabindex: "0", role: "button", class: `btn ${cls}` }, children);
export const DropdownContent = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, tabindex: "0", class: `dropdown-content ${cls}` }, children);
export const Fab = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `fab ${cls}` }, children);
export const FabButton = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, tabindex: "0", role: "button", class: `btn ${cls}` }, children);
export const Field = ({ label, error, class: cls = '', ...rest }, content) =>
  h("div", { class: `flex flex-col gap-1 w-full ${cls}` }, [
    label != null && h("span", { class: "label" }, label),
    content ?? inputBase(rest),
    error && h("span", { class: "text-error text-[10px] px-1" }, error),
  ]);
export const Fieldset = ({ label, class: cls = '', ...rest }, children) =>
  h("fieldset", { ...rest, class: `fieldset ${cls}` }, [
    label != null && h("legend", { class: "fieldset-legend" }, label),
    children,
  ]);
export const FileInput = props => {
  const {
    accept,
    multiple = false,
    maxSize,
    placeholder = "Arrastra archivos o haz clic",
    onchange,
    class: cls = "",
    preview = true,
  } = props;

  const files = signal([]);
  const dragging = signal(false);
  const error = signal("");

  const validate = list => {
    if (!maxSize) return "";
    const bad = list.find(f => f.size > maxSize);
    return bad ? `"${bad.name}" supera ${~~(maxSize / 1024)}KB` : "";
  };

  const apply = list => {
    const arr = Array.from(list);
    const err = validate(arr);
    error(err);
    if (err) return;
    files(arr);
    onchange?.(arr);
  };

  const removeAt = index => {
    const next = files().filter((_, i) => i !== index);
    files(next);
    onchange?.(next);
  };

  return h("div", { class: cls }, [
    h("label", {
      class: () => `flex items-center justify-between h-12 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${dragging() ? 'border-primary bg-primary/10' : 'border-base-content/20 bg-base-100'}`,
      ondragover: event => { event.preventDefault(); dragging(true); },
      ondragleave: () => dragging(false),
      ondrop: event => { event.preventDefault(); dragging(false); apply(event.dataTransfer.files); },
    }, [
      h("span", { class: "opacity-70" }, placeholder),
      h("input", {
        type: "file",
        accept,
        multiple,
        class: "hidden",
        onchange: event => apply(event.target.files),
      }),
    ]),
    preview && h("div", {}, () => {
      const list = files();
      if (!list.length) return null;
      return h("ul", { class: "mt-2 space-y-1" },
        list.map((file, index) =>
          h("li", { class: "flex items-center justify-between p-1.5 pl-3 text-xs bg-base-200/50 rounded-md border" }, [
            h("div", { class: "flex items-center gap-2 truncate opacity-70" }, [
              h("span", {}, "📄"),
              h("span", { class: "truncate max-w-[180px]" }, file.name),
              h("span", { class: "text-[9px] opacity-50" }, `(${~~(file.size / 1024)}KB)`),
            ]),
            h("button", {
              class: "btn btn-ghost btn-xs btn-circle",
              onclick: () => removeAt(index),
            }, Icon({ name: 'x' })),
          ])
        )
      );
    }),
    h("div", {}, () => error() && h("div", { class: "text-[10px] text-error mt-1 px-1" }, error())),
  ]);
};
export const Float = ({ label, class: cls = '', ...rest }, children) => h("label", { ...rest, class: `floating-label ${cls}` }, [h("span", {}, label ?? null), children]);
export const Icon = ({ name, class: cls = '' }) => h("span", { class: `icon-[lucide--${name}] ${cls}` });
export const Indicator = ({ class: cls = '', value, badgeClass = '', ...rest }, children) =>
  h("div", { ...rest, class: `indicator ${cls}` }, [
    () => val(value) != null && val(value) !== false
      ? h("span", { class: `indicator-item badge ${badgeClass}` }, val(value))
      : null,
    children,
  ]);
export const InputFloat = ({ label, class: cls = '', ...rest }, content) =>
  h("label", { class: `floating-label ${cls}` }, [
    h("span", {}, label ?? null),
    content ?? inputBase(rest),
  ]);
export const InputLabel = ({ label, class: cls = '', ...rest }, content) =>
  h("div", { class: `flex items-center gap-2 ${cls}` }, [
    label != null && h("span", { class: "label" }, label),
    content ?? inputBase(rest),
  ]);
export const InputPass = ({ label, labelMode = 'float', ...rest }) => {
  const show = signal(false);

  const core = inputBase({
    ...rest,
    type: () => val(show) ? "text" : "password",
    icon: "icon-[lucide--lock]",
    right: h("label", { class: "swap swap-rotate" }, [
      h("input", {
        type: "checkbox",
        checked: show,
        onchange: () => show(val(show) ? 0 : 1),
      }),
      h("div", { class: "swap-on" }, Icon({ name: 'eye' })),
      h("div", { class: "swap-off" }, Icon({ name: 'eye-off' })),
    ]),
  });

  if (label == null) return core;
  return labelMode === 'left'
    ? InputLabel({ label }, core)
    : InputFloat({ label }, core);
};
export const Kbd = ({ class: cls = '', ...rest }, children) => h("kbd", { ...rest, class: `kbd ${cls}` }, children);
export const Label = ({ class: cls = '', ...rest }, children) => h("span", { ...rest, class: `label ${cls}` }, children);
export const Loading = ({ class: cls = '', ...rest }) => h("span", { ...rest, class: `loading loading-spinner ${cls}` });
export const Menu = ({ class: cls = '', ...rest }, children) => h("ul", { ...rest, class: `menu ${cls}` }, children);
export const MenuItem = props =>
  props.items
    ? h('li', {}, [h('details', { open: props.open || false }, [h('summary', {}, props.label), h('ul', { class: props.submenuClass || '' }, props.items.map(i => MenuItem(i)))])])
    : h('li', {}, props.href || props.onclick
      ? h('a', { ...(props.href ? { href: props.href } : {}), onclick: props.onclick }, props.label)
      : props.label);
export const MenuTitle = (props, children) => h('li', { ...props, class: "menu-title" }, children);
export const Modal = props => {
  const { show, class: cls = '', children, ...rest } = props;
  let dialogEl;
  effect(() => {
    if (!dialogEl || show === undefined) return;
    if (val(show)) dialogEl.showModal?.();
    else dialogEl.close?.();
  });
  return h("dialog", {
    ...rest,
    ref: el => dialogEl = el,
    class: `modal ${cls}`,
  }, [
    children,
    h("form", { method: "dialog", class: "modal-backdrop" }, h("button", {}, "close")),
  ]);
};
export const ModalAction = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `modal-action ${cls}` }, children);
export const ModalBox = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `modal-box ${cls}` }, [
  h("form", { method: "dialog" }, h("button", { class: "btn btn-sm btn-circle btn-ghost absolute right-2 top-2" }, "✕")),
  children,
]);
export const Navbar = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `navbar ${cls}` }, children);
export const Pallete = props => {
  const toLower = s => (s || '').toLowerCase(),
    colors = ['#000', '#1A1A1A', '#333', '#4D4D4D', '#666', '#808080', '#B3B3B3', '#FFF', '#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#431407', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#ffedd5', '#713f12', '#a16207', '#ca8a04', '#eab308', '#facc15', '#fde047', '#fef08a', '#fff9c4', '#064e3b', '#065f46', '#059669', '#10b981', '#34d399', '#4ade80', '#84cc16', '#d9f99d', '#082f49', '#075985', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#22d3ee', '#cffafe', '#1e1b4b', '#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff', '#2e1065', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a855f7', '#d946ef', '#fae8ff'];

  return h('div', { class: `p-3 bg-base-100 rounded-box shadow w-64 ${props.class || ''}` },
    h('div', { class: 'grid grid-cols-8 gap-1' },
      colors.map(color => h('button', {
        type: 'button',
        style: `background:${color}`,
        onclick: () => (isF(props.value) ? props.value(color) : props.onchange?.(color), Blur()),
        class: () => `size-6 rounded-sm transition-all hover:scale-125 hover:z-10 active:scale-95 border border-black/5 p-0 min-h-0 ${toLower(val(props.value)) == toLower(color) ? 'ring-2 ring-offset-1 ring-primary z-10 scale-110' : ''}`
      }))
    )
  );
};
export const Progress = ({ class: cls = '', ...rest }) => h("progress", { ...rest, class: `progress ${cls}` });
export const Radial = ({ class: cls = '', value, ...rest }) => h("div", {
  ...rest,
  class: `radial-progress ${cls}`,
  style: () => `--value:${val(value) ?? 0}`,
  role: "progressbar",
}, () => val(value) ?? "");
export const Radio = ({ class: cls = '', ...rest }) => h("input", { ...rest, type: "radio", class: `radio ${cls}` });
export const Range = ({ class: cls = '', ...rest }) => h("input", { ...rest, type: "range", class: `range ${cls}` });
export const Rating = props => {
  const count = Math.max(0, props.count ?? 5);
  const offset = props.offset ?? 0;
  const itemValue = i => i + offset;

  const value = isF(props.value) ? props.value
    : signal(props.value ?? itemValue(0));

  const name = props.name ?? `rating-${Math.random().toString(36).slice(2, 9)}`;

  const set = v => isF(props.value) ? props.value(v) : (value(v), props.onChange?.(v));

  return h("div", { class: `rating ${props.class || ''}` },
    Array.from({ length: count }, (_, i) =>
      h("input", {
        type: "radio",
        name,
        class: `mask ${props.mask || 'mask-star'} ${props.itemClass || ''}`,
        checked: () => val(value) === itemValue(i),
        onchange: () => set(itemValue(i)),
        'aria-label': `${i + 1} de ${count}`,
      })
    )
  );
};
export const Search = props => InputFloat(
  { label: props.label, class: props.class },
  inputBase({ ...props, type: "search", icon: props.icon ?? "icon-[lucide--search]" })
);
export const Select = ({ class: cls = '', ...rest }, children) => h("select", { ...rest, class: `select ${cls}` }, children);
export const Stack = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stack ${cls}` }, children);
export const Stat = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stat ${cls}` }, children);
export const StatDesc = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stat-desc ${cls}` }, children);
export const StatFigure = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stat-figure ${cls}` }, children);
export const StatTitle = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stat-title ${cls}` }, children);
export const StatValue = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `stat-value ${cls}` }, children);
export const Step = ({ class: cls = '', dataContent, ...rest }, children) => h("li", { ...rest, class: `step ${cls}`, "data-content": dataContent }, children);
export const Steps = ({ class: cls = '', ...rest }, children) => h("ul", { ...rest, class: `steps ${cls}` }, children);
export const Swap = ({ class: cls = '', value, onchange, ...rest }, children) => h("label", { ...rest, class: `swap ${cls}` }, [
  h("input", { type: "checkbox", checked: value, onchange }),
  ...(isA(children) ? children : [children]),
]);
export const SwapOff = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `swap-off ${cls}` }, children);
export const SwapOn = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `swap-on ${cls}` }, children);
export const Tab = props => {
  const closeTab = event => {
    event.stopPropagation();
    event.preventDefault();

    const tabs = props.tabs?.() || [];
    const remaining = tabs.filter((_, index) => index !== props.index);
    props.tabs?.(remaining);

    const activeIndex = val(props.activeIndex);

    if (props.index === activeIndex) {
      if (remaining.length === 0) props.onSelect?.(-1);
      else props.onSelect?.(Math.min(props.index, remaining.length - 1));
    } else if (props.index < activeIndex) {
      props.onSelect?.(activeIndex - 1);
    }
  };

  return h('label', { role: 'tab', class: `tab ${props.class || ''}` }, [
    h('input', {
      type: 'radio',
      name: props.name,
      checked: () => val(props.checked) === true,
      onchange: () => props.onSelect?.(props.index),
    }),
    props.label,
    props.closable ? h('span', {
      class: 'ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content cursor-pointer',
      onclick: closeTab,
    }, Icon({ name: 'x', class: 'w-3 h-3' })) : null,
  ]);
};
export const TabPanel = ({ class: cls = '', ...rest }, children) =>
  h('div', { ...rest, role: 'tabpanel', class: `tab-content bg-base-100 border-base-300 p-6 ${cls}` }, children);
export const Table = ({ class: cls = '', ...rest }, children) => h("table", { ...rest, class: `table ${cls}` }, children);
export const Tabs = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, role: "tablist", class: `tabs ${cls}` }, children);
export const TBody = ({ class: cls = '', ...rest }, children) => h("tbody", { ...rest, class: cls }, children);
export const Td = ({ class: cls = '', ...rest }, children) => h("td", { ...rest, class: cls }, children);
export const Textarea = ({ class: cls = '', ...rest }) => h("textarea", { ...rest, class: `textarea ${cls}` });
export const TextRotate = ({ class: cls = '', ...rest }, children) => h("span", { ...rest, class: `text-rotate ${cls}` }, h("span", {}, children));
export const TFoot = ({ class: cls = '', ...rest }, children) => h("tfoot", { ...rest, class: cls }, children);
export const Th = ({ class: cls = '', ...rest }, children) => h("th", { ...rest, class: cls }, children);
export const THead = ({ class: cls = '', ...rest }, children) => h("thead", { ...rest, class: cls }, children);
export const Theme = props => Swap({ class: `text-xl ${props.class || ''}`, value: props.value, onchange: props.onchange }, [
  SwapOn({}, Icon({ name: 'moon' })),
  SwapOff({}, Icon({ name: 'sun' }))
]);
export const Timeline = ({ class: cls = '', ...rest }, children) => h("ul", { ...rest, class: `timeline ${cls}` }, children);
export const TimelineEnd = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `timeline-end ${cls}` }, children);
export const TimelineMiddle = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `timeline-middle ${cls}` }, children);
export const TimelineStart = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `timeline-start ${cls}` }, children);
export const Toast = (message, type = "alert-success", duration = 3500, position = "top-right") => {
  const positions = {
    'top-right': { pos: 'top-0 right-0 items-end', dir: 'flex-col' },
    'top-left': { pos: 'top-0 left-0 items-start', dir: 'flex-col' },
    'top-center': { pos: 'top-0 left-1/2 -translate-x-1/2 items-center', dir: 'flex-col' },
    'bottom-right': { pos: 'bottom-0 right-0 items-end', dir: 'flex-col-reverse' },
    'bottom-left': { pos: 'bottom-0 left-0 items-start', dir: 'flex-col-reverse' },
    'bottom-center': { pos: 'bottom-0 left-1/2 -translate-x-1/2 items-center', dir: 'flex-col-reverse' },
  };
  const { pos, dir } = positions[position] || positions['top-right'];
  const containerId = `stc-${position}`;

  let container = document.getElementById(containerId), autoDismissTimer, dismiss,
    wrapper = h("div", { style: "display:contents" });

  if (!container) document.body.append(container = h("div", {
    id: containerId,
    class: `fixed ${pos} z-[9999] p-4 flex ${dir} gap-2 pointer-events-none`,
  }));
  container.append(wrapper);

  let stopMount;
  stopMount = mount(() => {
    const entered = signal(0);
    const leaving = signal(0);
    dismiss = () => leaving() || (leaving(1), clearTimeout(autoDismissTimer), setTimeout(() => (stopMount(), wrapper.remove(), container.firstChild || container.remove()), 300));
    setTimeout(() => entered(1));
    return h("div", {
      class: () => `alert alert-soft ${type} shadow-lg transition-all duration-300 inline-flex w-auto pointer-events-auto ${leaving() ? 'translate-x-full opacity-0' : entered() ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`
    }, [
      typeof message == 'function' ? message() : typeof message == 'string' ? h("span", message) : message,
      h("button", { class: "btn btn-xs btn-circle btn-ghost", onclick: dismiss }, Icon({ name: 'x' }))
    ]);
  }, wrapper);

  if (duration > 0) autoDismissTimer = setTimeout(dismiss, duration);
  return dismiss;
};
export const Toggle = ({ class: cls = '', ...rest }) => h("input", { ...rest, type: "checkbox", class: `toggle ${cls}` });
export const Tooltip = ({ class: cls = '', tip, ...rest }, children) => h('div', { ...rest, class: `tooltip ${cls}`, "data-tip": tip }, children);
export const Tr = ({ class: cls = '', ...rest }, children) => h("tr", { ...rest, class: cls }, children);
export const Validator = ({ class: cls = '', ...rest }, children) => h("div", { ...rest, class: `validator-hint ${cls}` }, children);
export const Winbox = (props, children) => {
  const MIN_WIDTH = props.minWidth ?? 200;
  const MIN_HEIGHT = props.minHeight ?? 120;

  const viewportWidth = () => typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = () => typeof window !== 'undefined' ? window.innerHeight : 1080;

  const clampToViewport = (x, y, w, h) => ({
    x: Math.max(0, Math.min(x, viewportWidth() - w)),
    y: Math.max(0, Math.min(y, viewportHeight() - h)),
  });

  const autoX = props.x === undefined;
  const autoY = props.y === undefined;

  const posX = isF(props.x) ? props.x : signal(props.x ?? 0);
  const posY = isF(props.y) ? props.y : signal(props.y ?? 0);
  const width = isF(props.width) ? props.width : signal(props.width ?? null);
  const height = isF(props.height) ? props.height : signal(props.height ?? null);
  const show = isF(props.show) ? props.show : signal(props.show || false);

  let containerEl;
  let centered = false;
  const getRect = () => containerEl?.getBoundingClientRect() ?? { width: 0, height: 0 };

  const center = () => {
    const rect = getRect();
    if (!rect.width || !rect.height) return;
    if (autoX) posX(Math.max(0, (viewportWidth() - rect.width) / 2));
    if (autoY) posY(Math.max(0, (viewportHeight() - rect.height) / 3));
  };

  effect(() => {
    if (!show() || centered) return;
    requestAnimationFrame(() => { center(); centered = true; });
  });

  effect(() => {
    if (!show()) return;
    const onKey = event => { if (event.key === 'Escape') show(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  effect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const rect = getRect();
      const w = width() ?? rect.width;
      const h = height() ?? rect.height;
      const clamped = clampToViewport(posX(), posY(), w, h);
      posX(clamped.x); posY(clamped.y);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  const startDrag = (event, mode) => {
    event.preventDefault();

    const initialRect = getRect();
    if (width() === null) width(Math.max(MIN_WIDTH, initialRect.width));
    if (height() === null) height(Math.max(MIN_HEIGHT, initialRect.height));

    const start = { pointerX: event.clientX, pointerY: event.clientY, x: posX(), y: posY(), w: width(), h: height() };

    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - start.pointerX;
      const deltaY = moveEvent.clientY - start.pointerY;

      if (mode === 'move') {
        const clamped = clampToViewport(start.x + deltaX, start.y + deltaY, start.w, start.h);
        posX(clamped.x); posY(clamped.y);
        return;
      }

      let nextX = start.x, nextY = start.y, nextW = start.w, nextH = start.h;

      if (mode.includes('e')) nextW = start.w + deltaX;
      if (mode.includes('s')) nextH = start.h + deltaY;
      if (mode.includes('w')) { nextW = start.w - deltaX; nextX = start.x + deltaX; }
      if (mode.includes('n')) { nextH = start.h - deltaY; nextY = start.y + deltaY; }

      if (nextW < MIN_WIDTH) { if (mode.includes('w')) nextX -= (MIN_WIDTH - nextW); nextW = MIN_WIDTH; }
      if (nextH < MIN_HEIGHT) { if (mode.includes('n')) nextY -= (MIN_HEIGHT - nextH); nextH = MIN_HEIGHT; }

      if (nextX < 0) { nextW += nextX; nextX = 0; }
      if (nextY < 0) { nextH += nextY; nextY = 0; }
      if (nextX + nextW > viewportWidth()) nextW = viewportWidth() - nextX;
      if (nextY + nextH > viewportHeight()) nextH = viewportHeight() - nextY;

      width(nextW); height(nextH); posX(nextX); posY(nextY);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor =
      mode === 'move' ? 'grabbing' :
        mode === 'n' || mode === 's' ? 'ns-resize' :
          mode === 'e' || mode === 'w' ? 'ew-resize' :
            mode === 'ne' || mode === 'sw' ? 'nesw-resize' : 'nwse-resize';
  };

  const HANDLE_SIZE = 6;
  const handles = [
    ['n', { top: `-${HANDLE_SIZE / 2}px`, left: `${HANDLE_SIZE}px`, right: `${HANDLE_SIZE}px`, height: `${HANDLE_SIZE}px`, cursor: 'ns-resize' }],
    ['s', { bottom: `-${HANDLE_SIZE / 2}px`, left: `${HANDLE_SIZE}px`, right: `${HANDLE_SIZE}px`, height: `${HANDLE_SIZE}px`, cursor: 'ns-resize' }],
    ['e', { right: `-${HANDLE_SIZE / 2}px`, top: `${HANDLE_SIZE}px`, bottom: `${HANDLE_SIZE}px`, width: `${HANDLE_SIZE}px`, cursor: 'ew-resize' }],
    ['w', { left: `-${HANDLE_SIZE / 2}px`, top: `${HANDLE_SIZE}px`, bottom: `${HANDLE_SIZE}px`, width: `${HANDLE_SIZE}px`, cursor: 'ew-resize' }],
    ['ne', { right: `-${HANDLE_SIZE / 2}px`, top: `-${HANDLE_SIZE / 2}px`, width: `${HANDLE_SIZE * 2}px`, height: `${HANDLE_SIZE * 2}px`, cursor: 'nesw-resize' }],
    ['nw', { left: `-${HANDLE_SIZE / 2}px`, top: `-${HANDLE_SIZE / 2}px`, width: `${HANDLE_SIZE * 2}px`, height: `${HANDLE_SIZE * 2}px`, cursor: 'nwse-resize' }],
    ['se', { right: `-${HANDLE_SIZE / 2}px`, bottom: `-${HANDLE_SIZE / 2}px`, width: `${HANDLE_SIZE * 2}px`, height: `${HANDLE_SIZE * 2}px`, cursor: 'nwse-resize' }],
    ['sw', { left: `-${HANDLE_SIZE / 2}px`, bottom: `-${HANDLE_SIZE / 2}px`, width: `${HANDLE_SIZE * 2}px`, height: `${HANDLE_SIZE * 2}px`, cursor: 'nesw-resize' }],
  ];

  return h("div", {
    ref: el => containerEl = el,
    class: () => `fixed z-50 transition-opacity duration-300 ${show() ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`,
    style: () => {
      let style = `left: ${posX()}px; top: ${posY()}px;`;
      if (width() !== null) style += ` width: ${width()}px;`;
      if (height() !== null) style += ` height: ${height()}px;`;
      if (width() === null) style += ` max-width: 90vw;`;
      if (height() === null) style += ` max-height: 90vh;`;
      return style;
    }
  }, [
    h("div", { class: `relative bg-base-100 rounded-box shadow-2xl border w-full h-full flex flex-col ${props.class || ''}` }, [
      props.title && h("div", {
        class: "flex justify-between items-center cursor-grab p-2 border-b select-none bg-base-200 rounded-t-box shrink-0",
        onpointerdown: e => { if (e.target.closest('button')) return; startDrag(e, 'move'); }
      }, [
        h("span", { class: "font-bold" }, props.title),
        h("button", { class: "btn btn-sm btn-circle btn-ghost", onclick: () => show(false) }, "✕")
      ]),
      h("div", { class: "p-4 flex-1 overflow-auto" }, children),
      props.footer && h("div", { class: "p-2 border-t flex justify-end gap-2 shrink-0" }, props.footer),
      ...handles.map(([mode, handleStyle]) =>
        h("div", {
          class: "absolute z-10",
          style: `${Object.entries(handleStyle).map(([prop, value]) => `${prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${value}`).join('; ')};`,
          onpointerdown: e => startDrag(e, mode)
        })
      )
    ])
  ]);
};

// ── Internal ───────────────────────────────────────────────────
const isF = v => typeof v === 'function';
const isA = Array.isArray;
const isO = v => v !== null && typeof v === 'object' && !isA(v);
const val = v => (isF(v) ? v() : v);

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const inputBase = ({ icon, right, label, class: cls = '', ...rest }) =>
  h("label", { class: "input w-full" }, [
    icon && h("span", { class: icon }),
    h("input", { ...rest, class: `w-full ${cls}` }),
    right,
  ]);

const combo = (props, renderContent) => {
  const { placeholder = "", class: cls = "", debounce: debounceMs = 0 } = props;

  const query = isF(props.display) ? props.display
    : isF(props.value) ? props.value
      : signal(props.value ?? "");
  const filterQuery = debounceMs ? signal(val(query)) : query;

  const updateFilter = debounceMs
    ? debounce(v => filterQuery(v), debounceMs)
    : null;

  let inputEl;
  const open = signal(false);

  const commit = () => { props.onCommit?.(val(query)); open(false); };

  return Float({ label: props.label }, [
    h("div", { class: () => `dropdown w-full ${cls} ${val(open) ? "dropdown-open" : ""}` }, [
      h("label", { class: "input w-full" }, [
        h("span", { class: props.icon ?? "icon-[lucide--search]" }),
        props.custom ?? null,
        h("input", {
          type: "search",
          placeholder,
          tabindex: "0",
          value: query,
          disabled: props.disabled,
          readonly: props.readonly,
          name: props.name,
          oninput: e => {
            query(e.target.value);
            if (updateFilter) updateFilter(e.target.value);
            open(true);
          },
          onfocus: () => open(true),
          onkeydown: e => {
            if (props.onKeyDown?.(e)) return;
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
      }, () => val(open) && typeof renderContent === "function"
        ? renderContent({
          query: filterQuery,
          open,
          close: () => { open(false); inputEl?.blur(); },
          setValue: v => { query(v); if (debounceMs) filterQuery(v); },
        })
        : null
      )
    ])
  ]);
};