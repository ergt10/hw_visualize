export const INK = '#3b3325';
export const MUTED = '#94896f';
export const PAPER = '#f4efe3';
export const PANEL = '#fbf8f1';
export const LINE = '#e3dac5';
export const ACCENT = '#bf4d38';

export const SEQ = ['#e9dcba', '#d9a13b', '#bf4d38'];
export const DIV = ['#54718f', '#f1ead8', '#bf4d38'];

export const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';

export const tooltip = {
  backgroundColor: 'rgba(251,248,241,.96)',
  borderColor: LINE,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: INK, fontSize: 12, fontFamily: FONT },
  extraCssText: 'box-shadow: 0 4px 16px rgba(59,51,37,.12); border-radius: 4px;',
};

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
