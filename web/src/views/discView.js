// 律动唱盘：自绘扇环热力图（custom 系列），角度 = 24 小时，环 = 城市，色深 = 播放量。
// 借黑胶唱片的形态呈现城市听歌节律 —— 三个收听高峰会显现为唱片上的三道亮纹。
// ECharts 的 heatmap 系列不支持极坐标，这里用 renderItem 手工计算扇环几何。
// 点击扇环聚焦该城市（与地图点击等价）。
import { state, setState, subscribe } from '../store.js';
import { COL, filterRows } from '../dataService.js';
import { MUTED, tooltip } from '../theme.js';

const HOURS = [...Array(24).keys()];
const TAU = Math.PI * 2;

export function initDiscView(el, { china }) {
  const chart = echarts.init(el);
  const cities = china.cities.map(c => c.name);
  const nRing = cities.length;

  // 数据项: [城市环, 小时, 播放量, 是否压暗]
  function renderItem(params, api) {
    const w = api.getWidth(), h = api.getHeight();
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 14;   // 唱片外缘
    const r0 = R * .28;                  // 唱片芯外缘
    const ci = api.value(0), hour = api.value(1);
    const ring = (R - r0) / nRing;
    const a0 = -TAU / 4 + hour / 24 * TAU, a1 = a0 + TAU / 24;

    const sector = {
      type: 'sector',
      shape: {
        cx, cy,
        r0: r0 + ci * ring, r: r0 + (ci + 1) * ring,
        startAngle: a0, endAngle: a1,  // canvas 角度顺时针为正：0 时在顶端，小时顺时针递增
      },
      style: {
        fill: api.visual('color'),
        stroke: '#2a2620', lineWidth: .8,
        opacity: api.value(3) ? .25 : 1,
      },
    };
    if (ci !== nRing - 1) return sector;
    // 最外环顺带绘制小时刻度文字
    const mid = (a0 + a1) / 2;
    return {
      type: 'group',
      children: [sector, {
        type: 'text',
        style: {
          text: hour % 3 === 0 ? hour + '时' : '',
          x: cx + Math.cos(mid) * (R + 9), y: cy + Math.sin(mid) * (R + 9),
          fill: MUTED, font: '9px sans-serif',
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
      min: 0, max: 1,
      // 唱片质感：墨黑沟槽 -> 赭金亮纹
      inRange: { color: ['#332e26', '#54452c', '#a87b2e', '#e8b54d', '#f7dfa0'] },
    },
    series: [{
      name: 'disc',
      type: 'custom',
      coordinateSystem: 'none',
      renderItem,
    }],
    // 唱片中心标签（模拟唱片芯），文字随聚焦城市切换
    graphic: [{
      id: 'hub',
      type: 'circle',
      left: 'center', top: 'middle',
      shape: { r: 36 },
      style: { fill: '#bf4d38', stroke: '#f7dfa0', lineWidth: 1.5 },
      silent: true, z: 10,
    }, {
      id: 'hubText',
      type: 'text',
      left: 'center', top: 'middle',
      style: { text: '全国', fill: '#fbf8f1', font: '600 14px "Noto Serif SC", serif', textAlign: 'center' },
      silent: true, z: 11,
    }],
  });

  chart.on('click', p => {
    if (p.seriesName !== 'disc') return;
    const idx = p.value[0];
    setState({ city: state.city === idx ? null : idx });
  });

  function update(st) {
    // 编码维度为城市 × 小时，故不受城市筛选影响；受日期/风格筛选
    const rows = filterRows(china, st, ['city']);
    const grid = cities.map(() => HOURS.map(() => 0));
    for (const r of rows) grid[r[COL.CITY]][r[COL.HOUR]] += r[COL.PLAYS];

    const data = [];
    cities.forEach((_, ci) => HOURS.forEach(h => {
      data.push([ci, h, grid[ci][h], st.city !== null && st.city !== ci ? 1 : 0]);
    }));
    chart.setOption({
      visualMap: { max: Math.max(...grid.flat(), 1) },
      series: [{
        name: 'disc',
        data,
        tooltip: {
          formatter: p => `<b>${cities[p.value[0]]}</b> · ${p.value[1]} 时<br/>播放量：${p.value[2].toLocaleString()}`,
        },
      }],
      graphic: [{ id: 'hubText', style: { text: st.city === null ? '全国' : cities[st.city] } }],
    });
  }

  subscribe(update);
  update(state);
  return chart;
}
