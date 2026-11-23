/**
 * Período de la pantalla, con la forma del diseño: botones pegados dentro de
 * un recuadro, el activo en verde.
 *
 * El diseño trae tres opciones porque es una maqueta sin backend. Aquí entran
 * las que cada pantalla acepte, que son más, así que el grupo dobla línea en
 * pantalla angosta en vez de salirse.
 */
import { cn } from '../lib/utils';

export interface OpcionPeriodo<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SelectorPeriodoProps<T extends string> {
  valor: T;
  opciones: readonly OpcionPeriodo<T>[];
  onChange: (valor: T) => void;
  className?: string;
}

export default function SelectorPeriodo<T extends string>({
  valor,
  opciones,
  onChange,
  className,
}: SelectorPeriodoProps<T>) {
  return (
    <div
      role="group"
      aria-label="Período"
      className={cn(
        'flex flex-wrap rounded-lg border border-border bg-card p-0.5 shadow-xs',
        className,
      )}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          aria-pressed={valor === opcion.valor}
          className={cn(
            'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
            valor === opcion.valor
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}
