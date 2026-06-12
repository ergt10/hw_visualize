"""Spotify 2017-2021 周榜数据预处理：周榜明细 -> 宏观流派月度演变 + 歌曲生命周期 + 形态统计。

输出 web/data/spotify.json，结构：
  genres:      宏观流派列表（由 artist_genres 细分标签归并而来）
  months:      月份列表（2017-01 ~ 2021-04）
  monthly:     [genreIdx][monthIdx] -> 月均每周播放量（亿次/周）
               （除以当月榜单周数：大小月含 4/5 个榜单周，直接累计会产生 ±25% 锯齿）
  weeks:       周标签列表
  weeklyTotal: 每周 Top200 总播放量（亿次），用于大盘事件标注
  tracks:      全部上榜歌曲的生命周期形态统计（曲海星图散点用）
               [name, artist, genreIdx, 累计亿次, 峰值百万/周, 在榜周数, 首次上榜周序号, 在榜12月年数]
  curves:      每个流派累计播放 Top 40 歌曲的周级曲线（点击散点按需展开）
               "歌名|艺人" -> [[周序号, 周播放百万, 名次], ...]

artist_genres 是 Spotify 的细分标签（数百种），归并规则按优先级匹配
关键词：K-Pop > 拉丁 > 嘻哈 > R&B > 摇滚 > 乡村 > 电子 > 流行。
"""
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/raw/spotify-top-200-dataset.csv"
DST = ROOT / "web/data/spotify.json"

# (宏观流派, 关键词列表)，按优先级从上到下匹配
GENRE_RULES = [
    ("K-Pop", ["k-pop"]),
    ("拉丁/雷鬼顿", ["latin", "reggaeton", "urbano"]),
    ("嘻哈/说唱", ["hip hop", "rap", "trap", "drill"]),
    ("R&B/灵魂", ["r&b", "soul", "neo mellow"]),
    ("摇滚/金属", ["rock", "metal", "punk", "grunge"]),
    ("乡村", ["country"]),
    ("电子/舞曲", ["edm", "house", "electro", "techno", "dubstep", "brostep", "big room"]),
    ("流行", ["pop"]),
]
OTHER = "其他"
CURVE_TOP_N = 40  # 每个流派保留周级曲线的歌曲数


def classify(artist_genres: str) -> str:
    tags = artist_genres.lower()
    for name, keywords in GENRE_RULES:
        if any(k in tags for k in keywords):
            return name
    return OTHER


def parse_week(w: str) -> datetime:
    m, d, y = w.split("/")
    return datetime(int(y), int(m), int(d))


def main():
    csv.field_size_limit(10**7)
    records = list(csv.DictReader(open(SRC, encoding="utf-8"), delimiter=";"))

    genres = [name for name, _ in GENRE_RULES] + [OTHER]
    genre_idx = {g: i for i, g in enumerate(genres)}

    weeks = sorted({r["week"] for r in records}, key=parse_week)
    week_idx = {w: i for i, w in enumerate(weeks)}
    months = sorted({parse_week(w).strftime("%Y-%m") for w in weeks})
    month_idx = {m: i for i, m in enumerate(months)}

    # 合作歌曲在原始数据中每周按参与艺人拆成多行（streams 相同），
    # 先按 (歌曲, 周) 去重，并合并所有艺人的流派标签用于分类
    dedup = {}
    for r in records:
        key = (r["track_id"], r["week"])
        if key in dedup:
            dedup[key]["artist_genres"] += "," + r["artist_genres"]
        else:
            dedup[key] = dict(r)

    monthly = [[0] * len(months) for _ in genres]
    weeks_in_month = [0] * len(months)
    for w in weeks:
        weeks_in_month[month_idx[parse_week(w).strftime("%Y-%m")]] += 1
    weekly_total = [0] * len(weeks)
    track_total = defaultdict(int)   # track_id -> 累计播放
    track_info = {}
    track_weeks = defaultdict(list)  # track_id -> [周序号, 播放, 名次]

    for r in dedup.values():
        g = classify(r["artist_genres"])
        streams = int(r["streams"])
        monthly[genre_idx[g]][month_idx[parse_week(r["week"]).strftime("%Y-%m")]] += streams
        weekly_total[week_idx[r["week"]]] += streams

        tid = r["track_id"]
        track_total[tid] += streams
        track_weeks[tid].append([week_idx[r["week"]], streams, int(r["rank"])])
        track_info[tid] = {"name": r["track_name"], "artist": r["artist_names"], "genre": g}

    # 全曲目形态统计：在榜周数 / 峰值 / 首次上榜 / 季节性（出现过几个不同年份的 12 月）
    tracks = []
    by_genre = defaultdict(list)  # genre -> [(total, tid)]
    for tid, wlist in track_weeks.items():
        wlist.sort()
        info = track_info[tid]
        decembers = {parse_week(weeks[wi]).year for wi, _, _ in wlist
                     if parse_week(weeks[wi]).month == 12}
        tracks.append([
            info["name"], info["artist"], genre_idx[info["genre"]],
            round(track_total[tid] / 1e8, 3),            # 累计（亿）
            round(max(s for _, s, _ in wlist) / 1e6, 1), # 峰值（百万/周）
            len(wlist),                                  # 在榜周数
            wlist[0][0],                                 # 首次上榜周
            len(decembers),                              # 在榜 12 月年数
        ])
        by_genre[info["genre"]].append((track_total[tid], tid))
    tracks.sort(key=lambda t: -t[3])

    # 每个流派 Top N 歌曲保留周级曲线，键与 tracks 行通过 "歌名|艺人" 对应
    curves = {}
    for g in genres:
        for _, tid in sorted(by_genre[g], reverse=True)[:CURVE_TOP_N]:
            info = track_info[tid]
            curves[f'{info["name"]}|{info["artist"]}'] = [
                [wi, round(s / 1e6, 1), rk] for wi, s, rk in track_weeks[tid]]

    out = {
        "genres": genres,
        "months": months,
        "monthly": [[round(v / n / 1e8, 3) for v, n in zip(row, weeks_in_month)]
                    for row in monthly],  # 亿次/周
        "weeks": weeks,
        "weeklyTotal": [round(v / 1e8, 2) for v in weekly_total],
        "tracks": tracks,
        "curves": curves,
    }
    DST.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{DST.name}: {len(dedup)} 周记录, {len(tracks)} 歌曲, "
          f"{len(curves)} 条周曲线, {DST.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
