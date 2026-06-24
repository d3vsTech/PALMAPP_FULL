import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
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
  /**
   * Bundle splitting: separa librerías pesadas en chunks propios para que
   * el navegador descargue solo lo necesario por pantalla y cachee los vendors
   * entre deploys (mientras la versión del paquete no cambie).
   */
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;

          // React core: lo necesita la pantalla inicial.
          if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          // shadcn/Radix: lo usa casi todo, pero pesa mucho como bloque separado.
          if (id.includes('@radix-ui')) return 'radix-vendor';
          // Recharts (gráficos) — solo lo usan métricas/dashboard.
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts-vendor';
          // jsPDF + html2canvas (exportar desprendibles) — solo en algunas pantallas.
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
          // xlsx (importar/exportar colaboradores y reportes).
          if (id.includes('xlsx') || id.includes('exceljs')) return 'xlsx-vendor';
          // Lucide (íconos) — usado en todo.
          if (id.includes('lucide-react')) return 'icons-vendor';
          // date-fns — usado por calendarios y formatters.
          if (id.includes('date-fns')) return 'date-vendor';
          // Resto de vendors.
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: buildDevProxy(),
  },
});

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
