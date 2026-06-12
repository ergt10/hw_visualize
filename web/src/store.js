// 中央状态仓库：所有视图通过 setState 修改筛选条件、通过 subscribe 响应变化，
// 视图之间不直接引用，联动关系全部经由这里中转。

export const state = {
  city: null,        // 选中城市下标，null = 全国
  dateRange: null,   // [起始日下标, 结束日下标]，null = 全部日期
  genres: null,      // 选中风格下标集合（Set），null = 全部风格
  metric: 'plays',   // 地图颜色编码指标
  evoGenre: null,    // 演变视图当前流派（Spotify 宏观流派下标），初始化时设为"流行"
  track: null,       // 曲海星图选中的歌曲 "歌名|艺人"，null = 未选
};

const listeners = [];

export function subscribe(fn) {
  listeners.push(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}
