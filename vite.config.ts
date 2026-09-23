import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // پوشه‌ی data/ داده‌های اجرایی موتور جستجوی بصری است (ایندکس برداری،
      // لاگ‌ها، درخواست‌ها) و نباید باعث ری‌لود/فلیکر شود.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : { ignored: ['**/data/**', '**/scripts/**'] },
      // Allow the sandbox preview host so the app is reachable in hosted environments.
      allowedHosts: true as const,
      host: true,
    },
  };
});
