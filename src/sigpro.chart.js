//sigpro.chart.js

import { h, effect, untrack } from './sigpro.js';
import Highcharts from 'highcharts';

const isSeriesConfig = (d) => d[0] != null && typeof d[0] === 'object' && !Array.isArray(d[0]) && 'data' in d[0];

const toSeries = (d) =>
  d == null ? undefined
    : Array.isArray(d[0]) ? d.map(s => ({ data: s }))
    : isSeriesConfig(d) ? d
    : [{ data: d }];

export const Chart = (props) => {
  const { options, data, api, on, class: className, style = "height: 100%; width: 100%", dark } = props;

  const initChart = (container) => {
    let chart;

    const stop = effect(() => {
      const initialOptions = untrack(() => typeof options === 'function' ? options() : options) || {};
      const initialData = untrack(() => typeof data === 'function' ? data() : data);

      chart = Highcharts.chart(container, {
        ...initialOptions,
        credits: { enabled: false, ...(initialOptions.credits || {}) },
        series: toSeries(initialData) ?? initialOptions.series,
        chart: {
          ...(initialOptions.chart || {}),
          events: {
            ...(initialOptions.chart?.events || {}),
            load() { on?.onLoad?.(chart); },
            redraw() { on?.onRedraw?.(chart); },
            click(event) { on?.onClick?.(event, chart); },
          }
        }
      });

      if (api) api.current = chart;

      effect(() => {
        const newData = typeof data === 'function' ? data() : data;
        if (newData && chart && !chart.renderer.forExport) {
          if (Array.isArray(newData[0])) {
            newData.forEach((sd, i) => chart.series[i]?.setData(sd, false));
            chart.redraw();
          } else if (isSeriesConfig(newData)) {
            newData.forEach((s, i) => chart.series[i]?.update(s, false));
            chart.redraw();
          } else {
            chart.series[0]?.setData(newData, true);
          }
        }
      });

      let firstOptionsRun = true;
      effect(() => {
        const newOptions = typeof options === 'function' ? options() : options;
        if (firstOptionsRun) { firstOptionsRun = false; return; }
        if (newOptions && chart) {
          chart.update(newOptions, true, true);
        }
      });

      if (dark !== undefined) {
        let lastDark = null;
        effect(() => {
          const isDark = typeof dark === 'function' ? dark() : dark;
          if (isDark === lastDark) return;
          lastDark = isDark;
          chart.update({
            chart: { backgroundColor: isDark ? '#1d1d1d' : '#ffffff' },
            title: { style: { color: isDark ? '#ffffff' : '#333333' } }
          });
        });
      }

      return () => {
        if (chart) {
          chart.destroy();
          if (api) api.current = null;
        }
      };
    });

    return stop;
  };

  return h('div', { class: className, style, ref: initChart });
};