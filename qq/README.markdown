### 数据来源

根据 **output_qq_history  2021-2025** 中 **monthly_genre.csv** 和 **raw_records.csv** 的数据制作了2021-2025 QQ音乐巅峰榜数据旭日图。

### 图表信息

可以选择年份（2021-2025）和月份（1、4、7、10月）来查看QQ音乐巅峰榜前150的歌曲的流派等信息，直观展现了用户对音乐的喜好以及音乐流派的占比等。

### 打开方式

在终端cd到对应文件夹，输入 `python3 -m http.server 8000`。

连接成功后新建终端窗口，输入 `open http://localhost:8000/index.html`，即可打开网页。