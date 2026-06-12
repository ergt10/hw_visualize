"""中国 2025-12 播放数据预处理：原始播放记录 -> 前端可用的紧凑明细 + 维表。

输出 web/data/china.json，结构：
  cities:  城市维表（名称、坐标、所属省份 adcode）
  genres:  流派维表
  tracks:  歌曲维表（歌名、歌手、流派、情感标签、点赞、评论）
  dates:   日期维表（2025-12-01 ~ 12-25）
  rows:    播放明细聚合 [cityIdx, dateIdx, hour, trackIdx, plays,
           collects, repeats, durationSum, fullPlays]

明细按 (城市, 日期, 小时, 歌曲) 聚合后体积约 1MB，全部筛选与联动
计算放在浏览器端完成，避免引入后端服务。
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/raw/music_play_hot_songs_2025.csv"
DST = ROOT / "web/data/china.json"

# 城市坐标与所属省份（adcode 对应 GeoJSON 中的省级行政区）
CITY_INFO = {
    "北京": (116.40, 39.90, "北京市"),
    "上海": (121.47, 31.23, "上海市"),
    "广州": (113.26, 23.13, "广东省"),
    "深圳": (114.06, 22.55, "广东省"),
    "杭州": (120.16, 30.29, "浙江省"),
    "南京": (118.80, 32.06, "江苏省"),
    "武汉": (114.31, 30.59, "湖北省"),
    "成都": (104.07, 30.57, "四川省"),
    "重庆": (106.55, 29.56, "重庆市"),
    "西安": (108.94, 34.34, "陕西省"),
}


def main():
    records = list(csv.DictReader(open(SRC, encoding="utf-8")))

    cities = sorted({r["user_city"] for r in records})
    genres = sorted({r["genre"] for r in records})
    dates = sorted({r["play_time"][:10] for r in records})

    # 歌曲维表
    track_ids = sorted({r["track_id"] for r in records})
    track_idx = {t: i for i, t in enumerate(track_ids)}
    tracks = [None] * len(track_ids)
    for r in records:
        i = track_idx[r["track_id"]]
        if tracks[i] is None:
            tracks[i] = {
                "name": r["track_name"],
                "artist": r["artist_name"],
                "genre": genres.index(r["genre"]),
                "emotion": r["emotion_tag"],
                "language": r["language"],
                "likes": int(r["song_likes"]),
                "comments": int(r["song_comments"]),
            }

    # 按 (城市, 日期, 小时, 歌曲) 聚合
    city_idx = {c: i for i, c in enumerate(cities)}
    date_idx = {d: i for i, d in enumerate(dates)}
    cube = defaultdict(lambda: [0, 0, 0, 0, 0])  # plays, collects, repeats, durSum, fullPlays
    for r in records:
        key = (
            city_idx[r["user_city"]],
            date_idx[r["play_time"][:10]],
            int(r["play_time"][11:13]),
            track_idx[r["track_id"]],
        )
        cell = cube[key]
        cell[0] += 1
        cell[1] += int(r["is_collected"])
        cell[2] += int(r["is_repeat"])
        cell[3] += int(r["play_duration"])
        # 完整播放：实际播放时长达到歌曲总时长 90% 以上
        cell[4] += int(int(r["play_duration"]) >= 0.9 * int(r["track_total_duration"]))

    rows = [list(k) + v for k, v in sorted(cube.items())]

    out = {
        "cities": [
            {"name": c, "lng": CITY_INFO[c][0], "lat": CITY_INFO[c][1], "province": CITY_INFO[c][2]}
            for c in cities
        ],
        "genres": genres,
        "tracks": tracks,
        "dates": dates,
        "rows": rows,
    }
    DST.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{DST.name}: {len(records)} records -> {len(rows)} cells, {DST.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
