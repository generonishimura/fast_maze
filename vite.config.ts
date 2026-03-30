import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/fast_maze/' : '/',
  resolve: {
    alias: [
      { find: /^@\/domain\/(.*)/, replacement: path.resolve(__dirname, 'packages/shared/src/domain/$1') },
      { find: /^@\/utils\/(.*)/, replacement: path.resolve(__dirname, 'packages/shared/src/utils/$1') },
      { find: /^@\/battle\/(.*)/, replacement: path.resolve(__dirname, 'packages/shared/src/battle/$1') },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
  appType: 'spa',
})
