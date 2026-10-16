/**
 * Las filas de un viaje: una cosecha transportada por línea.
 *
 * Es el único lugar donde se ve que la celda `cosecha` cruzó con la planilla
 * que debía. Dos cuadrillas pueden haber cortado el mismo día en el mismo
 * sublote, así que la fila muestra la planilla, el lote, el sublote y los
 * nombres de la cuadrilla: con eso el usuario reconoce la cosecha antes de
 * cargar, y si se equivocó de etiqueta lo nota aquí y no tres meses después.
 */
import { IncidenciasFila } from '../../liquidaciones/historico/comunes';
import {
  ADVERTENCIA_VIAJE_LABEL,
  ERROR_VIAJE_LABEL,
  type CosechaDelCargue,
  type FilaViajeCargue,
  type ReconteoDeLaFila,
} from '../../../../api/importarViajes';
import { formatFecha } from '../../../utils/fecha';
import { miles } from './formato';

const CABECERAS = ['Fila', 'Cosecha', 'Cuadrilla', 'Gajos', 'Reconteo que queda', 'Notas'];

/** La cosecha resuelta: planilla, lote y sublote, que es como se ubica en campo. */
function CeldaCosecha({ fila }: { fila: FilaViajeCargue }) {
  const c = fila.cosecha;
  if (!c) {
    return (
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Sin cosecha</p>
        {fila.cosecha_celda && (
          <p className="truncate text-xs text-muted-foreground/70">{fila.cosecha_celda}</p>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">
        {c.lote?.nombre ?? '—'}
        {c.sublote ? ` › ${c.sublote.nombre}` : ''}
      </p>
      <p className="text-xs text-muted-foreground">
        Cosecha #{c.id} · planilla del {formatFecha(c.operacion?.fecha)}
        {c.referencia ? ` · ${c.referencia}` : ''}
      </p>
    </div>
  );
}

function CeldaCuadrilla({ cosecha }: { cosecha: CosechaDelCargue | null }) {
  const nombres = cosecha?.colaboradores ?? [];
  if (nombres.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <p className="truncate text-sm" title={nombres.join(', ')}>
      {nombres.join(', ')}
    </p>
  );
}

/** Los gajos del camión. Vacío significa que se llevó la cosecha entera. */
function CeldaGajos({ fila }: { fila: FilaViajeCargue }) {
  if (fila.gajos_en_viaje === null || fila.gajos_en_viaje === undefined) {
    return (
      <div className="text-right">
        <p className="text-sm">Toda</p>
        <p className="text-xs text-muted-foreground">sin reconteo</p>
      </div>
    );
  }
  return (
    <div className="text-right">
      <p className="text-sm font-semibold">{miles(fila.gajos_en_viaje)}</p>
      {fila.cosecha?.gajos_reportados != null && (
        <p className="text-xs text-muted-foreground">
          de {miles(fila.cosecha.gajos_reportados)} en planilla
        </p>
      )}
    </div>
  );
}

/**
 * El reconteo con el que queda la cosecha tras el archivo. Es el número que la
 * nómina paga, así que importa más que los gajos de la planilla.
 */
function CeldaReconteo({ reconteo }: { reconteo: ReconteoDeLaFila | null }) {
  if (!reconteo || reconteo.nuevo_total === null || reconteo.nuevo_total === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const yaAsignados = reconteo.gajos_ya_asignados ?? 0;
  return (
    <div className="text-right">
      <p className="text-sm font-semibold">{miles(reconteo.nuevo_total)}</p>
      <p className="text-xs text-muted-foreground">
        {yaAsignados > 0
          ? `${miles(yaAsignados)} ya iban en otro camión`
          : reconteo.reconteo_aprobado
            ? 'queda aprobado'
            : 'queda pendiente'}
      </p>
    </div>
  );
}

export function TablaFilasViaje({ filas }: { filas: FilaViajeCargue[] }) {
  if (filas.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        Este viaje no lleva cosechas: paga por jornal y cierra sin promedio.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-y border-border bg-muted/30">
            {CABECERAS.map((c) => (
              <th
                key={c}
                className={`px-3 py-2 text-xs font-semibold text-muted-foreground ${
                  c === 'Gajos' || c === 'Reconteo que queda' ? 'text-right' : 'text-left'
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
              <td className="px-3 py-2 align-top"><CeldaCosecha fila={fila} /></td>
              <td className="px-3 py-2 align-top"><CeldaCuadrilla cosecha={fila.cosecha} /></td>
              <td className="px-3 py-2 align-top"><CeldaGajos fila={fila} /></td>
              <td className="px-3 py-2 align-top"><CeldaReconteo reconteo={fila.reconteo} /></td>
              <td className="px-3 py-2 align-top">
                {fila.omitida && (
                  <p className="text-xs text-muted-foreground">Ya estaba cargada</p>
                )}
                <IncidenciasFila
                  errores={fila.errores ?? []}
                  advertencias={fila.advertencias ?? []}
                  etiquetasError={ERROR_VIAJE_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_VIAJE_LABEL}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
