// sigpro.ui.d.ts

declare module "sigpro.ui" {
  import type { Signal } from "./sigpro";

  // Utilidades
  function hide(): void;

  // Toast
  function toast(
    message: string | (() => any) | any,
    type?: "alert-success" | "alert-error" | "alert-warning" | "alert-info",
    duration?: number
  ): () => void;

  // Calendar
  interface CalendarProps {
    class?: string;
    value?: Signal<string | { start?: string; end?: string; startHour?: number; endHour?: number }> | any;
    range?: boolean | (() => boolean);
    hour?: boolean;
    onChange?: (value: any) => void;
  }
  function calendar(p: CalendarProps): HTMLElement;

  // Pallete
  interface PalleteProps {
    class?: string;
    value?: Signal<string> | ((v: string) => void);
    onchange?: (color: string) => void;
  }
  function pallete(p: PalleteProps): HTMLElement;

  // UI Components
  namespace ui {
    // Accordion
    function accordion(p: { class?: string; name?: string; checked?: boolean }, ...c: any[]): HTMLElement;
    function accordion_title(p: { class?: string }, ...c: any[]): HTMLElement;
    function accordion_content(p: { class?: string }, ...c: any[]): HTMLElement;

    // Alert
    function alert(p: { class?: string }, ...c: any[]): HTMLElement;

    // Autocomplete
    interface AutocompleteProps {
      label?: string;
      items: string[] | { label: string; value: any }[] | Signal<any[]>;
      value?: Signal<string> | ((v: any) => void);
      placeholder?: string;
      class?: string;
      icon?: string;
      onChange?: (v: any) => void;
    }
    function autocomplete(p: AutocompleteProps): HTMLElement;

    // Avatar
    function avatar(p: { class?: string; innerClass?: string }, ...c: any[]): HTMLElement;
    function avatar_group(p: { class?: string }, ...c: any[]): HTMLElement;

    // Badge
    function badge(p: { class?: string }, ...c: any[]): HTMLElement;

    // Breadcrumbs
    function breadcrumbs(p: { class?: string }, ...c: any[]): HTMLElement;

    // Button
    function button(p: { class?: string; onclick?: (e: Event) => void; disabled?: boolean | Signal<boolean> }, ...c: any[]): HTMLElement;

    // Card
    function card(p: { class?: string }, ...c: any[]): HTMLElement;
    function card_title(p: { class?: string }, ...c: any[]): HTMLElement;
    function card_body(p: { class?: string }, ...c: any[]): HTMLElement;
    function card_actions(p: { class?: string }, ...c: any[]): HTMLElement;

    // Carousel
    function carousel(p: { class?: string }, ...c: any[]): HTMLElement;
    function carousel_item(p: { class?: string }, ...c: any[]): HTMLElement;

    // Chat
    function chat(p: { class?: string }, ...c: any[]): HTMLElement;
    function chat_image(p: { class?: string }, ...c: any[]): HTMLElement;
    function chat_header(p: { class?: string }, ...c: any[]): HTMLElement;
    function chat_bubble(p: { class?: string }, ...c: any[]): HTMLElement;
    function chat_footer(p: { class?: string }, ...c: any[]): HTMLElement;

    // Checkbox
    function checkbox(p: { class?: string; checked?: boolean | Signal<boolean>; [key: string]: any }): HTMLElement;

    // Colorpicker
    function colorpicker(p: AutocompleteProps): HTMLElement;

    // Combo
    interface ComboProps {
      label?: string;
      value?: Signal<string> | string | ((v: string) => void);
      placeholder?: string;
      class?: string;
      icon?: string;
      custom?: any;
      disabled?: boolean | (() => boolean);
      readonly?: string;
    }
    function combo(p: ComboProps, c?: Function): HTMLElement;

    // Datepicker
    interface DatepickerProps {
      label?: string;
      value?: Signal<string | { start?: string; end?: string }>;
      range?: boolean | (() => boolean);
      placeholder?: string;
      class?: string;
      fromPlaceholder?: string;
      toPlaceholder?: string;
      onChange?: (v: any) => void;
    }
    function datepicker(p: DatepickerProps): HTMLElement;

    // Divider
    function divider(p: { class?: string }): HTMLElement;

    // Drawer
    function drawer(p: { class?: string }, ...c: any[]): HTMLElement;
    function drawer_toggle(p: { class?: string }): HTMLElement;
    function drawer_content(p: { class?: string }, ...c: any[]): HTMLElement;
    function drawer_side(p: { class?: string }, ...c: any[]): HTMLElement;
    function drawer_overlay(p: { class?: string }): HTMLElement;

    // Dropdown
    function dropdown(p: { class?: string }, ...c: any[]): HTMLElement;
    function dropdown_button(p: { class?: string; tabindex?: string; role?: string }, ...c: any[]): HTMLElement;
    function dropdown_content(p: { class?: string; tabindex?: string }, ...c: any[]): HTMLElement;

    // FAB
    function fab(p: { class?: string }, ...c: any[]): HTMLElement;
    function fab_button(p: { class?: string; tabindex?: string; role?: string }, ...c: any[]): HTMLElement;

    // Fieldset
    function fieldset(p: { class?: string; label?: string }, ...c: any[]): HTMLElement;

    // File
    function file(p: { class?: string; multiple?: boolean; accept?: string; onchange?: (e: Event) => void }): HTMLElement;
    interface FileDragProps {
      class?: string;
      drag?: boolean | Signal<boolean>;
      ondrag?: (v: boolean) => void;
      ondrop?: (files: FileList) => void;
    }
    function file_drag(p: FileDragProps, ...c: any[]): HTMLElement;
    interface FilePreviewProps {
      class?: string;
      files?: File[] | Signal<File[]>;
      onremove?: (index: number) => void;
    }
    function file_preview(p: FilePreviewProps): HTMLElement;
    function file_error(p: { class?: string; message?: string }): HTMLElement;

