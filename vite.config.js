import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/lxy-exam/' : '/',
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      resolvers: [NaiveUiResolver()]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  server: {
    port: 5200,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Rolldown（Vite 8）要求 manualChunks 为函数，对象形式会报错
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('naive-ui')) return 'naive-ui'
          if (id.includes('@wangeditor') || id.includes('wangeditor')) return 'wangeditor'
          if (id.includes('echarts') || id.includes('zrender') || id.includes('vue-echarts')) {
            return 'echarts'
          }
          if (
            id.includes('vue-router') ||
            id.includes('pinia') ||
            /node_modules[\\/]axios[\\/]/.test(id) ||
            /node_modules[\\/]vue[\\/]/.test(id)
          ) {
            return 'vendor'
          }
        }
      }
    }
  }
})
