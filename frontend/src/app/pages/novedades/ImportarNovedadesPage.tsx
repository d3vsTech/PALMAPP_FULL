/**
 * Importación masiva de novedades desde Excel o CSV (API_NOVEDADES §8).
 *
 * El registro uno a uno del wizard sigue siendo el camino normal. Esta
 * pantalla es para los lotes: un corte de incapacidades del mes, o las
 * novedades de un período que llegaron en una planilla de papel.
 *
 * Dos cosas propias de este cargue:
 *
 *  1. `validar` es un ensayo completo: no persiste nada y no guarda el
 *     archivo. Confirmar vuelve a leer el mismo archivo, así que entre los
 *     dos pasos no hay estado compartido en el servidor.
 *
 *  2. Confirmar es **todo o nada**. Una sola fila con error responde 422 y no
 *     inserta ninguna. Por eso el botón se bloquea mientras haya errores, en
 *     lugar de dejar al usuario descubrirlo al final.
 *
 * Las piezas visuales se reutilizan de los cargues históricos de
 * liquidaciones: es el mismo flujo de cuatro pasos y no tiene sentido tener
 * dos versiones del mismo manejo de archivo.
 */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  ADVERTENCIA_NOVEDAD_LABEL,
  ERROR_FILA_NOVEDAD_LABEL,
  type FilaImportacionNovedad,
  type FormatoPlantillaNovedades,
  type ResultadoImportacionNovedades,
} from '../../../api/novedades';
import { ACCEPT_ARCHIVO, MAX_FILAS_ARCHIVO } from '../../../api/historicoComun';
import { descargarBlob } from '../liquidaciones/final/comunes';
import {
  BotonesPlantilla, CabecerasIgnoradas, CeldaColaborador, EstadoValidacion,
  IncidenciasFila, PasoCard, Regla, VistaPreviaPlantilla, ZonaArchivo,
  mensajeArchivo,
} from '../liquidaciones/historico/comunes';
import { formatFecha, formatHora } from './tipos';

/**
 * Las columnas del archivo, con el nombre exacto que reconoce el lector
 * (ESTRUCTURA_EXCEL_NOVEDADES).
 *
 * `fecha_fin` no lleva asterisco: vacía significa un solo día. `hora_inicio`
 * y `hora_fin` van las dos o ninguna, y con ellas la novedad es parcial.
 */
const COLUMNAS_PLANTILLA = [
  { nombre: 'documento', requerida: true },
  { nombre: 'tipo_novedad', requerida: true },
  { nombre: 'fecha_inicio', requerida: true },
  { nombre: 'fecha_fin' },
  { nombre: 'hora_inicio' },
  { nombre: 'hora_fin' },
  { nombre: 'entidad' },
  { nombre: 'numero_radicado' },
  { nombre: 'observacion' },
];

const FILAS_EJEMPLO = [
  ['1012345678', 'Incapacidad EPS', '2026-03-02', '2026-03-11', '', '', 'Sura EPS', 'INC-99812', 'Diez días'],
  ['52.000.001', 'Permiso Remunerado', '04/03/2026', '', '08:00', '12:00', '', '', 'Cita médica en la mañana'],
  ['52000002', 'Licencia de Luto', '2026-03-09', '2026-03-13', '', '', '', '', 'Fallecimiento de familiar'],
];

/** `OK` se carga, `ERROR` bloquea el archivo completo. */
const ESTADO_FILA_BADGE: Record<string, string> = {
  OK: 'bg-success/10 text-success border-success/30',
  ERROR: 'bg-destructive/10 text-destructive border-destructive/30',
};

const ESTADO_FILA_LABEL: Record<string, string> = {
  OK: 'Se carga',
  ERROR: 'Con error',
};

/** El rango real de una fila: un horario, un rango o un solo día. */
function periodoFila(f: FilaImportacionNovedad): string {
  const n = f.novedad;
  if (!n.fecha_inicio) return '—';
  if (n.parcial && n.hora_inicio && n.hora_fin) {
    return `${formatFecha(n.fecha_inicio)} · ${formatHora(n.hora_inicio)} a ${formatHora(n.hora_fin)}`;
  }
  if (!n.fecha_fin || n.fecha_fin === n.fecha_inicio) return formatFecha(n.fecha_inicio);
  return `${formatFecha(n.fecha_inicio)} — ${formatFecha(n.fecha_fin)}`;
}

