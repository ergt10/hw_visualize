import echarts from './echarts.js';
import { GENRE_BRIDGE, SPOTIFY_COLORS } from '../services/dataService.js';
import { MUTED, LINE, ACCENT, tooltip } from '../styles/chartTheme.js';

const EVENTS = [
  ['2020-03-15', 'COVID-19 封锁\n大盘单月 −17%', 'right'],
  ['2019-12-15', '圣诞季\n经典老歌年度回归', 'left'],
];

export function initRiverChart(el, data, store) {
  const { china, spotify } = data;
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
      bottom: 2,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: { color: MUTED, fontSize: 10.5 },
    },
    singleAxis: {
      type: 'time',
      bottom: 44,
      top: 30,
      left: 16,
      right: 16,
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
    store.setState({ evoGenre: spotify.genres.indexOf(p.data[2]), track: null });
  });

  function drawEvents() {
    const h = chart.getHeight();
    chart.setOption({
      graphic: EVENTS.map(([date, text, side], i) => {
        const [x] = chart.convertToPixel({ singleAxisIndex: 0 }, new Date(date).getTime());
        return {
          id: 'evt' + i,
          type: 'group',
          x,
          y: 24,
          silent: true,
          children: [
            {
              type: 'line',
              shape: { x1: 0, y1: 0, x2: 0, y2: h - 70 },
              style: { stroke: ACCENT, lineWidth: 1, lineDash: [4, 4], opacity: .8 },
            },
            {
              type: 'text',
              style: {
                text,
                x: side === 'right' ? 5 : -5,
                y: 2,
                fill: ACCENT,
                font: '10px "Noto Sans SC", sans-serif',
                lineHeight: 13,
                textAlign: side === 'right' ? 'left' : 'right',
              },
            },
          ],
        };
      }),
    });
  }

  const origResize = chart.resize.bind(chart);
  chart.resize = opts => {
    origResize(opts);
    drawEvents();
  };

  const unsubscribe = store.$subscribe((_, st) => {
    if (st.genres && st.genres.length === 1) {
      const cn = china.genres[st.genres[0]];
      const target = spotify.genres.indexOf(GENRE_BRIDGE[cn]);
      if (target >= 0 && target !== st.evoGenre) store.setState({ evoGenre: target, track: null });
    }
  });

  setTimeout(drawEvents, 0);
  chart.__dispose = () => unsubscribe();
  return chart;
}
