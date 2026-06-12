// 数据加载与公共聚合逻辑。
// china.rows 的列定义：[城市, 日期, 小时, 歌曲, 播放量, 收藏数, 重复数, 时长和, 完播数]
export const COL = { CITY: 0, DATE: 1, HOUR: 2, TRACK: 3, PLAYS: 4, COLLECTS: 5, REPEATS: 6, DUR: 7, FULLS: 8 };

// 中国数据集 4 个风格的色板（与图例、芯片、标签共用）
export const GENRE_COLORS = { '流行': '#fbbf24', '摇滚': '#f87171', '说唱': '#60a5fa', '电子': '#34d399' };

// Spotify 宏观流派色板
export const SPOTIFY_COLORS = {
  '流行': '#fbbf24', '嘻哈/说唱': '#60a5fa', '摇滚/金属': '#f87171',
  '电子/舞曲': '#34d399', '拉丁/雷鬼顿': '#f472b6', 'K-Pop': '#c084fc',
  'R&B/灵魂': '#fb923c', '乡村': '#a3e635', '其他': '#94a3b8',
};

// 中国风格 -> Spotify 宏观流派 的语义映射，用于跨数据集联动
export const GENRE_BRIDGE = { '流行': '流行', '摇滚': '摇滚/金属', '说唱': '嘻哈/说唱', '电子': '电子/舞曲' };

export const METRICS = {
  plays:      { label: '播放量',     format: v => v.toLocaleString() },
  collectRate:{ label: '收藏率',     format: v => (v * 100).toFixed(1) + '%' },
  repeatRate: { label: '重复播放率', format: v => (v * 100).toFixed(1) + '%' },
  fullRate:   { label: '完播率',     format: v => (v * 100).toFixed(1) + '%' },
};

export async function loadData() {
  const [china, spotify] = await Promise.all([
    fetch('data/china.json').then(r => r.json()),
    fetch('data/spotify.json').then(r => r.json()),
  ]);
  return { china, spotify };
}

// 按当前筛选条件过滤明细行。omit 用于排除某个维度的筛选 ——
// 编码了某维度的视图不应被该维度的筛选过滤掉自己（标准 cross-filter 语义）。
export function filterRows(china, st, omit = []) {
  const useCity = st.city !== null && !omit.includes('city');
  const useDate = st.dateRange !== null && !omit.includes('date');
  const useGenre = st.genres !== null && !omit.includes('genre');
  return china.rows.filter(r =>
    (!useCity || r[COL.CITY] === st.city) &&
    (!useDate || (r[COL.DATE] >= st.dateRange[0] && r[COL.DATE] <= st.dateRange[1])) &&
    (!useGenre || st.genres.has(china.tracks[r[COL.TRACK]].genre))
  );
}

// 对一组明细行计算指标值
export function computeMetric(rows, metric) {
  let plays = 0, collects = 0, repeats = 0, fulls = 0;
  for (const r of rows) {
    plays += r[COL.PLAYS]; collects += r[COL.COLLECTS];
    repeats += r[COL.REPEATS]; fulls += r[COL.FULLS];
  }
  if (plays === 0) return 0;
  switch (metric) {
    case 'plays': return plays;
    case 'collectRate': return collects / plays;
    case 'repeatRate': return repeats / plays;
    case 'fullRate': return fulls / plays;
  }
}

// 按某一列分组
export function groupBy(rows, col) {
  const map = new Map();
  for (const r of rows) {
    const k = r[col];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

export function sumPlays(rows) {
  let s = 0;
  for (const r of rows) s += r[COL.PLAYS];
  return s;
}
