import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'vendor-recharts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-framer';
          if (id.includes('node_modules/react-router-dom')) return 'vendor-router';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react')) return 'vendor-react';
        },
      },
    },
  },
})
