/**
 * La tabla de filas del cargue: cómo entendió el backend cada línea del Excel.
 *
 * Es el único paso donde el usuario puede ver que un `04/03/2025` se leyó como
 * 4 de marzo, que la cédula cruzó con quien debía y con qué tarifa quedó cada
 * jornal. Por eso muestra lo resuelto, no lo que venía escrito.
 */
import {
  esFilaCosecha,
  ADVERTENCIA_OPERACION_LABEL,
  ERROR_FILA_OPERACION_LABEL,
  type FilaCosecha,
  type FilaImportacionOperacion,
  type FilaJornal,
  type PersonaFila,
} from '../../../../api/importarOperaciones';
import { Badge } from '../../../components/ui/badge';
import { IncidenciasFila } from '../../liquidaciones/historico/comunes';
import { formatFecha } from '../../../utils/fecha';

const ESTADO_BADGE: Record<string, string> = {
  OK: 'bg-success/10 text-success border-success/30',
  ERROR: 'bg-destructive/10 text-destructive border-destructive/30',
};

const ESTADO_LABEL: Record<string, string> = {
  OK: 'Se carga',
  ERROR: 'Con error',
};

function fmtPesos(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** Nombres de la fila. Con contratista se marca de quién son los operarios. */
function Personas({ personas, grupo }: { personas: PersonaFila[]; grupo?: boolean }) {
  if (personas.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin cuadrilla</span>;
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-sm" title={personas.map((p) => p.nombre_completo).join(', ')}>
        {personas.map((p) => p.nombre_completo).join(', ')}
      </p>
      <p className="text-xs text-muted-foreground">
        {grupo ? `Grupo de ${personas.length}` : personas[0].documento}
        {personas[0].tipo === 'OPERARIO' ? ' · operario' : ''}
      </p>
    </div>
  );
}

/** Lote y sublote, que es como el usuario ubica la fila en campo. */
function Ubicacion({ fila }: { fila: FilaImportacionOperacion }) {
  if (!fila.lote && !fila.sublote) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm">{fila.lote?.nombre ?? '—'}</p>
      {fila.sublote && (
        <p className="truncate text-xs text-muted-foreground">{fila.sublote.nombre}</p>
      )}
    </div>
  );
}

function CeldaJornal({ fila }: { fila: FilaJornal }) {
  return (
    <>
      <td className="px-3 py-2 align-top"><Personas personas={fila.personas} grupo={fila.grupo} /></td>
      <td className="px-3 py-2 align-top">
        <p className="truncate text-sm">{fila.labor?.nombre ?? '—'}</p>
        {fila.actividad && (
          <p className="truncate text-xs text-muted-foreground">{fila.actividad.nombre}</p>
        )}
      </td>
      <td className="px-3 py-2 align-top"><Ubicacion fila={fila} /></td>
      <td className="px-3 py-2 text-right align-top text-sm">
        {fila.datos?.cantidad_palmas ?? '—'}
      </td>
      <td className="px-3 py-2 text-right align-top">
        <p className="text-sm font-semibold">{fmtPesos(fila.calculo?.valor_total)}</p>
        {fila.calculo?.origen_valor === 'ARCHIVO' && (
          <p className="text-xs text-muted-foreground">del archivo</p>
        )}
      </td>
    </>
  );
}

function CeldaCosecha({ fila }: { fila: FilaCosecha }) {
  return (
    <>
      <td className="px-3 py-2 align-top"><Personas personas={fila.cuadrilla} /></td>
      <td className="px-3 py-2 align-top"><Ubicacion fila={fila} /></td>
      <td className="px-3 py-2 text-right align-top text-sm">{fila.cosecha?.gajos ?? '—'}</td>
      <td className="px-3 py-2 text-right align-top text-sm">{fila.cosecha?.kilos ?? '—'}</td>
      <td className="px-3 py-2 text-right align-top">
        <p className="text-sm font-semibold">{fmtPesos(fila.calculo?.valor_total)}</p>
        {fila.liquidable?.ok === false && (
          <p className="text-xs text-amber-700 dark:text-amber-400">no liquidable</p>
        )}
      </td>
    </>
  );
}

const CABECERAS_JORNALES = ['Fila', 'Fecha', 'Personas', 'Labor', 'Lote', 'Palmas', 'Valor', 'Estado'];
const CABECERAS_COSECHAS = ['Fila', 'Fecha', 'Cuadrilla', 'Lote', 'Gajos', 'Kilos', 'Valor', 'Estado'];

export function TablaFilasCargue({
  filas,
  esCosechas,
}: {
  filas: FilaImportacionOperacion[];
  esCosechas: boolean;
}) {
  const cabeceras = esCosechas ? CABECERAS_COSECHAS : CABECERAS_JORNALES;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {cabeceras.map((c) => (
              <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
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
              <td className="px-3 py-2 align-top text-sm">{formatFecha(fila.fecha)}</td>
              {esFilaCosecha(fila) ? <CeldaCosecha fila={fila} /> : <CeldaJornal fila={fila} />}
              <td className="px-3 py-2 align-top">
                <Badge variant="outline" className={ESTADO_BADGE[fila.estado]}>
                  {ESTADO_LABEL[fila.estado]}
                </Badge>
                {fila.omitida && (
                  <p className="mt-1 text-xs text-muted-foreground">Ya estaba cargada</p>
                )}
                <IncidenciasFila
                  errores={fila.errores}
                  advertencias={fila.advertencias}
                  etiquetasError={ERROR_FILA_OPERACION_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_OPERACION_LABEL}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
