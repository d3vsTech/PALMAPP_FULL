/**
 * Cargue del histórico de prima de servicios desde Excel o CSV (§13.5).
 *
 * Es una pantalla de puesta en marcha: se usa una vez por semestre, al
 * arrancar, para registrar la prima que la empresa pagó antes de que existiera
 * el módulo. Con el semestre cargado, el asistente de prima excluye a esos
 * colaboradores y nadie vuelve a pagarles lo mismo.
 *
 * El paso de revisar no es opcional. El archivo se valida siempre antes de
 * cargar, porque esa tabla es lo único que muestra cómo el sistema interpretó
 * cada celda: contra qué colaborador cruzó la cédula, qué fecha entendió y
 * cuántos días le calculó.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import PageHeader from '../../../components/common/PageHeader';
import StatStrip from '../../../components/common/StatStrip';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  historicoPrimaApi,
  semestresCargables,
  etiquetaSemestre,
  fechaLimiteSemestre,
  rangoSemestre,
  ADVERTENCIA_FILA_PRIMA_LABEL,
  ERROR_FILA_PRIMA_LABEL,
  type AnalisisHistoricoPrima,
  type FilaHistoricoPrima,
  type OpcionSemestre,
  type Semestre,
} from '../../../../api/historicoPrima';
import {
  ACCEPT_ARCHIVO,
  ESTADO_FILA_LABEL,
  HistoricoArchivoErrorCodes as E,
  MAX_FILAS_ARCHIVO,
} from '../../../../api/historicoComun';
import { descargarBlob, fmtCOP, fmtFecha } from '../final/comunes';
import {
  Aviso,
  BadgeDetectados,
  BadgeEstadoFila,
  BarraSubida,
  CasillaSobrescribir,
  ExitoCargue,
  TD,
  TH,
  THEAD,
  CabecerasIgnoradas,
  CeldaColaborador,
  CeldaObservacion,
  EstadoValidacion,
  IncidenciasFila,
  LineaMora,
  Regla,
  BotonesPlantilla,
  PasoCard,
  VistaPreviaPlantilla,
  ZonaArchivo,
  esApiError,
  mensajeArchivo,
} from './comunes';

const SEMESTRES = semestresCargables();

/**
 * Columnas del archivo de prima, con el nombre exacto que reconoce el lector
 * (API_LIQUIDACIONES §13.1). Son cuatro: la prima no tiene fondo ni intereses
 * porque se le paga al trabajador, no a un fondo.
 *
 * Ningún alias coincide con los de cesantías, así que subir aquí el archivo
 * del otro módulo falla con CABECERAS_FALTANTES en vez de cargar basura.
 */
const COLUMNAS_PLANTILLA = [
  { nombre: 'documento', requerida: true },
  { nombre: 'nombres' },
  { nombre: 'apellidos' },
  { nombre: 'prima_valor', requerida: true },
  { nombre: 'prima_fecha_pago' },
  { nombre: 'observacion' },
];

const FILAS_EJEMPLO = [
  ['1012345678', 'Juan Carlos', 'Pérez Gómez', '1.000.000', '2026-06-26', 'Planilla de junio'],
  ['52000002', 'Ana María', 'Rojas',   '875.450',   '26/06/2026', ''],
  ['1098765432', '', '', '640.000',   '',           'Ingresó en marzo'],
];

