/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend Laravel (termina en /api). */
  readonly VITE_API_URL?: string;
  /** URL del propio frontend (para enlaces en correos del backend). */
  readonly VITE_APP_URL?: string;
  /** Override de la URL del agente IA (FastAPI). */
  readonly VITE_AGRO_AGENTE_URL?: string;
  /** Target del proxy Vite para /agro-api y /agro-agente. */
  readonly VITE_AGRO_AGENTE_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }