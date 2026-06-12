// 区域画像（details-on-demand）：当前筛选范围下的 KPI、风格偏好指数、热门歌曲榜。
// 偏好指数 = 该城市某风格播放占比 / 全国该风格播放占比，>1 表示偏爱。
import { state, subscribe } from '../store.js';
import { COL, GENRE_COLORS, METRICS, filterRows, sumPlays } from '../dataService.js';

export function initProfileView({ china }) {
  const titleEl = document.getElementById('profile-title');
  const kpiEl = document.getElementById('kpi-row');
  const listEl = document.getElementById('track-list');
  const prefChart = echarts.init(document.getElementById('pref-chart'));

  prefChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 30, top: 20, bottom: 4 },
    tooltip: {
      backgroundColor: '#1d2a4a', borderColor: '#36456e', textStyle: { color: '#cbd5e1' },
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1d2a4a' } },
      axisLabel: { color: '#7b8bb0', fontSize: 9 },
    },
    yAxis: {
      type: 'category', data: china.genres,
      axisLine: { lineStyle: { color: '#36456e' } },
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
    },
    series: [{ type: 'bar', barWidth: 12 }],
  });

  function kpiCard(label, value, nationalValue) {
    let delta = '';
    if (nationalValue !== undefined && nationalValue > 0) {
      const diff = (value - nationalValue) / nationalValue * 100;
      const cls = diff >= 0 ? 'delta-up' : 'delta-down';
      delta = `<span class="${cls}">${diff >= 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(1)}%</span>`;
    }
    return `<div class="kpi"><div class="kpi-value">${value}${delta ? '' : ''}</div>
      <div class="kpi-label">${label} ${delta}</div></div>`;
  }

  function update(st) {
    const rows = filterRows(china, st);                    // 全维度筛选后的范围
    const nationalRows = filterRows(china, st, ['city']);  // 同期全国（对照基线）

    const cityName = st.city === null ? '全国' : china.cities[st.city].name;
    const dateLabel = st.dateRange === null
      ? '12-01 ~ 12-25'
      : `${china.dates[st.dateRange[0]].slice(5)} ~ ${china.dates[st.dateRange[1]].slice(5)}`;
    titleEl.textContent = `区域画像 · ${cityName} · ${dateLabel}`;

    // ---- KPI（聚焦城市时显示与全国均值的差异）----
    const ms = ['plays', 'collectRate', 'repeatRate', 'fullRate'];
    const cmp = st.city !== null;
    kpiEl.innerHTML = ms.map(m => {
      const v = computeRate(rows, m);
      const nv = computeRate(nationalRows, m);
      return kpiCard(METRICS[m].label, METRICS[m].format(v), cmp && m !== 'plays' ? nv : undefined);
    }).join('');

    // ---- 风格偏好：聚焦城市时画偏好指数，否则画全国播放占比 ----
    const cityShare = genreShare(rows, china);
    if (st.city !== null) {
      const natShare = genreShare(nationalRows, china);
      const lq = cityShare.map((s, i) => natShare[i] > 0 ? s / natShare[i] : 0);
      prefChart.setOption({
        xAxis: { min: .8, max: 1.2 },
        yAxis: { data: china.genres },
        series: [{
          data: lq.map((v, i) => ({
            value: +v.toFixed(3),
            itemStyle: { color: GENRE_COLORS[china.genres[i]] },
          })),
          label: { show: true, position: 'right', color: '#cbd5e1', fontSize: 10 },
          markLine: {
            symbol: 'none', silent: true,
            lineStyle: { color: '#7b8bb0', type: 'dashed' },
            label: { formatter: '全国基线', color: '#7b8bb0', fontSize: 9, position: 'start' },
            data: [{ xAxis: 1 }],
          },
          tooltip: { formatter: p => `${china.genres[p.dataIndex]} 偏好指数：${p.value}<br/>(>1 偏爱 / <1 冷淡)` },
        }],
      });
    } else {
      prefChart.setOption({
        xAxis: { min: 0, max: Math.max(...cityShare.map(v => v * 100)) * 1.25 || 1 },
        yAxis: { data: china.genres },
        series: [{
          data: cityShare.map((v, i) => ({
            value: +(v * 100).toFixed(1),
            itemStyle: { color: GENRE_COLORS[china.genres[i]] },
          })),
          label: { show: true, position: 'right', color: '#cbd5e1', fontSize: 10, formatter: '{c}%' },
          markLine: { data: [] },
          tooltip: { formatter: p => `${china.genres[p.dataIndex]} 播放占比：${p.value}%` },
        }],
      });
    }

    // ---- 热门歌曲榜 ----
    const byTrack = new Map();
    for (const r of rows) {
      const t = r[COL.TRACK];
      byTrack.set(t, (byTrack.get(t) || 0) + r[COL.PLAYS]);
    }
    const top = [...byTrack.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    listEl.innerHTML = `<table>
      <tr><th>#</th><th>歌曲</th><th>风格</th><th>情感</th><th>播放</th></tr>
      ${top.map(([ti, plays], i) => {
        const t = china.tracks[ti];
        const g = china.genres[t.genre];
        return `<tr>
          <td>${i + 1}</td>
          <td><div class="t-name">${t.name}</div><div class="t-artist">${t.artist}</div></td>
          <td><span class="genre-tag" style="background:${GENRE_COLORS[g]}">${g}</span></td>
          <td><span class="emotion-tag">${t.emotion}</span></td>
          <td>${plays.toLocaleString()}</td>
        </tr>`;
      }).join('')}
    </table>`;
  }

  subscribe(update);
  update(state);
  return prefChart;
}

function computeRate(rows, metric) {
  let plays = 0, x = 0;
  const col = { collectRate: COL.COLLECTS, repeatRate: COL.REPEATS, fullRate: COL.FULLS }[metric];
  for (const r of rows) { plays += r[COL.PLAYS]; if (col) x += r[col]; }
  return metric === 'plays' ? plays : (plays ? x / plays : 0);
}

function genreShare(rows, china) {
  const counts = china.genres.map(() => 0);
  let total = 0;
  for (const r of rows) {
    counts[china.tracks[r[COL.TRACK]].genre] += r[COL.PLAYS];
    total += r[COL.PLAYS];
  }
  return counts.map(c => total ? c / total : 0);
}
