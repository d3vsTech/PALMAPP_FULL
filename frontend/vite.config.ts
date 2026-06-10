import { defineConfig } from 'vite';
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
    proxy: {
      // Backend principal de Laravel (tenant, colaboradores, viajes, etc.)
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://agro-campo.test',
        changeOrigin: true,
        secure: false,
      },
      // Backend del Agente IA (FastAPI en otra máquina) — ruta legacy.
      '/agro-agente': {
        target: process.env.VITE_AGRO_AGENTE_TARGET ?? 'http://31.97.7.50',
        changeOrigin: true,
        secure: false,
      },
      // Proxy del Agente IA equivalente al de Netlify (`public/_redirects`):
      // /agro-api/* → http://31.97.7.50/agro-agente/api/*
      '/agro-api': {
        target: process.env.VITE_AGRO_AGENTE_TARGET ?? 'http://31.97.7.50',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/agro-api/, '/agro-agente/api'),
      },
      // /agro-uploads/* → http://31.97.7.50/agro-agente/uploads/*
      '/agro-uploads': {
        target: process.env.VITE_AGRO_AGENTE_TARGET ?? 'http://31.97.7.50',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/agro-uploads/, '/agro-agente/uploads'),
      },
    },
  },
});