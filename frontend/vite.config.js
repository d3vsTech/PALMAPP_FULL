var _a, _b;
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
    server: {
        port: 5173,
        proxy: {
            // Backend principal de Laravel (tenant, colaboradores, viajes, etc.)
            '/api': {
                target: (_a = process.env.VITE_API_URL) !== null && _a !== void 0 ? _a : 'http://agro-campo.test',
                changeOrigin: true,
                secure: false,
            },
            // Backend del Agente IA (FastAPI en otra máquina)
            '/agro-agente': {
                target: (_b = process.env.VITE_AGRO_AGENTE_TARGET) !== null && _b !== void 0 ? _b : 'http://31.97.7.50',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
