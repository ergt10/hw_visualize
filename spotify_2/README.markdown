

### 数据来源与图表信息

**spotify-top-200-dataset.csv** 中记录了 221 周的 Top200 榜单，有舞曲性、能量、调性、调式、拍号、整体响度、语词率、原声度、纯音乐度、现场感、欢快度、节拍率这12个音乐特征，通过 **process_by_rank_position.py** 处理，计算了 Top200 的12个音乐特征在不同时期的平均值，得到 **spotify_features_by_rank_position.csv** 。再通过 **correlation_analysis.py** 计算出 *排名* 与12个音乐特征即这13组变量两两之间的相关系数，得到 **correlation_matrix.csv** 。由此绘制了相关系数矩阵，点击任意方块可查看对应变量的散点拟合图。

### 打开方式

在终端cd到对应文件夹，输入 `python3 -m http.server 8000`。

连接成功后新建终端窗口，输入 `open http://127.0.0.1:8000/spotify_2.html`，即可打开网页。

