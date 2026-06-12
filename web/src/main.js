// 入口：加载数据、渲染控制面板、初始化各视图。
import { state, setState, subscribe } from './store.js';
import { loadData, GENRE_COLORS, METRICS } from './dataService.js';
import { initGeoView } from './views/geoView.js';
import { initDiscView } from './views/discView.js';
import { initProfileView } from './views/profileView.js';
import { initTimelineView } from './views/timelineView.js';
import { initMatrixView } from './views/matrixView.js';
import { initRiverView } from './views/riverView.js';
import { initScatterView } from './views/scatterView.js';
import { initLifecycleView } from './views/lifecycleView.js';

const data = await loadData();
const { china } = data;

// ---------- 控制面板：风格芯片 ----------
const chipsEl = document.getElementById('genre-chips');
china.genres.forEach((g, gi) => {
  const chip = document.createElement('span');
  chip.className = 'chip active';
  chip.textContent = g;
  chip.onclick = () => {
    const current = state.genres ?? new Set(china.genres.map((_, i) => i));
    const next = new Set(current);
    next.has(gi) ? next.delete(gi) : next.add(gi);
    if (next.size === 0) return; // 至少保留一个风格
    setState({ genres: next.size === china.genres.length ? null : next });
  };
  chipsEl.appendChild(chip);
});

// ---------- 控制面板：指标选择 ----------
const metricEl = document.getElementById('metric-select');
metricEl.innerHTML = Object.entries(METRICS)
  .map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('');
metricEl.onchange = () => setState({ metric: metricEl.value });

// ---------- 重置 ----------
document.getElementById('reset-btn').onclick = () => {
  metricEl.value = 'plays';
  setState({ city: null, dateRange: null, genres: null, metric: 'plays', track: null });
};

// ---------- 顶部筛选状态提示 + 芯片样式同步 ----------
subscribe(st => {
  const parts = [];
  if (st.city !== null) parts.push(`聚焦 <b>${china.cities[st.city].name}</b>`);
  if (st.dateRange !== null) {
    parts.push(`<b>${china.dates[st.dateRange[0]].slice(5)} ~ ${china.dates[st.dateRange[1]].slice(5)}</b>`);
  }
  if (st.genres !== null) parts.push(`<b>${[...st.genres].map(i => china.genres[i]).join(' / ')}</b>`);
  document.getElementById('scope-hint').innerHTML =
    parts.length ? '当前筛选：' + parts.join(' · ') : '';

  const active = st.genres ?? new Set(china.genres.map((_, i) => i));
  [...chipsEl.children].forEach((chip, i) => {
    const on = active.has(i);
    chip.classList.toggle('active', on);
    chip.style.background = on ? GENRE_COLORS[china.genres[i]] : '';
  });
});

// ---------- 初始化视图 ----------
const $ = id => document.getElementById(id);
const charts = [
  await initGeoView($('geo-chart'), data),
  initDiscView($('disc-chart'), data),
  initProfileView(data),
  initTimelineView($('timeline-chart'), data),
  initMatrixView($('matrix-chart'), data),
  initLifecycleView($('lifecycle-chart'), data), // 先于河流图：确保 evoGenre 默认值就绪
  initRiverView($('river-chart'), data),
  initScatterView($('scatter-chart'), data),
];

window.addEventListener('resize', () => charts.forEach(c => c.resize()));
