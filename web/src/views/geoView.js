// 地域流行格局：中国地图 + 城市气泡。
// 气泡大小编码播放量，颜色编码控制面板所选指标；点击城市切换聚焦。
import { state, setState, subscribe } from '../store.js';
import { COL, METRICS, filterRows, groupBy, computeMetric, sumPlays } from '../dataService.js';

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
      itemStyle: { areaColor: '#1b2440', borderColor: '#2c3a5e' },
      emphasis: { disabled: true },
      select: { disabled: true },
      label: { show: false },
    },
    tooltip: { backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' } },
    visualMap: {
      type: 'continuous',
      left: 12, bottom: 10,
      orient: 'horizontal',
      itemWidth: 10, itemHeight: 90,
      inRange: { color: ['#3b82f6', '#34d399', '#fbbf24', '#f87171'] },
      textStyle: { color: '#7b8bb0', fontSize: 10 },
    },
    series: [{
      name: 'cities',
      type: 'scatter',
      coordinateSystem: 'geo',
      symbolSize: v => v[3],
      label: {
        show: true, position: 'right', formatter: '{b}',
        color: '#cbd5e1', fontSize: 11,
      },
      labelLayout: { hideOverlap: true },
      emphasis: { scale: 1.2, label: { color: '#fff' } },
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
        value: [c.lng, c.lat, value, 14 + 22 * Math.sqrt(sumPlays(rows) / maxPlays), sumPlays(rows)],
        itemStyle: st.city === i
          ? { borderColor: '#fff', borderWidth: 2 }
          : { borderColor: 'rgba(255,255,255,.25)', borderWidth: 1 },
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
