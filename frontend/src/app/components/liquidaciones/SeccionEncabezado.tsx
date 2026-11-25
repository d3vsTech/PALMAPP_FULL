import { ReactNode } from 'react';

interface SeccionEncabezadoProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Título de sección dentro de una pestaña, con la acción a la derecha (debajo en móvil). */
export default function SeccionEncabezado({ title, description, actions }: SeccionEncabezadoProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2>{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