export default function ImportarNovedadesPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null!);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoImportacionNovedades | null>(null);
  const [descargando, setDescargando] = useState<FormatoPlantillaNovedades | null>(null);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const descargarPlantilla = async (formato: FormatoPlantillaNovedades) => {
    setDescargando(formato);
    try {
      const blob = await novedadesApi.importar.plantilla(formato);
      descargarBlob(blob, `plantilla_novedades.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargando(null);
    }
  };

  const validar = useCallback(async (file: File) => {
    setValidando(true);
    setError(null);
    setAnalisis(null);
    try {
      const res = await novedadesApi.importar.validar(file);
      setAnalisis(res.data);
      if (res.data.resumen.filas > MAX_FILAS_ARCHIVO) {
        toast.warning(`El archivo trae ${res.data.resumen.filas} filas. Divídelo si el cargue falla.`);
      }
    } catch (e) {
      // Un rechazo aquí es del archivo completo, no de una fila: la tabla no
      // se puede pintar y el mensaje es lo único que el usuario tiene.
      setError(mensajeArchivo(e));
    } finally {
      setValidando(false);
    }
  }, []);

  const tomarArchivo = (file: File) => {
    setArchivo(file);
    void validar(file);
  };

  const quitarArchivo = () => {
    setArchivo(null);
    setAnalisis(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const confirmar = async () => {
    if (!archivo) return;
    setCargando(true);
    try {
      const res = await novedadesApi.importar.confirmar(archivo);
      const insertadas = res.data.resumen.insertadas ?? res.data.resumen.validas;
      toast.success(res.message ?? `Se cargaron ${insertadas} novedades`);
      navigate('/novedades');
    } catch (e) {
      setError(mensajeArchivo(e));
      toast.error('El cargue no se hizo. Revisa los errores y vuelve a subir el archivo.');
    } finally {
      setCargando(false);
    }
  };

  const resumen = analisis?.resumen;
  const conError = resumen?.con_error ?? 0;
  const puedeCargar = !!analisis && conError === 0 && (resumen?.validas ?? 0) > 0 && !cargando;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/novedades')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />Volver a Novedades
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Importar novedades</h1>
        <p className="mt-1 text-muted-foreground">
          Carga permisos, incapacidades y licencias en lote desde un archivo
        </p>
      </div>

      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Las cabeceras se reconocen por nombre: no las renombres ni las reordenes"
        accion={<BotonesPlantilla descargando={descargando} onDescargar={descargarPlantilla} />}
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_PLANTILLA} filas={FILAS_EJEMPLO} />
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <Regla n={1}>
            <strong className="text-foreground">tipo_novedad</strong> es el nombre del motivo tal
            como está en Configuración, Novedades. También se acepta el tipo base,
            por ejemplo INCAPACIDAD_EPS.
          </Regla>
          <Regla n={2}>
            <strong className="text-foreground">fecha_fin</strong> vacía significa un solo día.
          </Regla>
          <Regla n={3}>
            Con <strong className="text-foreground">hora_inicio</strong> y{' '}
            <strong className="text-foreground">hora_fin</strong> la novedad es parcial: va de un
            solo día, es informativa y no descuenta día en nómina.
          </Regla>
          <Regla n={4}>
            Las vacaciones y las terminaciones de contrato no se importan: se registran una a una
            porque cada una mueve saldos y cierra la ficha.
          </Regla>
        </div>
      </PasoCard>

      <PasoCard n={2} titulo="Sube el archivo" subtitulo="Se revisa al instante, sin guardar nada">
        <ZonaArchivo
          archivo={archivo}
          analisis={analisis?.archivo}
          detalle={resumen ? `${resumen.filas} filas leídas` : undefined}
          onArchivo={tomarArchivo}
          onQuitar={quitarArchivo}
          inputRef={inputRef}
          accept={ACCEPT_ARCHIVO}
        />
        <EstadoValidacion validando={validando} error={error} />
        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}
      </PasoCard>

      {analisis && resumen && (
        <>
          <PasoCard
            n={3}
            titulo="Revisa lo que se va a cargar"
            subtitulo="Una fila es una novedad. La misma cédula puede repetirse si los rangos no se cruzan."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Se cargan</p>
                <p className="text-2xl font-bold text-success">{resumen.validas}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Con error</p>
                <p className={`text-2xl font-bold ${conError > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {conError}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Colaboradores</p>
                <p className="text-2xl font-bold text-foreground">{resumen.colaboradores}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Días calendario</p>
                <p className="text-2xl font-bold text-foreground">{resumen.dias_calendario}</p>
                {resumen.parciales > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {resumen.parciales} por horas, no cuentan como día
                  </p>
                )}
              </div>
            </div>

            {/* D5 — Con qué estado nacen. Si es PENDIENTE, la nómina no las
                toma hasta que alguien las apruebe, y eso hay que decirlo
                antes de cargar, no después. */}
            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Las novedades van a quedar en estado{' '}
                <strong>{analisis.estado_inicial === 'APROBADA' ? 'Aprobada' : 'Pendiente'}</strong>.
                {analisis.estado_inicial === 'PENDIENTE'
                  ? ' No entran a la nómina hasta que alguien con permiso las apruebe.'
                  : ' Entran a la nómina del período sin pasos adicionales.'}
              </p>
            </div>

            {analisis.advertencias.length > 0 && (
              <div className="space-y-1">
                {analisis.advertencias.map((a, i) => (
                  <p
                    key={`${a.code}-${i}`}
                    className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                  >
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {a.mensaje || ADVERTENCIA_NOVEDAD_LABEL[a.code] || a.code}
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2.5 font-semibold">Fila</th>
                    <th className="px-3 py-2.5 font-semibold">Colaborador</th>
                    <th className="px-3 py-2.5 font-semibold">Novedad</th>
                    <th className="px-3 py-2.5 font-semibold">Periodo</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Días</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.filas.map((f) => (
                    <tr key={f.fila} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 align-top text-muted-foreground">{f.fila}</td>
                      <td className="px-3 py-2.5 align-top">
                        <CeldaColaborador
                          nombre={f.empleado?.nombre_completo}
                          documento={f.empleado?.documento}
                          documentoArchivo={f.documento}
                        />
                        <IncidenciasFila
                          errores={f.errores}
                          advertencias={f.advertencias}
                          etiquetasError={ERROR_FILA_NOVEDAD_LABEL}
                          etiquetasAdvertencia={ADVERTENCIA_NOVEDAD_LABEL}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <p>{f.novedad.motivo?.nombre ?? f.novedad.tipo_novedad ?? '—'}</p>
                        {f.novedad.resuelto_por === 'TIPO_BASE' && (
                          <p className="text-xs text-muted-foreground">cruzado por tipo base</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {periodoFila(f)}
                        {f.novedad.parcial && (
                          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                            Parcial
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center align-top">
                        {f.novedad.parcial ? '—' : (f.novedad.dias_calendario ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Badge variant="outline" className={ESTADO_FILA_BADGE[f.estado]}>
                          {ESTADO_FILA_LABEL[f.estado]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PasoCard>

          <PasoCard
            n={4}
            titulo="Carga las novedades"
            subtitulo="Todo o nada: con una sola fila en error no se carga ninguna"
          >
            {conError > 0 ? (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Hay {conError} fila{conError !== 1 ? 's' : ''} con error. Corrígelas en el archivo
                y vuelve a subirlo.
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                El archivo está listo: se van a crear {resumen.validas} novedades.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/novedades')} disabled={cargando}>
                Cancelar
              </Button>
              <Button
                onClick={confirmar}
                disabled={!puedeCargar}
                className="gap-2 bg-success hover:bg-success/90"
              >
                {cargando
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Upload className="h-4 w-4" />}
                Cargar {resumen.validas} novedades
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </PasoCard>
        </>
      )}
    </div>
  );
}
