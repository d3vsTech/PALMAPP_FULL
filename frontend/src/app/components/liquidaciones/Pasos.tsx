import { Check } from 'lucide-react';
import { cn } from '../ui/utils';

interface PasosProps {
  pasos: string[];
  /** Paso actual, empezando en 1. */
  actual: number;
}

/** Indicador de pasos sobrio: número en círculo, línea entre pasos y título del paso. */
export default function Pasos({ pasos, actual }: PasosProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {pasos.map((titulo, idx) => {
        const numero = idx + 1;
        const completado = actual > numero;
        const activo = actual === numero;
        return (
          <li key={titulo} className={cn('flex items-center gap-2 sm:gap-3', idx < pasos.length - 1 && 'flex-1')}>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                completado && 'border-primary bg-primary text-primary-foreground',
                activo && 'border-primary bg-primary-soft text-primary',
                !completado && !activo && 'border-border bg-card text-muted-foreground'
              )}
              aria-current={activo ? 'step' : undefined}
            >
              {completado ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : numero}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-sm',
                activo ? 'font-semibold text-foreground' : 'text-muted-foreground',
                !activo && 'hidden md:inline'
              )}
            >
              {titulo}
            </span>
            {idx < pasos.length - 1 && <span className={cn('h-px flex-1', completado ? 'bg-primary' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}
