/**
 * Importación masiva de viajes históricos (API_VIAJES §15).
 *
 * El wizard de viaje sigue siendo el camino normal. Esta pantalla es para el
 * histórico: los despachos que la finca hizo antes de usar el sistema y trae
 * en una hoja de cálculo.
 *
 * Tres cosas que esta pantalla hace distinto de los demás cargues:
 *
 *  1. El archivo tiene **dos niveles**: una fila es una cosecha transportada y
 *     las filas con la misma remisión son un viaje. Por eso el resultado se
 *     muestra agrupado por viaje, con sus filas adentro, y no como una tabla
 *     plana: un error en una fila marca ERROR a todo su camión.
 *
 *  2. Va **después** del cargue de operaciones. Las cosechas que el archivo
 *     referencia tienen que existir en planillas aprobadas; si no, cada fila
 *     responde que no encontró la cosecha.
 *
 *  3. El 409 por nómina abierta aquí solo tiene una salida: forzar. Cargar en
 *     reconteo **no** la esquiva, porque el cargue escribe igual el reconteo
 *     de gajos y la nómina lo lee. La excepción es el viaje sin cosechas: no
 *     hay reconteo que escribir, así que no roza la nómina por ninguna vía.
 *
 *  4. Un viaje del que solo se tiene la cabecera (fecha, camión, planta) es un
 *     caso válido, no un archivo a medias: va en una fila con `cosecha` vacía
 *     y `gajos_total` en 0, en estado final CREADO, y las cosechas se le
 *     montan después desde el wizard normal del viaje.
 */
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ACCEPT_VIAJES, PROMEDIO_MAXIMO, PROMEDIO_MINIMO, type EstadoFinalViaje,
} from '../../../api/importarViajes';
import {
  BotonesPlantilla, CabecerasIgnoradas, EstadoValidacion, PasoCard, Regla,
  VistaPreviaPlantilla, ZonaArchivo,
} from '../liquidaciones/historico/comunes';
import { useCargueViajes } from './importar/useCargueViajes';
import { COLUMNAS_VIAJES, FILAS_VIAJES } from './importar/plantillas';
import { PanelViajes } from './importar/PanelViajes';
import { AvisosCargueViajes } from './importar/AvisosCargueViajes';

const ESTADOS: Array<{ valor: EstadoFinalViaje; etiqueta: string; nota: string }> = [
  {
    valor: 'FINALIZADO',
    etiqueta: 'Finalizados',
    nota:
      'Los viajes quedan cerrados y listos. Hay que escribir el peso de la báscula. '
      + 'Son los que cuentan para el pago de la cosecha.',
  },
  {
    valor: 'CREADO',
    etiqueta: 'En reconteo',
    nota:
      'Los viajes quedan abiertos, para revisarlos y cerrarlos uno por uno en pantalla. '
      + 'Todavía no cuentan para el pago. Escoja esta opción también cuando solo tenga '
      + 'los datos del camión y le falten las cosechas.',
  },
];

