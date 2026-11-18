# Chart

SigPro ships a `Chart` component that wraps [Highcharts](https://www.highcharts.com/) with full reactivity. It accepts signal-driven data and options, auto-syncs series configuration, and exposes the native Highcharts API via a ref.

## Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `data` | `Array \| Signal` | Chart data. Accepts plain arrays (`[[1,2],[3,4]]`) or series configs (`[{name:'A', data:[1,2]}]`). Reactive. |
| `options` | `Object \| Signal` | Highcharts `ChartOptions`. Shallow-merged with defaults. Can be a signal for reactive options. |
| `api` | `ref` | When provided, the Highcharts chart instance is set on `api.current` at chart-ready and null on destroy. |
| `on` | `Object` | Event callback map: `onLoad(chart)`, `onRedraw(chart)`, `onClick(event, chart)`. |
| `class` | `string` | CSS class for the root container div. |
| `style` | `string` | Inline styles for the container (default: `height: 100%; width: 100%`). |
| `dark` | `boolean \| Signal` | Force dark mode (`true`) or light mode (`false`). When omitted, uses chart defaults. |

## Data Format

The `data` prop accepts multiple formats automatically converted to Highcharts series:

```javascript
// Single series — plain array of values
Chart({ data: [1, 2, 3, 4, 5] });

// Multiple series — array of arrays
Chart({ data: [[1, 2], [3, 4], [5, 6]] });

// Mixed — custom series configs
Chart({ data: [{ name: 'A', data: [1, 2] }, { name: 'B', data: [3, 4] }] });
```

## Usage

```javascript
import { signal } from 'sigpro';
import { Chart } from 'sigpro/chart';

const data = signal([10, 20, 30, 40, 50]);
const options = signal({
  chart: { type: 'line' },
  title: { text: 'Monthly Sales' },
  xAxis: { title: { text: 'Month' } },
  yAxis: { title: { text: 'Revenue' } },
});

Chart({
  data,
  options,
  on: {
    onLoad(chart) {
      console.log('Chart ready:', chart);
    }
  }
});
```

## Reactive Updates

Both `data` and `options` are fully reactive. Updating a signal triggers a chart update without re-creating the instance:

```javascript
// Update data reactively — only series data changes
data([15, 25, 35, 45, 55]);

// Update options reactively — full chart.update() call
options({
  ...options.value,
  title: { text: 'Updated Title' }
});
```

## Dark Mode

When `dark` is set, the chart background and title color update reactively:

```javascript
const theme = signal(false);

Chart({
  data,
  dark: theme,
  options: { chart: { type: 'line' } },
});
```

## API Access

Use a ref to access the Highcharts chart instance:

```javascript
import { ref } from 'sigpro';

const apiRef = ref(null);

Chart({
  data,
  api: apiRef,
  on: {
    onLoad(chart) {
      chart.addSeries({ name: 'B', data: [1, 2, 3] });
    }
  }
});

// Later: use apiRef.current for imperative calls
apiRef.current?.update({ title: { text: 'Changed' }, true });
```

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Bind data | `data: signal([1,2,3])` |
| Multiple series | `data: [[1,2],[3,4]]` or series config objects |
| Reactive options | `options: signal({ ... })` |
| Access chart API | Pass a `ref` as `api` prop |
| Handle events | `on: { onLoad(chart) { ... } }` |
| Enable dark mode | `dark: true` or `dark: themeSignal` |
