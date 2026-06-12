// 城市画像（details-on-demand）：当前筛选范围下的 KPI 与热门歌曲榜。
// 纯 DOM 排版（非图表），聚焦城市时 KPI 显示相对全国基线的差异。
import { state, subscribe } from '../store.js';
import { COL, GENRE_COLORS, METRICS, filterRows } from '../dataService.js';

export function initProfileView({ china }) {
  const body = document.getElementById('profile-body');

  function update(st) {
    const rows = filterRows(china, st);                    // 全维度筛选后的范围
    const nationalRows = filterRows(china, st, ['city']);  // 同期全国（对照基线）

    const cityName = st.city === null ? '全国' : china.cities[st.city].name;
    const dateLabel = st.dateRange === null
      ? '12-01 ~ 12-25'
      : `${china.dates[st.dateRange[0]].slice(5)} ~ ${china.dates[st.dateRange[1]].slice(5)}`;

    // ---- KPI（聚焦城市时显示与全国均值的差异）----
    const cmp = st.city !== null;
    const kpis = ['plays', 'collectRate', 'repeatRate', 'fullRate'].map(m => {
      const v = computeRate(rows, m);
      let delta = '';
      if (cmp && m !== 'plays') {
        const nv = computeRate(nationalRows, m);
        if (nv > 0) {
          const diff = (v - nv) / nv * 100;
          delta = `<span class="d ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(1)}%</span>`;
        }
      }
      return `<div class="kpi"><div class="v">${METRICS[m].format(v)}</div>
        <div class="l"><span>${METRICS[m].label}</span>${delta}</div></div>`;
    }).join('');

    // ---- 热门歌曲榜 ----
    const byTrack = new Map();
    for (const r of rows) {
      const t = r[COL.TRACK];
      byTrack.set(t, (byTrack.get(t) || 0) + r[COL.PLAYS]);
    }
    const top = [...byTrack.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxPlays = top[0]?.[1] || 1;
    const list = top.map(([ti, plays], i) => {
      const t = china.tracks[ti];
      const color = GENRE_COLORS[china.genres[t.genre]];
      return `<div class="trk">
        <span class="no">${i + 1}</span>
        <div class="meta"><span class="t">${t.name}</span><span class="a"> · ${t.artist} · ${t.emotion}</span></div>
        <div class="bar"><i style="width:${(plays / maxPlays * 100).toFixed(0)}%;background:${color}"></i></div>
        <span class="pv">${plays.toLocaleString()}</span>
      </div>`;
    }).join('');

    body.innerHTML = `
      <div id="profile-place"><span class="name">${cityName}</span><span class="range">${dateLabel}${cmp ? ' · 对比全国' : ''}</span></div>
      <div id="kpi-grid">${kpis}</div>
      <div id="track-list"><div class="sec">热门歌曲 TOP 5</div>${list}</div>`;
  }

  subscribe(update);
  update(state);
  return { resize() {} }; // 与图表视图统一接口
}

function computeRate(rows, metric) {
  let plays = 0, x = 0;
  const col = { collectRate: COL.COLLECTS, repeatRate: COL.REPEATS, fullRate: COL.FULLS }[metric];
  for (const r of rows) { plays += r[COL.PLAYS]; if (col) x += r[col]; }
  return metric === 'plays' ? plays : (plays ? x / plays : 0);
}
