import { defineConfig } from 'vite';

const proxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
};

export default defineConfig({
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy }
});
