import pandas as pd
import numpy as np

# 读取数据
df = pd.read_csv('spotify-top-200-dataset.csv', sep=';')

# 特征列
features = ['danceability', 'energy', 'key', 'mode', 'time_signature',
            'loudness', 'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo']

# rank 列是每周的排名 (1-200)
df['rank'] = pd.to_numeric(df['rank'], errors='coerce')
df = df.dropna(subset=['rank'])
df['rank'] = df['rank'].astype(int)

# 确保特征列都是数值
for f in features:
    df[f] = pd.to_numeric(df[f], errors='coerce')

# 同一周内同一首歌可能有多行（不同作者），只保留第一行
df_unique = df.drop_duplicates(subset=['week', 'track_id'], keep='first')

print(f"去重后总行数: {len(df_unique)}")
print(f"唯一周数: {df_unique['week'].nunique()}")

results = []

# 对每个排名位置 1-200
for rank_pos in range(1, 201):
    # 找出所有在该排名的歌曲
    rank_songs = df_unique[df_unique['rank'] == rank_pos]

    if len(rank_songs) == 0:
        continue

    row = {'rank': rank_pos, 'count': len(rank_songs)}
    for f in features:
        row[f] = rank_songs[f].mean()

    results.append(row)

# 创建结果DataFrame
result_df = pd.DataFrame(results)
result_df.to_csv('spotify_features_by_rank_position.csv', index=False)

print(f"\n处理完成！共 {len(result_df)} 个排名位置")
print("\n前10行:")
print(result_df.head(10).to_string())
print("\n最后5行:")
print(result_df.tail(5).to_string())
