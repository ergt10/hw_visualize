import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // ECharts/D3 属于可视化项目的主体依赖，生产包偏大是预期内的。
    chunkSizeWarningLimit: 1500,
  },
})
