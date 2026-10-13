/**
 * Importación masiva de jornales y cosechas históricos (API_OPERACIONES §13).
 *
 * El wizard de planilla sigue siendo el camino normal. Esta pantalla es para
 * el histórico: lo que la finca trabajó antes de usar el sistema y trae en una
 * hoja de cálculo.
 *
 * Tres cosas que esta pantalla hace distinto de los demás cargues:
 *
 *  1. Son **dos archivos**, no uno. Una fila de jornal y una de cosecha no
 *     comparten ni la mitad de las columnas, así que cambiar de tipo descarta
 *     el análisis en vez de intentar releer el mismo archivo.
 *
 *  2. El **estado final** es una decisión, no una preferencia. Aprobada es el
 *     default del backend y es lo que hace visible el histórico en reportes y
 *     viajes, pero también lo mete al cálculo de nómina.
 *
 *  3. El 409 por nómina abierta se resuelve en pantalla con las dos salidas
 *     reales, cargar en borrador o forzar, en vez de mostrarse como error.
 */
import { useNavigate } from 'react-router';
import { ArrowLeft, FileSpreadsheet, Leaf, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ACCEPT_OPERACIONES,
  type EstadoFinalPlanilla,
  type TipoImportacion,
} from '../../../api/importarOperaciones';
import {
  BotonesPlantilla, CabecerasIgnoradas, EstadoValidacion, PasoCard, Regla,
  VistaPreviaPlantilla, ZonaArchivo,
} from '../liquidaciones/historico/comunes';
import { useCargueOperaciones } from './importar/useCargueOperaciones';
import { plantillaDe } from './importar/plantillas';
import { TablaFilasCargue } from './importar/TablaFilasCargue';
import { PanelPlanillas } from './importar/PanelPlanillas';
import { AvisosDelCargue } from './importar/AvisosDelCargue';

const TIPOS: Array<{ valor: TipoImportacion; etiqueta: string; icono: typeof Leaf }> = [
  { valor: 'jornales', etiqueta: 'Jornales', icono: FileSpreadsheet },
  { valor: 'cosechas', etiqueta: 'Cosechas', icono: Leaf },
];

function SelectorTipo({
  tipo,
  onCambiar,
}: {
  tipo: TipoImportacion;
  onCambiar: (t: TipoImportacion) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIPOS.map(({ valor, etiqueta, icono: Icono }) => (
        <Button
          key={valor}
          variant={tipo === valor ? 'default' : 'outline'}
          onClick={() => onCambiar(valor)}
          className="gap-2"
        >
          <Icono className="h-4 w-4" />
          {etiqueta}
        </Button>
      ))}
    </div>
  );
}

const ESTADOS: Array<{ valor: EstadoFinalPlanilla; etiqueta: string; nota: string }> = [
  {
    valor: 'APROBADA',
    etiqueta: 'Aprobadas',
    nota: 'Aparecen en reportes y viajes, y entran al cálculo de nómina.',
  },
  {
    valor: 'BORRADOR',
    etiqueta: 'En borrador',
    nota: 'Para revisarlas en el wizard antes de aprobarlas. No las ve ningún reporte.',
  },
];

