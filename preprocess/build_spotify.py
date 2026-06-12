"""Spotify 2017-2021 周榜数据预处理：周榜明细 -> 宏观流派月度演变 + 歌曲生命周期。

输出 web/data/spotify.json，结构：
  genres:    宏观流派列表（由 artist_genres 细分标签归并而来）
  months:    月份列表（2017-01 ~ 2021-04）
  monthly:   [genreIdx][monthIdx] -> 月度总播放量（亿次）
  lifecycle: 每个宏观流派下累计播放量 Top 8 歌曲的周级生命周期曲线
             {name, artist, genre, total, weeks: [[周序号, 周播放量, 周榜名次], ...]}
  weeks:     周标签列表

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
    track_total = defaultdict(int)   # track_id -> 累计播放
    track_info = {}
    track_weeks = defaultdict(list)  # track_id -> [周序号, 播放, 名次]

    for r in dedup.values():
        g = classify(r["artist_genres"])
        streams = int(r["streams"])
        monthly[genre_idx[g]][month_idx[parse_week(r["week"]).strftime("%Y-%m")]] += streams

        tid = r["track_id"]
        track_total[tid] += streams
        track_weeks[tid].append([week_idx[r["week"]], streams, int(r["rank"])])
        track_info[tid] = {"name": r["track_name"], "artist": r["artist_names"], "genre": g}

    # 每个流派取累计播放 Top 8 歌曲
    by_genre = defaultdict(list)
    for tid, total in track_total.items():
        by_genre[track_info[tid]["genre"]].append((total, tid))
    lifecycle = []
    for g in genres:
        for total, tid in sorted(by_genre[g], reverse=True)[:8]:
            info = track_info[tid]
            lifecycle.append({
                "name": info["name"],
                "artist": info["artist"],
                "genre": genre_idx[g],
                "total": total,
                "weeks": sorted(track_weeks[tid]),
            })

    out = {
        "genres": genres,
        "months": months,
        "monthly": [[round(v / 1e8, 3) for v in row] for row in monthly],  # 亿次
        "weeks": weeks,
        "lifecycle": lifecycle,
    }
    DST.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{DST.name}: {len(records)} records, {len(lifecycle)} lifecycle tracks, "
          f"{DST.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