export default function CargaHistoricoPrima() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.importar');

  const [seleccion, setSeleccion] = useState<OpcionSemestre | null>(SEMESTRES[0] ?? null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistoricoPrima | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState<'xlsx' | 'csv' | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async (formato: 'xlsx' | 'csv') => {
    setDescargandoPlantilla(formato);
    try {
      const blob = await historicoPrimaApi.plantilla(formato);
      descargarBlob(blob, `plantilla_historico_prima.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargandoPlantilla(null);
    }
  }, []);

  /** Valida sin guardar nada. Se repite al cambiar el semestre o la casilla. */
  const validar = useCallback(
    async (file: File, anio: number, semestre: Semestre, sobre: boolean) => {
      setValidando(true);
      setErrorArchivo(null);
      try {
        const res = await historicoPrimaApi.validar(file, anio, semestre, sobre);
        setAnalisis(res.data);
      } catch (e) {
        setAnalisis(null);
        setErrorArchivo(mensajeArchivo(e));
      } finally {
        setValidando(false);
      }
    },
    [],
  );

  // La zona de arrastre ya entrega el `File`, venga del input o del drop.
  const elegirArchivo = useCallback(
    (file: File) => {
      if (!seleccion) return;
      setArchivo(file);
      setCargado(false);
      void validar(file, seleccion.anio, seleccion.semestre, sobrescribir);
    },
    [seleccion, sobrescribir, validar],
  );

  const cambiarSemestre = useCallback(
    (valor: string) => {
      const opcion = SEMESTRES.find((s) => s.valor === valor);
      if (!opcion) return;
      setSeleccion(opcion);
      setCargado(false);
      if (archivo) void validar(archivo, opcion.anio, opcion.semestre, sobrescribir);
    },
    [archivo, sobrescribir, validar],
  );

  const cambiarSobrescribir = useCallback(
    (valor: boolean) => {
      setSobrescribir(valor);
      if (archivo && seleccion) void validar(archivo, seleccion.anio, seleccion.semestre, valor);
    },
    [archivo, seleccion, validar],
  );

  const cargar = useCallback(async () => {
    if (!archivo || !seleccion) return;
    setCargando(true);
    try {
      const res = await historicoPrimaApi.importar(
        archivo,
        seleccion.anio,
        seleccion.semestre,
        sobrescribir,
      );
      setAnalisis(res.data);
      setCargado(true);
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(res.message ?? 'Histórico de prima cargado');
    } catch (e) {
      // El 422 con errores trae la misma tabla: se repinta con lo que falló.
      if (esApiError(e) && e.code === E.HISTORICO_ARCHIVO_CON_ERRORES) {
        const data = (e as { data?: AnalisisHistoricoPrima }).data;
        if (data) setAnalisis(data);
        toast.error('No se cargó nada. Corrija las filas en rojo y vuelva a subir el archivo.');
        return;
      }
      toast.error(mensajeArchivo(e));
    } finally {
      setCargando(false);
    }
  }, [archivo, seleccion, sobrescribir]);

  const limpiar = useCallback(() => {
    setArchivo(null);
    setAnalisis(null);
    setErrorArchivo(null);
    setCargado(false);
    setSobrescribir(false);
  }, []);

  const resumen = analisis?.resumen;
  const hayErrores = (resumen?.con_error ?? 0) > 0;
  const hayYaCargados = useMemo(
    () => (analisis?.filas ?? []).some((f) => f.errores.some((x) => x.code === 'YA_CARGADO')),
    [analisis],
  );
  const listoParaCargar =
    Boolean(archivo) && Boolean(analisis) && !hayErrores && !validando && !cargando && !cargado;

  const aCargar = (resumen?.validas ?? 0) + (resumen?.a_sobrescribir ?? 0);

  const rango = seleccion ? rangoSemestre(seleccion.semestre) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backTo="/liquidaciones?tab=prima"
        eyebrow="Prima de servicios"
        title="Cargar histórico de prima de servicios"
        description="Registra la prima que ya pagaste antes de usar el sistema. Un archivo por semestre."
      />

      {/* Paso 1: plantilla + el semestre, que no va dentro del archivo. */}
      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Prepara tus datos con las columnas que espera el sistema."
        contenidoClassName="space-y-2"
        accion={
          <BotonesPlantilla
            descargando={descargandoPlantilla}
            onDescargar={(formato) => void descargarPlantilla(formato)}
          />
        }
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_PLANTILLA} filas={FILAS_EJEMPLO} formatos=".xlsx, .xls y .csv" />

        <p className="text-xs text-muted-foreground">
          La plantilla trae estas columnas y la cédula en formato de texto, que es lo
          que evita que Excel le quite los ceros de la izquierda. Las fechas se leen
          como día/mes: <strong className="text-foreground">26/06/2026 es el 26 de junio</strong>.
        </p>
      </PasoCard>

      {/* Paso 2: archivo */}
      <PasoCard
        n={2}
        titulo="Carga tu archivo"
        subtitulo="Arrastra el archivo o haz clic para seleccionarlo."
      >
        {/* El semestre va aquí y no en el paso 1: el paso 1 solo baja la
            plantilla, y el semestre define contra qué se valida el archivo. */}
        <div className="max-w-sm space-y-2">
          <Label htmlFor="semestre">
            Semestre que va a cargar <span className="text-destructive">*</span>
          </Label>
          <Select value={seleccion?.valor ?? ''} onValueChange={cambiarSemestre}>
            <SelectTrigger id="semestre">
              <SelectValue placeholder="Seleccionar semestre..." />
            </SelectTrigger>
            <SelectContent>
              {SEMESTRES.map((s) => (
                <SelectItem key={s.valor} value={s.valor}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rango && seleccion && (
            <p className="text-xs text-muted-foreground">
              Del {rango.inicio} al {rango.fin} de {seleccion.anio}. Solo semestres ya
              terminados. El semestre no va dentro del archivo.
            </p>
          )}
        </div>

        <ZonaArchivo
          archivo={archivo}
          analisis={analisis?.archivo}
          inputRef={inputRef}
          accept={ACCEPT_ARCHIVO}
          bloqueado={cargando}
          onArchivo={elegirArchivo}
          onQuitar={limpiar}
          detalle={
            analisis
              ? `${analisis.archivo.filas_leidas} fila${
                  analisis.archivo.filas_leidas === 1 ? '' : 's'
                } leída${analisis.archivo.filas_leidas === 1 ? '' : 's'} · ${etiquetaSemestre(
                  analisis.anio,
                  analisis.semestre,
                )}`
              : null
          }
        />

        <p className="text-xs text-muted-foreground">
          Hasta {MAX_FILAS_ARCHIVO} colaboradores por archivo. Al subirlo se revisa contra las
          fichas, pero todavía no se guarda nada.
        </p>

        <EstadoValidacion validando={validando} error={errorArchivo} />

        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}

        {analisis?.periodos.prima && !cargado && (
          <Aviso tono="info" icono={Info}>
            El {etiquetaSemestre(analisis.anio, analisis.semestre)} ya tiene un histórico
            cargado con {analisis.periodos.prima.total_colaboradores} colaboradores. Lo que
            subas ahora se agrega a ese mismo período.
          </Aviso>
        )}
      </PasoCard>

      {/* Paso 3: revisión */}
      {analisis && resumen && (
        <PasoCard
          n={3}
          titulo="Revisa los datos"
          subtitulo="Confirma que todo esté bien antes de subirlo."
          accion={<BadgeDetectados total={analisis.archivo.filas_leidas} />}
          contenidoClassName="space-y-6"
        >
            <StatStrip
              items={[
                { label: 'Se cargan', value: resumen.validas },
                { label: 'Reemplazan', value: resumen.a_sobrescribir },
                {
                  label: 'Con error',
                  value: hayErrores ? <span className="text-destructive">{resumen.con_error}</span> : resumen.con_error,
                },
                {
                  label: 'Total prima',
                  value: fmtCOP(resumen.total_prima),
                  note: `Límite legal: ${fechaLimiteSemestre(analisis.semestre)}`,
                },
              ]}
            />

            {analisis.advertencias.map((a, i) => (
              <p
                key={`${a.code}-${i}`}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {a.mensaje}
              </p>
            ))}

            {hayYaCargados && (
              <CasillaSobrescribir
                checked={sobrescribir}
                onChange={cambiarSobrescribir}
                titulo="Reemplazar a los que ya estaban cargados"
              >
                Hay colaboradores con ese semestre ya registrado. Sin marcar esta casilla el
                archivo no se puede subir.
              </CasillaSobrescribir>
            )}

            <TablaFilasPrima filas={analisis.filas} />

            {hayErrores && (
              <Aviso tono="destructive" icono={AlertCircle}>
                Hay {resumen.con_error} fila{resumen.con_error === 1 ? '' : 's'} con error. El
                cargue es todo o nada: corrige el archivo y vuelve a subirlo.
              </Aviso>
            )}

            {cargado ? (
              <ExitoCargue
                total={aCargar}
                modulo={`prima de servicios del ${etiquetaSemestre(analisis.anio, analisis.semestre)}`}
              >
                <Button variant="outline" onClick={limpiar}>
                  Cargar otro archivo
                </Button>
                {/* Siempre hay salida: con el período a la vista se entra a él,
                    y sin él a la pestaña. */}
                <Button
                  onClick={() =>
                    navigate(
                      analisis.periodos.prima
                        ? `/liquidaciones/prima/${analisis.periodos.prima.id}`
                        : '/liquidaciones?tab=prima',
                    )
                  }
                >
                  Ir a prima de servicios
                </Button>
              </ExitoCargue>
            ) : (
              <BarraSubida
                total={aCargar}
                modulo="prima de servicios"
                bloqueado={hayErrores}
                cargando={cargando}
                deshabilitado={!listoParaCargar || !puedeCargar}
                onCancelar={limpiar}
                onSubir={() => void cargar()}
              />
            )}
        </PasoCard>
      )}

      {/* Las mismas reglas que trae la hoja de instrucciones de la plantilla,
          aquí donde se leen antes de subir el archivo. */}
      <Card className="gap-4">
        <CardHeader>
          <h3>Cómo llenar el archivo</h3>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <Regla n={1}>
              <strong className="text-foreground">Un archivo por semestre.</strong> El semestre se
              elige arriba, no va dentro del archivo, y solo se admiten semestres ya terminados.
            </Regla>
            <Regla n={2}>
              <strong className="text-foreground">Una fila por colaborador.</strong> La cédula
              tiene que ser la misma de su ficha. Los puntos, espacios y guiones no importan.
            </Regla>
            <Regla n={3}>
              <strong className="text-foreground">Valor de la prima</strong>, obligatorio. Lo que
              se le pagó por ese semestre, en pesos, mayor que cero.
            </Regla>
            <Regla n={4}>
              <strong className="text-foreground">Fecha de pago</strong>, opcional. AÑO-MES-DÍA o
              DÍA/MES/AÑO. Si la dejas vacía se usa el 30 de junio o el 20 de diciembre del mismo
              año, que es la fecha límite legal del semestre.
            </Regla>
            <Regla n={5}>
              <strong className="text-foreground">Observación</strong>, opcional. Hasta 500
              caracteres; queda guardada con el pago.
            </Regla>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <Regla n={6}>
              Los días del semestre los calcula el sistema desde los contratos. El archivo no
              lleva días ni salario base.
            </Regla>
            <Regla n={7}>
              Todo lo que se cargue queda pagado.{' '}
              <strong className="text-foreground">
                Si una sola fila tiene error no se carga nada:
              </strong>{' '}
              se corrige el archivo y se vuelve a subir.
            </Regla>
            <Regla n={8}>
              Un colaborador que ya tenga ese semestre cargado se rechaza. Para reemplazarlo hay
              que marcar la casilla de sobrescribir.
            </Regla>
            <Regla n={9}>
              Quien ya tenga ese semestre liquidado en el sistema no se puede cargar. Hay que
              quitarlo de ese período o liquidarlo allí.
            </Regla>
            <Regla n={10}>
              Máximo {MAX_FILAS_ARCHIVO} filas por archivo. En Excel solo se lee la primera hoja,
              así que la de instrucciones de la plantilla se ignora.
            </Regla>
          </div>

          <Aviso tono="warning" icono={AlertTriangle}>
            Las fechas se leen como día/mes. <strong>10/02/2024 es el 10 de febrero</strong>, no el
            2 de octubre. Revísalas en la tabla antes de subir.
          </Aviso>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabla de filas ───────────────────────────────────────────────────────────

/**
 * La columna "Base implícita" no está de adorno. Es `valor × 360 ÷ días`: el
 * salario mensual que explicaría la prima cargada. Un dígito de menos salta a
 * la vista ahí y en ninguna otra parte.
 */
function TablaFilasPrima({ filas }: { filas: FilaHistoricoPrima[] }) {
  if (filas.length === 0) {
    return <p className="rounded-lg bg-muted/60 py-6 text-center text-sm text-muted-foreground">El archivo está vacío.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className={THEAD}>
          <tr>
            <th className={`${TH} w-8`}>#</th>
            <th className={TH}>Colaborador</th>
            <th className={`${TH} hidden md:table-cell`}>Días</th>
            <th className={`${TH} text-right`}>Prima</th>
            <th className={`${TH} hidden text-right lg:table-cell`}>Base implícita</th>
            <th className={`${TH} hidden xl:table-cell`}>Observación</th>
            <th className={TH}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((f) => (
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
                  nombresArchivo={f.nombres}
                  apellidosArchivo={f.apellidos}
                />
                <IncidenciasFila
                  errores={f.errores}
                  advertencias={f.advertencias}
                  etiquetasError={ERROR_FILA_PRIMA_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_FILA_PRIMA_LABEL}
                />
              </td>

              <td className={`${TD} hidden text-muted-foreground md:table-cell`}>
                {f.dias ? `${f.dias.dias_computados}` : '—'}
              </td>

              <td className={`${TD} text-right`}>
                <p className="font-medium tabular-nums text-foreground">
                  {f.prima?.valor != null ? fmtCOP(f.prima.valor) : '—'}
                </p>
                {f.prima?.fecha_pago && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.prima.fecha_pago)}
                    {f.prima.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
                <LineaMora dias={f.prima?.dias_mora} />
              </td>

              <td className="hidden px-4 py-3 text-right align-top tabular-nums text-muted-foreground lg:table-cell">
                {f.prima?.base_implicita != null ? fmtCOP(f.prima.base_implicita) : '—'}
              </td>

              <td className={`${TD} hidden xl:table-cell`}>
                <CeldaObservacion texto={f.observacion} />
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
  );
}
