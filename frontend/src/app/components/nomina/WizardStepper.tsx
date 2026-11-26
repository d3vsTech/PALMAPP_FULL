import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

/** Indicador de pasos sobrio para los asistentes del módulo Pagos. */
export default function WizardStepper({
  pasos,
  actual,
  className,
}: {
  pasos: { numero: number; titulo: string }[];
  actual: number;
  className?: string;
}) {
  const pasoActual = pasos.find((p) => p.numero === actual);
  return (
    <nav aria-label="Pasos" className={className}>
      {/* Móvil: texto compacto + barra */}
      <div className="space-y-2 sm:hidden">
        <p className="text-sm text-muted-foreground">
          Paso {actual} de {pasos.length} ·{' '}
          <span className="font-semibold text-foreground">{pasoActual?.titulo}</span>
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(actual / pasos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tablet y escritorio */}
      <ol className="hidden items-center gap-2 sm:flex">
        {pasos.map((paso, i) => {
          const completo = actual > paso.numero;
          const activo = actual === paso.numero;
          return (
            <li key={paso.numero} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  completo && 'border-primary bg-primary text-primary-foreground',
                  activo && 'border-primary bg-primary-soft text-primary',
                  !completo && !activo && 'border-border bg-card text-muted-foreground',
                )}
                aria-current={activo ? 'step' : undefined}
              >
                {completo ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : paso.numero}
              </span>
              {/* En tableta el nombre del paso baja a dos líneas en vez de cortarse */}
              <span
                className={cn(
                  'min-w-0 text-sm leading-tight',
                  activo ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {paso.titulo}
              </span>
              {i < pasos.length - 1 && (
                <span className="mx-1 h-px min-w-4 flex-1 bg-border" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
