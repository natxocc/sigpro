/**
 * SigPro UI - daisyUI v5 & Tailwind v4 Plugin
 * Provides a set of reactive functional components, flow control and i18n.
 */
import { $, $if, $for, $watch, $html, $mount } from 'sigpro';
export const UI = (defaultLang = "es") => {
  const ui = {};

  // --- I18N CORE ---
  const i18n = {
    es: { close: "Cerrar", confirm: "Confirmar", cancel: "Cancelar", search: "Buscar...", loading: "Cargando..." },
    en: { close: "Close", confirm: "Confirm", cancel: "Cancel", search: "Search...", loading: "Loading..." },
  };

  const currentLocale = $(defaultLang);

  /** SET LOCALE */
  ui.SetLocale = (locale) => currentLocale(locale);

  /** TRANSLATE */
  const tt = (key) => () => i18n[currentLocale()][key] || key;

  // --- INTERNAL HELPERS ---
  const val = (v) => (typeof v === "function" ? v() : v);

  const joinClass = (base, extra) => {
    if (typeof extra === "function") {
      return () => `${base} ${extra() || ""}`.trim();
    }
    return `${base} ${extra || ""}`.trim();
  };

  /** ICONS */
  const iconShow =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADjSURBVDiN3dJNSgNBEAXgz4DZeAAVJ9tko2St3kaIFxAVt4KZeAD1GKKi7vQSydI/yHgALxAXU02GxniAFBR0v1ev+3V1sZSxjxtM8BM5wTX2/hNu4gFvOMI21iJ3cIwP3GMjF/dQ4RyraOMS34GPAmvjIrBeEnfwjoPGgSM8ooh8QtngB6Ep4BWnmaMqkY1LqqzmDC8tzNDK3/RHzLL9SloUYWfQIMuw3Yl8xrDBH6qbvZWALqbqBqVmlWF7GuKEDwPr5hbXcYdPnKBv/o39wL5wG7ULY1c9NGPzQRrjKrhli1/02zEjWyWMBwAAAABJRU5ErkJggg==";
  const iconHide =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEDSURBVDiN1dK/K8VhFAbwD+VLGSxKcu9guSQ/Zils/gNkuaX4BxRZDTdklYU/QAaDlEVGGwu2Kz/uVbKJzWDwfuv1+jHz1Km3c85znuf0Hv4jxnD2W8MItnCJ5xAX2MQcHsOQL+jEAapYQD9aQwxiDy+B3JKSe1DHCpqQYQ0PeMJOpDyAmyAAirjGbDRwFYcoYCZSzjGP+8B1gqXEUT2QxyPlqaRnGceNeENzUswwil1MBocbSU9DCAXUUI6K25HtIo5QSVaooitP9OEO65iIbE+HXSvBVRbeNZQSR9pxGil3o83HNw5hEbfYR0dKFki5ci+u8OrzIQ1/R8xx7ocL+9t4B0HPOVXjoptxAAAAAElFTkSuQmCC";
  const iconClose =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAESSURBVDiNtdO7LoRBHAXwXyhVG5ddEq9AgbXiskS1dOJS6DyDRKLmFRCvQY9aIi6FnpDsrkuiQCWKmS/5dmW/VXCSyWTm/GfmnPzP8A8oYBc3eEMd59iKXCZW8YpDzCOHHszgAE9Ya3V4EY8YzXhgAndYaib68YxiO4kYRg290Bk3t/GAvbiuII/7uJ7CGG5RxSCGcJrceh2LEkzGwnIctTgnGMdFWtZ7IimFcrykirkmrkvokI7WVn1lcD9wpdFCKfVyYmE2xRdFC4mCY2ykCgaEfp/gTGhbX4pfx1FaQUEIyW/bWBUC1oAFIUgjGYdLWgQpwTJesC/4z6Eb00JG6lhpJzGPHVziEx/CZ9qM3N/iGy1pNoTrsd1eAAAAAElFTkSuQmCC";
  const iconCalendar =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACLSURBVDiN7dO9CQJBFEXhb38K0FwQrMNEVpuwB0NjrcYabECsQk0sQ1mTF4zIjrgmBh54MMx998AEwzOrmC5e8gJjbDHCJO7PHYI0v2JT4Ig9DljGwq5DkOZTLOCOMoIhBpknpHmFWx3ldaaUo6oTc2/ab7rl+508f8GvCC5oenTn4tM1cWg/nBNmD4fBH/Kfvt2TAAAAAElFTkSuQmCC";
  const iconLock =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAWQAAAFkBqp2phgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACQSURBVDiN7dKxDcJQDATQJ0YgXQQ1bAgDEIZBETPQwjakIjRQ8CMSyR8SiZKTrvHZd/r+JsYSNZrEI1ZR4ywzfElcJ55xwiITOECNTVDf4jDGoEEZ1Etcxxg8pmjRDiahb7BH20uKKPVUkVmL+YjQArdI+PT2bO9Pd/A34O71Rd9QeN/LAFUSckfUscWuG3oCgP8nrDH6T5AAAAAASUVORK5CYII=";
  const iconAbc =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAB2AAAAdgFOeyYIAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAMRJREFUOI3t0bFKAmAUBeAPURD1HQwUTKPJEmzQoSWQcKpVfIuWdvU9WnqNhsYWBx0a2lvLSMKGbvQ7SO564HA497/3cu/92SPFAS5QDN9CftviDhZYYRpNPtH/rzATOsQT6jhCFzmc4DTJL6AX067hPiimuAr95RglzMJ/4AyyUXSMw3iEauhN6C0eUEMFAyzTFZ7xiOvwL3jbsPYSr3hPg3dB/o43SVYY+TnsPPwXztMG5SDr39dGM8kr4RKNDdPtJL4BNXEmsdKC+S4AAAAASUVORK5CYII=";
  const icon123 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAB2AAAAdgFOeyYIAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAMxJREFUOI3t0bFKwlEUBvBfmmBEr1APIDZJ9AJJQyAIvkGP0C4uQruza+DUmuIc9AC9gBG4Nmpkw/8IB3Vw1w8u95zvnvPde77LEeUUV9HAF67QRA2nmMf5A+o4x3cWOsMYy8j7WMX6jaYbLBL/mAWe8RcHm1ihs8G94gVKQQzwlAouMcQo8p/Y28HdYpYFZmsi0MVdxD1MdrxsC500wijdvgtbI1AYtDbxMwkuFAZmE1uYwkkSqOIaHyHcxEU0vUXNPSqKr37fZ6xDwD9DPS0OyHjQHQAAAABJRU5ErkJggg==";
  const iconMail =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAC4SURBVDiNxdIxagJRFIXhLzLFBNJYaJslSEylWOhq3IorMGQ16SyjYCFiZWU5pTaDFvOUyTAZ8RHID69555577oXLf/OEGaY4R3g/4IhORHg3eOXYYvSAeRQ8OWQYYoNPvDQYnxUr7zBB1grCAv3QbIlxjXmAb7Txhq+rkFUKq9NUU8vcJiizwDtOWGEdmvTKqT+61H0GXsP7jSxpEGF/R1e3wkO0FBeVRnhTSBTneBB3yvOI4D/mAnvrIwKM5s4AAAAAAElFTkSuQmCC";
  const iconInfo =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAnXAAAJ1wGxbhe3AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASVJREFUOI190r0uhFEQBuBnVxaF2PUTCkFchV0SV6BQi0rEbShFlCqNktJP0Iqf3i3YVSlXVEQozojP8e2+ySSTed+ZMzNnKnpjCFPhv+C9j/YPlnCBV3TCujhHq19iFftoYxOjBa4esTb2QvsP+7jFWJ9HxnEXRf5gGU9Z8gKucBl+sUgHTahE8AJnOCoIT/AcmhmsF7gtrGINBqWFFWcmLXMUhzjIuEbk1GA+2i/DNh4wUsK1MVfFV2GUHJO4xlsPHr8j1Eu44bAcDek2agP4lDZaxWMm3MEKbrL4hjT/8U+gJc00nglnw4qYkL5xMW9rTzqSvEiefI/dMrIaRTrSPzcKXCNinUguPeUfNKWj6kqH9Bz+aVnbvb6PtKTp8F/wUSb6Bu5YN5n7ff0kAAAAAElFTkSuQmCC";
  const iconSuccess =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAnXAAAJ1wGxbhe3AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAQtJREFUOI2F0jFOAlEQBuAPImoFqyTa6TEEbfUihruYDYfwCAg3UDsTY20na0VjgqUWWuxgHsuy/skk82bmn/fPm9eyHXs4Cn+Br4baNZxjhk8UYUtMMWwitjHGHNfoJrlexObIo3YDY9zjoOGSQzxEkzVc4O0fctqkwCANzkJiE9LmI9ytDrvKB+tWGQnylIAsOB04VcrfdluO55CeYo6THfygVUne4jX8S1zho1LTDu7fCL2KxCe8oF8zUqb8G51VYGrzEffD6jDCJA0MY6bqnHXoK9d4Vk3kyk/S1KSPR9zUJdvRpAiJWZLLIlYEufYrrzBQ7nyJ97ClcuYN2dX1pejgOPwFvuuKfgHXiDR+HL1j1AAAAABJRU5ErkJggg==";
  const iconError =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAnXAAAJ1wGxbhe3AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAARZJREFUOI2V0j1KQ1EQBeDPp4lWRiMoKVyAK9AoiLgJGytxD9oJNhKyDyvBnw2IugC3YGKVRk1KRbR48yC5vjzwwIHL3DPnzp2ZGdMxj9U4D/BZoZ3ANu4wQj84xC3aVYkZuujhCItjd42I9dAJ7R908YDlikeaeAyTCezgpST5IJia9LFVlA0nOMd7It4IjuMttKeFQR17uKooPcUV9lHL0ArX0T8MPqLa1hx+MDNFWDX7LHLV4/VGiWghmGJJvhu1WXzLO5rhORGeYRf3SfwQNVwWgbZ8SZqJcD04jhX5GDfTsjryJUlN0uQnXJRdZmHSx7H8nwWWItaP5NJVLrCFG3mTXoNDXJeVPW185E1ai/MAX2WiX9S3NSPYbj+uAAAAAElFTkSuQmCC";
  const iconWarning =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAnXAAAJ1wGxbhe3AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAARJJREFUOI2l0r8uRFEQBvAfu9glwUYiUaxHUEl0VDpKeq+wpZBINAqFRHgTKg0tCSqVhmKDEM1u/Esodm725rq7iC+ZzMnM982ZmXP4JwpdchWsYBrXeMkj9XQQV3GEi+BMYR63v+mqiDPUUrEaTiP3I1ZxEOcySnE+jFxXVPEQPimWiCYzOdCbKbCFPe1Z+8PgBvvBycVMCIdSsY2wBEPBmcnrYBtraKRib2EJGljHjswLLuI8Z6SS9hLTl15iIR08wZLv2AzLYjk0YATP8n9lVWbrgUJohosYxCdG8Zghdvp5ldCUi6hrPd0VjvGEVzTxEYLkogGMYQ67uEtvcgKzGA8y9IV/D9/Evdb89Q7d/Q1fB8U0mpUmzV0AAAAASUVORK5CYII=";
  const iconLeft =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABfSURBVDiNY2AY8oCZSHWxDAwMEgwMDHfJsaSAgYHhH9QQsjT/Z2BgKKe75gQGiLMLCSlkwiHOSI6t6ADmhYoBN6SIARIeidgkiUlIxxkYGB4xMDB8YmBguE6JSwYpAACvLRHTKwPjZgAAAABJRU5ErkJggg==";
  const iconRight =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABNSURBVDiN3dAxCoAwFATRh3fU2oAHiDbi5Y1F2jT+gKLbzyy7/DYjUo8g4cTWI8koOF6XrOqc5ifDDVGJthfsj8OLujtHYJgwR+GP5QKMxA9/SolDQgAAAABJRU5ErkJggg==";
  const iconLLeft =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABlSURBVDiN3ZLBDUBAEEUfmtCchA5woUMlOO1FCQrAwbqwf8eFhHd7mfzJn2Tg82TGvABywAmPUgOLD4XcDK9AJ/y5cOlrNsIvpCdPDL/FUbkX/t6Slv3+SjgQf6QBmIAZGAP+FzZJViOd89x8pAAAAABJRU5ErkJggg==";
  const iconRRight =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABmSURBVDiN3dGxCoAgEMbxfz1dL1BTREJzmUv08trgDYcg6VCD3/YD7zvkoLmMgFEegLmmwAAecOJVvNeUWCAAt7IHjt9LThkyiRf9qC8oCom70u0BuDL+bngj/tNm/JqJePucW8wDvGYdzT0nMUkAAAAASUVORK5CYII=";

  /** REQ */
  ui.Request = (url, payload = null, options = {}) => {
    const data = $(null),
      loading = $(false),
      error = $(null),
      success = $(false);
    let abortController = null;

    const execute = async (customPayload = null) => {
      const targetUrl = val(url);
      if (!targetUrl) return;

      if (abortController) abortController.abort();
      abortController = new AbortController();

      loading(true);
      error(null);
      success(false);
      try {
        const bodyData = customPayload || payload;
        const res = await fetch(targetUrl, {
          method: options.method || (bodyData ? "POST" : "GET"),
          headers: { "Content-Type": "application/json", ...options.headers },
          body: bodyData ? JSON.stringify(bodyData) : null,
          signal: abortController.signal,
          ...options,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let json = await res.json();
        if (typeof options.transform === "function") json = options.transform(json);

        data(json);
        success(true);
      } catch (err) {
        if (err.name !== "AbortError") error(err.message);
      } finally {
        loading(false);
      }
    };

    $(() => {
      execute();
      return () => abortController?.abort();
    });

    return { data, loading, error, success, reload: (p) => execute(p) };
  };

  /** RESPONSE */
  ui.Response = (reqObj, renderFn) =>
    $html("div", { class: "res-container" }, [
      $if(reqObj.loading, $html("div", { class: "flex justify-center p-4" }, $html("span", { class: "loading loading-dots text-primary" }))),
      $if(reqObj.error, () =>
        $html("div", { role: "alert", class: "alert alert-error" }, [
          $html("span", {}, reqObj.error()),
          ui.Button({ class: "btn-xs btn-ghost border-current", onclick: () => reqObj.reload() }, "Retry"),
        ]),
      ),
      $if(reqObj.success, () => {
        const current = reqObj.data();
        return current !== null ? renderFn(current) : null;
      }),
    ]);

  // --- UI COMPONENTS ---

  /** BUTTON */
  ui.Button = (props, children) => {
    const { badge, badgeClass, tooltip, icon, loading, ...rest } = props;
    const btn = $html(
      "button",
      {
        ...rest,
        class: joinClass("btn", props.class || props.class),
        disabled: () => val(loading) || val(props.disabled) || val(props.disabled),
      },
      [
        () => (val(loading) ? $html("span", { class: "loading loading-spinner" }) : null),
        icon ? $html("span", { class: "mr-1" }, icon) : null,
        children,
      ],
    );
    let out = btn;
    if (badge) {
      out = $html("div", { class: "indicator" }, [
        $html("span", { class: joinClass("indicator-item badge", badgeClass || "badge-secondary") }, badge),
        out,
      ]);
    }
    return tooltip ? $html("div", { class: "tooltip", "data-tip": tooltip }, out) : out;
  };

  /** INPUT */
  ui.Input = (props) => {
    const { label, tip, value, error, isSearch, icon, type = "text", ...rest } = props;
    const isPassword = type === "password";
    const visible = $(false);

    const iconsByType = {
      text: iconAbc,
      password: iconLock,
      date: iconCalendar,
      number: icon123,
      email: iconMail,
    };

    const inputEl = $html("input", {
      ...rest,
      type: () => (isPassword ? (visible() ? "text" : "password") : type),
      placeholder: props.placeholder || label || (isSearch ? tt("search")() : " "),
      class: joinClass("grow order-2 focus:outline-none", props.class),
      value: value,
      oninput: (e) => props.oninput?.(e),
      disabled: () => val(props.disabled),
    });

    const leftIcon = icon ? icon : iconsByType[type] ? $html("img", { src: iconsByType[type], class: "w-5 h-5 opacity-50", alt: type }) : null;

    return $html(
      "label",
      {
        class: () => joinClass("input input-bordered floating-label flex items-center gap-2 w-full relative", val(error) ? "input-error" : ""),
      },
      [
        leftIcon ? $html("div", { class: "order-1 shrink-0" }, leftIcon) : null,
        label ? $html("span", { class: "text-base-content/60 order-0" }, label) : null,
        inputEl,
        isPassword
          ? $html(
            "button",
            {
              type: "button",
              class: "order-3 btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100",
              onclick: (e) => {
                e.preventDefault();
                visible(!visible());
              },
            },
            () =>
              $html("img", {
                class: "w-5 h-5",
                src: visible() ? iconShow : iconHide,
              }),
          )
          : null,
        tip
          ? $html(
            "div",
            { class: "tooltip tooltip-left order-4", "data-tip": tip },
            $html("span", { class: "badge badge-ghost badge-xs cursor-help" }, "?"),
          )
          : null,
        () => (val(error) ? $html("span", { class: "text-error text-[10px] absolute -bottom-5 left-2" }, val(error)) : null),
      ],
    );
  };

  /** SELECT */
  ui.Select = (props) => {
    const { label, options, value, ...rest } = props;

    const selectEl = $html(
      "select",
      {
        ...rest,
        class: joinClass("select select-bordered w-full", props.class || props.class),
        value: value
      },
      $for(
        () => val(options) || [],
        (opt) =>
          $html(
            "option",
            {
              value: opt.value,
              $selected: () => String(val(value)) === String(opt.value),
            },
            opt.label,
          ),
        (opt) => opt.value,
      ),
    );

    if (!label) return selectEl;

    return $html("label", { class: "fieldset-label flex flex-col gap-1" }, [$html("span", {}, label), selectEl]);
  };

  /** AUTOCOMPLETE */
  ui.Autocomplete = (props) => {
    const { options = [], value, onSelect, label, placeholder, ...rest } = props;

    const query = $(val(value) || "");
    const isOpen = $(false);
    const cursor = $(-1);

    const list = $(() => {
      const q = query().toLowerCase();
      const data = val(options) || [];
      return q ? data.filter((o) => (typeof o === "string" ? o : o.label).toLowerCase().includes(q)) : data;
    });

    const pick = (opt) => {
      const valStr = typeof opt === "string" ? opt : opt.value;
      const labelStr = typeof opt === "string" ? opt : opt.label;

      query(labelStr);
      if (typeof value === "function") value(valStr);
      onSelect?.(opt);

      isOpen(false);
      cursor(-1);
    };

    const nav = (e) => {
      const items = list();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        isOpen(true);
        cursor(Math.min(cursor() + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cursor(Math.max(cursor() - 1, 0));
      } else if (e.key === "Enter" && cursor() >= 0) {
        e.preventDefault();
        pick(items[cursor()]);
      } else if (e.key === "Escape") {
        isOpen(false);
      }
    };

    return $html("div", { class: "relative w-full" }, [
      ui.Input({
        label,
        placeholder: placeholder || tt("search")(),
        value: query,
        onfocus: () => isOpen(true),
        onblur: () => setTimeout(() => isOpen(false), 150),
        onkeydown: nav,
        oninput: (e) => {
          const v = e.target.value;
          query(v);
          if (typeof value === "function") value(v);
          isOpen(true);
          cursor(-1);
        },
        ...rest,
      }),
      $html(
        "ul",
        {
          class: "absolute left-0 w-full menu bg-base-100 rounded-box mt-1 p-2 shadow-xl max-h-60 overflow-y-auto border border-base-300 z-50",
          style: () => (isOpen() && list().length ? "display:block" : "display:none"),
        },
        [
          $for(
            list,
            (opt, i) =>
              $html("li", {}, [
                $html(
                  "a",
                  {
                    class: () => `block w-full ${cursor() === i ? "active bg-primary text-primary-content" : ""}`,
                    onclick: () => pick(opt),
                    onmouseenter: () => cursor(i),
                  },
                  typeof opt === "string" ? opt : opt.label,
                ),
              ]),
            (opt, i) => (typeof opt === "string" ? opt : opt.value) + i,
          ),
          () => (list().length ? null : $html("li", { class: "p-2 text-center opacity-50" }, "No results")),
        ],
      ),
    ]);
  };

  /** DATEPICKER */
  ui.Datepicker = (props) => {
    const { value, range, label, placeholder, ...rest } = props;

    const isOpen = $(false);
    const internalDate = $(new Date());
    const hoverDate = $(null);
    const isRangeMode = () => val(range) === true;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const selectDate = (date) => {
      const dateStr = formatDate(date);
      const current = val(value);

      if (isRangeMode()) {
        if (!current?.start || (current.start && current.end)) {
          if (typeof value === "function") value({ start: dateStr, end: null });
        } else {
          const start = current.start;
          if (typeof value === "function") {
            value(dateStr < start ? { start: dateStr, end: start } : { start, end: dateStr });
          }
          isOpen(false);
        }
      } else {
        if (typeof value === "function") value(dateStr);
        isOpen(false);
      }
    };

    const displayValue = $(() => {
      const v = val(value);
      if (!v) return "";
      if (typeof v === "string") return v;
      if (v.start && v.end) return `${v.start} - ${v.end}`;
      if (v.start) return `${v.start}...`;
      return "";
    });

    const move = (m) => {
      const d = internalDate();
      internalDate(new Date(d.getFullYear(), d.getMonth() + m, 1));
    };

    const moveYear = (y) => {
      const d = internalDate();
      internalDate(new Date(d.getFullYear() + y, d.getMonth(), 1));
    };

    return $html("div", { class: "relative w-full" }, [
      ui.Input({
        label,
        placeholder: placeholder || (isRangeMode() ? "Seleccionar rango..." : "Seleccionar fecha..."),
        value: displayValue,
        readonly: true,
        icon: $html("img", { src: iconCalendar, class: "opacity-40" }),
        onclick: (e) => {
          e.stopPropagation();
          isOpen(!isOpen());
        },
        ...rest,
      }),

      $if(isOpen, () =>
        $html(
          "div",
          {
            class: "absolute left-0 mt-2 p-4 bg-base-100 border border-base-300 shadow-2xl rounded-box z-[100] w-80 select-none",
            onclick: (e) => e.stopPropagation(),
          },
          [
            $html("div", { class: "flex justify-between items-center mb-4 gap-1" }, [
              $html("div", { class: "flex gap-0.5" }, [
                $html(
                  "button",
                  { type: "button", class: "btn btn-ghost btn-xs px-1", onclick: () => moveYear(-1) },
                  $html("img", { src: iconLLeft, class: "opacity-40" }),
                ),
                $html(
                  "button",
                  { type: "button", class: "btn btn-ghost btn-xs px-1", onclick: () => move(-1) },
                  $html("img", { src: iconLeft, class: "opacity-40" }),
                ),
              ]),
              $html("span", { class: "font-bold uppercase flex-1 text-center" }, [
                () => internalDate().toLocaleString("es-ES", { month: "short", year: "numeric" }),
              ]),
              $html("div", { class: "flex gap-0.5" }, [
                $html(
                  "button",
                  { type: "button", class: "btn btn-ghost btn-xs px-1", onclick: () => move(1) },
                  $html("img", { src: iconRight, class: "opacity-40" }),
                ),
                $html(
                  "button",
                  { type: "button", class: "btn btn-ghost btn-xs px-1", onclick: () => moveYear(1) },
                  $html("img", { src: iconRRight, class: "opacity-40" }),
                ),
              ]),
            ]),

            $html("div", { class: "grid grid-cols-7 gap-1", onmouseleave: () => hoverDate(null) }, [
              ...["L", "M", "X", "J", "V", "S", "D"].map((d) => $html("div", { class: "text-[10px] opacity-40 font-bold text-center" }, d)),
              () => {
                const d = internalDate();
                const year = d.getFullYear();
                const month = d.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const offset = firstDay === 0 ? 6 : firstDay - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                const nodes = [];
                for (let i = 0; i < offset; i++) nodes.push($html("div"));

                for (let i = 1; i <= daysInMonth; i++) {
                  const date = new Date(year, month, i);
                  const dStr = formatDate(date);

                  nodes.push(
                    $html(
                      "button",
                      {
                        type: "button",
                        class: () => {
                          const v = val(value);
                          const h = hoverDate();
                          const isStart = typeof v === "string" ? v === dStr : v?.start === dStr;
                          const isEnd = v?.end === dStr;
                          let inRange = false;

                          if (isRangeMode() && v?.start) {
                            const start = v.start;
                            if (!v.end && h) {
                              inRange = (dStr > start && dStr <= h) || (dStr < start && dStr >= h);
                            } else if (v.end) {
                              inRange = dStr > start && dStr < v.end;
                            }
                          }

                          const base = "btn btn-xs p-0 aspect-square min-h-0 h-auto font-normal relative";
                          const state = isStart || isEnd ? "btn-primary z-10" : inRange ? "bg-primary/20 border-none rounded-none" : "btn-ghost";
                          const today = dStr === todayStr ? "ring-1 ring-primary ring-inset font-black text-primary" : "";

                          return `${base} ${state} ${today}`;
                        },
                        onmouseenter: () => {
                          if (isRangeMode()) hoverDate(dStr);
                        },
                        onclick: () => selectDate(date),
                      },
                      [i.toString()],
                    ),
                  );
                }
                return nodes;
              },
            ]),
          ],
        ),
      ),

      $if(isOpen, () => $html("div", { class: "fixed inset-0 z-[90]", onclick: () => isOpen(false) })),
    ]);
  };

  /** COLORPICKER  */
  ui.Colorpicker = (props) => {
    const { value, label, ...rest } = props;
    const isOpen = $(false);

    const palette = [
      ...["#000", "#1A1A1A", "#333", "#4D4D4D", "#666", "#808080", "#B3B3B3", "#FFF"],
      ...["#450a0a", "#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"],
      ...["#431407", "#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c", "#ffedd5"],
      ...["#713f12", "#a16207", "#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a", "#fff9c4"],
      ...["#064e3b", "#065f46", "#059669", "#10b981", "#34d399", "#4ade80", "#84cc16", "#d9f99d"],
      ...["#082f49", "#075985", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#22d3ee", "#cffafe"],
      ...["#1e1b4b", "#312e81", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#e0e7ff"],
      ...["#2e1065", "#4c1d95", "#6d28d9", "#7c3aed", "#8b5cf6", "#a855f7", "#d946ef", "#fae8ff"],
    ];

    const getColor = () => val(value) || "#000000";

    return $html("div", { class: "relative w-fit" }, [
      $html(
        "button",
        {
          type: "button",
          class: "btn px-3 bg-base-100 border-base-300 hover:border-primary/50 flex items-center gap-2 shadow-sm font-normal normal-case",
          onclick: (e) => {
            e.stopPropagation();
            isOpen(!isOpen());
          },
          ...rest,
        },
        [
          $html("div", {
            class: "size-5 rounded-sm shadow-inner border border-black/10 shrink-0",
            style: () => `background-color: ${getColor()}`,
          }),
          label ? $html("span", { class: "opacity-80" }, label) : null,
        ],
      ),

      $if(isOpen, () =>
        $html(
          "div",
          {
            class: "absolute left-0 mt-2 p-3 bg-base-100 border border-base-300 shadow-2xl rounded-box z-[110] w-64 select-none",
            onclick: (e) => e.stopPropagation(),
          },
          [
            $html(
              "div",
              { class: "grid grid-cols-8 gap-1" },
              palette.map((c) =>
                $html("button", {
                  type: "button",
                  style: `background-color: ${c}`,
                  class: () => {
                    const active = getColor().toLowerCase() === c.toLowerCase();
                    return `size-6 rounded-sm cursor-pointer transition-all hover:scale-125 hover:z-10 active:scale-95 outline-none border border-black/5 
                ${active ? "ring-2 ring-offset-1 ring-primary z-10 scale-110" : ""}`;
                  },
                  onclick: () => {
                    value(c);
                    isOpen(false);
                  },
                }),
              ),
            ),
          ],
        ),
      ),

      $if(isOpen, () =>
        $html("div", {
          class: "fixed inset-0 z-[100]",
          onclick: () => isOpen(false),
        }),
      ),
    ]);
  };

  /** CHECKBOX */
  ui.CheckBox = (props) => {
    const { value, tooltip, toggle, ...rest } = props;
    const checkEl = $html("input", {
      ...rest,
      type: "checkbox",
      class: () => (val(toggle) ? "toggle" : "checkbox"),
      checked: value
    });

    const layout = $html("label", { class: "label cursor-pointer justify-start gap-3" }, [
      checkEl,
      props.label ? $html("span", { class: "label-text" }, props.label) : null,
    ]);

    return tooltip ? $html("div", { class: "tooltip", "data-tip": tooltip }, layout) : layout;
  };

  /** RADIO */
  ui.Radio = (props) => {
    const { label, tooltip, value, ...rest } = props;

    const radioEl = $html("input", {
      ...rest,
      type: "radio",
      class: joinClass("radio", props.class || props.class),
      checked: () => val(value) === value,
      disabled: () => val(props.disabled) || val(props.disabled),
      onclick: () => typeof value === "function" && value(value),
    });

    if (!label && !tooltip) return radioEl;

    const layout = $html("label", { class: "label cursor-pointer justify-start gap-3" }, [
      radioEl,
      label ? $html("span", { class: "label-text" }, label) : null,
    ]);

    return tooltip ? $html("div", { class: "tooltip", "data-tip": tooltip }, layout) : layout;
  };

  /** RANGE */
  ui.Range = (props) => {
    const { label, tooltip, value, ...rest } = props;

    const rangeEl = $html("input", {
      ...rest,
      type: "range",
      class: joinClass("range", props.class),
      value: value,
      disabled: () => val(props.disabled)
    });

    if (!label && !tooltip) return rangeEl;

    const layout = $html("div", { class: "flex flex-col gap-2" }, [
      label ? $html("span", { class: "label-text" }, label) : null,
      rangeEl
    ]);

    return tooltip ? $html("div", { class: "tooltip", "data-tip": tooltip }, layout) : layout;
  };

  /** MODAL */
  ui.Modal = (props, children) => {
    const { title, buttons, open, ...rest } = props;
    const close = () => open(false);

    return $if(open, () =>
      $html("dialog", { ...rest, class: "modal modal-open" }, [
        $html("div", { class: "modal-box" }, [
          title ? $html("h3", { class: "text-lg font-bold mb-4" }, title) : null,
          typeof children === "function" ? children() : children,
          $html("div", { class: "modal-action flex gap-2" }, [
            ...(Array.isArray(buttons) ? buttons : [buttons]).filter(Boolean),
            ui.Button({ onclick: close }, tt("close")()),
          ]),
        ]),
        $html(
          "form",
          {
            method: "dialog",
            class: "modal-backdrop",
            onclick: (e) => (e.preventDefault(), close()),
          },
          [$html("button", {}, "close")],
        ),
      ]),
    );
  };

  /** GRID */
  ui.Grid = (props) => {
    const { data, options, class: className } = props;
    let gridApi = null;

    const container = $html("div", {
      style: "height: 100%; width: 100%;",
      class: className,
    });

    const observer = new MutationObserver(() => {
      if (gridApi) gridApi.setGridOption("theme", getTheme(isDark()));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    container._cleanups.add(() => observer.disconnect());

    const stopGrid = $watch(() => {
      const dark = isDark();
      const agTheme = getTheme(dark);
      const rowData = val(data) || [];

      if (!gridApi) {
        gridApi = createGrid(container, {
          ...(val(options) || {}),
          theme: agTheme,
          rowData: rowData,
        });
      } else {
        gridApi.setGridOption("theme", agTheme);
      }
    });
    container._cleanups.add(stopGrid);

    const stopData = $watch(() => {
      const rowData = val(data);
      if (gridApi && Array.isArray(rowData)) {
        gridApi.setGridOption("rowData", rowData);
      }
    });
    container._cleanups.add(stopData);

    container._cleanups.add(() => {
      if (gridApi) {
        gridApi.destroy();
        gridApi = null;
      }
    });

    return container;
  };

  /** DROPDOWN */
  ui.Dropdown = (props, children) => {
    const { label, icon, ...rest } = props;

    return $html(
      "div",
      {
        ...rest,
        class: () => `dropdown ${val(props.class) || props.class || ""}`,
      },
      [
        $html(
          "div",
          {
            tabindex: 0,
            role: "button",
            class: "btn m-1 flex items-center gap-2",
          },
          [icon ? (typeof icon === "function" ? icon() : icon) : null, label ? (typeof label === "function" ? label() : label) : null],
        ),
        $html(
          "ul",
          {
            tabindex: 0,
            class: "dropdown-content z-[50] menu p-2 shadow bg-base-100 rounded-box min-w-max border border-base-300",
          },
          [typeof children === "function" ? children() : children],
        ),
      ],
    );
  };

  /** ACCORDION */
  ui.Accordion = (props, children) => {
    const { title, name, open, ...rest } = props;

    return $html(
      "div",
      {
        ...rest,
        class: joinClass("collapse collapse-arrow bg-base-200 mb-2", props.class || props.class),
      },
      [
        $html("input", {
          type: name ? "radio" : "checkbox",
          name: name,
          checked: open
        }),
        $html("div", { class: "collapse-title text-xl font-medium" }, title),
        $html("div", { class: "collapse-content" }, children),
      ],
    );
  };

  /** TABS */
  ui.Tabs = (props) => {
    const { items, ...rest } = props;
    const itemsSignal = typeof items === "function" ? items : () => items || [];

    return $html("div", { ...rest, class: "flex flex-col gap-4 w-full" }, [
      $html(
        "div",
        {
          role: "tablist",
          class: joinClass("tabs tabs-box", props.class || props.class),
        },
        $for(
          itemsSignal,
          (it) =>
            $html(
              "a",
              {
                role: "tab",
                class: () => joinClass("tab", val(it.active) && "tab-active", val(it.disabled) && "tab-disabled", it.tip && "tooltip"),
                "data-tip": it.tip,
                onclick: (e) => !val(it.disabled) && it.onclick?.(e),
              },
              it.label,
            ),
          (t) => t.label,
        ),
      ),
      () => {
        const active = itemsSignal().find((it) => val(it.active));
        if (!active) return null;
        const content = val(active.content);
        return $html("div", { class: "p-4" }, [typeof content === "function" ? content() : content]);
      },
    ]);
  };

  /** BADGE */
  ui.Badge = (props, children) => $html("span", { ...props, class: joinClass("badge", props.class || props.class) }, children);

  /** TOOLTIP */
  ui.Tooltip = (props, children) =>
    $html("div", { ...props, class: joinClass("tooltip", props.class || props.class), "data-tip": props.tip }, children);

  /** NAVBAR */
  ui.Navbar = (props, children) =>
    $html("div", { ...props, class: joinClass("navbar bg-base-100 shadow-sm px-4", props.class || props.class) }, children);

  /** MENU */
  ui.Menu = (props) => {
    const renderItems = (items) =>
      $for(
        () => items || [],
        (it) =>
          $html("li", {}, [
            it.children
              ? $html("details", { open: it.open }, [
                $html("summary", {}, [it.icon && $html("span", { class: "mr-2" }, it.icon), it.label]),
                $html("ul", {}, renderItems(it.children)),
              ])
              : $html("a", { class: () => (val(it.active) ? "active" : ""), onclick: it.onclick }, [
                it.icon && $html("span", { class: "mr-2" }, it.icon),
                it.label,
              ]),
          ]),
        (it, i) => it.label || i,
      );

    return $html("ul", { ...props, class: joinClass("menu bg-base-200 rounded-box", props.class || props.class) }, renderItems(props.items));
  };

  /** DRAWER */
  ui.Drawer = (props) =>
    $html("div", { class: joinClass("drawer", props.class || props.class) }, [
      $html("input", {
        id: props.id,
        type: "checkbox",
        class: "drawer-toggle",
        checked: props.open,
      }),
      $html("div", { class: "drawer-content" }, props.content),
      $html("div", { class: "drawer-side" }, [
        $html("label", { for: props.id, class: "drawer-overlay", onclick: () => props.open?.(false) }),
        $html("div", { class: "min-h-full bg-base-200 w-80" }, props.side),
      ]),
    ]);

  /** FIELDSET */
  ui.Fieldset = (props, children) =>
    $html(
      "fieldset",
      {
        ...props,
        class: joinClass("fieldset bg-base-200 border border-base-300 p-4 rounded-lg", props.class || props.class),
      },
      [
        () => {
          const legendText = val(props.legend);
          return legendText ? $html("legend", { class: "fieldset-legend font-bold" }, [legendText]) : null;
        },
        children,
      ],
    );

  /** LIST */
  ui.List = (props) => {
    const { items, header, render, keyFn, class: className } = props;

    return $html(
      "ul",
      {
        class: joinClass("list bg-base-100 rounded-box shadow-md", className),
      },
      [
        $if(header, () => $html("li", { class: "p-4 pb-2 text-xs opacity-60 tracking-wide" }, [val(header)])),
        $for(items, (item, index) => $html("li", { class: "list-row" }, [render(item, index)]), keyFn),
      ],
    );
  };

  /** STACK */
  ui.Stack = (props, children) => $html("div", { ...props, class: joinClass("stack", props.class || props.class) }, children);

  /** STAT */
  ui.Stat = (props) =>
    $html("div", { ...props, class: joinClass("stat", props.class || props.class) }, [
      props.icon && $html("div", { class: "stat-figure text-secondary" }, props.icon),
      props.label && $html("div", { class: "stat-title" }, props.label),
      $html("div", { class: "stat-value" }, () => val(props.value) ?? props.value),
      props.desc && $html("div", { class: "stat-desc" }, props.desc),
    ]);

  /** SWAP */
  ui.Swap = (props) =>
    $html("label", { class: joinClass("swap", props.class || props.class) }, [
      $html("input", {
        type: "checkbox",
        checked: props.value
      }),
      $html("div", { class: "swap-on" }, props.on),
      $html("div", { class: "swap-off" }, props.off),
    ]);

  /** INDICATOR */
  ui.Indicator = (props, children) =>
    $html("div", { class: joinClass("indicator", props.class || props.class) }, [
      children,
      $html("span", { class: joinClass("indicator-item badge", props.badgeClass) }, props.badge),
    ]);

  /** RATING */
  ui.Rating = (props) => {
    const { value, count = 5, mask = "mask-star", readonly = false, ...rest } = props;
    const ratingGroup = `rating-${Math.random().toString(36).slice(2, 7)}`;

    return $html("div", {
      ...rest,
      class: () => `rating ${val(readonly) ? "pointer-events-none" : ""} ${props.class || ""}`,
    },
      Array.from({ length: val(count) }, (_, i) => {
        const starValue = i + 1;

        return $html("input", {
          type: "radio",
          name: ratingGroup,
          class: `mask ${mask}`,
          "aria-label": `${starValue} star`,
          checked: () => Math.round(val(value)) === starValue,
          onchange: () => {
            if (!val(readonly) && typeof value === "function") {
              value(starValue);
            }
          },
        });
      }));
  };

  /** ALERT */
  ui.Alert = (props, children) => {
    const { type = "info", soft = true, ...rest } = props;
    const icons = {
      info: iconInfo,
      success: iconSuccess,
      warning: iconWarning,
      error: iconError,
    };

    const typeClass = () => {
      const t = val(type);
      const map = {
        info: "alert-info",
        success: "alert-success",
        warning: "alert-warning",
        error: "alert-error",
      };
      return map[t] || t;
    };

    const content = children || props.message;

    return $html(
      "div",
      {
        ...rest,
        role: "alert",
        class: () => `alert ${typeClass()} ${val(soft) ? "alert-soft" : ""} ${props.class || ""}`,
      },
      [
        $html("img", {
          src: icons[val(type)] || icons.info,
          class: "w-4 h-4 object-contain",
          alt: val(type),
        }),
        $html("div", { class: "flex-1" }, [$html("span", {}, [typeof content === "function" ? content() : content])]),
        props.actions ? $html("div", { class: "flex-none" }, [typeof props.actions === "function" ? props.actions() : props.actions]) : null,
      ],
    );
  };

  /** TIMELINE */
  ui.Timeline = (props) => {
    const { items = [], vertical = true, compact = false, ...rest } = props;

    const icons = {
      info: iconInfo,
      success: iconSuccess,
      warning: iconWarning,
      error: iconError,
    };

    return $html(
      "ul",
      {
        ...rest,
        class: () =>
          `timeline ${val(vertical) ? "timeline-vertical" : "timeline-horizontal"} ${val(compact) ? "timeline-compact" : ""} ${props.class || ""}`,
      },
      [
        $for(
          items,
          (item, i) => {
            const isFirst = i === 0;
            const isLast = i === val(items).length - 1;
            const itemType = item.type || "success";
            const renderSlot = (content) => (typeof content === "function" ? content() : content);

            return $html("li", { class: "flex-1" }, [
              !isFirst ? $html("hr", { class: item.completed ? "bg-primary" : "" }) : null,
              $html("div", { class: "timeline-start" }, [renderSlot(item.title)]),
              $html("div", { class: "timeline-middle" }, [
                $html("img", {
                  src: icons[itemType] || item.icon || icons.success,
                  class: "w-4 h-4 object-contain mx-1",
                  alt: itemType,
                }),
              ]),
              $html("div", { class: "timeline-end timeline-box shadow-sm" }, [renderSlot(item.detail)]),
              !isLast ? $html("hr", { class: item.completed ? "bg-primary" : "" }) : null,
            ]);
          },
          (item, i) => item.id || i,
        ),
      ],
    );
  };

  /** FAB */
  ui.Fab = (props) => {
    const { icon, label, actions = [], position = "bottom-6 right-6", ...rest } = props;

    return $html(
      "div",
      {
        ...rest,
        class: () => `fab fixed ${val(position)} flex flex-col-reverse items-end gap-3 z-[100] ${props.class || ""}`,
      },
      [
        $html(
          "div",
          {
            tabindex: 0,
            role: "button",
            class: "btn btn-lg btn-circle btn-primary shadow-2xl",
          },
          [icon ? (typeof icon === "function" ? icon() : icon) : null, !icon && label ? label : null],
        ),

        ...val(actions).map((act) =>
          $html("div", { class: "flex items-center gap-3 transition-all duration-300" }, [
            act.label ? $html("span", { class: "badge badge-ghost shadow-sm whitespace-nowrap" }, act.label) : null,
            $html(
              "button",
              {
                type: "button",
                class: `btn btn-circle shadow-lg ${act.class || ""}`,
                onclick: (e) => {
                  e.stopPropagation();
                  act.onclick?.(e);
                },
              },
              [act.icon ? (typeof act.icon === "function" ? act.icon() : act.icon) : act.text || ""],
            ),
          ]),
        ),
      ],
    );
  };

  /** TOAST */
  ui.Toast = (message, type = "alert-success", duration = 3500) => {
    let container = document.getElementById("sigpro-toast-container");
    if (!container) {
      container = $html("div", {
        id: "sigpro-toast-container",
        class: "fixed top-0 right-0 z-[9999] p-4 flex flex-col gap-2 pointer-events-none",
      });
      document.body.appendChild(container);
    }

    const toastHost = $html("div", { style: "display: contents" });
    container.appendChild(toastHost);

    let timeoutId;
    const close = () => {
      clearTimeout(timeoutId);
      const el = toastHost.firstElementChild;
      if (el && !el.classList.contains("opacity-0")) {
        el.classList.add("translate-x-full", "opacity-0");
        setTimeout(() => {
          instance.destroy();
          toastHost.remove();
          if (!container.hasChildNodes()) container.remove();
        }, 300);
      } else {
        instance.destroy();
        toastHost.remove();
      }
    };

    const ToastComponent = () => {
      const el = $html(
        "div",
        {
          class: `alert alert-soft ${type} shadow-lg transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto`,
        },
        [
          $html("span", typeof message === "function" ? message : () => message),
          ui.Button({ class: "btn-xs btn-circle btn-ghost", onclick: close }, "✕"),
        ],
      );

      requestAnimationFrame(() => el.classList.remove("translate-x-10", "opacity-0"));
      return el;
    };

    const instance = $mount(ToastComponent, toastHost);

    if (duration > 0) {
      timeoutId = setTimeout(close, duration);
    }

    return close;
  };

  /** LOADING */
  ui.Loading = (props) => {
    return $if(props.$show, () =>
      $html("div", { class: "fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-base-100/30" }, [
        $html("span", { class: "loading loading-spinner loading-lg text-primary" }),
      ]),
    );
  };

  ui.tt = tt;
  Object.keys(ui).forEach((key) => {
    $[key] = ui[key];
    Object.defineProperty(window, key, {
      value: ui[key],
      writable: false,
      configurable: true,
      enumerable: true
    });
  });

  return ui;
};
