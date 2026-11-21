import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 4173, strictPort: true },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 400,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (/[/\\]node_modules[/\\](react|react-dom|scheduler)[/\\]/u.test(id)) {
            return 'react-vendor';
          }
        }
      }
    }
  }
});
