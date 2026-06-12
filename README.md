# 乐潮 MusicTide · 音乐流行趋势可视分析系统（宏观时空模块）

《数据可视化导论》课程大作业。本仓库为系统的**宏观时空流行趋势分析模块**，
围绕"音乐流行的地域差异、时序演变与时空联动"三类分析任务，
提供六个相互联动的可视化视图。

核心设计决策的完整阐释见 [docs/设计文档.md](docs/设计文档.md)。

## 运行方式

纯静态前端，无需安装任何依赖（ECharts 已随仓库附带），任意静态文件服务器即可运行：

```bash
cd web
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

或使用 `npx serve web`、VS Code Live Server 等任意等价方式。
推荐 1600px 以上宽度的浏览器窗口。

## 目录结构

```
├── data/raw/                  原始数据（见下方数据来源）
├── preprocess/                Python 预处理脚本（标准库实现，无第三方依赖）
│   ├── build_china.py         播放明细 -> 紧凑聚合立方体 china.json
│   └── build_spotify.py       周榜明细 -> 流派月度演变 + 歌曲生命周期 spotify.json
└── web/                       前端（原生 ES Module，无构建步骤）
    ├── index.html
    ├── lib/                   echarts 5.5.1 + 中国地图 GeoJSON（本地附带）
    ├── data/                  预处理产物（已生成，可直接运行）
    └── src/
        ├── store.js           中央状态仓库：视图联动的唯一通道
        ├── dataService.js     数据加载与公共聚合逻辑
        ├── main.js            入口与控制面板
        └── views/             六个视图，每个一个模块
```

## 数据加载方式

`web/data/` 下的 JSON 已随仓库提供，**克隆即可直接运行**。
如需从原始数据复现预处理：

```bash
python3 preprocess/build_china.py
python3 preprocess/build_spotify.py
```

## 数据来源

| 数据集 | 内容 | 规模 | 来源 |
|---|---|---|---|
| 中国音乐平台播放数据（2025-12） | 播放行为明细：城市、时间戳、歌曲、收藏/重复/完播 | 15,628 条记录 | 课程提供的离线数据集 |
| Spotify Weekly Top 200（2017-2021） | 全球周榜：歌曲、艺人流派标签、周播放量、名次 | 74,660 条记录 / 221 周 / 4,247 首歌 | 公开数据集（spotifycharts.com 公开榜单的抓取整理版） |
| 中国地图 GeoJSON | 省级行政区边界 | — | 阿里云 DataV.GeoAtlas |

## 模块分工与扩展

本模块（宏观时空）与队友负责的微观音频特征模块通过同一套
`store.js`（状态契约）与 `views/`（视图注册）机制集成：
新增视图只需实现 `initXxxView(el, data)`，在内部 `subscribe` 状态变化即可加入联动。