function SelectorEstadoFinal({
  estado,
  onCambiar,
}: {
  estado: EstadoFinalViaje;
  onCambiar: (e: EstadoFinalViaje) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ESTADOS.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onCambiar(op.valor)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estado === op.valor
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40'
          }`}
        >
          <p className="text-sm font-medium">{op.etiqueta}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{op.nota}</p>
        </button>
      ))}
    </div>
  );
}

function Indicador({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`text-2xl font-bold ${tono ?? 'text-foreground'}`}>{valor}</p>
    </div>
  );
}

export default function ImportarViajesPage() {
  const navigate = useNavigate();
  const cargue = useCargueViajes(() => navigate('/viajes'));
  const { analisis, estadoFinal } = cargue;

  const resumen = analisis?.resumen;
  const conError = resumen?.con_error ?? 0;
  const puedeImportar =
    !!analisis && conError === 0 && (resumen?.validas ?? 0) > 0 && !cargue.importando;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver a Viajes
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Importar histórico</h1>
        <p className="mt-1 text-muted-foreground">
          Carga los despachos de fruta de antes del sistema desde un archivo
        </p>
      </div>

      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Trae sus camiones, sus plantas y sus cosechas en listas, para no escribirlos a mano"
        accion={
          <BotonesPlantilla
            descargando={cargue.descargando}
            onDescargar={cargue.descargarPlantilla}
          />
        }
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_VIAJES} filas={FILAS_VIAJES} />
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <Regla n={1}>
            <strong className="text-foreground">Una fila por cada cosecha que llevó el camión.</strong>{' '}
            Si el camión llevó tres cosechas, escriba tres filas y repita el mismo número de{' '}
            <strong className="text-foreground">remision</strong> en las tres. La fecha, la placa
            y la planta se escriben una sola vez, en la primera fila.
          </Regla>
          <Regla n={2}>
            <strong className="text-foreground">Primero suba las planillas del mes.</strong> La
            cosecha se escoge de una lista, y esa lista solo trae lo que ya está en una planilla
            aprobada. Si la planilla falta, la cosecha no aparece.
          </Regla>
          <Regla n={3}>
            En <strong className="text-foreground">remision</strong> va{' '}
            <strong className="text-foreground">el número que usa la finca</strong>, el del papel
            que llevó el camión. No escriba algo como REM-2025-004: ese es el número que el
            sistema se pone solo a los viajes hechos aquí.
          </Regla>
          <Regla n={4}>
            En <strong className="text-foreground">gajos</strong> va{' '}
            <strong className="text-foreground">cuántos gajos de esa cosecha subieron a este
            camión</strong>. Si el camión se llevó la cosecha completa, deje la casilla vacía. Si
            la cosecha se repartió entre dos o más camiones, escriba en cada fila cuántos gajos
            llevó cada uno.
          </Regla>
          <Regla n={5}>
            <strong className="text-foreground">Si el camión salió sin cosechas, use una sola
            fila:</strong> deje <strong className="text-foreground">cosecha</strong> vacía y
            escriba el total de gajos en{' '}
            <strong className="text-foreground">gajos_total</strong>. Sirve para dos casos. Uno,
            la finca paga por jornal y no lleva cuenta de cosechas. Dos, usted todavía no sabe
            qué cosechas llevó: escriba{' '}
            <strong className="text-foreground">0</strong> en gajos_total, escoja{' '}
            <strong className="text-foreground">En reconteo</strong> en el paso 2, y después le
            agrega las cosechas desde el viaje.
          </Regla>
          <Regla n={6}>
            <strong className="text-foreground">Borre la fila 2 de la plantilla antes de
            cargar.</strong> Esa fila es un ejemplo, pero con datos de verdad de su finca: un
            camión suyo, una planta suya y una cosecha suya. Si la deja, el sistema va a creer
            que ese viaje existió. Si prefiere aprovecharla para su primer viaje, bórrele al
            menos lo que dice en <strong className="text-foreground">cosecha</strong> y en{' '}
            <strong className="text-foreground">gajos</strong>.
          </Regla>
        </div>
        <p className="text-xs text-muted-foreground">
          En <strong className="text-foreground">placa</strong> escoja el camión de la lista. La
          empresa de transporte no se escribe: cada camión ya tiene la suya guardada y el viaje
          la copia solo. La casilla <strong className="text-foreground">conductor</strong> se
          deja vacía casi siempre, porque el sistema pone el conductor de siempre de ese camión.
          Llénela nada más cuando ese día manejó otra persona.
        </p>
      </PasoCard>

      <PasoCard
        n={2}
        titulo="Decide cómo quedan los viajes"
        subtitulo="Lo que escoja aquí cambia lo que la nómina va a pagar"
      >
        <SelectorEstadoFinal estado={estadoFinal} onCambiar={cargue.cambiarEstadoFinal} />
        <p className="text-xs text-muted-foreground">
          Cuando un viaje queda cerrado, el sistema saca cuánto pesó cada gajo de ese lote, y con
          ese número se le paga la cosecha a la cuadrilla. Por eso vale la pena mirar, antes de
          cargar, el peso por gajo que el sistema calcula para cada viaje: lo normal es entre{' '}
          {PROMEDIO_MINIMO} y {PROMEDIO_MAXIMO} kilos. Si sale uno de 600, es que el peso se
          escribió en toneladas o que los gajos quedaron mal escritos.
        </p>
        <p className="text-xs text-muted-foreground">
          Dejar los viajes abiertos no los saca de la nómina: el conteo de gajos se guarda igual y
          la nómina lo lee. El único que no la toca es el viaje sin cosechas, el de la regla 5 del
          paso 1.
        </p>
      </PasoCard>

      <PasoCard n={3} titulo="Sube el archivo" subtitulo="Se revisa al instante, sin guardar nada">
        <ZonaArchivo
          archivo={cargue.archivo}
          analisis={analisis?.archivo}
          detalle={resumen ? `${resumen.filas} filas leídas` : undefined}
          onArchivo={cargue.tomarArchivo}
          onQuitar={cargue.quitarArchivo}
          inputRef={cargue.inputRef}
          accept={ACCEPT_VIAJES}
        />
        <EstadoValidacion validando={cargue.validando} error={cargue.error} />
        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo?.cabeceras_ignoradas ?? []} />}
      </PasoCard>

      {analisis && resumen && (
        <>
          <PasoCard
            n={4}
            titulo="Revisa lo que se va a cargar"
            subtitulo="Viaje por viaje, con las cosechas que lleva cada camión"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                titulo="Viajes"
                valor={`${resumen.viajes.nuevos}`}
                tono="text-success"
              />
              <Indicador
                titulo="Con error"
                valor={`${conError}`}
                tono={conError > 0 ? 'text-destructive' : undefined}
              />
              <Indicador titulo="Cosechas" valor={`${resumen.cosechas}`} />
              <Indicador
                titulo="Promedios que siembra"
                valor={`${resumen.promedios_lote}`}
              />
            </div>

            <AvisosCargueViajes avisos={analisis.advertencias} />

            <PanelViajes viajes={analisis.viajes} filas={analisis.filas} />
          </PasoCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {conError > 0 && (
              <p className="text-sm text-destructive">
                Corrija {conError === 1 ? 'la fila' : `las ${conError} filas`} con error. Basta
                con que una falle para que no entre ningún viaje.
              </p>
            )}
            <Button
              onClick={() => void cargue.importar(false)}
              disabled={!puedeImportar}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {cargue.importando
                ? 'Cargando...'
                : `Importar ${resumen.viajes.nuevos} viaje(s)`}
            </Button>
          </div>
        </>
      )}

      <AlertDialog
        open={cargue.conflicto !== null}
        onOpenChange={(abierto) => !abierto && cargue.descartarConflicto()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay una nómina sin cerrar sobre estas fechas</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{cargue.conflicto?.mensaje}</span>
              <span className="block">
                Esa nómina va a pagar la cosecha con los gajos y el peso que usted está
                cargando ahora. Puede esperar a cerrarla, o seguir de todas formas si ya contaba
                con eso. Si sigue, el Validar Cosecha de esa nómina queda sin confirmar y hay que
                confirmarlo otra vez antes de cerrarla.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cargue.importar(true)}>
              Cargar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
