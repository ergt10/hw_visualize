<script setup>
import { computed, onMounted, ref } from 'vue';
import ChartBox from './components/ChartBox.vue';
import CityProfile from './components/CityProfile.vue';
import { useVisStore } from './stores/visStore.js';
import { GENRE_COLORS, METRICS, SPOTIFY_COLORS, loadData } from './services/dataService.js';
import { initGeoChart } from './charts/geoChart.js';
import { initDiscChart } from './charts/discChart.js';
import { initTimelineChart } from './charts/timelineChart.js';
import { initMatrixChart } from './charts/matrixChart.js';
import { initRiverChart } from './charts/riverChart.js';
import { initScatterChart } from './charts/scatterChart.js';
import { initLifecycleChart } from './charts/lifecycleChart.js';

const store = useVisStore();
const data = ref(null);
const loadError = ref('');
const chipsSynced = ref(false);

onMounted(async () => {
  try {
    const loaded = await loadData();
    if (store.evoGenre === null) {
      store.setState({ evoGenre: loaded.spotify.genres.indexOf('流行') });
    }
    data.value = loaded;
    store.$subscribe(() => {
      chipsSynced.value = true;
    });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  }
});

const scopeHintHtml = computed(() => {
  if (!data.value) return '';
  const { china } = data.value;
  const parts = [];
  if (store.city !== null) parts.push(`聚焦 <b>${china.cities[store.city].name}</b>`);
  if (store.dateRange !== null) {
    parts.push(`<b>${china.dates[store.dateRange[0]].slice(5)} ~ ${china.dates[store.dateRange[1]].slice(5)}</b>`);
  }
  if (store.genres !== null) parts.push(`<b>${store.genres.map(i => china.genres[i]).join(' / ')}</b>`);
  return parts.length ? `当前筛选：${parts.join(' · ')}` : '';
});

const lifecycleGenre = computed(() => {
  if (!data.value || store.evoGenre === null) return '流行';
  return data.value.spotify.genres[store.evoGenre];
});

function isGenreActive(index) {
  return store.genres === null || store.genres.includes(index);
}
</script>

<template>
  <header id="header">
    <div id="brand">
      <div id="seal">潮</div>
      <div>
        <h1>乐潮 <span>MusicTide</span></h1>
        <p>音乐流行趋势可视分析 · 宏观时空模块</p>
      </div>
    </div>
    <div id="scope-hint" v-html="scopeHintHtml"></div>
    <div v-if="data" id="controls">
      <div class="control-group">
        <label>音乐风格</label>
        <div id="genre-chips">
          <span
            v-for="(genre, index) in data.china.genres"
            :key="genre"
            class="chip"
            :class="{ active: isGenreActive(index) }"
            :style="{ background: chipsSynced && isGenreActive(index) ? GENRE_COLORS[genre] : '' }"
            @click="store.toggleGenre(index, data.china.genres.length)"
          >
            {{ genre }}
          </span>
        </div>
      </div>
      <div class="control-group">
        <label>气泡指标</label>
        <select id="metric-select" v-model="store.metric">
          <option v-for="(metric, key) in METRICS" :key="key" :value="key">
            {{ metric.label }}
          </option>
        </select>
      </div>
      <button id="reset-btn" @click="store.reset()">重置</button>
    </div>
  </header>

  <main v-if="data" id="grid">
    <section class="panel" id="panel-profile">
      <h2><i class="tag tag-cn">境内</i>城市画像 <small>点击地图 / 唱盘聚焦城市</small></h2>
      <CityProfile :data="data" />
    </section>

    <section class="panel" id="panel-geo">
      <h2><i class="tag tag-cn">境内</i>乐潮地图 <small>气泡大小 = 播放量 · 颜色 = 所选指标</small></h2>
      <ChartBox :data="data" :initializer="initGeoChart" />
    </section>

    <section class="panel" id="panel-disc">
      <h2><i class="tag tag-cn">境内</i>律动唱盘 <small>角度 = 24 小时 · 环 = 城市</small></h2>
      <ChartBox :data="data" :initializer="initDiscChart" />
    </section>

    <section class="panel" id="panel-timeline">
      <h2><i class="tag tag-cn">境内</i>时光轴 <small>2025-12-01 ~ 25 · 拖动滑块刷选日期，全局生效</small></h2>
      <ChartBox :data="data" :initializer="initTimelineChart" />
    </section>

    <section class="panel" id="panel-matrix">
      <h2><i class="tag tag-cn">境内</i>偏好矩阵 <small>偏好指数 = 城市风格份额 ÷ 全国份额</small></h2>
      <ChartBox :data="data" :initializer="initMatrixChart" />
    </section>

    <section class="panel" id="panel-river">
      <h2><i class="tag tag-gl">全球</i>风格长河 <small>Spotify Top200 周榜 · 点击流派联动右侧</small></h2>
      <ChartBox :data="data" :initializer="initRiverChart" />
    </section>

    <section class="panel" id="panel-scatter">
      <h2><i class="tag tag-gl">全球</i>曲海星图 <small>每点一首歌 · 在榜周数 × 峰值播放 · ◆ = 圣诞季回归</small></h2>
      <ChartBox :data="data" :initializer="initScatterChart" />
    </section>

    <section class="panel" id="panel-lifecycle">
      <h2 id="lifecycle-title">
        <i class="tag tag-gl">全球</i>生命周期 ·
        <span :style="{ color: SPOTIFY_COLORS[lifecycleGenre] }">{{ lifecycleGenre }}</span>
        <small>累计播放 Top 8 · 点击星图加入歌曲</small>
      </h2>
      <ChartBox :data="data" :initializer="initLifecycleChart" />
    </section>
  </main>

  <main v-else id="grid"></main>
</template>
