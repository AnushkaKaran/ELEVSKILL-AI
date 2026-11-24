import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return;
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (
            normalizedId.includes('/node_modules/firebase/') ||
            normalizedId.includes('/node_modules/@firebase/')
          ) {
            return 'firebase-vendor';
          }
          if (normalizedId.includes('/node_modules/lucide-react/')) {
            return 'lucide-vendor';
          }
        },
      },
    },
  },
  server: {
    watch: {
      ignored: [
        '**/ml/**/.venv/**',
        '**/ml/**/__pycache__/**',
        '**/ml/**/*.pyc',
      ],
    },
  },
});
