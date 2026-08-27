import { AlertCircle } from 'lucide-react';

/**
 * Banner ámbar de advertencias no bloqueantes (§9.9). Se usa en:
 *  - `LiquidarColaborador` para `PreviewLiquidacion.advertencias[]`
 *  - `NominaDetalle` para `Nomina.advertencias[]`
 *
 * Si `items` es undefined o vacío, no renderiza nada — el consumidor no necesita
 * envolver la llamada en un condicional.
 */
export interface AdvertenciaItem {
  codigo: string;
  mensaje: string;
}

interface Props {
  items?: AdvertenciaItem[];
  /** `sm` para dentro del preview, `md` para el header del detalle. */
  size?: 'sm' | 'md';
}

export function AdvertenciasBanner({ items, size = 'md' }: Props) {
  if (!items || items.length === 0) return null;

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const codeSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 text-amber-700 shrink-0" />
        <div className="flex-1 space-y-1">
          {items.map((a, i) => (
            <p
              key={`${a.codigo}-${i}`}
              className={`${textSize} text-amber-900 dark:text-amber-100/90`}
            >
              <strong className={`uppercase tracking-wide ${codeSize}`}>
                {a.codigo}:
              </strong>{' '}
              {a.mensaje}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
