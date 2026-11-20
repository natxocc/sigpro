import { h, effect, untrack } from './sigpro.js';

import {
  ModuleRegistry, ValidationModule, ColumnAutoSizeModule, CellStyleModule,
  QuickFilterModule, RowSelectionModule, TextEditorModule,
  ClientSideRowModelModule, themeQuartz, createGrid,
  NumberFilterModule, TextFilterModule, DateFilterModule
} from "ag-grid-community";

import {
  MultiFilterModule, SetFilterModule, CellSelectionModule, PivotModule,
  MasterDetailModule, SideBarModule, ColumnsToolPanelModule, ColumnMenuModule,
  StatusBarModule, ExcelExportModule, ClipboardModule, ContextMenuModule
} from "./grid";

ModuleRegistry.registerModules([
  ValidationModule, ColumnAutoSizeModule, CellStyleModule, QuickFilterModule,
  RowSelectionModule, TextEditorModule, ClientSideRowModelModule, MultiFilterModule,
  CellSelectionModule, PivotModule, MasterDetailModule, SideBarModule,
  ColumnsToolPanelModule, ColumnMenuModule, StatusBarModule, ExcelExportModule,
  ClipboardModule, NumberFilterModule, TextFilterModule, SetFilterModule,
  DateFilterModule, ContextMenuModule
]);

const commonEvents = [
  'onFilterChanged', 'onModelUpdated', 'onGridSizeChanged',
  'onFirstDataRendered', 'onRowValueChanged', 'onSelectionChanged',
  'onCellClicked', 'onCellDoubleClicked', 'onCellValueChanged',
  'onRowClicked', 'onSortChanged', 'onContextMenu',
  'onColumnResized', 'onColumnMoved', 'onRowDataUpdated',
  'onCellEditingStarted', 'onCellEditingStopped',
  'onPaginationChanged', 'onBodyScroll'
];

// FIX 1: builder puro que recibe isDark
const buildTheme = (isDark) => isDark
  ? themeQuartz.withParams({
      headerFontSize: 14,
      headerVerticalPaddingScale: 0.4,
      rowVerticalPaddingScale: 0.4,
      backgroundColor: "#1d1d1d",
      foregroundColor: "#ffffff",
      headerBackgroundColor: "#2a2a2a",
      headerForegroundColor: "#ffffff",
      oddRowBackgroundColor: "#262626",
      borderColor: "#404040",
      browserColorScheme: "dark"
    })
  : themeQuartz.withParams({
      browserColorScheme: "light",
      headerFontSize: 14,
      headerVerticalPaddingScale: 0.4,
      rowVerticalPaddingScale: 0.4
    });

export const Grid = (props) => {
  const { data, options, api, on, class: className, style = "height: 100%; width: 100%", dark } = props;

  const getDark = () =>
    dark !== undefined
      ? (typeof dark === 'function' ? dark() : dark)
      : document.documentElement.getAttribute('data-theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

  const initGrid = (container) => {
    let gridApi;

    const stop = effect(() => {
      const initialData = untrack(() => typeof data === "function" ? data() : data);
      const initialOptions = untrack(() => typeof options === "function" ? options() : options);
      const initialTheme = untrack(() => buildTheme(getDark()));

      const eventHandlers = {};
      commonEvents.forEach(eventName => {
        // FIX 4: handler lee `on` en cada invocación (opcional)
        eventHandlers[eventName] = (params) => {
          const fn = on?.[eventName];
          if (fn) fn(params);
        };
      });

      const gridOptions = {
        ...initialOptions,
        theme: initialTheme,
        rowData: initialData || [],
        onGridReady: (params) => {
          if (api) api.current = params.api;
          if (on?.onGridReady) on.onGridReady(params);
          if (initialOptions?.autoSizeColumns) params.api.autoSizeAllColumns();
        },
        ...eventHandlers
      };

      gridApi = createGrid(container, gridOptions);
      if (api) api.current = gridApi;

      // effect de data (sin cambios)
      effect(() => {
        const newData = typeof data === "function" ? data() : data;
        if (Array.isArray(newData)) {
          const currentData = gridApi.getGridOption("rowData");
          if (newData !== currentData) gridApi.setGridOption("rowData", newData);
        }
      });

      // FIX 2: theme reacciona a isDark, no a JSON.stringify
      let lastIsDark = null;
      effect(() => {
        const isDark = getDark();
        if (isDark === lastIsDark) return;
        lastIsDark = isDark;
        gridApi.setGridOption("theme", buildTheme(isDark));
      });

      // FIX 3: options no se re-setean en el primer render
      let firstOptionsRun = true;
      effect(() => {
        const newOptions = typeof options === "function" ? options() : options;
        if (firstOptionsRun) { firstOptionsRun = false; return; }
        if (newOptions) {
          Object.entries(newOptions).forEach(([key, val]) => {
            try { gridApi.setGridOption(key, val); } catch (e) {}
          });
        }
      });

      return () => {
        if (gridApi && !gridApi.isDestroyed()) gridApi.destroy();
        if (api) api.current = null;
      };
    });

    return () => { stop(); };  // red de seguridad (requiere el cambio en h())
  };

  return h("div", { class: className, style, ref: initGrid });
};