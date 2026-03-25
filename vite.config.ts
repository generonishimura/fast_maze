import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/fast_maze/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
