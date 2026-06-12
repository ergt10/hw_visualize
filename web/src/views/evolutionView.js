// 全球流派演变长河（Spotify 2017-2021 主题河流图）+ 热门歌曲生命周期曲线。
// 点击河流中的流派 -> 右侧展示该流派 Top 歌曲的周播放量轨迹，
// 曲线形态直接呈现"爆发期-持续期-衰退期"。
import { state, setState, subscribe } from '../store.js';
import { SPOTIFY_COLORS, GENRE_BRIDGE } from '../dataService.js';

export function initEvolutionView(riverEl, lifecycleEl, { china, spotify }) {
  if (state.evoGenre === null) state.evoGenre = spotify.genres.indexOf('流行');
  const river = echarts.init(riverEl);
  const lifecycle = echarts.init(lifecycleEl);
  const titleEl = document.getElementById('lifecycle-title');

  // ---------- 主题河流 ----------
  const riverData = [];
  spotify.genres.forEach((g, gi) => {
    spotify.months.forEach((m, mi) => {
      riverData.push([m + '-15', spotify.monthly[gi][mi], g]);
    });
  });

  river.setOption({
    backgroundColor: 'transparent',
    color: spotify.genres.map(g => SPOTIFY_COLORS[g]),
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,.3)' } },
    },
    singleAxis: {
      type: 'time', bottom: 24, top: 16, left: 16, right: 16,
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#7b8bb0', fontSize: 10 },
    },
    series: [{
      type: 'themeRiver',
      data: riverData,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,.6)' } },
      tooltip: { valueFormatter: v => v + ' 亿次' },
    }],
  });

  river.on('click', p => {
    setState({ evoGenre: spotify.genres.indexOf(p.data[2]) });
  });

  // ---------- 生命周期 ----------
  lifecycle.setOption({
    backgroundColor: 'transparent',
    grid: { left: 48, right: 16, top: 24, bottom: 24 },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' },
    },
    xAxis: {
      type: 'category', data: spotify.weeks.map(formatWeek),
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#7b8bb0', fontSize: 9, interval: 25 },
    },
    yAxis: {
      type: 'value', name: '周播放(百万)', nameTextStyle: { color: '#7b8bb0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1d2a4a' } },
      axisLabel: { color: '#7b8bb0', fontSize: 10 },
    },
  });

  function update(st) {
    const g = spotify.genres[st.evoGenre];
    titleEl.innerHTML = `热门歌曲生命周期 · <span style="color:${SPOTIFY_COLORS[g]}">${g}</span>
      <small>该流派累计播放 Top 8 · 悬停查看歌曲</small>`;

    const tracks = spotify.lifecycle.filter(t => t.genre === st.evoGenre);
    const series = tracks.map(t => {
      const data = new Array(spotify.weeks.length).fill(null);
      for (const [wi, streams] of t.weeks) data[wi] = +(streams / 1e6).toFixed(1);
      return {
        name: t.name, type: 'line', data,
        smooth: true, symbol: 'none', connectNulls: false,
        lineStyle: { width: 1.5 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        tooltip: {
          formatter: p => `<b>${t.name}</b><br/>${t.artist}<br/>${p.name}：${p.value} 百万次/周`,
        },
      };
    });
    // 单色系深浅区分同流派的不同歌曲
    const base = SPOTIFY_COLORS[g];
    lifecycle.setOption({
      color: tracks.map((_, i) => shade(base, 1 - i * 0.09)),
      series,
    }, { replaceMerge: 'series' });

    // 河流图高亮与中国数据集风格筛选的语义联动：
    // 当左侧只选中一个中国风格且存在映射时，自动切换生命周期流派
    river.dispatchAction({ type: 'downplay', seriesIndex: 0 });
  }

  // 中国风格筛选 -> Spotify 流派的桥接（单选时联动）
  subscribe(st => {
    if (st.genres && st.genres.size === 1) {
      const cn = china.genres[[...st.genres][0]];
      const target = spotify.genres.indexOf(GENRE_BRIDGE[cn]);
      if (target >= 0 && target !== st.evoGenre) setState({ evoGenre: target });
    }
  });

  subscribe(update);
  update(state);
  return [river, lifecycle];
}

function formatWeek(w) {
  const [m, , y] = w.split('/');
  return `${y}-${m.padStart(2, '0')}`;
}

// 颜色乘法调暗，用于同流派多曲线的深浅渐变
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(Math.min(255, Math.max(0, c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
