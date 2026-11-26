import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@pages': path.resolve(__dirname, './src/app/pages'),
      '@contexts': path.resolve(__dirname, './src/app/contexts'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  // NOTA: no usamos `rollupOptions.manualChunks`. Separar React de las libs
  // que llaman `createContext` en el top-level (radix, mui, motion, cmdk,
  // sonner, react-hook-form, etc.) causaba `Cannot read properties of
  // undefined (reading 'createContext')` en producción porque el chunk
  // vendor se ejecutaba antes de que react-vendor definiera React.
  // Vite/Rollup ya hacen splitting automático correcto.
  build: {
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: buildDevProxy(loadEnv(mode, process.cwd(), 'VITE_')),
  },
}));

/**
 * Proxies del dev server. Todos los targets se leen del `.env` cargado con
 * `loadEnv`. Si una variable no está definida, el proxy correspondiente se
 * omite y el frontend recibirá 404 si intenta consumirlo — preferimos eso a
 * tener IPs de servidores viejos hardcodeadas como fallback (lo que ya nos
 * rompió cuando migramos el VPS).
 */
function buildDevProxy(env: Record<string, string>) {
  const proxy: Record<string, any> = {};

  const apiTarget = (env.VITE_API_URL ?? '').replace(/\/api\/?$/, '');
  if (apiTarget) {
    proxy['/api'] = { target: apiTarget, changeOrigin: true, secure: false };
  }

  const agroTarget = env.VITE_AGRO_AGENTE_TARGET;
  if (agroTarget) {
    // Ruta legacy directa a /agro-agente/...
    proxy['/agro-agente'] = { target: agroTarget, changeOrigin: true, secure: false };
    // Paridad con Netlify (`public/_redirects`):
    // /agro-api/*     → {host}/agro-agente/api/*
    // /agro-uploads/* → {host}/agro-agente/uploads/*
    proxy['/agro-api'] = {
      target: agroTarget,
      changeOrigin: true,
      secure: false,
      rewrite: (p: string) => p.replace(/^\/agro-api/, '/agro-agente/api'),
    };
    proxy['/agro-uploads'] = {
      target: agroTarget,
      changeOrigin: true,
      secure: false,
      rewrite: (p: string) => p.replace(/^\/agro-uploads/, '/agro-agente/uploads'),
    };
  }

  return proxy;
}