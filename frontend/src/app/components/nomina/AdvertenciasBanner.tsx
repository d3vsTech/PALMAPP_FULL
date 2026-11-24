import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../ui/button';
import {
  severidadAdvertencia,
  tituloAdvertencia,
  type SeveridadAdvertencia,
} from '../../utils/advertenciasNomina';
import type { VacacionTrabajadaEnNomina } from '../../../api/nomina';
import { formatFecha } from '../../utils/fecha';

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
/**
 * El backend nombra estos dos campos distinto segun el endpoint: el preview
 * de §5.1 manda `{code, message}` y `GET /nominas/{id}` de §6.1 manda
 * `{codigo, mensaje}`. El banner acepta los dos y normaliza al leer; antes
 * solo miraba los de §6.1 y el recuadro del preview salia con el icono y
 * sin una sola letra.
 */
export interface AdvertenciaItem {
  codigo?: string;
  mensaje?: string;
  code?: string;
  message?: string;
  /**
   * PR-V2 — `VACACIONES_CON_TRABAJO_REGISTRADO` trae la vacación y el primer
   * día trabajado, para ofrecer interrumpirla ahí mismo (CST art. 188).
   */
  vacaciones?: VacacionTrabajadaEnNomina[];
  fecha_reintegro_sugerida?: string | null;
  interrumpible?: boolean;
}

const codigoDe = (a: AdvertenciaItem) => a.codigo ?? a.code ?? '';
const mensajeDe = (a: AdvertenciaItem) => a.mensaje ?? a.message ?? '';

interface Props {
  items?: AdvertenciaItem[];
  /** `sm` para dentro del preview, `md` para el header del detalle. */
  size?: 'sm' | 'md';
  /**
   * PR-V2 — Con esto, la advertencia de trabajo en días de vacaciones ofrece
   * el botón que abre el modal de interrupción. Sin esto solo muestra el
   * texto, que es lo que hace el detalle de la nómina.
   */
  onInterrumpirVacacion?: (v: VacacionTrabajadaEnNomina) => void;
}

const ESTILO: Record<SeveridadAdvertencia, { caja: string; texto: string; icono: string }> = {
  critica: {
    caja: 'border-2 border-destructive/40 bg-destructive/5',
    texto: 'text-destructive',
    icono: 'text-destructive',
  },
  informativa: {
    caja: 'border border-warning/20 bg-warning-soft',
    texto: 'text-warning',
    icono: 'text-warning',
  },
};

export function AdvertenciasBanner({ items, size = 'md', onInterrumpirVacacion }: Props) {
  if (!items || items.length === 0) return null;

  const criticas = items.filter((a) => severidadAdvertencia(codigoDe(a)) === 'critica');
  const informativas = items.filter((a) => severidadAdvertencia(codigoDe(a)) !== 'critica');

  return (
    <div className="space-y-3">
      <Bloque
        items={criticas}
        severidad="critica"
        size={size}
        onInterrumpirVacacion={onInterrumpirVacacion}
      />
      <Bloque
        items={informativas}
        severidad="informativa"
        size={size}
        onInterrumpirVacacion={onInterrumpirVacacion}
      />
    </div>
  );
}

/** Las acciones que la advertencia ofrece, hoy solo la interrupción. */
function AccionesVacacion({
  item,
  onInterrumpir,
}: {
  item: AdvertenciaItem;
  onInterrumpir: (v: VacacionTrabajadaEnNomina) => void;
}) {
  const vacaciones = item.vacaciones ?? [];
  const interrumpibles = vacaciones.filter((v) => v.interrumpible);
  if (interrumpibles.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {interrumpibles.map((v) => (
        <Button
          key={v.vacacion_id}
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => onInterrumpir(v)}
          title={v.fecha_reintegro_sugerida
            ? `La planilla dice que volvió el ${formatFecha(v.fecha_reintegro_sugerida)}`
            : undefined}
        >
          Interrumpir {v.numero_comprobante}
        </Button>
      ))}
    </div>
  );
}

function Bloque({
  items,
  severidad,
  size,
  onInterrumpirVacacion,
}: {
  items: AdvertenciaItem[];
  severidad: SeveridadAdvertencia;
  size: 'sm' | 'md';
  onInterrumpirVacacion?: (v: VacacionTrabajadaEnNomina) => void;
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
            const codigo = codigoDe(a);
            const titulo = tituloAdvertencia(codigo);
            const mensaje = mensajeDe(a);
            return (
              <div key={`${codigo}-${i}`} className={`${textSize} ${estilo.texto}`}>
                {titulo && <p className="font-semibold">{titulo}</p>}
                {/* Sin título ni mensaje queda el código crudo: feo, pero
                    menos inútil que un recuadro vacío. */}
                <p className={titulo ? 'opacity-90' : undefined}>
                  {mensaje || (titulo ? '' : codigo)}
                </p>
                {onInterrumpirVacacion && (a.vacaciones?.length ?? 0) > 0 && (
                  <AccionesVacacion item={a} onInterrumpir={onInterrumpirVacacion} />
                )}
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
  const criticas = (items ?? []).filter((a) => severidadAdvertencia(codigoDe(a)) === 'critica');
  if (criticas.length === 0) return null;

  return (
    <p className="flex items-start gap-2 text-xs text-destructive">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Revise {criticas.length === 1 ? 'la advertencia' : `las ${criticas.length} advertencias`} de
      arriba antes de confirmar.
    </p>
  );
}
