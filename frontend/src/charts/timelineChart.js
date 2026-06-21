import echarts from './echarts.js';
import { COL, GENRE_COLORS, filterRows } from '../services/dataService.js';
import { LINE, MUTED, ACCENT, tooltip, axis } from '../styles/chartTheme.js';

export function initTimelineChart(el, data, store) {
  const { china } = data;
  const chart = echarts.init(el);
  const dateLabels = china.dates.map(d => d.slice(5));
  const weekends = china.dates
    .map((d, i) => [new Date(d).getDay(), i])
    .filter(([w]) => w === 0 || w === 6)
    .map(([, i]) => i);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 14, right: 14, top: 8, bottom: 38 },
    legend: { show: false },
    tooltip: { trigger: 'axis', ...tooltip },
    xAxis: {
      type: 'category',
      data: dateLabels,
      boundaryGap: false,
      ...axis({ splitLine: { show: false } }),
    },
    yAxis: {
      type: 'value',
      ...axis({ axisLabel: { show: false }, splitLine: { show: false } }),
    },
    dataZoom: [{
      type: 'slider',
      height: 14,
      bottom: 5,
      showDetail: false,
      showDataShadow: false,
      borderColor: LINE,
      backgroundColor: 'rgba(227,218,197,.25)',
      fillerColor: 'rgba(191,77,56,.12)',
      handleStyle: { color: ACCENT, borderColor: ACCENT },
      moveHandleSize: 0,
      textStyle: { color: MUTED, fontSize: 10 },
    }],
  });

  chart.on('datazoom', () => {
    const dz = chart.getOption().dataZoom[0];
    const range = [dz.startValue, dz.endValue];
    const whole = range[0] === 0 && range[1] === china.dates.length - 1;
    const next = whole ? null : range;
    if (JSON.stringify(next) !== JSON.stringify(store.dateRange)) {
      store.setState({ dateRange: next });
    }
  });

  function update(st) {
    const rows = filterRows(china, st, ['date', 'genre']);
    const active = st.genres === null
      ? new Set(china.genres.map((_, i) => i))
      : new Set(st.genres);
    const series = china.genres.map((g, gi) => {
      const daily = new Array(china.dates.length).fill(0);
      if (active.has(gi)) {
        for (const r of rows) {
          if (china.tracks[r[COL.TRACK]].genre === gi) daily[r[COL.DATE]] += r[COL.PLAYS];
        }
      }
      return {
        name: g,
        type: 'line',
        stack: 'total',
        smooth: true,
        symbol: 'none',
        areaStyle: { opacity: .7 },
        lineStyle: { width: 1 },
        color: GENRE_COLORS[g],
        data: active.has(gi) ? daily : [],
      };
    });
    series[0].markArea = {
      silent: true,
      itemStyle: { color: 'rgba(59,51,37,.05)' },
      data: weekends.map(i => [{ xAxis: Math.max(i - .5, 0) }, { xAxis: Math.min(i + .5, china.dates.length - 1) }]),
    };
    chart.setOption({ series });
    if (st.dateRange === null) {
      const dz = chart.getOption().dataZoom[0];
      if (dz.startValue !== 0 || dz.endValue !== china.dates.length - 1) {
        chart.dispatchAction({ type: 'dataZoom', startValue: 0, endValue: china.dates.length - 1 });
      }
    }
  }

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}
