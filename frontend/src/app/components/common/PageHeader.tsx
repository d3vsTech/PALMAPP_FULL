import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { fijarVolver } from '../layout/shellState';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Texto pequeño sobre el título: módulo, fecha, contexto. */
  eyebrow?: ReactNode;
  /** Botones o controles alineados a la derecha; en móvil pasan debajo. */
  actions?: ReactNode;
  /** Ruta a la que vuelve la flecha. */
  backTo?: string;
  className?: string;
}

export default function PageHeader({ title, description, eyebrow, actions, backTo, className }: PageHeaderProps) {
  useEffect(() => {
    fijarVolver(backTo ?? null);
    return () => fijarVolver(null);
  }, [backTo]);

  return (
    <header className={cn('mb-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Volver"
            className="mt-1 flex h-9 w-9 shrink-0 group-data-[barra-volver]/shell:max-md:hidden items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="md:truncate">{title}</h1>
          {description && <p className="text-[15px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="acciones-pagina flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">{actions}</div>}
    </header>
  );
}
