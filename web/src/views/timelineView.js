// 时光轴：按风格堆叠的窄幅面积图，底部 dataZoom 滑块充当全局日期刷选器。
// 视图自身展示完整 25 天（周末以灰带标出），刷选结果写回 store 驱动其他视图。
import { state, setState, subscribe } from '../store.js';
import { COL, GENRE_COLORS, filterRows } from '../dataService.js';
import { LINE, MUTED, ACCENT, tooltip, axis } from '../theme.js';

export function initTimelineView(el, { china }) {
  const chart = echarts.init(el);
  const dateLabels = china.dates.map(d => d.slice(5));
  // 周末日期下标（2025-12-06 是周六）
  const weekends = china.dates
    .map((d, i) => [new Date(d).getDay(), i])
    .filter(([w]) => w === 0 || w === 6)
    .map(([, i]) => i);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 14, right: 14, top: 8, bottom: 38 },
    legend: { show: false }, // 风格图例统一由顶部芯片承担
    tooltip: { trigger: 'axis', ...tooltip },
    xAxis: {
      type: 'category', data: dateLabels, boundaryGap: false,
      ...axis({ splitLine: { show: false } }),
    },
    // 上下文条带：纵轴刻度无信息量，隐去以换取图形空间
    yAxis: {
      type: 'value',
      ...axis({ axisLabel: { show: false }, splitLine: { show: false } }),
    },
    dataZoom: [{
      type: 'slider', height: 14, bottom: 5, showDetail: false, showDataShadow: false,
      borderColor: LINE, backgroundColor: 'rgba(227,218,197,.25)',
      fillerColor: 'rgba(191,77,56,.12)',
      handleStyle: { color: ACCENT, borderColor: ACCENT },
      moveHandleSize: 0,
      textStyle: { color: MUTED, fontSize: 10 },
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
        symbol: 'none', areaStyle: { opacity: .7 },
        lineStyle: { width: 1 },
        color: GENRE_COLORS[g],
        data: active.has(gi) ? daily : [],
      };
    });
    // 周末灰带挂在第一个系列上
    series[0].markArea = {
      silent: true,
      itemStyle: { color: 'rgba(59,51,37,.05)' },
      data: weekends.map(i => [{ xAxis: Math.max(i - .5, 0) }, { xAxis: Math.min(i + .5, china.dates.length - 1) }]),
    };
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
