import echarts from './echarts.js';
import { SPOTIFY_COLORS, TCOL } from '../services/dataService.js';
import { MUTED, tooltip, axis } from '../styles/chartTheme.js';

export function initScatterChart(el, data, store) {
  const { spotify } = data;
  const chart = echarts.init(el);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 18, top: 26, bottom: 30 },
    tooltip,
    xAxis: {
      type: 'log',
      name: '在榜周数',
      nameLocation: 'middle',
      nameGap: 18,
      min: .9,
      max: 300,
      ...axis({ splitLine: { show: false } }),
    },
    yAxis: {
      type: 'log',
      name: '峰值(百万/周)',
      min: 1,
      max: 130,
      ...axis(),
    },
    graphic: [
      zone('脉冲型 爆红速朽', '14%', '12%'),
      zone('常青型 长线热门', '72%', '12%'),
      zone('昙花一现', '14%', '82%'),
    ],
    series: [{
      name: 'tracks',
      type: 'scatter',
      progressive: 2000,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: MUTED, type: 'dashed', opacity: .5 },
        label: { color: MUTED, fontSize: 9, formatter: '一年' },
        data: [{ xAxis: 52 }],
      },
    }],
  });

  chart.on('click', p => {
    if (p.seriesName !== 'tracks') return;
    const t = p.data.track;
    const key = `${t[TCOL.NAME]}|${t[TCOL.ARTIST]}`;
    if (!spotify.curves[key]) return;
    store.setState({ evoGenre: t[TCOL.GENRE], track: store.track === key ? null : key });
  });

  function update(st) {
    const seriesData = spotify.tracks.map((t, i) => {
      const focus = t[TCOL.GENRE] === st.evoGenre;
      const seasonal = t[TCOL.DECS] >= 3 && t[TCOL.WEEKS] <= 60;
      const selected = st.track === `${t[TCOL.NAME]}|${t[TCOL.ARTIST]}`;
      const jitter = 1 + ((i * 37 % 97) - 48) / 1200;
      return {
        value: [Math.max(t[TCOL.WEEKS], 1) * jitter, Math.max(t[TCOL.PEAK], 1.01)],
        track: t,
        symbol: seasonal ? 'diamond' : 'circle',
        symbolSize: selected ? 16 : 2.5 + 8 * Math.sqrt(t[TCOL.TOTAL] / 25),
        itemStyle: {
          color: SPOTIFY_COLORS[spotify.genres[t[TCOL.GENRE]]],
          opacity: selected ? 1 : focus ? .9 : .38,
          borderColor: selected ? '#3b3325' : 'transparent',
          borderWidth: selected ? 1.5 : 0,
        },
      };
    });
    chart.setOption({
      series: [{
        name: 'tracks',
        data: seriesData,
        tooltip: {
          formatter: p => {
            const t = p.data.track;
            return `<b>${t[TCOL.NAME]}</b><br/>${t[TCOL.ARTIST]}<br/>
              ${spotify.genres[t[TCOL.GENRE]]} · 在榜 ${t[TCOL.WEEKS]} 周 · 峰值 ${t[TCOL.PEAK]} 百万/周<br/>
              累计 ${t[TCOL.TOTAL]} 亿次` +
              (spotify.curves[`${t[TCOL.NAME]}|${t[TCOL.ARTIST]}`]
                ? '<br/><span style="color:#bf4d38">点击展开生命周期曲线</span>' : '');
          },
        },
      }],
    });
  }

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}

function zone(text, left, top) {
  return {
    type: 'text',
    left,
    top,
    silent: true,
    style: { text, fill: '#b3a98c', font: '600 11px "Noto Serif SC", serif' },
  };
}
