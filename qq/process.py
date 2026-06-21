#!/usr/bin/env python3
import csv
import json
import sys
from collections import defaultdict

GENRES = ["R&B","民谣","流行","电子","说唱","古风","摇滚"]

def build_hierarchy(input_csv, output_json):
    years = defaultdict(list)
    with open(input_csv, newline='', encoding='utf-8') as fh:
        reader = csv.reader(fh)
        header = next(reader)
        header_map = {h: i for i, h in enumerate(header)}
        year_idx = header_map.get('年份')
        genre_idx = header_map.get('流派')
        name_idx = header_map.get('歌曲名')
        if year_idx is None or genre_idx is None:
            raise SystemExit('CSV header must contain 年份 and 流派 columns')
        for i, row in enumerate(reader):
            try:
                year = row[year_idx].strip()
            except Exception:
                continue
            if year == '':
                continue
            genre = row[genre_idx].strip() if row[genre_idx] else '其他'
            if genre not in GENRES:
                genre = '其他'
            title = row[name_idx].strip() if name_idx is not None and row[name_idx] else f'record-{i}'
            month = None
            if '月份' in header_map:
                try:
                    month = row[header_map['月份']].strip()
                except Exception:
                    month = None
            years[year].append({"name": title, "genre": genre, "size": 1, "month": month})

    root = {"name": "root", "children": []}
    for year in sorted(years.keys()):
        root["children"].append({"name": str(year), "children": years[year]})

    with open(output_json, 'w', encoding='utf-8') as out:
        json.dump(root, out, ensure_ascii=False)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python process.py /path/to/raw_records.csv ./sunburst.json')
        sys.exit(1)
    build_hierarchy(sys.argv[1], sys.argv[2])
