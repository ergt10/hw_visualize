// 曲海星图：4247 首上榜歌曲的生命周期形态散点。
// x = 在榜周数（log），y = 峰值周播放（log），点径 = 累计播放，颜色 = 流派，
// ◆ = 圣诞季回归曲目（连续 3 个以上年份的 12 月重新上榜）。
// 三种形态一目了然：左上"脉冲型"、右侧"常青型"、左下"昙花一现"。
// 点击歌曲 -> 在生命周期视图展开它的周播放曲线。
import { state, setState, subscribe } from '../store.js';
import { SPOTIFY_COLORS, TCOL } from '../dataService.js';
import { MUTED, tooltip, axis } from '../theme.js';

export function initScatterView(el, { spotify }) {
  const chart = echarts.init(el);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 18, top: 26, bottom: 30 },
    tooltip,
    xAxis: {
      type: 'log', name: '在榜周数', nameLocation: 'middle', nameGap: 18,
      min: .9, max: 300,
      ...axis({ splitLine: { show: false } }),
    },
    yAxis: {
      type: 'log', name: '峰值(百万/周)',
      min: 1, max: 130,
      ...axis(),
    },
    // 形态分区注释
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
        silent: true, symbol: 'none',
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
    if (!spotify.curves[key]) return; // 仅各流派 Top40 保留周曲线
    setState({ evoGenre: t[TCOL.GENRE], track: state.track === key ? null : key });
  });

  function update(st) {
    const data = spotify.tracks.map((t, i) => {
      const focus = t[TCOL.GENRE] === st.evoGenre;
      const seasonal = t[TCOL.DECS] >= 3 && t[TCOL.WEEKS] <= 60;
      const selected = st.track === `${t[TCOL.NAME]}|${t[TCOL.ARTIST]}`;
      // 在榜周数是整数，按行号做 ±4% 确定性抖动，打散 log 轴左侧的竖条纹
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
        data,
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

  subscribe(update);
  update(state);
  return chart;
}

function zone(text, left, top) {
  return {
    type: 'text', left, top, silent: true,
    style: { text, fill: '#b3a98c', font: '600 11px "Noto Serif SC", serif' },
  };
}
