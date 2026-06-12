// 入口：加载数据、渲染控制面板、初始化各视图。
import { state, setState, subscribe } from './store.js';
import { loadData, GENRE_COLORS, METRICS } from './dataService.js';
import { initGeoView } from './views/geoView.js';
import { initTrendView } from './views/trendView.js';
import { initRhythmView } from './views/rhythmView.js';
import { initProfileView } from './views/profileView.js';
import { initEvolutionView } from './views/evolutionView.js';

const data = await loadData();
const { china } = data;

// ---------- 控制面板：风格芯片 ----------
const chipsEl = document.getElementById('genre-chips');
china.genres.forEach((g, gi) => {
  const chip = document.createElement('span');
  chip.className = 'chip active';
  chip.textContent = g;
  chip.style.setProperty('--chip-color', GENRE_COLORS[g]);
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
  setState({ city: null, dateRange: null, genres: null, metric: 'plays' });
};

// ---------- 顶部筛选状态提示 + 芯片样式同步 ----------
subscribe(st => {
  const parts = [];
  if (st.city !== null) parts.push(`聚焦 ${china.cities[st.city].name}`);
  if (st.dateRange !== null) {
    parts.push(`${china.dates[st.dateRange[0]].slice(5)} ~ ${china.dates[st.dateRange[1]].slice(5)}`);
  }
  if (st.genres !== null) parts.push([...st.genres].map(i => china.genres[i]).join('/'));
  document.getElementById('scope-hint').textContent =
    parts.length ? '当前筛选：' + parts.join(' · ') : '';

  const active = st.genres ?? new Set(china.genres.map((_, i) => i));
  [...chipsEl.children].forEach((chip, i) => chip.classList.toggle('active', active.has(i)));
});

// ---------- 初始化视图 ----------
const charts = [
  await initGeoView(document.getElementById('geo-chart'), data),
  initTrendView(document.getElementById('trend-chart'), data),
  initRhythmView(document.getElementById('rhythm-chart'), data),
  initProfileView(data),
  ...initEvolutionView(
    document.getElementById('river-chart'),
    document.getElementById('lifecycle-chart'),
    data,
  ),
];

window.addEventListener('resize', () => charts.forEach(c => c.resize()));
