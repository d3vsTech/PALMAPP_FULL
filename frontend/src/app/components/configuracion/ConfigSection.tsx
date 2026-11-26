import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfigSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Botones a la derecha del título; en móvil pasan debajo. */
  actions?: ReactNode;
  /** Sin relleno interior: para tablas y listas que van de borde a borde. */
  flush?: boolean;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
}

/** Tarjeta de sección de configuración: título h3, descripción corta y contenido. */
export function ConfigSection({
  title, description, actions, flush, className, contentClassName, children,
}: ConfigSectionProps) {
  return (
    <Card className={cn('gap-0', flush && 'overflow-hidden', className)}>
      <div
        className={cn(
          'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between',
          (flush || children) && 'border-b border-border',
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <h3>{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
      {children !== undefined && children !== null && (
        <div className={cn(!flush && 'px-5 py-5', contentClassName)}>{children}</div>
      )}
    </Card>
  );
}

interface ConfigEmptyProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vacío dentro de una sección. */
export function ConfigEmpty({ title, description, action }: ConfigEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Fila de acciones al final de un formulario, alineada a la derecha. */
export function ConfigActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}

interface ConfigRowActionsProps {
  /** Nombre del registro, para las etiquetas accesibles. */
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Acciones de fila sobrias: editar y eliminar como botones de ícono. */
export function ConfigRowActions({ label, onEdit, onDelete }: ConfigRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {onEdit && (
        <Button variant="ghost" size="icon" aria-label={`Editar ${label}`} className="text-muted-foreground" onClick={onEdit}>
          <Pencil strokeWidth={2} />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Eliminar ${label}`}
          className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 strokeWidth={2} />
        </Button>
      )}
    </div>
  );
}
