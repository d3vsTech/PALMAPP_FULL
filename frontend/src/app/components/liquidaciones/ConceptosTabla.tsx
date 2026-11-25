import { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface Concepto {
  label: ReactNode;
  /** Detalle pequeño debajo del concepto (fórmula, base, días). */
  detalle?: ReactNode;
  valor: ReactNode;
  /** Resta del total: se muestra con signo menos. */
  negativo?: boolean;
  /** Fila de subtotal o total: peso tipográfico mayor y borde superior. */
  total?: boolean;
}

interface ConceptosTablaProps {
  items: Concepto[];
  className?: string;
}

/** Tabla de conceptos de un cálculo: concepto a la izquierda, valor a la derecha. */
export default function ConceptosTabla({ items, className }: ConceptosTablaProps) {
  return (
    <dl className={cn('divide-y divide-border text-sm', className)}>
      {items.map((c, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start justify-between gap-4 py-2.5',
            c.total && 'border-t border-foreground/20 pt-3'
          )}
        >
          <dt className="min-w-0">
            <span className={cn(c.total ? 'font-semibold text-foreground' : 'text-foreground')}>{c.label}</span>
            {c.detalle && <span className="block text-xs text-muted-foreground">{c.detalle}</span>}
          </dt>
          <dd
            className={cn(
              'shrink-0 text-right tabular-nums',
              c.total ? 'text-base font-bold text-foreground' : 'font-medium text-foreground'
            )}
          >
            {c.negativo && '− '}
            {c.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
