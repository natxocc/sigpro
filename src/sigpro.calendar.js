import { h, effect, untrack } from './sigpro.js';

import { Calendar as FullCalendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

const defaultPlugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];

const eventCallbacks = [
  ['onEventClick', 'eventClick'],
  ['onDateClick', 'dateClick'],
  ['onSelect', 'select'],
  ['onUnselect', 'unselect'],
  ['onEventDrop', 'eventDrop'],
  ['onEventResize', 'eventResize'],
  ['onEventChange', 'eventChange'],
  ['onEventDragStart', 'eventDragStart'],
  ['onEventDragStop', 'eventDragStop'],
  ['onEventAdd', 'eventAdd'],
  ['onDatesSet', 'datesSet'],
  ['onLoading', 'loading'],
  ['onMoreLinkClick', 'moreLinkClick'],
];

const getDark = (dark) =>
  dark !== undefined
    ? (typeof dark === 'function' ? dark() : dark)
    : (typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme') === 'dark' ||
         window.matchMedia('(prefers-color-scheme: dark)').matches)
      : false);

export const Calendar = (props) => {
  const { events, data, options, api, on, class: className, style = "height: 100%; width: 100%", dark } = props;

  // `events` es la prop canónica; `data` se acepta como alias (consistencia con Grid/Chart)
  const getEvents = () => {
    const e = typeof events === 'function' ? events() : events;
    if (e != null) return e;
    return typeof data === 'function' ? data() : data;
  };

  // Whitelist de opciones válidas para el constructor FullCalendar v6
  const fcKnownKeys = new Set([
    'plugins', 'initialView', 'initialDate', 'headerToolbar', 'footerToolbar',
    'customButtons', 'header', 'footer', 'eventDisplay', 'timeZone',
    'editable', 'selectMirror', 'dayHoverTime', 'nowIndicator', 'slotMinTime',
    'slotMaxTime', 'minHeight', 'contentHeight', 'aspectRatio', 'expandRows',
    'weekends', 'holidays', 'locale', 'firstDay', 'prevText', 'nextText',
    'moreLinkText', 'yearRange', 'navLinks', 'dayHeaders', 'startParam',
    'endParam', 'titleFormat', 'eventTimeFormat', 'isMobile', 'timeGridAutoWidth',
    'groupEvents', 'resourceLabelText', 'displayEventTime', 'displayEventEnd',
    'lazyRendering', 'ignoreWindowResize', 'windowResize', 'dayMaxEvents',
    'dayMaxEventRows', 'allDaySlot', 'slotDuration', 'snapDuration', 'slotLabelFormat',
    'slotLabelClassNames', 'extraScroll', 'dateIncrement', 'businessHours',
  ]);

  const cleanOpts = (raw) => {
    const res = {};
    for (const [k, v] of Object.entries(raw || {})) {
      if (fcKnownKeys.has(k)) res[k] = v;
    }
    return res;
  };

  const initCalendar = (container) => {
    let cal = null;
    let prevSource = null;
    let lastDark = undefined;
    let calledMount = false;

    const outerStop = effect(() => {
      if (!container) return;

      // Si ya existe una instancia en este container, no recrear
      const existing = container._fc_calendar;
      if (existing) {
        cal = existing;

        // Reactive events update
        const evts = getEvents();
        if (prevSource) { cal.removeEventSource(prevSource); prevSource = null; }
        if (evts != null) {
          prevSource = cal.addEventSource(Array.isArray(evts) ? evts : []);
        }

        // Reactive options update
        const newOptions = typeof options === 'function' ? options() : options;
        if (newOptions) {
          Object.entries(cleanOpts(newOptions)).forEach(([key, val]) => {
            if (key === 'plugins') return;
            try { cal.setOption(key, val); } catch (_) {}
          });
        }

        // Reactive dark mode update
        const isDark = getDark(dark);
        if (isDark !== lastDark) {
          lastDark = isDark;
          container.classList.toggle('sigpro-calendar-dark', isDark);
        }

        return;
      }

      // Ya se está inicializando en rAF, saltar este efecto
      if (container.__sigproCalPending) return;

      // Primera inicialización
      calledMount = false;
      const initialOptions = untrack(() => typeof options === 'function' ? options() : options) || {};
      const initialDark = getDark(dark);

      let mergedOpts = {
        plugins: initialOptions.plugins ?? defaultPlugins,
        initialView: initialOptions.initialView ?? 'dayGridMonth',
        height: '100%',
        ...cleanOpts(initialOptions),
      };

      // Bind callbacks de `on.*` (sin pisar overrides del usuario)
      eventCallbacks.forEach(([sigproName, fcKey]) => {
        if (mergedOpts[fcKey] == null) mergedOpts[fcKey] = (arg) => on?.[sigproName]?.(arg, existing);
      });

      // Bind onDidMount en viewDidMount (una sola vez, por init)
      const origViewDidMount = mergedOpts.viewDidMount;
      mergedOpts.viewDidMount = function(...args) {
        if (!calledMount && on?.onDidMount) { calledMount = true; on.onDidMount(cal); }
        return origViewDidMount?.call(this, ...args);
      };

      // El contenedor puede estar 0×0 cuando SigPro invoca el ref.
      // FullCalendar lee dimensiones en el constructor Y en render(), así que
      // ambos deben ocurrir después del primer paint visible.
      const needsDefer = !container.isConnected || container.clientWidth === 0 || container.clientHeight === 0;

      if (needsDefer) {
        // Pendiente de inicialización: esperar al paint para tener dimensiones reales
        let pending = { opts: mergedOpts, dark: initialDark };
        let done = false;

        // Marcar como pendiente ANTES del rAF para bloquear re-runs
        container.__sigproCalPending = true;

        const createAndRender = () => {
          if (done || !container.isConnected) return;
          delete container.__sigproCalPending;
          cal = new FullCalendar(container, pending.opts);
          container._fc_calendar = cal;
          calendarRef.current = cal;
          if (api) api.current = cal;
          lastDark = pending.dark;
          container.classList.toggle('sigpro-calendar-dark', pending.dark);
          cal.render();
          requestAnimationFrame(() => {
            if (cal && container.isConnected) cal.updateSize();
          });
        };

        // El primer rAF espera a que el navegador pinte el contenedor.
        requestAnimationFrame(createAndRender);

        // Si por alguna razón el paint no ocurre (SSR / hidden), fallback a 50ms
        setTimeout(() => {
          delete container.__sigproCalPending;
          if (done || !container.isConnected) return;
          cal = new FullCalendar(container, pending.opts);
          container._fc_calendar = cal;
          calendarRef.current = cal;
          if (api) api.current = cal;
          lastDark = pending.dark;
          container.classList.toggle('sigpro-calendar-dark', pending.dark);
          cal.render();
          requestAnimationFrame(() => {
            if (cal && container.isConnected) cal.updateSize();
          });
        }, 50);

        // Reactive effects para el caso diferido (se ejecutan pero cal=null)
        effect(() => {
          const evts = getEvents();
          if (!cal) return;
          if (prevSource) { cal.removeEventSource(prevSource); prevSource = null; }
          if (evts != null) {
            prevSource = cal.addEventSource(Array.isArray(evts) ? evts : []);
          }
        });

        let firstOptionsRun = true;
        effect(() => {
          const newOptions = typeof options === 'function' ? options() : options;
          if (firstOptionsRun) { firstOptionsRun = false; return; }
          if (!newOptions || !cal) return;
          Object.entries(cleanOpts(newOptions)).forEach(([key, val]) => {
            if (key === 'plugins') return;
            try { cal.setOption(key, val); } catch (_) {}
          });
        });

        effect(() => {
          const isDark = getDark(dark);
          if (isDark === lastDark) return;
          lastDark = isDark;
          container.classList.toggle('sigpro-calendar-dark', isDark);
        });

      } else {
        // El contenedor ya tiene tamaño real, inicializar inmediatamente
        cal = new FullCalendar(container, mergedOpts);
        container._fc_calendar = cal;
        calendarRef.current = cal;
        if (api) api.current = cal;
        lastDark = initialDark;
        container.classList.toggle('sigpro-calendar-dark', initialDark);
        cal.render();

        // Reactive events: remove previous source and add new
        effect(() => {
          const evts = getEvents();
          if (!cal) return;
          if (prevSource) { cal.removeEventSource(prevSource); prevSource = null; }
          if (evts != null) {
            prevSource = cal.addEventSource(Array.isArray(evts) ? evts : []);
          }
        });

        // Reactive options: apply to existing calendar instance via setOption
        let firstOptionsRun = true;
        effect(() => {
          const newOptions = typeof options === 'function' ? options() : options;
          if (firstOptionsRun) { firstOptionsRun = false; return; }
          if (!newOptions || !cal) return;
          Object.entries(cleanOpts(newOptions)).forEach(([key, val]) => {
            if (key === 'plugins') return;
            try { cal.setOption(key, val); } catch (_) {}
          });
        });

        // Reactive dark mode
        effect(() => {
          const isDark = getDark(dark);
          if (isDark === lastDark) return;
          lastDark = isDark;
          container.classList.toggle('sigpro-calendar-dark', isDark);
        });
      }

      return () => {
        delete container.__sigproCalPending;
        if (cal) { cal.destroy(); }
        container._fc_calendar = null;
        calendarRef.current = null;
        if (api) api.current = null;
      };
    });

    return outerStop;
  };

  const calendarRef = {}; // unstable ref to pass around

  return h('div', { class: className, style, ref: initCalendar });
};
