import { h, effect, untrack } from './sigpro.js';

import {
  ModuleRegistry,
  ValidationModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  QuickFilterModule,
  RowSelectionModule,
  TextEditorModule,
  ClientSideRowModelModule,
  themeQuartz,
  createGrid,
  NumberFilterModule,
  TextFilterModule,
  DateFilterModule
} from "ag-grid-community";

import {
  MultiFilterModule,
  SetFilterModule,
  CellSelectionModule,
  PivotModule,
  MasterDetailModule,
  SideBarModule,
  ColumnsToolPanelModule,
  ColumnMenuModule,
  StatusBarModule,
  ExcelExportModule,
  ClipboardModule,
  ContextMenuModule
} from "./grid-e";

ModuleRegistry.registerModules([
  ValidationModule, ColumnAutoSizeModule, CellStyleModule, QuickFilterModule,
  RowSelectionModule, TextEditorModule, ClientSideRowModelModule, MultiFilterModule,
  CellSelectionModule, PivotModule, MasterDetailModule, SideBarModule,
  ColumnsToolPanelModule, ColumnMenuModule, StatusBarModule, ExcelExportModule,
  ClipboardModule, NumberFilterModule, TextFilterModule, SetFilterModule,
  DateFilterModule, ContextMenuModule
]);

export const Grid = (props) => {
  const { data, options, api, on, class: className, style = "height: 100%; width: 100%", dark } = props;

  const getDark = () =>
    dark !== undefined
      ? (typeof dark === 'function' ? dark() : dark)
      : document.documentElement.getAttribute('data-theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

  const getTheme = () => {
    const isDark = getDark();
    if (isDark) {
      return themeQuartz.withParams({
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
      });
    }
    return themeQuartz.withParams({
      browserColorScheme: "light",
      headerFontSize: 14,
      headerVerticalPaddingScale: 0.4,
      rowVerticalPaddingScale: 0.4
    });
  };

  const initGrid = (container) => {
    effect(() => {
      const initialData = untrack(() => typeof data === "function" ? data() : data);
      const initialOptions = untrack(() => typeof options === "function" ? options() : options);
      const initialTheme = untrack(() => getTheme());

      const commonEvents = [
        'onFilterChanged', 'onModelUpdated', 'onGridSizeChanged',
        'onFirstDataRendered', 'onRowValueChanged', 'onSelectionChanged',
        'onCellClicked', 'onCellDoubleClicked', 'onCellValueChanged',
        'onRowClicked', 'onSortChanged', 'onContextMenu',
        'onColumnResized', 'onColumnMoved', 'onRowDataUpdated',
        'onCellEditingStarted', 'onCellEditingStopped',
        'onPaginationChanged', 'onBodyScroll'
      ];

      const eventHandlers = {};
      commonEvents.forEach(eventName => {
        if (on?.[eventName]) {
          eventHandlers[eventName] = (params) => on[eventName](params);
        }
      });

      const gridOptions = {
        ...initialOptions,
        theme: initialTheme,
        rowData: initialData || [],
        onGridReady: (params) => {
          if (api) api.current = params.api;
          if (on?.onGridReady) on.onGridReady(params);
          if (initialOptions?.autoSizeColumns) {
            params.api.autoSizeAllColumns();
          }
        },
        ...eventHandlers
      };

      const gridApi = createGrid(container, gridOptions);
      if (api) api.current = gridApi;

      effect(() => {
        const newData = typeof data === "function" ? data() : data;
        if (Array.isArray(newData)) {
          const currentData = gridApi.getGridOption("rowData");
          if (newData !== currentData) {
            gridApi.setGridOption("rowData", newData);
          }
        }
      });

      effect(() => {
        getDark();
        const newTheme = getTheme();
        const currentTheme = gridApi.getGridOption("theme");
        if (JSON.stringify(newTheme) !== JSON.stringify(currentTheme)) {
          gridApi.setGridOption("theme", newTheme);
        }
      });

      effect(() => {
        if (!options) return;
        const newOptions = typeof options === "function" ? options() : options;
        if (newOptions) {
          Object.entries(newOptions).forEach(([key, val]) => {
            try {
              gridApi.setGridOption(key, val);
            } catch (e) {}
          });
        }
      });

      return () => {
        if (gridApi && !gridApi.isDestroyed()) gridApi.destroy();
        if (api) api.current = null;
      };
    });
  };

  return h("div", {
    class: className,
    style: style,
    ref: initGrid
  });
};
