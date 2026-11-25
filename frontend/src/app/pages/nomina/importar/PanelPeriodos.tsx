/**
 * Un bloque por período: la nómina histórica que va a quedar, con sus filas.
 *
 * Lo que más importa aquí no es lo que trae el archivo sino lo que **falta**:
 * los colaboradores con contrato vigente en esas fechas que no aparecen. Se
 * pintan en dos grupos, porque no significan lo mismo:
 *
 *  - sin novedad: tenía contrato y no quedó ni pago ni explicación. Hay que
 *    revisarlo antes de cargar, porque su período queda en blanco y eso baja
 *    en silencio la base de sus cesantías y su prima.
 *  - con novedad: hay una ausencia o una vacación que cruza el período. Es
 *    informativo, para confirmar que por eso no se le pagó.
 */
import { Badge } from '../../../components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import type { FaltanteDelPeriodo, FilaNominaCargue, NominaDelCargue } from '../../../../api/importarNominas';
import { formatFecha } from '../../../utils/fecha';
import { TablaFilasNominas } from './TablaFilasNominas';

function pesos(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-CO')}`;
}

/** Cómo se llamará el período en el listado de nóminas. */
function etiquetaPeriodo(nomina: NominaDelCargue): string {
  if (nomina.quincena === 1) return 'Primera quincena';
  if (nomina.quincena === 2) return 'Segunda quincena';
  return 'Mensual';
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className="font-medium tabular-nums text-foreground">{valor}</dd>
    </div>
  );
}

function Faltante({ persona }: { persona: FaltanteDelPeriodo }) {
  return (
    <li>
      {persona.nombre_completo}{' '}
      <span className="text-muted-foreground">({persona.documento})</span>
      {persona.novedad && (
        <span className="text-muted-foreground">
          {' · '}
          {persona.novedad.tipo ?? persona.novedad.fuente} del{' '}
          {formatFecha(persona.novedad.fecha_inicio)} al {formatFecha(persona.novedad.fecha_fin)}
        </span>
      )}
    </li>
  );
}

/**
 * Los que faltan, separados por si hay algo que los explique. El grupo sin
 * novedad va en ámbar; el otro en azul informativo, porque no pide acción.
 */
function Faltantes({ faltantes }: { faltantes: FaltanteDelPeriodo[] }) {
  const sinNovedad = faltantes.filter((f) => !f.novedad);
  const conNovedad = faltantes.filter((f) => f.novedad);
  if (faltantes.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border px-4 py-3">
      {sinNovedad.length > 0 && (
        <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
          <div className="min-w-0 text-sm text-foreground">
            <p className="font-medium">
              {sinNovedad.length} con contrato y sin pago en este período
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {sinNovedad.map((p) => <Faltante key={p.id} persona={p} />)}
            </ul>
          </div>
        </div>
      )}
      {conNovedad.length > 0 && (
        <div className="flex gap-2 rounded-lg bg-info-soft p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
          <div className="min-w-0 text-sm text-foreground">
            <p className="font-medium">
              {conNovedad.length} sin pago, con una novedad que lo explica
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {conNovedad.map((p) => <Faltante key={p.id} persona={p} />)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaPeriodo({
  nomina,
  filas,
}: {
  nomina: NominaDelCargue;
  filas: FilaNominaCargue[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h4>
            {formatFecha(nomina.fecha_inicio)} al {formatFecha(nomina.fecha_fin)}
          </h4>
          <p className="text-xs text-muted-foreground">
            {etiquetaPeriodo(nomina)} · {filas.length} colaborador
            {filas.length === 1 ? '' : 'es'}
          </p>
        </div>
        <Badge variant={nomina.nueva ? 'success' : 'secondary'}>
          {nomina.nueva ? 'Nómina nueva' : 'Ya existe, recibe filas'}
        </Badge>
      </div>

      <dl className="grid gap-4 bg-muted/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato titulo="Devengado" valor={pesos(nomina.totales?.fijos)} />
        <Dato titulo="Producción" valor={pesos(nomina.totales?.variables)} />
        <Dato titulo="Deducciones" valor={pesos(nomina.totales?.deducciones)} />
        <Dato titulo="Total del período" valor={pesos(nomina.totales?.general)} />
      </dl>

      <Faltantes faltantes={nomina.faltantes ?? []} />
      <TablaFilasNominas filas={filas} />
    </div>
  );
}

/**
 * Reparte las filas entre sus períodos. `nomina_indice` es el camino directo;
 * las fechas son el respaldo para una fila que llegó sin índice.
 */
function filasDe(
  nomina: NominaDelCargue,
  indice: number,
  filas: FilaNominaCargue[],
): FilaNominaCargue[] {
  return filas.filter((f) =>
    f.nomina_indice !== null && f.nomina_indice !== undefined
      ? f.nomina_indice === indice
      : f.periodo?.fecha_inicio === nomina.fecha_inicio
        && f.periodo?.fecha_fin === nomina.fecha_fin,
  );
}

export function PanelPeriodos({
  nominas,
  filas,
}: {
  nominas: NominaDelCargue[];
  filas: FilaNominaCargue[];
}) {
  if (nominas.length === 0) return null;

  return (
    <div className="space-y-3">
      {nominas.map((nomina, i) => (
        <TarjetaPeriodo
          key={`${nomina.fecha_inicio}-${nomina.fecha_fin}`}
          nomina={nomina}
          filas={filasDe(nomina, i, filas)}
        />
      ))}
    </div>
  );
}
