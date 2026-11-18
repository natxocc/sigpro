# Grid

SigPro ships a `Grid` component that wraps [ag-Grid](https://www.ag-grid.com/) with full reactivity. It accepts signal-driven data and options, auto-syncs theme (light/dark), and exposes the native ag-Grid API via a ref.

## Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `data` | `Array \| Signal` | Row data. Can be a plain array or a signal. Reactive: updates to the data re-render the grid. |
| `options` | `Object \| Signal` | ag-Grid `gridOptions`. Shallow-merged with defaults. Can be a signal for reactive options. |
| `api` | `ref` | When provided, the ag-Grid API instance is set on `api.current` at grid-ready and null on destroy. |
| `on` | `Object` | Event callback map. Keys match ag-Grid event names (`onCellClicked`, `onRowClicked`, etc.). |
| `class` | `string` | CSS class for the root container div. |
| `style` | `string` | Inline styles for the container (default: `height: 100%; width: 100%`). |
| `dark` | `boolean \| Signal` | Force dark mode (`true`) or light mode (`false`). When omitted, auto-detects from `data-theme` attribute or `prefers-color-scheme`. |

## Events

The `on` prop accepts a map of ag-Grid event handlers:

```javascript
{
  onGridReady(params),
  onCellClicked(params),
  onRowClicked(params),
  onSortChanged(params),
  onFilterChanged(params),
  onSelectionChanged(params),
  onModelUpdated(params),
  onFirstDataRendered(params),
}
```

## Usage

```javascript
import { signal } from 'sigpro';
import { Grid } from 'sigpro/grid';

const rowData = signal([
  { name: 'Alice', age: 30, status: 'active' },
  { name: 'Bob', age: 25, status: 'inactive' },
]);

Grid({
  data: rowData,
  options: {
    columnDefs: [
      { field: 'name', filter: true },
      { field: 'age', filter: 'agNumberColumnFilter' },
      { field: 'status', filter: 'agTextColumnFilter' },
    ],
    autoSizeColumns: true,
  },
  on: {
    onCellClicked(params) {
      console.log('Clicked:', params.data);
    }
  }
});
```

## Dark Mode

When `dark` is provided as a signal, the grid theme updates reactively:

```javascript
const theme = signal(false);

Grid({
  data: rowData,
  dark: theme,
  options: { columnDefs: [...] },
});
```

## API Access

Use a ref to access the ag-Grid API for imperative operations:

```javascript
import { ref } from 'sigpro';

const apiRef = ref(null);

Grid({
  data: rowData,
  api: apiRef,
  on: {
    onGridReady(params) {
      params.api.sizeColumnsToFit();
    }
  }
});

// Later: use apiRef.current for imperative calls
apiRef.current?.getSelectedRows();
apiRef.current?.softRefreshView();
```

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Bind data | `data: signal([...])` |
| Reactive options | `options: signal({ ... })` |
| Access grid API | Pass a `ref` as `api` prop |
| Handle events | `on: { onCellClicked(params) { ... } }` |
| Force dark mode | `dark: true` |
| Auto-detect theme | Omit `dark` (reads `data-theme` / `prefers-color-scheme`) |
