import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from https://<user>.github.io/leelee/ when deployed to Pages.
  base: process.env.GITHUB_ACTIONS ? '/leelee/' : '/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
});
