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
  AlertTriangle, CheckCircle2, Info, Loader2, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
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
  Aviso, BadgeDetectados, BadgeEstadoFila, BotonesPlantilla, CabecerasIgnoradas,
  CeldaColaborador, EstadoValidacion, IncidenciasFila, PasoCard, Regla,
  VistaPreviaPlantilla, ZonaArchivo, TD, TH, THEAD,
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
  return `${formatFecha(n.fecha_inicio)} a ${formatFecha(n.fecha_fin)}`;
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backTo="/novedades"
        eyebrow="Novedades"
        title="Importar novedades"
        description="Carga permisos, incapacidades y licencias en lote desde un archivo."
      />

      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Las cabeceras se reconocen por nombre: no las renombres ni las reordenes."
        accion={<BotonesPlantilla descargando={descargando} onDescargar={descargarPlantilla} />}
      >
        <VistaPreviaPlantilla
          columnas={COLUMNAS_PLANTILLA}
          filas={FILAS_EJEMPLO}
          formatos=".xlsx, .xls y .csv"
        />
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

      <PasoCard
        n={2}
        titulo="Carga tu archivo"
        subtitulo="Arrastra el archivo o haz clic para seleccionarlo."
      >
        <ZonaArchivo
          archivo={archivo}
          analisis={analisis?.archivo}
          detalle={resumen ? `${resumen.filas} filas leídas` : undefined}
          onArchivo={tomarArchivo}
          onQuitar={quitarArchivo}
          inputRef={inputRef}
          accept={ACCEPT_ARCHIVO}
          bloqueado={cargando}
        />
        <p className="text-xs text-muted-foreground">
          Hasta {MAX_FILAS_ARCHIVO} filas por archivo. Se revisa al instante y todavía no se
          guarda nada.
        </p>
        <EstadoValidacion validando={validando} error={error} />
        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}
      </PasoCard>

      {analisis && resumen && (
        <>
          <PasoCard
            n={3}
            titulo="Revisa los datos"
            subtitulo="Una fila es una novedad. La misma cédula puede repetirse si los rangos no se cruzan."
            accion={<BadgeDetectados total={resumen.filas} />}
            contenidoClassName="space-y-6"
          >
            <StatStrip
              items={[
                { label: 'Se cargan', value: resumen.validas },
                {
                  label: 'Con error',
                  value: conError > 0 ? <span className="text-destructive">{conError}</span> : conError,
                },
                { label: 'Colaboradores', value: resumen.colaboradores },
                {
                  label: 'Días calendario',
                  value: resumen.dias_calendario,
                  note: resumen.parciales > 0
                    ? `${resumen.parciales} por horas, no cuentan como día`
                    : undefined,
                },
              ]}
            />

            {/* D5 — Con qué estado nacen. Si es PENDIENTE, la nómina no las
                toma hasta que alguien las apruebe, y eso hay que decirlo
                antes de cargar, no después. */}
            <Aviso tono="info" icono={Info}>
              Las novedades van a quedar en estado{' '}
              <strong>{analisis.estado_inicial === 'APROBADA' ? 'Aprobada' : 'Pendiente'}</strong>.
              {analisis.estado_inicial === 'PENDIENTE'
                ? ' No entran a la nómina hasta que alguien con permiso las apruebe.'
                : ' Entran a la nómina del período sin pasos adicionales.'}
            </Aviso>

            {analisis.advertencias.map((a, i) => (
              <Aviso key={`${a.code}-${i}`} tono="warning" icono={AlertTriangle}>
                {a.mensaje || ADVERTENCIA_NOVEDAD_LABEL[a.code] || a.code}
              </Aviso>
            ))}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className={THEAD}>
                  <tr>
                    <th className={`${TH} w-8`}>#</th>
                    <th className={TH}>Colaborador</th>
                    <th className={TH}>Novedad</th>
                    <th className={TH}>Periodo</th>
                    <th className={`${TH} text-center`}>Días</th>
                    <th className={TH}>Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analisis.filas.map((f) => (
                    <tr
                      key={f.fila}
                      className={f.estado === 'ERROR' ? 'bg-destructive-soft/40' : undefined}
                    >
                      <td className={`${TD} text-xs text-muted-foreground`}>{f.fila}</td>
                      <td className={TD}>
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
                      <td className={TD}>
                        <p className="break-words">
                          {f.novedad.motivo?.nombre ?? f.novedad.tipo_novedad ?? '—'}
                        </p>
                        {f.novedad.resuelto_por === 'TIPO_BASE' && (
                          <p className="text-xs text-muted-foreground">cruzado por tipo base</p>
                        )}
                      </td>
                      <td className={TD}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{periodoFila(f)}</span>
                          {f.novedad.parcial && <Badge variant="info">Parcial</Badge>}
                        </div>
                      </td>
                      <td className={`${TD} text-center`}>
                        {f.novedad.parcial ? '—' : (f.novedad.dias_calendario ?? '—')}
                      </td>
                      <td className={TD}>
                        <BadgeEstadoFila estado={f.estado}>
                          {ESTADO_FILA_LABEL[f.estado]}
                        </BadgeEstadoFila>
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
            subtitulo="Todo o nada: con una sola fila en error no se carga ninguna."
          >
            {conError > 0 ? (
              <Aviso tono="destructive" icono={AlertTriangle}>
                Hay {conError} fila{conError !== 1 ? 's' : ''} con error. Corrígelas en el archivo
                y vuelve a subirlo.
              </Aviso>
            ) : (
              <Aviso tono="success" icono={CheckCircle2}>
                El archivo está listo: ninguna fila quedó con error.
              </Aviso>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {conError > 0 ? (
                  'Corrige las filas con error para poder cargar el archivo.'
                ) : (
                  <>
                    Se crearán{' '}
                    <span className="font-semibold text-foreground">
                      {resumen.validas} novedad{resumen.validas === 1 ? '' : 'es'}
                    </span>{' '}
                    en el módulo de novedades.
                  </>
                )}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => navigate('/novedades')} disabled={cargando}>
                  Cancelar
                </Button>
                <Button onClick={confirmar} disabled={!puedeCargar}>
                  {cargando
                    ? <Loader2 className="animate-spin" strokeWidth={2} />
                    : <Upload strokeWidth={2} />}
                  {cargando ? 'Cargando…' : `Cargar ${resumen.validas} novedades`}
                </Button>
              </div>
            </div>
          </PasoCard>
        </>
      )}
    </div>
  );
}
