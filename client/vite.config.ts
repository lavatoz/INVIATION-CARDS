import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'API_', 'PUBLIC_'],
    define: {
      'import.meta.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL || env.VITE_API_BASE_URL || ''),
      'import.meta.env.PUBLIC_URL': JSON.stringify(env.PUBLIC_URL || env.VITE_PUBLIC_URL || ''),
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
