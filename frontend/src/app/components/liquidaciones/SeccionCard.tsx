import { ReactNode } from 'react';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';

interface SeccionCardProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Tarjeta de sección para detalles y formularios: título h3, descripción corta y contenido. */
export default function SeccionCard({ title, description, actions, children, className, contentClassName }: SeccionCardProps) {
  return (
    <Card className={cn('gap-0', className)}>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-0.5">
          <h3>{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={cn('px-5 py-5 sm:px-6', contentClassName)}>{children}</div>
    </Card>
  );
}
