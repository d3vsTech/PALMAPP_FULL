import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  severidadAdvertencia,
  tituloAdvertencia,
  type SeveridadAdvertencia,
} from '../../utils/advertenciasNomina';

/**
 * Advertencias no bloqueantes de nómina (§5.1 y §6.1). Se usa en:
 *  - `LiquidarColaborador` para `PreviewLiquidacion.advertencias[]`
 *  - `NominaDetalle` para `Nomina.advertencias[]`
 *
 * Las separa en dos bloques, y esa separación es el punto: hasta ahora todas
 * se pintaban del mismo ámbar, así que "este colaborador liquida en cero" se
 * veía igual que "el calendario de festivos está desactualizado". Cuando todo
 * parece igual de urgente, nada lo parece.
 *
 * El código crudo dejó de encabezar el texto. En su lugar va un título legible
 * cuando lo hay; el detalle con nombres y fechas lo sigue mandando el backend.
 *
 * Si `items` es undefined o vacío no renderiza nada — el consumidor no necesita
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

const ESTILO: Record<SeveridadAdvertencia, { caja: string; texto: string; icono: string }> = {
  critica: {
    caja: 'border-2 border-destructive/40 bg-destructive/5',
    texto: 'text-destructive',
    icono: 'text-destructive',
  },
  informativa: {
    caja: 'border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20',
    texto: 'text-amber-900 dark:text-amber-100/90',
    icono: 'text-amber-700',
  },
};

export function AdvertenciasBanner({ items, size = 'md' }: Props) {
  if (!items || items.length === 0) return null;

  const criticas = items.filter((a) => severidadAdvertencia(a.codigo) === 'critica');
  const informativas = items.filter((a) => severidadAdvertencia(a.codigo) !== 'critica');

  return (
    <div className="space-y-3">
      <Bloque items={criticas} severidad="critica" size={size} />
      <Bloque items={informativas} severidad="informativa" size={size} />
    </div>
  );
}

function Bloque({
  items,
  severidad,
  size,
}: {
  items: AdvertenciaItem[];
  severidad: SeveridadAdvertencia;
  size: 'sm' | 'md';
}) {
  if (items.length === 0) return null;

  const estilo = ESTILO[severidad];
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const Icono = severidad === 'critica' ? AlertTriangle : AlertCircle;

  return (
    <div className={`rounded-lg p-4 ${estilo.caja}`}>
      <div className="flex items-start gap-3">
        <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.icono}`} />
        <div className="flex-1 space-y-2">
          {items.map((a, i) => {
            const titulo = tituloAdvertencia(a.codigo);
            return (
              <div key={`${a.codigo}-${i}`} className={`${textSize} ${estilo.texto}`}>
                {titulo && <p className="font-semibold">{titulo}</p>}
                <p className={titulo ? 'opacity-90' : undefined}>{a.mensaje}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso corto para el botón de confirmar, cuando hay algo que el usuario
 * debería resolver antes de liquidar. No bloquea: el backend tampoco lo hace.
 */
export function NotaAntesDeConfirmar({ items }: { items?: AdvertenciaItem[] }) {
  const criticas = (items ?? []).filter((a) => severidadAdvertencia(a.codigo) === 'critica');
  if (criticas.length === 0) return null;

  return (
    <p className="flex items-start gap-2 text-xs text-destructive">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Revise {criticas.length === 1 ? 'la advertencia' : `las ${criticas.length} advertencias`} de
      arriba antes de confirmar.
    </p>
  );
}
