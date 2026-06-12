// 播放热度时序演变：按风格堆叠的面积图，底部 dataZoom 滑块充当日期刷选器。
// 视图自身展示完整 25 天，刷选结果写回 store 驱动其他视图。
import { state, setState, subscribe } from '../store.js';
import { COL, GENRE_COLORS, filterRows } from '../dataService.js';

export function initTrendView(el, { china }) {
  const chart = echarts.init(el);
  const dateLabels = china.dates.map(d => d.slice(5));

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 48, right: 16, top: 28, bottom: 44 },
    legend: { show: false }, // 风格图例统一由顶部芯片承担
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' },
    },
    xAxis: {
      type: 'category', data: dateLabels, boundaryGap: false,
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#7b8bb0', fontSize: 10 },
    },
    yAxis: {
      type: 'value', name: '播放量', nameTextStyle: { color: '#7b8bb0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1d2a4a' } },
      axisLabel: { color: '#7b8bb0', fontSize: 10 },
    },
    dataZoom: [{
      type: 'slider', height: 18, bottom: 6,
      borderColor: '#36456e', backgroundColor: '#131c33',
      fillerColor: 'rgba(251,191,36,.15)',
      handleStyle: { color: '#fbbf24' },
      moveHandleSize: 0,
      textStyle: { color: '#7b8bb0', fontSize: 10 },
    }],
  });

  // 刷选 -> 写回全局日期范围（变化时才写，避免自触发循环）
  chart.on('datazoom', () => {
    const dz = chart.getOption().dataZoom[0];
    const range = [dz.startValue, dz.endValue];
    const whole = range[0] === 0 && range[1] === china.dates.length - 1;
    const next = whole ? null : range;
    if (JSON.stringify(next) !== JSON.stringify(state.dateRange)) {
      setState({ dateRange: next });
    }
  });

  function update(st) {
    // 日期是本视图的编码维度，不按日期过滤；城市/风格筛选生效
    const rows = filterRows(china, st, ['date', 'genre']);
    const active = st.genres ?? new Set(china.genres.map((_, i) => i));
    const series = china.genres.map((g, gi) => {
      const daily = new Array(china.dates.length).fill(0);
      if (active.has(gi)) {
        for (const r of rows) {
          if (china.tracks[r[COL.TRACK]].genre === gi) daily[r[COL.DATE]] += r[COL.PLAYS];
        }
      }
      return {
        name: g, type: 'line', stack: 'total', smooth: true,
        symbol: 'none', areaStyle: { opacity: .55 },
        lineStyle: { width: 1.5 },
        color: GENRE_COLORS[g],
        data: active.has(gi) ? daily : [],
      };
    });
    chart.setOption({ series });
    // 外部重置筛选时同步滑块位置
    if (st.dateRange === null) {
      const dz = chart.getOption().dataZoom[0];
      if (dz.startValue !== 0 || dz.endValue !== china.dates.length - 1) {
        chart.dispatchAction({ type: 'dataZoom', startValue: 0, endValue: china.dates.length - 1 });
      }
    }
  }

  subscribe(update);
  update(state);
  return chart;
}
