import pandas as pd
import numpy as np

# 读取数据
df = pd.read_csv('spotify_features_by_rank_position.csv')

# 13个特征
features = ['rank', 'danceability', 'energy', 'key', 'mode', 'time_signature',
            'loudness', 'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo']

df_sel = df[features]

# 计算相关系数矩阵（Pearson相关系数）
corr = df_sel.corr()

# 保存到CSV
corr.to_csv('correlation_matrix.csv')

# 打印结果
print("=" * 80)
print("相关系数矩阵 (13x13)")
print("=" * 80)
print(corr.round(3).to_string())
print()

# 验证：矩阵应为对称矩阵，对角线元素均为1
print("=" * 80)
print("验证：对角线元素 (应为1.0)")
print("=" * 80)
print(corr.values.diagonal())
print()

# 验证矩阵是否对称
print("=" * 80)
print("验证：矩阵是否对称")
print("=" * 80)
is_symmetric = np.allclose(corr.values, corr.values.T)
print(f"矩阵是否对称: {is_symmetric}")
print(f"矩阵形状: {corr.shape} (应为 13x13)")
print(f"元素总数: {corr.size} (应为 169)")
print()

# 保存完成提示
print("=" * 80)
print("结果已保存至: correlation_matrix.csv")
print("=" * 80)
