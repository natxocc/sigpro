# Calendar

SigPro ships a `Calendar` component that wraps [FullCalendar](https://fullcalendar.io/) with full reactivity. It accepts signal-driven events and options, auto-syncs theme (light/dark), and exposes the native FullCalendar API via a ref.

## Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `events` | `Array \| Signal` | Calendar events. Reactive: updates to events sync to the calendar instance. Also accepts `data` as an alias for consistency with Grid/Chart. |
| `data` | `Array \| Signal` | Alias for `events`. If both are provided, `events` takes precedence. |
| `options` | `Object \| Signal` | FullCalendar options (headerToolbar, initialView, editable, etc.). Whitelisted keys only. Can be a signal for reactive updates. |
| `api` | `ref` | When provided, the FullCalendar instance is set on `api.current` at calendar-ready and null on destroy. |
| `on` | `Object` | Event callback map: `onEventClick`, `onDateClick`, `onSelect`, `onEventDrop`, `onDatesSet`, etc. |
| `class` | `string` | CSS class for the root container div. |
| `style` | `string` | Inline styles for the container (default: `height: 100%; width: 100%`). |
| `dark` | `boolean \| Signal` | Force dark mode (`true`) or light mode (`false`). When omitted, auto-detects from `data-theme` attribute or `prefers-color-scheme`. |

## Events

The `on` prop accepts FullCalendar event handlers:

```javascript
{
  onEventClick(info),
  onDateClick(info),
  onSelect(info),
  onUnselect(info),
  onEventDrop(info),
  onEventResize(info),
  onEventChange(info),
  onEventDragStart(info),
  onEventDragStop(info),
  onEventAdd(info),
  onDatesSet(info),
  onLoading(visible),
  onMoreLinkClick(info),
}
```

## Usage

```javascript
import { signal } from 'sigpro';
import { Calendar } from 'sigpro/calendar';

const events = signal([
  { title: 'Team Meeting', start: '2026-11-20', color: '#3b82f6' },
  { title: 'Deadline', start: '2026-11-25', color: '#ef4444' },
]);

Calendar({
  events,
  options: {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
    editable: true,
  },
  on: {
    onEventClick(info) {
      console.log('Clicked event:', info.event.title);
    }
  }
});
```

## Reactive Updates

Both `events` and `options` are fully reactive. Updating a signal syncs to the existing calendar instance without re-creating it:

```javascript
// Add an event reactively
events([
  ...events.value,
  { title: 'New Event', start: '2026-12-01' }
]);

// Update options reactively
Calendar({
  events,
  options: signal({ initialView: 'timeGridWeek' }),
});
```

## Dark Mode

When `dark` is provided as a signal or boolean, the calendar theme updates reactively:

```javascript
const theme = signal(false);

Calendar({
  events,
  dark: theme,
  options: { initialView: 'dayGridMonth' },
});
```

## API Access

Use a ref to access the FullCalendar instance:

```javascript
import { ref } from 'sigpro';

const apiRef = ref(null);

Calendar({
  events,
  api: apiRef,
  on: {
    datesSet(info) {
      console.log('Current view:', info.view.type);
    }
  }
});

// Later: use apiRef.current for imperative calls
apiRef.current?.next();
apiRef.current?.currentData.start;
```

## Options Whitelist

FullCalendar v6 has many options. SigPro whitelists known keys to prevent passing invalid props. The whitelist includes:

`plugins`, `initialView`, `initialDate`, `headerToolbar`, `footerToolbar`, `customButtons`, `timeZone`, `editable`, `selectMirror`, `nowIndicator`, `slotMinTime`, `slotMaxTime`, `contentHeight`, `aspectRatio`, `weekends`, `holidays`, `locale`, `firstDay`, `moreLinkText`, `navLinks`, `dayHeaders`, `businessHours`, and more.

Unknown keys are silently dropped. For custom options, use the FullCalendar plugin system or extend via the `api` ref.

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Bind events | `events: signal([...])` |
| Alias for events | `data: signal([...])` |
| Reactive options | `options: signal({ ... })` |
| Access calendar API | Pass a `ref` as `api` prop |
| Handle events | `on: { onEventClick(info) { ... } }` |
| Enable drag-and-drop | `options: { editable: true }` |
| Force dark mode | `dark: true` or `dark: themeSignal` |
| Auto-detect theme | Omit `dark` (reads `data-theme` / `prefers-color-scheme`) |
