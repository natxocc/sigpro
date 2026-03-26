import {
  createGrid,
  ModuleRegistry,
  ValidationModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  QuickFilterModule,
  RowSelectionModule,
  TextEditorModule,
  ClientSideRowModelModule,
  themeQuartz,
  iconSetQuartzLight,
} from "ag-grid-community";

import {
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
} from "ag-grid-enterprise";

// Registro único de módulos
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
]);

// Helper de tema exportado
export const getAgTheme = (isDark) =>
  themeQuartz.withPart(iconSetQuartzLight).withParams({
    browserColorScheme: isDark ? "dark" : "light",
    backgroundColor: isDark ? "#121212" : "#FDFDFD",
    foregroundColor: isDark ? "#E0E0E0" : "#181D1F",
    accentColor: isDark ? "#4FAAFF" : "#004B9C",
    headerBackgroundColor: isDark ? "#2A2A2A" : "#EEB111",
    headerTextColor: isDark ? "#4FAAFF" : "#004B9C",
    borderRadius: 4,
    columnBorder: false,
    headerFontSize: 14,
    headerFontWeight: 600,
    listItemHeight: 20,
    iconSize: 14,
    spacing: 3,
    wrapperBorderRadius: 4,
  });

export { createGrid };