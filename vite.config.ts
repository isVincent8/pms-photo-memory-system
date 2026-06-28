import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 开发时把 /api 请求转发到 pms-cloud，保持 cookie 同域
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'map-vendor': ['maplibre-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/mapbox', 'supercluster'],
          'markdown-vendor': ['@kangc/v-md-editor'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
