// 全局设计语言：暖纸色编辑风。
// 所有视图从这里取色与公共 ECharts 样式片段，保证全站视觉一致。

export const INK = '#3b3325';        // 正文墨色
export const MUTED = '#94896f';      // 次级文字
export const PAPER = '#f4efe3';      // 纸面底色
export const PANEL = '#fbf8f1';      // 面板底色
export const LINE = '#e3dac5';       // 分隔线/网格线
export const ACCENT = '#bf4d38';     // 主强调色（陶土红）

// 顺序色带：沙 -> 赭金 -> 陶土红，用于地图等"量级"编码
export const SEQ = ['#e9dcba', '#d9a13b', '#bf4d38'];

// 发散色带：青蓝 -> 纸白 -> 陶土红，用于偏好指数等"高于/低于基准"编码
export const DIV = ['#54718f', '#f1ead8', '#bf4d38'];

export const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';

// 公共 tooltip 样式
export const tooltip = {
  backgroundColor: 'rgba(251,248,241,.96)',
  borderColor: LINE,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: INK, fontSize: 12, fontFamily: FONT },
  extraCssText: 'box-shadow: 0 4px 16px rgba(59,51,37,.12); border-radius: 4px;',
};

// 公共直角坐标轴样式
export function axis(extra = {}) {
  return {
    axisLine: { lineStyle: { color: LINE } },
    axisTick: { show: false },
    axisLabel: { color: MUTED, fontSize: 10, fontFamily: FONT },
    splitLine: { lineStyle: { color: LINE, opacity: .6 } },
    nameTextStyle: { color: MUTED, fontSize: 10 },
    ...extra,
  };
}
