// 生命周期：当前流派累计播放 Top 8 歌曲的周播放曲线（单色系深浅区分），
// 曲线形态直接呈现"爆发-持续-衰退"；星图选中的歌曲以高亮粗线叠加。
import { state, setState, subscribe } from '../store.js';
import { SPOTIFY_COLORS, TCOL } from '../dataService.js';
import { tooltip, axis } from '../theme.js';

export function initLifecycleView(el, { spotify }) {
  if (state.evoGenre === null) state.evoGenre = spotify.genres.indexOf('流行');
  const chart = echarts.init(el);
  const titleEl = document.getElementById('lifecycle-title');
  const tagHtml = titleEl.querySelector('.tag').outerHTML;

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 42, right: 14, top: 24, bottom: 22 },
    tooltip: { trigger: 'item', ...tooltip },
    xAxis: {
      type: 'category', data: spotify.weeks.map(formatWeek),
      ...axis({ axisLabel: { fontSize: 9, interval: 25 }, splitLine: { show: false } }),
    },
    yAxis: {
      type: 'value', name: '周播放(百万)',
      ...axis(),
    },
  });

  function update(st) {
    const g = spotify.genres[st.evoGenre];
    const color = SPOTIFY_COLORS[g];
    titleEl.innerHTML = `${tagHtml}生命周期 · <span style="color:${color}">${g}</span>
      <small>累计播放 Top 8 · 点击星图加入歌曲</small>`;

    // 该流派 Top 8（按累计播放降序，预处理已排序）+ 星图选中曲目
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
      const data = new Array(spotify.weeks.length).fill(null);
      for (const [wi, streams] of spotify.curves[key]) data[wi] = streams;
      return {
        name, type: 'line', data,
        smooth: true, symbol: 'none', connectNulls: false,
        z: selected ? 5 : 2,
        lineStyle: { width: selected ? 3 : 1.4, opacity: st.track && !selected ? .45 : 1 },
        color: selected ? '#3b3325' : shade(color, 1.15 - i * .09),
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        tooltip: {
          formatter: p => `<b>${name}</b><br/>${artist}<br/>${p.name}：${p.value} 百万次/周`,
        },
      };
    });
    chart.setOption({ series }, { replaceMerge: 'series' });
  }

  chart.on('click', p => {
    // 点击曲线 -> 选中/取消选中该歌曲
    const key = Object.keys(spotify.curves).find(k => k.startsWith(p.seriesName + '|'));
    if (key) setState({ track: state.track === key ? null : key });
  });

  subscribe(update);
  update(state);
  return chart;
}

function formatWeek(w) {
  const [m, , y] = w.split('/');
  return `${y}-${m.padStart(2, '0')}`;
}

// 颜色乘法调暗/调亮，用于同流派多曲线的深浅渐变
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(Math.min(255, Math.max(0, c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
