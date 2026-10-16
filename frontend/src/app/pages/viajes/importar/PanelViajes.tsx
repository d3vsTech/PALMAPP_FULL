/**
 * Un bloque por viaje: cómo entendió el backend el grupo de filas con la misma
 * remisión, y qué va a quedar cuando cierre.
 *
 * El dato que el usuario tiene que mirar sí o sí es el promedio kg/gajo
 * previsto. De ahí sale el pago de cosecha de la nómina, y un peso en
 * toneladas o unos gajos mal digitados se delatan ahí y en ningún otro lado:
 * un promedio de 625 en vez de 62,5 no rompe nada, solo paga mal.
 */
import { Badge } from '../../../components/ui/badge';
import { CalendarDays, Factory, Scale, Truck } from 'lucide-react';
import { IncidenciasFila } from '../../liquidaciones/historico/comunes';
import {
  ADVERTENCIA_VIAJE_LABEL,
  ERROR_VIAJE_LABEL,
  type CalculoViajeCargue,
  type FilaViajeCargue,
  type ViajeDelCargue,
} from '../../../../api/importarViajes';
import { formatFecha } from '../../../utils/fecha';
import { kg, miles } from './formato';
import { TablaFilasViaje } from './TablaFilasViaje';

function EstadoViaje({ viaje }: { viaje: ViajeDelCargue }) {
  if (viaje.estado === 'ERROR') {
    return (
      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
        Con error
      </Badge>
    );
  }
  if (viaje.omitido) {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        Ya estaba cargado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
      {viaje.estado_final === 'CREADO' ? 'Quedará en reconteo' : 'Quedará finalizado'}
    </Badge>
  );
}

/** Un dato del viaje con su icono, en la fila de resumen. */
function Dato({
  icono: Icono,
  titulo,
  valor,
  nota,
}: {
  icono: typeof Truck;
  titulo: string;
  valor: string;
  nota?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="truncate text-sm font-medium" title={valor}>{valor}</p>
        {nota && <p className="truncate text-xs text-muted-foreground">{nota}</p>}
      </div>
    </div>
  );
}

/**
 * El promedio que el viaje va a sembrar en cada lote. Llega vacío cuando el
 * viaje queda en reconteo o cuando cierra sin promedio: mixto, peso en cero o
 * sin cosechas. Las advertencias del viaje explican cuál de los tres es.
 */
function PromedioPrevisto({ calculo }: { calculo: CalculoViajeCargue | null }) {
  const previstos = calculo?.promedio_previsto ?? [];
  if (previstos.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Promedio kg/gajo que va a sembrar
      </p>
      {previstos.map((p) => (
        <p key={p.lote_id} className="text-sm">
          <span className="font-semibold">{p.promedio_kg_gajo}</span>{' '}
          <span className="text-muted-foreground">
            en {p.lote ?? `lote ${p.lote_id}`} · {miles(p.gajos)} gajos
          </span>
        </p>
      ))}
    </div>
  );
}

function TarjetaViaje({ viaje, filas }: { viaje: ViajeDelCargue; filas: FilaViajeCargue[] }) {
  const cosechas = viaje.calculo?.detalles ?? filas.filter((f) => f.cosecha).length;
  const mezcla = viaje.calculo && !viaje.calculo.es_homogeneo ? 'varios lotes' : null;

  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        viaje.estado === 'ERROR' ? 'border-destructive/40' : 'border-border'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{viaje.remision}</p>
          <p className="text-xs text-muted-foreground">
            {filas.length} fila{filas.length === 1 ? '' : 's'} del archivo · {cosechas} cosecha
            {cosechas === 1 ? '' : 's'}
            {mezcla ? ` · ${mezcla}` : ''}
          </p>
        </div>
        <EstadoViaje viaje={viaje} />
      </div>

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          icono={CalendarDays}
          titulo="Fecha del viaje"
          valor={formatFecha(viaje.fecha_viaje)}
          nota={viaje.hora_salida ? `Salida ${viaje.hora_salida}` : null}
        />
        <Dato
          icono={Truck}
          titulo="Camión"
          valor={viaje.transportador?.placa ?? '—'}
          nota={viaje.conductor ?? viaje.transportador?.nombre ?? null}
        />
        <Dato
          icono={Factory}
          titulo="Extractora"
          valor={viaje.extractora?.razon_social ?? '—'}
          nota={viaje.extractora_datos?.numero_remision_extractora
            ? `Tiquete ${viaje.extractora_datos.numero_remision_extractora}`
            : null}
        />
        <Dato
          icono={Scale}
          titulo="Peso de báscula"
          valor={kg(viaje.peso_viaje)}
          nota={
            viaje.calculo?.cantidad_gajos_total != null
              ? `${miles(viaje.calculo.cantidad_gajos_total)} gajos`
              : null
          }
        />
      </div>

      <div className="space-y-2 px-4 pb-3">
        <PromedioPrevisto calculo={viaje.calculo} />
        <IncidenciasFila
          errores={viaje.errores ?? []}
          advertencias={viaje.advertencias ?? []}
          etiquetasError={ERROR_VIAJE_LABEL}
          etiquetasAdvertencia={ADVERTENCIA_VIAJE_LABEL}
        />
      </div>

      <TablaFilasViaje filas={filas} />
    </div>
  );
}

/**
 * Reparte las filas entre sus viajes. `viaje_indice` es el camino directo; la
 * remisión es el respaldo para una fila que llegó sin índice, que es lo que
 * pasa cuando el error impidió agruparla.
 */
function filasDe(
  viaje: ViajeDelCargue,
  indice: number,
  filas: FilaViajeCargue[],
): FilaViajeCargue[] {
  return filas.filter((f) =>
    f.viaje_indice !== null && f.viaje_indice !== undefined
      ? f.viaje_indice === indice
      : (f.remision ?? '').toUpperCase() === viaje.remision.toUpperCase(),
  );
}

export function PanelViajes({
  viajes,
  filas,
}: {
  viajes: ViajeDelCargue[];
  filas: FilaViajeCargue[];
}) {
  if (viajes.length === 0) return null;

  return (
    <div className="space-y-3">
      {viajes.map((viaje, i) => (
        <TarjetaViaje key={viaje.remision} viaje={viaje} filas={filasDe(viaje, i, filas)} />
      ))}
    </div>
  );
}
