# 乐潮 MusicTide · Vue 3 前端

这是乐潮 MusicTide 的前端入口，使用 Vue 3 + Vite + Pinia + ECharts/D3。

## 技术栈

- Vue 3 + Vite：组件化页面与开发构建
- Pinia：跨视图联动状态
- ECharts：地图、热力图、ThemeRiver、散点图、生命周期曲线
- D3：预留给后续自定义可视化/比例尺/布局能力
- Python 预处理：沿用 `../preprocess`

## 运行

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址，默认通常是 `http://localhost:5173`。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`，可以用任意静态服务器部署。

## 数据

当前 Vue 版本直接读取：

- `public/data/china.json`
- `public/data/spotify.json`
- `public/lib/china.json`

这些文件由 `../preprocess` 下的脚本生成或维护。
