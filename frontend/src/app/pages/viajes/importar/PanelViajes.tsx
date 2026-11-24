/**
 * Un bloque por viaje: cómo entendió el backend el grupo de filas con la misma
 * remisión, y qué va a quedar cuando cierre.
 *
 * El dato que el usuario tiene que mirar sí o sí es el promedio kg/gajo
 * previsto. De ahí sale el pago de cosecha de la nómina, y un peso en
 * toneladas o unos gajos mal digitados se delatan ahí y en ningún otro lado:
 * un promedio de 625 en vez de 62,5 no rompe nada, solo paga mal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Factory, Scale, Truck,
} from 'lucide-react';
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
      <Badge variant="destructive">
        Con error
      </Badge>
    );
  }
  if (viaje.omitido) {
    return (
      <Badge variant="secondary">
        Ya estaba cargado
      </Badge>
    );
  }
  return (
    <Badge variant="success">
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
        <p className="text-[13px] font-medium text-muted-foreground">{titulo}</p>
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
 *
 * Vacío no es un defecto: un viaje de jornal y uno importado solo con la
 * cabecera no siembran promedio por diseño.
 */
function PromedioPrevisto({ calculo }: { calculo: CalculoViajeCargue | null }) {
  const previstos = calculo?.promedio_previsto ?? [];
  if (previstos.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary-soft px-3 py-2">
      <p className="text-[13px] font-medium text-muted-foreground">
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

      <TablaFilasViaje filas={filas} estadoFinal={viaje.estado_final} />
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

/** Cuántos viajes caben en una pantalla sin volverla un rollo. */
const POR_PAGINA = 10;

/**
 * Los controles de página. Van arriba y abajo de la lista: con diez tarjetas
 * de por medio, tener que subir para cambiar de página es el mismo problema
 * que se está resolviendo.
 */
function Paginador({
  pagina,
  paginas,
  desde,
  hasta,
  total,
  onPagina,
}: {
  pagina: number;
  paginas: number;
  desde: number;
  hasta: number;
  total: number;
  onPagina: (p: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        Viajes <span className="font-semibold text-foreground">{desde}</span> a{' '}
        <span className="font-semibold text-foreground">{hasta}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">Página {pagina} de {paginas}</span>
        <Button
          size="sm" variant="outline" 
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anteriores
        </Button>
        <Button
          size="sm" variant="outline" 
          disabled={pagina >= paginas}
          onClick={() => onPagina(pagina + 1)}
        >
          Siguientes
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PanelViajes({
  viajes,
  filas,
}: {
  viajes: ViajeDelCargue[];
  filas: FilaViajeCargue[];
}) {
  const [pagina, setPagina] = useState(1);
  const tope = useRef<HTMLDivElement>(null);

  // Un archivo nuevo empieza en la primera página, no en la que quedó.
  useEffect(() => { setPagina(1); }, [viajes]);

  const paginas = Math.max(1, Math.ceil(viajes.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const inicio = (actual - 1) * POR_PAGINA;
  const enPantalla = viajes.slice(inicio, inicio + POR_PAGINA);

  /*
   * Un solo viaje con error bloquea el archivo entero, y con la lista
   * paginada puede quedar en una página que nadie abrió. Este atajo lleva
   * directo al primero.
   */
  const conError = useMemo(
    () => viajes.reduce((n, v) => n + (v.estado === 'ERROR' ? 1 : 0), 0),
    [viajes],
  );
  const paginaDelPrimerError = useMemo(() => {
    const i = viajes.findIndex((v) => v.estado === 'ERROR');
    return i < 0 ? null : Math.floor(i / POR_PAGINA) + 1;
  }, [viajes]);

  const irA = (p: number) => {
    setPagina(p);
    tope.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (viajes.length === 0) return null;

  const paginador = (
    <Paginador
      pagina={actual}
      paginas={paginas}
      desde={inicio + 1}
      hasta={inicio + enPantalla.length}
      total={viajes.length}
      onPagina={irA}
    />
  );

  return (
    <div className="space-y-3" ref={tope}>
      {conError > 0 && paginaDelPrimerError !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {conError === 1 ? 'Un viaje tiene' : `${conError} viajes tienen`} error.
          </p>
          <Button
            size="sm" variant="outline"
            onClick={() => irA(paginaDelPrimerError)}
            disabled={actual === paginaDelPrimerError}
          >
            Ir al primero
          </Button>
        </div>
      )}

      {paginas > 1 && paginador}

      {enPantalla.map((viaje, i) => (
        <TarjetaViaje
          key={viaje.remision}
          viaje={viaje}
          filas={filasDe(viaje, inicio + i, filas)}
        />
      ))}

      {paginas > 1 && paginador}
    </div>
  );
}
