var _a;
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
            // Redirigir llamadas /api al backend durante desarrollo
            '/api': {
                target: (_a = process.env.VITE_API_URL) !== null && _a !== void 0 ? _a : 'http://agro-campo.test',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
