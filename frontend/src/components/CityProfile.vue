<script setup>
import { computed } from 'vue';
import { useVisStore } from '../stores/visStore.js';
import { COL, GENRE_COLORS, METRICS, filterRows } from '../services/dataService.js';

const props = defineProps({
  data: { type: Object, required: true },
});

const store = useVisStore();
const china = props.data.china;

const profileHtml = computed(() => {
  const rows = filterRows(china, store.$state);
  const nationalRows = filterRows(china, store.$state, ['city']);
  const cityName = store.city === null ? '全国' : china.cities[store.city].name;
  const dateLabel = store.dateRange === null
    ? '12-01 ~ 12-25'
    : `${china.dates[store.dateRange[0]].slice(5)} ~ ${china.dates[store.dateRange[1]].slice(5)}`;
  const cmp = store.city !== null;

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

  return `
      <div id="profile-place"><span class="name">${cityName}</span><span class="range">${dateLabel}${cmp ? ' · 对比全国' : ''}</span></div>
      <div id="kpi-grid">${kpis}</div>
      <div id="track-list"><div class="sec">热门歌曲 TOP 5</div>${list}</div>`;
});

function computeRate(rows, metric) {
  let plays = 0, value = 0;
  const col = { collectRate: COL.COLLECTS, repeatRate: COL.REPEATS, fullRate: COL.FULLS }[metric];
  for (const r of rows) {
    plays += r[COL.PLAYS];
    if (col) value += r[col];
  }
  return metric === 'plays' ? plays : (plays ? value / plays : 0);
}
</script>

<template>
  <div id="profile-body" v-html="profileHtml"></div>
</template>
