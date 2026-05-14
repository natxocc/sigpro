const { h, watch, onUnmount } = window.SigPro

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
  ValidationModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  QuickFilterModule,
  RowSelectionModule,
  TextEditorModule,
  ClientSideRowModelModule,
  MultiFilterModule,
  CellSelectionModule,
  PivotModule,
  MasterDetailModule,
  SideBarModule,
  ColumnsToolPanelModule,
  ColumnMenuModule,
  StatusBarModule,
  ExcelExportModule,
  ClipboardModule,
  NumberFilterModule,
  TextFilterModule,
  SetFilterModule,
  DateFilterModule,
  ContextMenuModule
]);

const Grid = (props) => {
  const { data, options, api, on, class: className, style = "height: 100%; width: 100%", dark } = props;
  let gridApi = null;
  let cleanupFn = null;

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
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
    if (gridApi && !gridApi.isDestroyed()) {
      gridApi.destroy();
      if (api) api.current = null;
      gridApi = null;
    }

    if (!container) return;

    const initialData = typeof data === "function" ? data() : data;
    const initialOptions = typeof options === "function" ? options() : options;

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
      theme: getTheme(),
      rowData: initialData || [],
      onGridReady: (params) => {
        gridApi = params.api;
        if (api) api.current = gridApi;
        if (on?.onGridReady) on.onGridReady(params);

        if (initialOptions?.autoSizeColumns) {
          params.api.autoSizeAllColumns();
        }
      },
      ...eventHandlers
    };

    gridApi = createGrid(container, gridOptions);

    const stopData = watch(() => {
      if (!gridApi || gridApi.isDestroyed()) return;
      const newData = typeof data === "function" ? data() : data;
      if (Array.isArray(newData)) {
        const currentData = gridApi.getGridOption("rowData");
        if (newData !== currentData) {
          gridApi.setGridOption("rowData", newData);
        }
      }
    });

    const stopTheme = watch(() => {
      if (!gridApi || gridApi.isDestroyed()) return;
      getDark();
      const newTheme = getTheme();
      const currentTheme = gridApi.getGridOption("theme");
      if (JSON.stringify(newTheme) !== JSON.stringify(currentTheme)) {
        gridApi.setGridOption("theme", newTheme);
      }
    });

    const stopOptions = watch(() => {
      if (!gridApi || gridApi.isDestroyed() || !options) return;
      const newOptions = typeof options === "function" ? options() : options;
      if (newOptions) {
        Object.entries(newOptions).forEach(([key, val]) => {
          try {
            gridApi.setGridOption(key, val);
          } catch (e) { }
        });
      }
    });

    cleanupFn = () => {
      stopData();
      stopTheme();
      stopOptions();
      if (gridApi && !gridApi.isDestroyed()) {
        gridApi.destroy();
        if (api) api.current = null;
        gridApi = null;
      }
    };

    onUnmount(() => {
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    });
  };

  return h("div", {
    class: className,
    style: style,
    ref: initGrid
  });
};

export { Grid };