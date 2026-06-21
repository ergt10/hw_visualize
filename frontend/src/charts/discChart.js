import echarts from './echarts.js';
import { COL, filterRows } from '../services/dataService.js';
import { MUTED, tooltip } from '../styles/chartTheme.js';

const HOURS = [...Array(24).keys()];
const TAU = Math.PI * 2;

export function initDiscChart(el, data, store) {
  const { china } = data;
  const chart = echarts.init(el);
  const cities = china.cities.map(c => c.name);
  const nRing = cities.length;

  function renderItem(params, api) {
    const w = api.getWidth(), h = api.getHeight();
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 14;
    const r0 = R * .28;
    const ci = api.value(0), hour = api.value(1);
    const ring = (R - r0) / nRing;
    const a0 = -TAU / 4 + hour / 24 * TAU, a1 = a0 + TAU / 24;
    const sector = {
      type: 'sector',
      shape: { cx, cy, r0: r0 + ci * ring, r: r0 + (ci + 1) * ring, startAngle: a0, endAngle: a1 },
      style: { fill: api.visual('color'), stroke: '#26211a', lineWidth: .5, opacity: api.value(3) ? .25 : 1 },
    };
    if (ci !== nRing - 1) return sector;
    const mid = (a0 + a1) / 2;
    return {
      type: 'group',
      children: [sector, {
        type: 'text',
        style: {
          text: hour % 3 === 0 ? hour + '时' : '',
          x: cx + Math.cos(mid) * (R + 10), y: cy + Math.sin(mid) * (R + 10),
          fill: MUTED, font: '10px "Noto Sans SC", sans-serif',
          textAlign: 'center', textVerticalAlign: 'middle',
        },
        silent: true,
      }],
    };
  }

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip,
    visualMap: {
      type: 'continuous',
      show: false,
      dimension: 2,
      min: 0,
      max: 1,
      inRange: { color: ['#3a3328', '#5c4b2d', '#a87b2e', '#e8b54d', '#f7dfa0'] },
    },
    series: [{ name: 'disc', type: 'custom', coordinateSystem: 'none', renderItem }],
    graphic: [{
      id: 'hub',
      type: 'circle',
      left: 'center',
      top: 'middle',
      shape: { r: 36 },
      style: { fill: '#bf4d38', stroke: '#f7dfa0', lineWidth: 1.5 },
      silent: true,
      z: 10,
    }, {
      id: 'hubText',
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: '全国', fill: '#fbf8f1', font: '600 14px "Noto Serif SC", serif', textAlign: 'center' },
      silent: true,
      z: 11,
    }],
  });

  chart.on('click', p => {
    if (p.seriesName !== 'disc') return;
    store.toggleCity(p.value[0]);
  });

  function update(st) {
    const rows = filterRows(china, st, ['city']);
    const grid = cities.map(() => HOURS.map(() => 0));
    for (const r of rows) grid[r[COL.CITY]][r[COL.HOUR]] += r[COL.PLAYS];

    const seriesData = [];
    cities.forEach((_, ci) => HOURS.forEach(h => {
      seriesData.push([ci, h, grid[ci][h], st.city !== null && st.city !== ci ? 1 : 0]);
    }));
    chart.setOption({
      visualMap: { max: Math.max(...grid.flat(), 1) },
      series: [{
        name: 'disc',
        data: seriesData,
        tooltip: {
          formatter: p => `<b>${cities[p.value[0]]}</b> · ${p.value[1]} 时<br/>播放量：${p.value[2].toLocaleString()}`,
        },
      }],
      graphic: [{ id: 'hubText', style: { text: st.city === null ? '全国' : cities[st.city] } }],
    });
  }

  const unsubscribe = store.$subscribe((_, st) => update(st));
  update(store.$state);
  chart.__dispose = () => unsubscribe();
  return chart;
}
