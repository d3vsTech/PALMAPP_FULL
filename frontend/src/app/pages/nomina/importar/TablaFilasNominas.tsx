/**
 * Las filas de un período: un colaborador por línea, con lo que se escribiría.
 *
 * Muestra lo resuelto, no lo que venía escrito: el colaborador que cruzó la
 * cédula, la modalidad con la que se va a guardar y de dónde salió, y el
 * devengado, el auxilio, las deducciones y el neto tal como quedarían. Es el
 * único paso donde se ve que una columna corrida mandó el auxilio al neto.
 */
import { Badge } from '../../../components/ui/badge';
import { IncidenciasFila } from '../../liquidaciones/historico/comunes';
import {
  ADVERTENCIA_NOMINA_LABEL,
  ERROR_FILA_NOMINA_LABEL,
  type FilaNominaCargue,
} from '../../../../api/importarNominas';

const ESTADO_BADGE: Record<string, string> = {
  OK: 'bg-success/10 text-success border-success/30',
  ERROR: 'bg-destructive/10 text-destructive border-destructive/30',
  SOBRESCRIBIR: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
};

const ESTADO_LABEL: Record<string, string> = {
  OK: 'Se carga',
  ERROR: 'Con error',
  SOBRESCRIBIR: 'Se reescribe',
};

const CABECERAS = [
  'Fila', 'Colaborador', 'Modalidad', 'Días', 'Devengado', 'Auxilio',
  'Deducciones', 'Neto', 'Estado',
];

function pesos(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** El colaborador que cruzó la cédula, con lo que decía el archivo debajo. */
function CeldaColaborador({ fila }: { fila: FilaNominaCargue }) {
  if (!fila.empleado) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Sin colaborador</p>
        <p className="text-xs text-muted-foreground/70">
          {fila.documento ?? '—'}
          {fila.nombre_archivo ? ` · ${fila.nombre_archivo}` : ''}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{fila.empleado.nombre_completo}</p>
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
      <p className="text-sm font-semibold">{pesos(fila.valores.total_devengado)}</p>
      {!fila.valores.desglose && (
        <p className="text-xs text-muted-foreground">sin desglose</p>
      )}
    </div>
  );
}

export function TablaFilasNominas({ filas }: { filas: FilaNominaCargue[] }) {
  if (filas.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">Este período no trae filas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-sm">
        <thead>
          <tr className="border-y border-border bg-muted/30">
            {CABECERAS.map((c) => (
              <th
                key={c}
                className={`px-3 py-2 text-xs font-semibold text-muted-foreground ${
                  ['Días', 'Devengado', 'Auxilio', 'Deducciones', 'Neto'].includes(c)
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={fila.fila}
              className={`border-b border-border/40 last:border-0 ${
                fila.estado === 'ERROR' ? 'bg-destructive/5' : ''
              }`}
            >
              <td className="px-3 py-2 align-top text-xs text-muted-foreground">{fila.fila}</td>
              <td className="px-3 py-2 align-top"><CeldaColaborador fila={fila} /></td>
              <td className="px-3 py-2 align-top"><CeldaModalidad fila={fila} /></td>
              <td className="px-3 py-2 text-right align-top text-sm">
                {fila.valores?.dias_trabajados ?? '—'}
              </td>
              <td className="px-3 py-2 align-top"><CeldaDevengado fila={fila} /></td>
              <td className="px-3 py-2 text-right align-top text-sm">
                {pesos(fila.valores?.subsidio_transporte)}
              </td>
              <td className="px-3 py-2 text-right align-top text-sm">
                {pesos(fila.valores?.total_deducciones)}
              </td>
              <td className="px-3 py-2 text-right align-top text-sm font-semibold">
                {pesos(fila.valores?.total_neto)}
              </td>
              <td className="px-3 py-2 align-top">
                <Badge variant="outline" className={ESTADO_BADGE[fila.estado]}>
                  {ESTADO_LABEL[fila.estado]}
                </Badge>
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
