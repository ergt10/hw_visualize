import echarts from './echarts.js';
import { SPOTIFY_COLORS, TCOL } from '../services/dataService.js';
import { tooltip, axis } from '../styles/chartTheme.js';

export function initLifecycleChart(el, data, store) {
  const { spotify } = data;
  if (store.evoGenre === null) store.setState({ evoGenre: spotify.genres.indexOf('流行') });
  const chart = echarts.init(el);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 42, right: 14, top: 24, bottom: 22 },
    tooltip: { trigger: 'item', ...tooltip },
    xAxis: {
      type: 'category',
      data: spotify.weeks.map(formatWeek),
      ...axis({ axisLabel: { fontSize: 9, interval: 25 }, splitLine: { show: false } }),
    },
    yAxis: {
      type: 'value',
      name: '周播放(百万)',
      ...axis(),
    },
  });

  function update(st) {
    const g = spotify.genres[st.evoGenre];
    const color = SPOTIFY_COLORS[g];
    const keys = [];
    for (const t of spotify.tracks) {
      if (t[TCOL.GENRE] !== st.evoGenre) continue;
      const key = `${t[TCOL.NAME]}|${t[TCOL.ARTIST]}`;
      if (spotify.curves[key]) keys.push(key);
      if (keys.length >= 8) break;
    }
    if (st.track && spotify.curves[st.track] && !keys.includes(st.track)) keys.push(st.track);

    const series = keys.map((key, i) => {
      const [name, artist] = key.split('|');
      const selected = st.track === key;
      const lineData = new Array(spotify.weeks.length).fill(null);
      let peak = 0, peakWi = 0;
      for (const [wi, streams] of spotify.curves[key]) {
        lineData[wi] = streams;
        if (streams > peak) {
          peak = streams;
          peakWi = wi;
        }
      }
      const lineColor = selected ? '#3b3325' : shade(color, 1.15 - i * .09);
      return {
        name,
        type: 'line',
        data: lineData,
        smooth: true,
        symbol: 'none',
        connectNulls: false,
        z: selected ? 5 : 2,
        lineStyle: { width: selected ? 3 : 1.4, opacity: st.track && !selected ? .45 : 1 },
        color: lineColor,
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        markPoint: (i < 3 || selected) ? {
          silent: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: { color: lineColor },
          label: {
            show: true,
            position: 'top',
            distance: 3,
            color: lineColor,
            fontSize: 9.5,
            fontWeight: 600,
            formatter: name.length > 14 ? name.slice(0, 13) + '…' : name,
          },
          data: [{ coord: [peakWi, peak] }],
        } : undefined,
        tooltip: {
          formatter: p => `<b>${name}</b><br/>${artist}<br/>${p.name}：${p.value} 百万次/周`,
        },
      };
    });
    chart.setOption({ series }, { replaceMerge: ['series'] });
  }

  chart.on('click', p => {
    const key = Object.keys(spotify.curves).find(k => k.startsWith(p.seriesName + '|'));
    if (key) store.setState({ track: store.track === key ? null : key });
  });

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}

function formatWeek(w) {
  const [m, , y] = w.split('/');
  return `${y}-${m.padStart(2, '0')}`;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(Math.min(255, Math.max(0, c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
