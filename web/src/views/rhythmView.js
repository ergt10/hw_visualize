// 城市听歌节律：小时 × 城市热力图，揭示各城市一天内的收听波峰。
// 受日期/风格筛选影响；聚焦某城市时淡化其余行。
import { state, subscribe, setState } from '../store.js';
import { COL, filterRows } from '../dataService.js';

export function initRhythmView(el, { china }) {
  const chart = echarts.init(el);
  const hours = [...Array(24).keys()];
  const cityNames = china.cities.map(c => c.name);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 60, top: 8, bottom: 22 },
    tooltip: {
      backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' },
      formatter: p => `<b>${cityNames[p.value[1]]}</b> ${p.value[0]}:00–${p.value[0]}:59<br/>播放量：${p.value[2]}`,
    },
    xAxis: {
      type: 'category', data: hours.map(h => h + '时'),
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#7b8bb0', fontSize: 9, interval: 1 },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category', data: cityNames,
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#7b8bb0', fontSize: 10 },
    },
    visualMap: {
      type: 'continuous', right: 4, top: 'center',
      itemWidth: 8, itemHeight: 80,
      inRange: { color: ['#16203a', '#1e3a8a', '#3b82f6', '#34d399', '#fbbf24'] },
      textStyle: { color: '#7b8bb0', fontSize: 9 },
    },
    series: [{
      type: 'heatmap',
      emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
    }],
  });

  // 点击某一行的格子可聚焦该城市（与地图点击等效）
  chart.on('click', p => {
    const idx = p.value[1];
    setState({ city: state.city === idx ? null : idx });
  });

  function update(st) {
    // 城市维度由 y 轴编码，因此不按城市过滤
    const rows = filterRows(china, st, ['city']);
    const grid = china.cities.map(() => new Array(24).fill(0));
    for (const r of rows) grid[r[COL.CITY]][r[COL.HOUR]] += r[COL.PLAYS];
    const data = [];
    grid.forEach((rowArr, ci) => rowArr.forEach((v, h) => {
      data.push({
        value: [h, ci, v],
        itemStyle: st.city !== null && st.city !== ci ? { opacity: .25 } : {},
      });
    }));
    chart.setOption({
      visualMap: { min: 0, max: Math.max(...grid.flat(), 1) },
      series: [{ data }],
    });
  }

  subscribe(update);
  update(state);
  return chart;
}
