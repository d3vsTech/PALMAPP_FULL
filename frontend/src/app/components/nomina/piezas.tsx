/**
 * Piezas sueltas que se repiten en todo el módulo de Pagos.
 *
 * Viven aquí y no en cada pantalla por una razón: hasta ahora cada tabla se
 * pintaba su propia franja de encabezado, y había ocho versiones del mismo
 * gris. Con las clases en un solo sitio, cambiar el tono se hace una vez.
 *
 * Es el mismo archivo del diseño, con un ajuste de ruta: `cn` sale de
 * `components/lib/utils`.
 */
import { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../lib/utils';
import { cop } from '../../lib/formato';

/** Pesos con punto de miles, sin redondear: hasta dos decimales. */
export { cop };

/** Selector segmentado para alternar vistas dentro de una pantalla. */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex w-full rounded-lg border border-border bg-muted/60 p-1 sm:w-auto',
        className,
      )}
    >
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none',
              activo
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1.5 text-xs tabular-nums',
                  activo ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Fila etiqueta / monto para resúmenes de liquidación. */
export function FilaMonto({
  label,
  value,
  strong,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 text-sm', className)}>
      <span className={strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={cn('tabular-nums text-foreground', strong ? 'font-semibold' : 'font-medium')}>
        {value}
      </span>
    </div>
  );
}

/** Rótulo de sección, el gris chico que va encima de un bloque de datos. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[13px] font-medium text-muted-foreground', className)}>{children}</p>;
}

/** Clases compartidas para tablas a mano. La alineación la pone cada columna. */
export const thead = 'bg-muted/60 text-[13px] font-medium text-muted-foreground';
export const th = 'px-4 py-2.5 font-semibold';
export const td = 'px-4 py-3';

/** Lista editable de conceptos con valor (préstamos, descuentos, bonificaciones). */
export function ConceptosEditables({
  titulo,
  items,
  onAgregar,
  onCambiar,
  onQuitar,
  placeholder = 'Concepto',
  textoVacio = 'Sin registros',
  agregarLabel = 'Agregar',
}: {
  titulo: string;
  items: { concepto: string; valor: number }[];
  onAgregar: () => void;
  onCambiar: (index: number, campo: 'concepto' | 'valor', valor: string | number) => void;
  onQuitar: (index: number) => void;
  placeholder?: string;
  textoVacio?: string;
  agregarLabel?: string;
}) {
  const total = items.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{titulo}</span>
        <Button type="button" size="sm" variant="ghost" onClick={onAgregar}>
          <Plus strokeWidth={2} />
          {agregarLabel}
        </Button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((it, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder={placeholder}
                value={it.concepto}
                onChange={(e) => onCambiar(index, 'concepto', e.target.value)}
                className="min-w-0 flex-1"
                aria-label={`${titulo}: concepto`}
              />
              <Input
                type="number"
                placeholder="0"
                value={it.valor || ''}
                onChange={(e) => onCambiar(index, 'valor', Number(e.target.value) || 0)}
                className="w-28 text-right sm:w-36"
                aria-label={`${titulo}: valor`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onQuitar(index)}
                aria-label="Quitar"
              >
                <Trash2 strokeWidth={2} />
              </Button>
            </div>
          ))}
          <FilaMonto label={`Total ${titulo.toLowerCase()}`} value={cop(total)} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{textoVacio}</p>
      )}
    </div>
  );
}
