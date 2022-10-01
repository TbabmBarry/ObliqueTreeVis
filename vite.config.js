import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 4545,
    cors: true,
    proxy: {
        '^/api/': {
            target: 'http://localhost:3000',
            // target: 'https://vercel-flask-oblique-tree.vercel.app',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '/api')
        }
    },
},
build: {
  target: "es2020",
},
define: {
  "process.env": {}
}
})
