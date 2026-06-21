import echarts from './echarts.js';
import { COL, METRICS, filterRows, groupBy, computeMetric, sumPlays } from '../services/dataService.js';
import { INK, MUTED, tooltip } from '../styles/chartTheme.js';

const VIEW = { zoom: 2.4, center: [112.5, 31.5] };
const LABEL_POS = {
  北京: 'right', 西安: 'left', 成都: 'left', 重庆: 'bottom', 武汉: 'top',
  南京: 'top', 上海: 'right', 杭州: 'bottom', 广州: 'left', 深圳: 'bottom',
};
const BUBBLE_SEQ = ['#dec27f', '#c8742f', '#9e2f1c'];

export async function initGeoChart(el, data, store) {
  const { china } = data;
  const geoJson = await fetch('/lib/china.json').then(r => r.json());
  echarts.registerMap('china', geoJson);
  const chart = echarts.init(el);

  chart.setOption({
    backgroundColor: 'transparent',
    geo: {
      map: 'china',
      roam: true,
      ...VIEW,
      itemStyle: { areaColor: '#ede4cf', borderColor: '#d2c5a6', borderWidth: .8 },
      emphasis: { disabled: true },
      select: { disabled: true },
      label: { show: false },
    },
    tooltip,
    visualMap: {
      type: 'continuous',
      left: 12, bottom: 8,
      orient: 'horizontal',
      itemWidth: 9, itemHeight: 80,
      inRange: { color: BUBBLE_SEQ },
      textStyle: { color: MUTED, fontSize: 10 },
    },
    series: [{
      name: 'cities',
      type: 'scatter',
      coordinateSystem: 'geo',
      symbolSize: v => v[3],
      label: { show: true, formatter: '{b}', color: INK, fontSize: 11 },
      itemStyle: { shadowBlur: 6, shadowColor: 'rgba(59,51,37,.3)' },
      emphasis: { scale: 1.2, label: { fontWeight: 'bold' } },
    }],
  });

  chart.on('click', params => {
    if (params.seriesName !== 'cities') return;
    const idx = china.cities.findIndex(c => c.name === params.name);
    store.toggleCity(idx);
  });

  function update(st) {
    const byCity = groupBy(filterRows(china, st, ['city']), COL.CITY);
    const playsArr = [...byCity.values()].map(sumPlays);
    const maxPlays = Math.max(...playsArr, 1);
    const values = [];
    const seriesData = china.cities.map((c, i) => {
      const rows = byCity.get(i) || [];
      const value = computeMetric(rows, st.metric);
      const plays = sumPlays(rows);
      values.push(value);
      return {
        name: c.name,
        value: [c.lng, c.lat, value, 11 + 17 * Math.sqrt(plays / maxPlays), plays],
        itemStyle: st.city === i
          ? { borderColor: '#3b3325', borderWidth: 2 }
          : { borderColor: 'rgba(251,248,241,.9)', borderWidth: 1.2 },
        label: {
          position: LABEL_POS[c.name] || 'right',
          fontWeight: st.city === i ? 'bold' : 'normal',
        },
      };
    });
    const metric = METRICS[st.metric];
    chart.setOption({
      visualMap: {
        min: Math.min(...values),
        max: Math.max(...values),
        dimension: 2,
        formatter: v => metric.format(v),
        text: [metric.label, ''],
      },
      series: [{
        name: 'cities',
        data: seriesData,
        tooltip: {
          formatter: p =>
            `<b>${p.name}</b><br/>播放量：${p.value[4].toLocaleString()}<br/>${metric.label}：${metric.format(p.value[2])}`,
        },
      }],
    });
  }

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}
