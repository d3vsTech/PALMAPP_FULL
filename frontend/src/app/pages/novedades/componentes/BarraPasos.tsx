/** Indicador de progreso del wizard de registro. */
import { Check } from 'lucide-react';

interface Paso {
  numero: number;
  titulo: string;
}

const PASOS: Paso[] = [
  { numero: 1, titulo: 'Tipo de novedad' },
  { numero: 2, titulo: 'Detalles' },
  { numero: 3, titulo: 'Confirmación' },
];

export function BarraPasos({ actual }: { actual: number }) {
  return (
    <ol className="flex items-center">
      {PASOS.map((paso, idx) => {
        const completado = actual > paso.numero;
        const activo = actual === paso.numero;

        return (
          <li key={paso.numero} className="flex flex-1 items-center last:flex-none">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                  completado
                    ? 'border-primary bg-primary text-primary-foreground'
                    : activo
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {completado ? <Check className="h-4 w-4" strokeWidth={2.5} /> : paso.numero}
              </span>
              {/* El título se oculta en móvil: no caben tres junto a sus círculos. */}
              <span
                className={`hidden text-sm sm:block ${
                  activo ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {paso.titulo}
              </span>
            </div>
            {idx < PASOS.length - 1 && (
              <div className={`mx-3 h-px flex-1 transition-colors ${completado ? 'bg-primary' : 'bg-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