function SelectorEstadoFinal({
  estado,
  onCambiar,
}: {
  estado: EstadoFinalPlanilla;
  onCambiar: (e: EstadoFinalPlanilla) => void;
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

function Indicador({ titulo, valor, tono }: { titulo: string; valor: number; tono?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`text-2xl font-bold ${tono ?? 'text-foreground'}`}>{valor}</p>
    </div>
  );
}

export default function ImportarOperacionesPage() {
  const navigate = useNavigate();
  const cargue = useCargueOperaciones(() => navigate('/operaciones'));
  const { analisis, tipo, estadoFinal } = cargue;

  const plantilla = plantillaDe(tipo);
  const resumen = analisis?.resumen;
  const conError = resumen?.con_error ?? 0;
  const puedeImportar =
    !!analisis && conError === 0 && (resumen?.validas ?? 0) > 0 && !cargue.importando;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operaciones')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver a Operaciones
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Importar histórico</h1>
        <p className="mt-1 text-muted-foreground">
          Carga jornales y cosechas de antes del sistema desde un archivo
        </p>
      </div>

      <PasoCard
        n={1}
        titulo="Elige qué vas a cargar"
        subtitulo="Son dos archivos distintos: cada uno tiene sus columnas"
      >
        <SelectorTipo tipo={tipo} onCambiar={cargue.cambiarTipo} />
        <p className="text-sm text-muted-foreground">{plantilla.queEsUnaFila}</p>
      </PasoCard>

      <PasoCard
        n={2}
        titulo="Descarga la plantilla"
        subtitulo="Trae los lotes, labores y colaboradores de la finca en listas desplegables"
        accion={
          <BotonesPlantilla descargando={cargue.descargando} onDescargar={cargue.descargarPlantilla} />
        }
      >
        <VistaPreviaPlantilla columnas={plantilla.columnas} filas={plantilla.ejemplo} />
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <Regla n={1}>
            Elige los valores de las listas. La celda queda como{' '}
            <strong className="text-foreground">13 · Plateo</strong> y el id viaja adentro: nunca
            hay que escribirlo a mano.
          </Regla>
          <Regla n={2}>
            Varias cédulas en una celda, separadas por{' '}
            <strong className="text-foreground">;</strong>, son un grupo que trabajó junto.
          </Regla>
          <Regla n={3}>
            <strong className="text-foreground">tercero</strong> lleno significa que la fila la
            hicieron operarios de ese contratista, con su tarifa pactada.
          </Regla>
          <Regla n={4}>
            <strong className="text-foreground">valor_total</strong> vacío se liquida con la tarifa
            de hoy. Con valor, se guarda el del archivo como histórico.
          </Regla>
          <Regla n={5}>
            <strong className="text-foreground">lluvia</strong> y{' '}
            <strong className="text-foreground">lluvia_mm</strong> son del día, no de la fila:
            basta ponerlas en una sola fila de esa fecha. Si unas dicen SI y otras NO, gana SI.
          </Regla>
        </div>
      </PasoCard>

      <PasoCard
        n={3}
        titulo="Decide cómo quedan las planillas"
        subtitulo="Esto no es un detalle visual: cambia lo que la nómina va a pagar"
      >
        <SelectorEstadoFinal estado={estadoFinal} onCambiar={cargue.cambiarEstadoFinal} />
        <p className="text-xs text-muted-foreground">
          Un período que se vaya a liquidar en el sistema se carga completo, con jornales, cosechas
          y novedades. Una planilla aprobada a medias descuenta el día y el dominical a quien no
          aparezca en ella. Por eso conviene subir primero un archivo y después el otro, los dos
          aprobados: el segundo entra en las planillas que creó el primero.
        </p>
      </PasoCard>

      <PasoCard n={4} titulo="Sube el archivo" subtitulo="Se revisa al instante, sin guardar nada">
        <ZonaArchivo
          archivo={cargue.archivo}
          analisis={analisis?.archivo}
          detalle={resumen ? `${resumen.filas} filas leídas` : undefined}
          onArchivo={cargue.tomarArchivo}
          onQuitar={cargue.quitarArchivo}
          inputRef={cargue.inputRef}
          accept={ACCEPT_OPERACIONES}
        />
        <EstadoValidacion validando={cargue.validando} error={cargue.error} />
        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}
      </PasoCard>

      {analisis && resumen && (
        <>
          <PasoCard n={5} titulo="Revisa lo que se va a cargar" subtitulo={plantilla.queEsUnaFila}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador titulo="Se cargan" valor={resumen.validas} tono="text-success" />
              <Indicador
                titulo="Con error"
                valor={conError}
                tono={conError > 0 ? 'text-destructive' : undefined}
              />
              <Indicador titulo="Planillas" valor={resumen.planillas.total} />
              <Indicador
                titulo={tipo === 'cosechas' ? 'Cosechas' : 'Jornales'}
                valor={tipo === 'cosechas' ? resumen.cosechas : resumen.jornales + resumen.grupos}
              />
            </div>

            <AvisosDelCargue avisos={analisis.advertencias} />

            <div>
              <p className="mb-2 text-sm font-semibold">Planillas que se tocan</p>
              <PanelPlanillas planillas={analisis.planillas} />
            </div>

            <TablaFilasCargue filas={analisis.filas} esCosechas={tipo === 'cosechas'} />
          </PasoCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {conError > 0 && (
              <p className="text-sm text-destructive">
                Corrige las {conError} fila{conError === 1 ? '' : 's'} con error. Si una falla, no
                entra ninguna.
              </p>
            )}
            <Button
              onClick={() => void cargue.importar(false)}
              disabled={!puedeImportar}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {cargue.importando ? 'Cargando...' : `Importar ${resumen.validas} fila(s)`}
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
                Si cargas estas planillas aprobadas, esa liquidación va a pagar lo que estás
                subiendo. Puedes cargarlas en borrador y aprobarlas después, o seguir de todas
                formas si ya contaste con eso.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => cargue.cambiarEstadoFinal('BORRADOR')}>
              Cargar en borrador
            </Button>
            <AlertDialogAction onClick={() => void cargue.importar(true)}>
              Cargar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
