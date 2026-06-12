// 风格长河：Spotify 2017-2021 流派月度演变主题河流图（ThemeRiver, Havre et al. 2002）。
// 河面宽度 = 月均每周播放量（已按当月榜单周数归一，消除大小月锯齿）；
// 叠加 COVID 封锁、圣诞季两类真实事件标注。
// 点击流派 -> 切换曲海星图高亮与生命周期视图的当前流派。
import { setState, subscribe } from '../store.js';
import { SPOTIFY_COLORS, GENRE_BRIDGE } from '../dataService.js';
import { MUTED, LINE, ACCENT, tooltip } from '../theme.js';

// 大盘事件标注：[日期, 文本, 文字相对竖线的方位]
// （数值经预处理验证：2020-03→04 周播放 20.5亿 → 17亿）
const EVENTS = [
  ['2020-03-15', 'COVID-19 封锁\n大盘单月 −17%', 'right'],
  ['2019-12-15', '圣诞季\n经典老歌年度回归', 'left'],
];

export function initRiverView(el, { china, spotify }) {
  const chart = echarts.init(el);

  const riverData = [];
  spotify.genres.forEach((g, gi) => {
    spotify.months.forEach((m, mi) => {
      riverData.push([m + '-15', spotify.monthly[gi][mi], g]);
    });
  });

  chart.setOption({
    backgroundColor: 'transparent',
    color: spotify.genres.map(g => SPOTIFY_COLORS[g]),
    tooltip: {
      trigger: 'axis',
      ...tooltip,
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(59,51,37,.35)' } },
    },
    legend: {
      bottom: 2, left: 'center',
      itemWidth: 10, itemHeight: 10, itemGap: 14,
      textStyle: { color: MUTED, fontSize: 10.5 },
    },
    singleAxis: {
      type: 'time', bottom: 44, top: 30, left: 16, right: 16,
      axisLine: { lineStyle: { color: LINE } },
      axisLabel: { color: MUTED, fontSize: 10 },
    },
    series: [{
      type: 'themeRiver',
      data: riverData,
      label: { show: false },
      itemStyle: { borderColor: '#fbf8f1', borderWidth: .6 },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(59,51,37,.35)' } },
      tooltip: { valueFormatter: v => v + ' 亿次/周' },
    }],
  });

  chart.on('click', p => {
    if (p.data?.[2] === undefined) return;
    setState({ evoGenre: spotify.genres.indexOf(p.data[2]), track: null });
  });

  // 事件标注：依赖像素坐标，在渲染完成 / resize 后重画
  function drawEvents() {
    const h = chart.getHeight();
    chart.setOption({
      graphic: EVENTS.map(([date, text, side], i) => {
        const [x] = chart.convertToPixel({ singleAxisIndex: 0 }, new Date(date).getTime());
        return {
          id: 'evt' + i, type: 'group', x, y: 24,
          silent: true,
          children: [
            { type: 'line', shape: { x1: 0, y1: 0, x2: 0, y2: h - 70 },
              style: { stroke: ACCENT, lineWidth: 1, lineDash: [4, 4], opacity: .8 } },
            { type: 'text',
              style: { text, x: side === 'right' ? 5 : -5, y: 2, fill: ACCENT,
                       font: '10px "Noto Sans SC", sans-serif', lineHeight: 13,
                       textAlign: side === 'right' ? 'left' : 'right' } },
          ],
        };
      }),
    });
  }
  setTimeout(drawEvents, 0);

  const origResize = chart.resize.bind(chart);
  chart.resize = opts => { origResize(opts); drawEvents(); };

  // 中国风格筛选 -> Spotify 流派的桥接（单选时联动）
  subscribe(st => {
    if (st.genres && st.genres.size === 1) {
      const cn = china.genres[[...st.genres][0]];
      const target = spotify.genres.indexOf(GENRE_BRIDGE[cn]);
      if (target >= 0 && target !== st.evoGenre) setState({ evoGenre: target, track: null });
    }
  });

  return chart;
}
