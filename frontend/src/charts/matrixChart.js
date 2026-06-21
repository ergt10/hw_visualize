import echarts from './echarts.js';
import { filterRows, locationQuotient } from '../services/dataService.js';
import { DIV, INK, MUTED, tooltip, axis } from '../styles/chartTheme.js';

export function initMatrixChart(el, data, store) {
  const { china } = data;
  const chart = echarts.init(el);
  const cities = china.cities.map(c => c.name);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 14, top: 8, bottom: 36 },
    tooltip,
    xAxis: {
      type: 'category',
      data: cities,
      ...axis({ splitLine: { show: false }, axisLabel: { color: MUTED, fontSize: 10, interval: 0 } }),
    },
    yAxis: {
      type: 'category',
      data: china.genres,
      ...axis({ splitLine: { show: false }, axisLabel: { color: INK, fontSize: 11, interval: 0 } }),
    },
    visualMap: {
      type: 'continuous',
      show: false,
      dimension: 2,
      min: .85,
      max: 1.15,
      inRange: { color: DIV },
    },
    series: [{
      name: 'lq',
      type: 'heatmap',
      label: { show: true, fontSize: 9.5, color: INK, formatter: p => p.value[2].toFixed(2) },
      itemStyle: { borderColor: '#fbf8f1', borderWidth: 2, borderRadius: 2 },
      emphasis: { itemStyle: { borderColor: '#3b3325', borderWidth: 1 } },
    }],
  });

  chart.on('click', p => {
    if (p.seriesName !== 'lq') return;
    store.toggleCity(p.value[0]);
  });

  function update(st) {
    const rows = filterRows(china, st, ['city', 'genre']);
    const lq = locationQuotient(china, rows);
    const seriesData = [];
    cities.forEach((_, ci) => china.genres.forEach((_, gi) => {
      seriesData.push({
        value: [ci, gi, +(lq[ci]?.[gi] ?? 0).toFixed(3)],
        itemStyle: st.city !== null && st.city !== ci ? { opacity: .3 } : {},
      });
    }));
    chart.setOption({
      series: [{
        name: 'lq',
        data: seriesData,
        tooltip: {
          formatter: p => `<b>${cities[p.value[0]]}</b> · ${china.genres[p.value[1]]}<br/>
            偏好指数：${p.value[2]}<br/><span style="color:#94896f">&gt;1 偏爱 / &lt;1 冷淡（对全国基线）</span>`,
        },
      }],
    });
  }

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}
