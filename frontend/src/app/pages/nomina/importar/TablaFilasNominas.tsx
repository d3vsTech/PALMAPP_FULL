/**
 * Las filas de un período: un colaborador por línea, con lo que se escribiría.
 *
 * Muestra lo resuelto, no lo que venía escrito: el colaborador que cruzó la
 * cédula, la modalidad con la que se va a guardar y de dónde salió, y el
 * devengado, el auxilio, las deducciones y el neto tal como quedarían. Es el
 * único paso donde se ve que una columna corrida mandó el auxilio al neto.
 */
import { AlertCircle, AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { IncidenciasFila, THEAD, TD } from '../../liquidaciones/historico/comunes';
import {
  ADVERTENCIA_NOMINA_LABEL,
  ERROR_FILA_NOMINA_LABEL,
  type FilaNominaCargue,
} from '../../../../api/importarNominas';

const ESTADO_BADGE: Record<string, 'success' | 'destructive' | 'warning'> = {
  OK: 'success',
  ERROR: 'destructive',
  SOBRESCRIBIR: 'warning',
};

const ESTADO_ICONO: Record<string, LucideIcon> = {
  OK: CheckCircle2,
  ERROR: AlertCircle,
  SOBRESCRIBIR: AlertTriangle,
};

const ESTADO_LABEL: Record<string, string> = {
  OK: 'Se carga',
  ERROR: 'Con error',
  SOBRESCRIBIR: 'Se reescribe',
};

const CABECERAS = [
  '#', 'Colaborador', 'Modalidad', 'Días', 'Devengado', 'Auxilio',
  'Deducciones', 'Neto', 'Estado',
];

function pesos(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-CO')}`;
}

/** El colaborador que cruzó la cédula, con lo que decía el archivo debajo. */
function CeldaColaborador({ fila }: { fila: FilaNominaCargue }) {
  if (!fila.empleado) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Sin colaborador</p>
        <p className="text-xs text-muted-foreground">
          {fila.documento ?? '—'}
          {fila.nombre_archivo ? ` · ${fila.nombre_archivo}` : ''}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{fila.empleado.nombre_completo}</p>
      <p className="text-xs text-muted-foreground">{fila.empleado.documento}</p>
    </div>
  );
}

/**
 * La modalidad decide a qué columna va el devengado cuando el archivo no lo
 * desglosa, así que importa de dónde salió.
 */
function CeldaModalidad({ fila }: { fila: FilaNominaCargue }) {
  if (!fila.modalidad) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="min-w-0">
      <p className="text-sm">{fila.modalidad.salario_tipo === 'FIJO' ? 'Fijo' : 'Producción'}</p>
      {fila.modalidad.resuelta_por === 'FICHA' && (
        <p className="text-xs text-muted-foreground">de la ficha</p>
      )}
    </div>
  );
}

/** El devengado, con la marca de si vino desglosado o como un solo total. */
function CeldaDevengado({ fila }: { fila: FilaNominaCargue }) {
  if (!fila.valores) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-right">
      <p className="text-sm tabular-nums text-foreground">{pesos(fila.valores.total_devengado)}</p>
      {!fila.valores.desglose && (
        <p className="text-xs text-muted-foreground">sin desglose</p>
      )}
    </div>
  );
}

/** El estado de la fila, con su ícono como en la revisión del diseño. */
function BadgeEstado({ estado }: { estado: string }) {
  const Icono = ESTADO_ICONO[estado];
  return (
    <Badge variant={ESTADO_BADGE[estado] ?? 'secondary'}>
      {Icono && <Icono />}
      {ESTADO_LABEL[estado] ?? estado}
    </Badge>
  );
}

export function TablaFilasNominas({ filas }: { filas: FilaNominaCargue[] }) {
  if (filas.length === 0) {
    return <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Este período no trae filas.</p>;
  }

  return (
    <div className="overflow-x-auto border-t border-border">
      <table className="w-full min-w-[840px] text-sm">
        <thead className={THEAD}>
          <tr>
            {CABECERAS.map((c) => (
              <th
                key={c}
                className={`whitespace-nowrap px-4 py-2.5 font-semibold ${
                  ['Días', 'Devengado', 'Auxilio', 'Deducciones', 'Neto'].includes(c)
                  ? 'text-right'
                  : 'text-left'
                } ${c === '#' ? 'w-8' : ''}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((fila) => (
            <tr key={fila.fila}>
              <td className={`${TD} text-xs text-muted-foreground`}>{fila.fila}</td>
              <td className={TD}><CeldaColaborador fila={fila} /></td>
              <td className={TD}><CeldaModalidad fila={fila} /></td>
              <td className="px-4 py-3 text-right align-top tabular-nums">
                {fila.valores?.dias_trabajados ?? '—'}
              </td>
              <td className={TD}><CeldaDevengado fila={fila} /></td>
              <td className="px-4 py-3 text-right align-top tabular-nums">
                {pesos(fila.valores?.subsidio_transporte)}
              </td>
              <td className="px-4 py-3 text-right align-top tabular-nums">
                {pesos(fila.valores?.total_deducciones)}
              </td>
              <td className="px-4 py-3 text-right align-top font-semibold tabular-nums text-foreground">
                {pesos(fila.valores?.total_neto)}
              </td>
              <td className={TD}>
                <BadgeEstado estado={fila.estado} />
                {fila.omitida && (
                  <p className="mt-1 text-xs text-muted-foreground">Ya estaba cargada</p>
                )}
                <IncidenciasFila
                  errores={fila.errores ?? []}
                  advertencias={fila.advertencias ?? []}
                  etiquetasError={ERROR_FILA_NOMINA_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_NOMINA_LABEL}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
