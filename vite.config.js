import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/anu-qrng': {
        target: 'https://qrng.anu.edu.au',
        changeOrigin: true,
        rewrite: () => '/API/jsonI.php?length=100&type=uint16',
      },
    },
  },
})
