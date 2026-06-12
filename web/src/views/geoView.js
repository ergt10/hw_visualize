// 乐潮地图：中国地图 + 城市气泡。
// 气泡大小编码播放量，颜色编码控制面板所选指标；点击城市切换聚焦。
import { state, setState, subscribe } from '../store.js';
import { COL, METRICS, filterRows, groupBy, computeMetric, sumPlays } from '../dataService.js';
import { SEQ, INK, MUTED, tooltip } from '../theme.js';

export async function initGeoView(el, { china }) {
  const geoJson = await fetch('lib/china.json').then(r => r.json());
  echarts.registerMap('china', geoJson);
  const chart = echarts.init(el);

  chart.setOption({
    backgroundColor: 'transparent',
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.9,
      center: [111.5, 32],
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
      inRange: { color: SEQ },
      textStyle: { color: MUTED, fontSize: 10 },
    },
    series: [{
      name: 'cities',
      type: 'scatter',
      coordinateSystem: 'geo',
      symbolSize: v => v[3],
      label: {
        show: true, position: 'right', formatter: '{b}',
        color: INK, fontSize: 11,
      },
      labelLayout: { hideOverlap: true },
      itemStyle: { shadowBlur: 6, shadowColor: 'rgba(59,51,37,.3)' },
      emphasis: { scale: 1.2, label: { fontWeight: 'bold' } },
    }],
  });

  chart.on('click', params => {
    if (params.seriesName !== 'cities') return;
    const idx = china.cities.findIndex(c => c.name === params.name);
    setState({ city: state.city === idx ? null : idx }); // 再次点击取消聚焦
  });

  function update(st) {
    // 城市气泡不受城市筛选影响（编码维度即城市），受日期/风格筛选
    const byCity = groupBy(filterRows(china, st, ['city']), COL.CITY);
    const playsArr = [...byCity.values()].map(sumPlays);
    const maxPlays = Math.max(...playsArr, 1);
    const values = [];
    const data = china.cities.map((c, i) => {
      const rows = byCity.get(i) || [];
      const value = computeMetric(rows, st.metric);
      values.push(value);
      return {
        name: c.name,
        // [经度, 纬度, 指标值(供 visualMap), 气泡尺寸, 播放量]
        value: [c.lng, c.lat, value, 13 + 21 * Math.sqrt(sumPlays(rows) / maxPlays), sumPlays(rows)],
        itemStyle: st.city === i
          ? { borderColor: '#3b3325', borderWidth: 2 }
          : { borderColor: 'rgba(251,248,241,.9)', borderWidth: 1.2 },
        label: { fontWeight: st.city === i ? 'bold' : 'normal' },
      };
    });
    const m = METRICS[st.metric];
    chart.setOption({
      visualMap: {
        min: Math.min(...values), max: Math.max(...values),
        dimension: 2,
        formatter: v => m.format(v),
        text: [m.label, ''],
      },
      series: [{
        name: 'cities',
        data,
        tooltip: {
          formatter: p =>
            `<b>${p.name}</b><br/>播放量：${p.value[4].toLocaleString()}<br/>${m.label}：${m.format(p.value[2])}`,
        },
      }],
    });
  }

  subscribe(update);
  update(state);
  return chart;
}