    // Float
    function float(p: { label?: string }, ...c: any[]): HTMLElement;

    // Indicator
    function indicator(p: { class?: string; value?: any; badgeClass?: string }, ...c: any[]): HTMLElement;

    // Input
    function input(p: { 
      label?: string; 
      class?: string; 
      icon?: string; 
      right?: any; 
      type?: string | (() => string);
      placeholder?: string;
      value?: Signal<string> | string;
      [key: string]: any 
    }): HTMLElement;

    // Kbd
    function kbd(p: { class?: string }, ...c: any[]): HTMLElement;

    // Label
    function label(p: { class?: string }, ...c: any[]): HTMLElement;

    // Loading
    function loading(p: { class?: string }): HTMLElement;

    // Menu
    function menu(p: { class?: string }, ...c: any[]): HTMLElement;
    interface MenuItem {
      label?: string;
      href?: string;
      items?: MenuItem[];
      open?: boolean;
      submenuClass?: string;
    }
    function menu_items(p: { items?: MenuItem[] }): HTMLElement[];

    // Modal
    function modal(p: { class?: string }, ...c: any[]): HTMLElement;
    function modal_box(p: { class?: string }, ...c: any[]): HTMLElement;
    function modal_action(p: { class?: string }, ...c: any[]): HTMLElement;

    // Navbar
    function navbar(p: { class?: string }, ...c: any[]): HTMLElement;

    // Option
    function option(p: { [key: string]: any }, ...c: any[]): HTMLElement;

    // Password
    function password(p: { label?: string; class?: string; value?: Signal<string> }): HTMLElement;

    // Progress
    function progress(p: { class?: string; value?: number | Signal<number>; max?: number | string }): HTMLElement;

    // Radial
    function radial(p: { class?: string; value?: number | Signal<number>; role?: string }): HTMLElement;

    // Radio
    function radio(p: { class?: string; name?: string; checked?: boolean | Signal<boolean>; [key: string]: any }): HTMLElement;

    // Range
    function range(p: { class?: string; min?: number; max?: number; value?: number | Signal<number>; oninput?: (e: Event) => void }): HTMLElement;

    // Rating
    interface RatingProps {
      class?: string;
      count?: number;
      mask?: string;
      itemClass?: string;
      name?: string;
      value?: Signal<number> | number;
      offset?: number;
      onChange?: (i: number) => void;
    }
    function rating(p: RatingProps): HTMLElement;

    // Search
    function search(p: { label?: string; class?: string; icon?: string; value?: Signal<string>; placeholder?: string }): HTMLElement;

    // Select
    function select(p: { class?: string; [key: string]: any }, ...c: any[]): HTMLElement;

    // Stack
    function stack(p: { class?: string }, ...c: any[]): HTMLElement;

    // Stat
    function stat(p: { class?: string }, ...c: any[]): HTMLElement;
    function stat_figure(p: { class?: string }, ...c: any[]): HTMLElement;
    function stat_title(p: { class?: string }, ...c: any[]): HTMLElement;
    function stat_value(p: { class?: string }, ...c: any[]): HTMLElement;
    function stat_desc(p: { class?: string }, ...c: any[]): HTMLElement;

    // Steps
    function steps(p: { class?: string }, ...c: any[]): HTMLElement;
    function step(p: { class?: string; dataContent?: string }, ...c: any[]): HTMLElement;

    // Swap
    function swap(p: { class?: string; value?: Signal<boolean> | boolean }, ...c: any[]): HTMLElement;
    function swap_on(p: { class?: string }, ...c: any[]): HTMLElement;
    function swap_off(p: { class?: string }, ...c: any[]): HTMLElement;

    // Table
    function table(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_head(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_body(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_foot(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_row(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_th(p: { class?: string }, ...c: any[]): HTMLElement;
    function table_td(p: { class?: string }, ...c: any[]): HTMLElement;

    // Tabs
    function tabs(p: { class?: string }, ...c: any[]): HTMLElement;
    interface TabProps {
      class?: string;
      classContent?: string;
      name?: string;
      label?: string;
      content?: any;
      checked?: boolean | (() => boolean);
      tabs?: Signal<any[]> | ((v: any[]) => void);
      index?: number;
      closable?: boolean;
      onclick?: () => void;
    }
    function tab(p: TabProps): any[];

    // Textarea
    function textarea(p: { class?: string; [key: string]: any }): HTMLElement;

    // Textrotate
    function textrotate(p: { class?: string }, ...c: any[]): HTMLElement;

    // Theme
    function theme(p?: { value?: string; class?: string }): HTMLElement;

    // Timeline
    function timeline(p: { class?: string }, ...c: any[]): HTMLElement;
    function timeline_start(p: { class?: string }, ...c: any[]): HTMLElement;
    function timeline_middle(p: { class?: string }, ...c: any[]): HTMLElement;
    function timeline_end(p: { class?: string }, ...c: any[]): HTMLElement;

    // Toggle
    function toggle(p: { class?: string; value?: string | Signal<string>; checked?: boolean | Signal<boolean>; [key: string]: any }): HTMLElement;

    // Tooltip
    function tooltip(p: { class?: string; tip?: string }, ...c: any[]): HTMLElement;

    // Validator
    function validator(p: { class?: string }, ...c: any[]): HTMLElement;
  }
}