import { ReactNode } from 'react';
import { PalmappLogo } from '../../components/common/PalmappLogo';

/**
 * Foto de plantación para el panel del login. Cuando el cliente entregue una foto propia,
 * se guarda en assets/ y se importa aquí (p. ej. `import foto from 'figma:asset/login-plantacion.jpg'`).
 * Mientras sea null, el panel usa el patrón de hojas de la marca.
 */
const FOTO_LOGIN: string | null = null;

interface AuthFrameProps {
  children: ReactNode;
  /** Frase corta del panel verde (solo escritorio). */
  frase?: string;
  /** Rótulo pequeño bajo el logo, p. ej. "Super admin". */
  rotulo?: string;
}

/** Marco de las pantallas de acceso: panel verde con el logo en escritorio y formulario sobre bg-background. */
export default function AuthFrame({
  children,
  frase = 'Tu palma en la palma: predios, cosecha, viajes y nómina de la finca en un solo lugar.',
  rotulo,
}: AuthFrameProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[42%] max-w-[560px] flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:m-2.5 lg:flex lg:rounded-[20px]">
        {FOTO_LOGIN ? (
          <>
            <img src={FOTO_LOGIN} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/60 to-sidebar/20" />
          </>
        ) : (
          <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -bottom-24 -right-24 h-[520px] w-[520px] text-sidebar-primary/[0.08]">
            <g fill="currentColor">
              <path d="M200 390V190c-28-70-104-112-180-98 32 62 104 98 180 98Z" />
              <path d="M200 190c28-70 104-112 180-98-32 62-104 98-180 98Z" />
              <path d="M200 250c-34-44-92-60-142-42 30 38 86 56 142 42Z" />
              <path d="M200 250c34-44 92-60 142-42-30 38-86 56-142 42Z" />
              <path d="M200 190c-14-50-6-104 0-140 6 36 14 90 0 140Z" />
            </g>
          </svg>
        )}
        <div className="relative">
          <div className="flex items-center gap-3">
            <PalmappLogo variant="isotipo" tono="blanco" className="h-10 w-auto" alt="" />
            <PalmappLogo variant="wordmark" tono="blanco" className="h-[20px] w-auto" />
          </div>
          {rotulo && (
            <p className="mt-2 pl-[52px] text-xs font-medium text-sidebar-primary">
              {rotulo}
            </p>
          )}
        </div>
        <p className="relative max-w-sm font-heading text-[28px] font-bold leading-tight tracking-tight text-sidebar-accent-foreground">{frase}</p>
        <p className="relative text-xs text-sidebar-foreground/55">© {new Date().getFullYear()} PalmApp</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <PalmappLogo variant="vertical" className="h-28 w-auto" />
            {rotulo && (
              <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
