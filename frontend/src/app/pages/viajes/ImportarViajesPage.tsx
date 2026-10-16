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
 *     de gajos y la nómina lo lee.
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
    nota: 'Quedan cerrados, con su promedio kg/gajo y su desprendible. Piden el peso de báscula.',
  },
  {
    valor: 'CREADO',
    etiqueta: 'En reconteo',
    nota: 'Quedan abiertos para revisarlos y cerrarlos en pantalla. Todavía no siembran promedio.',
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
        subtitulo="Trae los camiones, las plantas y las cosechas por despachar en listas desplegables"
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
            Una fila es <strong className="text-foreground">una cosecha transportada</strong>. Las
            filas con la misma <strong className="text-foreground">remision</strong> son el mismo
            viaje, y las columnas del camión basta ponerlas en la primera.
          </Regla>
          <Regla n={2}>
            Primero hay que cargar las <strong className="text-foreground">operaciones</strong> del
            mes: la cosecha se elige de la lista y tiene que existir en una planilla aprobada.
          </Regla>
          <Regla n={3}>
            La remisión es <strong className="text-foreground">la del cliente</strong>. No puede ir
            con el formato REM-2025-004, que es el consecutivo que genera el sistema.
          </Regla>
          <Regla n={4}>
            <strong className="text-foreground">gajos</strong> es cuántos de esa cosecha iban en
            este camión. Vacío significa toda la cosecha, y eso solo vale si ningún otro camión se
            llevó parte de ella.
          </Regla>
          <Regla n={5}>
            Un viaje que paga por jornal va en{' '}
            <strong className="text-foreground">una sola fila</strong>, sin cosecha y con{' '}
            <strong className="text-foreground">gajos_total</strong>.
          </Regla>
        </div>
        <p className="text-xs text-muted-foreground">
          La columna <strong className="text-foreground">placa</strong> identifica al camión con
          su conductor y su empresa, que es como están en Configuración. La empresa no se
          escribe: cada camión tiene la suya en la ficha y el viaje la toma de ahí. La columna{' '}
          <strong className="text-foreground">conductor</strong> se deja vacía salvo que ese día
          manejara otra persona; entonces el viaje guarda ese nombre.
        </p>
      </PasoCard>

      <PasoCard
        n={2}
        titulo="Decide cómo quedan los viajes"
        subtitulo="Esto no es un detalle visual: cambia lo que la nómina va a pagar"
      >
        <SelectorEstadoFinal estado={estadoFinal} onCambiar={cargue.cambiarEstadoFinal} />
        <p className="text-xs text-muted-foreground">
          Un viaje finalizado siembra el promedio kg/gajo del lote, y de ahí sale el pago de
          cosecha de la nómina. Por eso conviene revisar el promedio previsto de cada viaje antes
          de cargar: tiene que quedar entre {PROMEDIO_MINIMO} y {PROMEDIO_MAXIMO} kg por gajo. Uno
          de 600 significa que el peso vino en toneladas o que los gajos están mal digitados.
          Dejarlos en reconteo no esquiva la nómina: el reconteo de gajos se escribe igual.
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
                Corrige las {conError} fila{conError === 1 ? '' : 's'} con error. Si una falla, no
                entra ningún viaje.
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
                Esa liquidación va a pagar la cosecha con el reconteo y el promedio que estás
                cargando. Puedes esperar a cerrarla, o seguir de todas formas si ya contaste con
                eso: su Validar Cosecha quedará sin confirmar y habrá que confirmarlo otra vez.
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
