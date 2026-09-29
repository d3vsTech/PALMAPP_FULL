/**
 * Cargue del histórico de vacaciones desde Excel o CSV (§14.5).
 *
 * El registro uno a uno (§10.6) sigue existiendo para los casos puntuales, y
 * está enlazado abajo. Esta pantalla es para la puesta en marcha: una finca con
 * 80 colaboradores y tres o cuatro vacaciones previas cada uno son cientos de
 * registros a mano.
 *
 * Dos cosas propias de este cargue:
 *
 *  1. Una fila es una vacación, no un colaborador. La misma cédula puede
 *     repetirse; lo que no puede es que dos filas suyas se crucen en fechas.
 *
 *  2. `validar` simula el saldo. El panel por colaborador muestra cómo queda
 *     "Turnos pendientes" después del cargue, sin guardar nada. Es lo que deja
 *     ver si el archivo arregla los saldos inflados o los deja peor.
 */
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  historicoVacacionesApi,
  aniosCargables,
  ADVERTENCIA_COLABORADOR_LABEL,
  ADVERTENCIA_FILA_LABEL,
  ERROR_FILA_LABEL,
  type AnalisisHistoricoVacaciones,
  type ColaboradorHistoricoVacaciones,
  type FilaHistoricoVacaciones,
  type SaldoColaborador,
  type SaldoFila,
} from '../../../../api/historicoVacaciones';
import {
  ACCEPT_ARCHIVO,
  ESTADO_FILA_BADGE,
  ESTADO_FILA_LABEL,
  HistoricoArchivoErrorCodes as E,
  MAX_FILAS_ARCHIVO,
} from '../../../../api/historicoComun';
import { descargarBlob, fmtCOP, fmtFecha } from '../final/comunes';
import {
  BotonesPlantilla,
  CabecerasIgnoradas,
  CeldaColaborador,
  EstadoValidacion,
  IncidenciasFila,
  PasoCard,
  Regla,
  VistaPreviaPlantilla,
  ZonaArchivo,
  esApiError,
  mensajeArchivo,
} from './comunes';

const ANIOS = aniosCargables();

/**
 * Las 8 columnas del archivo, con el nombre exacto que reconoce el lector
 * (API_LIQUIDACIONES §14.1).
 *
 * `fecha_fin` y `dias_habiles` no llevan asterisco porque ninguna es
 * obligatoria por sí sola: basta una de las dos y el sistema calcula la otra
 * con el calendario de festivos. Lo que sí es obligatorio es que exista al
 * menos una de las dos cabeceras.
 */
const COLUMNAS_PLANTILLA = [
  { nombre: 'documento', requerida: true },
  { nombre: 'fecha_inicio', requerida: true },
  { nombre: 'fecha_fin' },
  { nombre: 'dias_habiles' },
  { nombre: 'dias_dinero' },
  { nombre: 'valor_pagado' },
  { nombre: 'fecha_pago' },
  { nombre: 'observacion' },
];

/** Las cuatro filas del ejemplo del documento de estructura. */
const FILAS_EJEMPLO = [
  ['1012345678', '2024-10-07', '2024-10-24', '15', '', '780.000', '2024-10-04', 'Archivo físico 2024'],
  ['52.000.001', '04/03/2024', '', '15', '7,5', '1.061.667', '', 'Compensó 7,5 días por escrito'],
  ['52000002', '2024-12-16', '2025-01-03', '', '', '', '', 'Regresó el lunes 6 de enero'],
  ['52000002', '2024-09-02', '2024-09-07', '6', '', '$ 260.000', '', 'Semana corta de septiembre'],
];

/** Colores del semáforo de vencimiento, para el panel de saldos. */
const VENCIMIENTO_BADGE: Record<string, string> = {
  VENCIDA: 'bg-destructive/10 text-destructive border-destructive/30',
  URGENTE:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
  PROXIMA:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
  CON_TIEMPO: 'bg-success/10 text-success border-success/30',
  AL_DIA: 'bg-muted text-muted-foreground border-border',
};

const VENCIMIENTO_LABEL: Record<string, string> = {
  VENCIDA: 'Vencida',
  URGENTE: 'Urgente',
  PROXIMA: 'Próxima',
  CON_TIEMPO: 'Con tiempo',
  AL_DIA: 'Al día',
};

/** Los días se causan proporcionalmente: llegan con decimales. */
const fmtDias = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });

export default function CargaHistoricoVacacionesArchivo() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.editar');

  const [anio, setAnio] = useState<number>(ANIOS[0] ?? new Date().getFullYear());
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistoricoVacaciones | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState<'xlsx' | 'csv' | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async (formato: 'xlsx' | 'csv') => {
    setDescargandoPlantilla(formato);
    try {
      const blob = await historicoVacacionesApi.plantilla(formato);
      descargarBlob(blob, `plantilla_historico_vacaciones.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargandoPlantilla(null);
    }
  }, []);

  /** Valida sin guardar nada. Se repite al cambiar el año o la casilla. */
  const validar = useCallback(async (file: File, anioSel: number, sobre: boolean) => {
    setValidando(true);
    setErrorArchivo(null);
    try {
      const res = await historicoVacacionesApi.validar(file, anioSel, sobre);
      setAnalisis(res.data);
    } catch (e) {
      setAnalisis(null);
      setErrorArchivo(mensajeArchivo(e));
    } finally {
      setValidando(false);
    }
  }, []);

  // La zona de arrastre ya entrega el `File`, venga del input o del drop.
  const elegirArchivo = useCallback(
    (file: File) => {
      setArchivo(file);
      setCargado(false);
      void validar(file, anio, sobrescribir);
    },
    [anio, sobrescribir, validar],
  );

  const cambiarAnio = useCallback(
    (valor: string) => {
      const nuevo = Number(valor);
      setAnio(nuevo);
      setCargado(false);
      if (archivo) void validar(archivo, nuevo, sobrescribir);
    },
    [archivo, sobrescribir, validar],
  );

  const cambiarSobrescribir = useCallback(
    (valor: boolean) => {
      setSobrescribir(valor);
      if (archivo) void validar(archivo, anio, valor);
    },
    [archivo, anio, validar],
  );

  const cargar = useCallback(async () => {
    if (!archivo) return;
    setCargando(true);
    try {
      const res = await historicoVacacionesApi.importar(archivo, anio, sobrescribir);
      setAnalisis(res.data);
      setCargado(true);
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(res.message ?? 'Histórico de vacaciones cargado');
    } catch (e) {
      // El 422 con errores trae la misma tabla: se repinta con lo que falló.
      if (esApiError(e) && e.code === E.HISTORICO_ARCHIVO_CON_ERRORES) {
        const data = (e as { data?: AnalisisHistoricoVacaciones }).data;
        if (data) setAnalisis(data);
        toast.error('No se cargó nada. Corrija las filas en rojo y vuelva a subir el archivo.');
        return;
      }
      toast.error(mensajeArchivo(e));
    } finally {
      setCargando(false);
    }
  }, [archivo, anio, sobrescribir]);

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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/liquidaciones')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Cargar histórico de vacaciones</h1>
            <p className="mt-0.5 text-muted-foreground">
              Registre las vacaciones que sus colaboradores ya disfrutaron antes de usar el
              sistema. Un archivo por año de inicio del disfrute.
            </p>
          </div>
        </div>
      </div>

      {/* Paso 1: plantilla. El año no va dentro del archivo. */}
      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Usa esta plantilla para preparar tus datos correctamente"
        accion={
          <BotonesPlantilla
            descargando={descargandoPlantilla}
            onDescargar={(formato) => void descargarPlantilla(formato)}
          />
        }
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_PLANTILLA} filas={FILAS_EJEMPLO} />

        <p className="text-xs text-muted-foreground">
          Basta con una de <strong className="text-foreground">fecha_fin</strong> o{' '}
          <strong className="text-foreground">dias_habiles</strong>: la otra la calcula el sistema
          con el calendario de festivos. Si vienen las dos, manda el archivo. Formatos aceptados:{' '}
          <strong className="text-foreground">.xlsx, .xls, .csv</strong>. Las fechas se leen como
          día/mes: <strong className="text-foreground">07/10/2024 es el 7 de octubre</strong>.
        </p>
      </PasoCard>

      {/* Paso 2: archivo */}
      <PasoCard
        n={2}
        titulo="Carga tu archivo"
        subtitulo="Arrastra el archivo o haz clic para seleccionarlo"
      >
        {/* El año va aquí y no en el paso 1: el paso 1 solo baja la plantilla,
            y el año define contra qué se valida este archivo. */}
        <div className="max-w-sm space-y-2">
          <Label htmlFor="anio">
            Año en que salieron a vacaciones <span className="text-destructive">*</span>
          </Label>
          <Select value={String(anio)} onValueChange={cambiarAnio}>
            <SelectTrigger id="anio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ZonaArchivo
          archivo={archivo}
          analisis={analisis?.archivo}
          inputRef={inputRef}
          accept={ACCEPT_ARCHIVO}
          onArchivo={elegirArchivo}
          onQuitar={limpiar}
          detalle={
            analisis
              ? `${analisis.archivo.filas_leidas} fila${
                  analisis.archivo.filas_leidas === 1 ? '' : 's'
                } leída${analisis.archivo.filas_leidas === 1 ? '' : 's'} · año ${analisis.anio}`
              : null
          }
        />

        <p className="text-xs text-muted-foreground">
          Hasta {MAX_FILAS_ARCHIVO} vacaciones por archivo. Al subirlo se revisa contra las
          fichas, los contratos y las nóminas, pero todavía no se guarda nada.
        </p>

        <EstadoValidacion validando={validando} error={errorArchivo} />

        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}

        {/* Sin calendario de un año el sistema no puede derivar ni comparar
            días: conviene decirlo antes de que el usuario vea los errores. */}
        {(analisis?.parametros.anios_sin_calendario.length ?? 0) > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            No hay calendario de festivos de{' '}
            {analisis!.parametros.anios_sin_calendario.join(', ')}. Las filas que traigan fecha
            fin y días hábiles se cargan igual; las que dejen una de las dos por calcular dan
            error.
          </p>
        )}
      </PasoCard>

      {/* Paso 3: revisión */}
      {analisis && resumen && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>3. Revise antes de cargar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Se cargan</p>
                <p className="text-2xl font-bold text-success">{resumen.validas}</p>
                <p className="text-xs text-muted-foreground">
                  {resumen.colaboradores} colaborador{resumen.colaboradores === 1 ? '' : 'es'}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Reemplazan</p>
                <p className="text-2xl font-bold text-amber-600">{resumen.a_sobrescribir}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Con error</p>
                <p
                  className={`text-2xl font-bold ${
                    hayErrores ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {resumen.con_error}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Días</p>
                <p className="text-lg font-bold text-foreground">
                  {fmtDias(resumen.total_dias_habiles)} hábiles
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtDias(resumen.total_dias_dinero)} en dinero ·{' '}
                  {fmtCOP(resumen.total_valor_pagado)}
                </p>
              </div>
            </div>

            {analisis.advertencias.map((a, i) => (
              <p
                key={`${a.code}-${i}`}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {a.mensaje}
              </p>
            ))}

            {hayYaCargados && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/30">
                <Checkbox
                  checked={sobrescribir}
                  onCheckedChange={(v) => cambiarSobrescribir(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Reemplazar las vacaciones ya cargadas</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Hay fechas que cruzan una vacación histórica ya registrada. La anterior se
                    borra y la nueva queda con otro número. Nunca se toca una vacación liquidada
                    por el sistema. Sin marcar esta casilla el archivo no se puede cargar.
                  </p>
                </div>
              </label>
            )}

            <TablaFilasVacaciones filas={analisis.filas} />

            {/* El panel que justifica el cargue: cómo queda el saldo de cada
                colaborador en "Turnos pendientes" después de subir el archivo. */}
            <PanelSaldos colaboradores={analisis.colaboradores} cargado={cargado} />

            {hayErrores && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Hay {resumen.con_error} fila{resumen.con_error === 1 ? '' : 's'} con error. El
                cargue es todo o nada: corrija el archivo y vuelva a subirlo.
              </p>
            )}

            {cargado ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Vacaciones de {analisis.anio} cargadas.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/liquidaciones')}>
                    Ver turnos pendientes
                  </Button>
                  <Button size="sm" onClick={limpiar}>
                    Cargar otro año
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  onClick={() => void cargar()}
                  disabled={!listoParaCargar || !puedeCargar}
                  className="gap-2"
                >
                  {cargando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Cargar {aCargar} vacación{aCargar === 1 ? '' : 'es'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Las mismas reglas que trae la hoja de instrucciones de la plantilla,
          aquí donde se leen antes de subir el archivo. */}
      <Card className="border-border">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Cómo llenar el archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <Regla n={1}>
              <strong className="text-foreground">Cargue el histórico antes</strong> de liquidar
              vacaciones nuevas en la pestaña. Si liquida primero una de este año, el sistema la
              imputa al período más viejo y los saldos quedan corridos.
            </Regla>
            <Regla n={2}>
              <strong className="text-foreground">Una fila por vacación</strong>, no por
              colaborador. Quien salió en marzo y en octubre tiene dos filas. Lo único prohibido
              es que dos filas suyas se crucen en fechas.
            </Regla>
            <Regla n={3}>
              <strong className="text-foreground">Un archivo por año</strong>, el de la fecha de
              inicio. Una vacación que empieza en diciembre y termina en enero va en el archivo
              del año en que empezó.
            </Regla>
            <Regla n={4}>
              <strong className="text-foreground">Fecha fin o días hábiles</strong>, al menos una.
              La que falte la calcula el sistema con el calendario de festivos y el sábado hábil
              de la finca. Si vienen las dos y no cuadran, manda el archivo y solo se advierte.
            </Regla>
            <Regla n={5}>
              <strong className="text-foreground">La fecha fin es el último día del disfrute</strong>,
              no el día de regreso. Si volvió el lunes 28, la fecha fin es el domingo 27.
            </Regla>
            <Regla n={6}>
              <strong className="text-foreground">Valor pagado</strong>, opcional. Lo que se pagó
              por esa vacación, disfrute y días en dinero en una sola cifra. Es informativo: no
              cambia saldos, ni cesantías, ni prima, ni nómina.
            </Regla>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <Regla n={7}>
              <strong className="text-foreground">Quien nunca salió a vacaciones no se toca.</strong>{' '}
              Su saldo vencido es real y el módulo lo muestra a propósito.
            </Regla>
            <Regla n={8}>
              Un colaborador <strong className="text-foreground">retirado o inactivo sí se
              carga</strong>: su histórico explica su ficha y sus períodos.
            </Regla>
            <Regla n={9}>
              Las fechas <strong className="text-foreground">no pueden cruzar una nómina</strong>{' '}
              que ya exista en el sistema: esos días ya los trató la nómina, así que eso es una
              liquidación del sistema y no un histórico.
            </Regla>
            <Regla n={10}>
              Todo lo que se cargue queda pagado.{' '}
              <strong className="text-foreground">
                Si una sola fila tiene error no se carga nada:
              </strong>{' '}
              se corrige el archivo y se vuelve a subir.
            </Regla>
            <Regla n={11}>
              Para corregir una vacación cargada se anula desde la pestaña Vacaciones y se vuelve
              a cargar, o se recarga el archivo con la casilla de reemplazar. No hay edición.
            </Regla>
            <Regla n={12}>
              Máximo {MAX_FILAS_ARCHIVO} filas por archivo. En Excel solo se lee la primera hoja,
              así que la de instrucciones de la plantilla se ignora.
            </Regla>
          </div>

          {/* El registro uno a uno no desaparece: sigue siendo la vía para
              una vacación suelta que aparece después del cargue. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              ¿Es una sola vacación? Regístrela a mano sin preparar un archivo.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/liquidaciones/vacaciones/carga-historico/manual')}
              className="gap-2"
            >
              Registrar una vacación
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabla de filas ───────────────────────────────────────────────────────────

/**
 * Una fila por vacación.
 *
 * Las marcas "calculada" no son decoración: dicen qué puso el sistema y qué
 * venía en el archivo. Si la fecha fin calculada no es la que el usuario
 * recuerda, el problema está en los días o en el sábado hábil de la finca.
 */
function TablaFilasVacaciones({ filas }: { filas: FilaHistoricoVacaciones[] }) {
  if (filas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">El archivo está vacío.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Fila</th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">
              Colaborador
            </th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Disfrute</th>
            <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Días</th>
            <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground md:table-cell">
              Se imputa a
            </th>
            <th className="hidden p-3 text-right text-xs font-semibold text-muted-foreground lg:table-cell">
              Valor pagado
            </th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const v = f.vacacion;
            return (
              <tr
                key={f.fila}
                className={`border-b border-border last:border-0 ${
                  f.estado === 'ERROR' ? 'bg-destructive/[0.03]' : ''
                }`}
              >
                <td className="p-3 align-top text-sm text-muted-foreground">{f.fila}</td>

                <td className="p-3 align-top">
                  <CeldaColaborador
                    nombre={f.empleado?.nombre_completo}
                    documento={f.empleado?.documento}
                    documentoArchivo={f.documento}
                  />
                  <IncidenciasFila
                    errores={f.errores}
                    advertencias={f.advertencias}
                    etiquetasError={ERROR_FILA_LABEL}
                    etiquetasAdvertencia={ADVERTENCIA_FILA_LABEL}
                  />
                </td>

                <td className="p-3 align-top">
                  {v ? (
                    <>
                      <p className="whitespace-nowrap text-sm">
                        {fmtFecha(v.fecha_inicio)}
                        {v.fecha_fin ? ` a ${fmtFecha(v.fecha_fin)}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.fecha_fin_calculada && 'fecha fin calculada · '}
                        {v.dias_calendario != null && `${v.dias_calendario} días calendario`}
                      </p>
                      {v.fecha_pago && (
                        <p className="text-xs text-muted-foreground">
                          pagada el {fmtFecha(v.fecha_pago)}
                        </p>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="p-3 align-top text-center">
                  <p className="text-sm font-medium">{fmtDias(v?.dias_habiles)}</p>
                  <p className="text-xs text-muted-foreground">
                    {v?.dias_habiles_calculados ? 'calculados' : 'hábiles'}
                  </p>
                  {(v?.dias_dinero ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      +{fmtDias(v!.dias_dinero)} en dinero
                    </p>
                  )}
                </td>

                {/* A qué período de causación va cada vacación lo decide el
                    FIFO, no el archivo: los períodos son anuales desde el
                    aniversario del contrato, no semestres ni años calendario.
                    Sin esta columna el usuario no tiene cómo saberlo. */}
                <td className="hidden p-3 align-top md:table-cell">
                  <PeriodosImputados saldo={f.saldo} />
                </td>

                <td className="hidden p-3 align-top text-right lg:table-cell">
                  {v?.valor_pagado ? (
                    <>
                      <p className="text-sm">{fmtCOP(v.valor_pagado)}</p>
                      {/* El reparto solo importa cuando hubo días en dinero:
                          ahí una cifra sola se parte en dos conceptos. */}
                      {v.reparto_valor === 'PROPORCIONAL_A_DIAS' && (
                        <p className="text-xs text-muted-foreground">
                          {fmtCOP(v.valor_disfrute ?? 0)} disfrute ·{' '}
                          {fmtCOP(v.valor_dinero ?? 0)} dinero
                        </p>
                      )}
                      {v.valor_dia != null && (
                        <p className="text-xs text-muted-foreground">
                          día: {fmtCOP(v.valor_dia)}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="p-3 align-top">
                  <Badge variant="outline" className={ESTADO_FILA_BADGE[f.estado]}>
                    {ESTADO_FILA_LABEL[f.estado]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Los períodos de causación que consume la fila.
 *
 * Son anuales contados desde el aniversario del contrato: el período 1 de
 * quien ingresó el 1 de marzo de 2021 va del 1-mar-2021 al 28-feb-2022. No son
 * semestres ni coinciden con el año calendario, así que una vacación de
 * octubre de 2024 puede estar descontando el período de 2021.
 *
 * El reparto lo hace el sistema por orden cronológico, del más antiguo con
 * saldo hacia adelante; una sola vacación puede tocar dos períodos.
 */
function PeriodosImputados({ saldo }: { saldo: SaldoFila | null }) {
  if (!saldo || saldo.periodos_afectados.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const sinSaldo = saldo.dias_sin_saldo.disfrute + saldo.dias_sin_saldo.dinero;

  return (
    <div className="space-y-1">
      {saldo.periodos_afectados.map((p) => (
        <div key={p.periodo} className="whitespace-nowrap">
          <p className="text-sm">
            Período {p.periodo}
            <span className="text-muted-foreground">
              {' '}
              · {fmtDias(p.dias_disfrute + p.dias_dinero)} d
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtFecha(p.inicio)} a {fmtFecha(p.fin)}
          </p>
        </div>
      ))}
      {sinSaldo > 0 && (
        <p className="text-xs text-amber-600">{fmtDias(sinSaldo)} d sin saldo causado</p>
      )}
    </div>
  );
}

// ─── Panel de saldos ──────────────────────────────────────────────────────────

/**
 * Saldo de cada colaborador antes y después del cargue.
 *
 * Es la razón de ser del histórico: un colaborador antiguo aparece hoy con 75
 * días vencidos porque el sistema no sabe de las vacaciones que ya disfrutó.
 * Esta tabla muestra, sin guardar nada, cómo queda su saldo real.
 */
function PanelSaldos({
  colaboradores,
  cargado,
}: {
  colaboradores: ColaboradorHistoricoVacaciones[];
  cargado: boolean;
}) {
  if (colaboradores.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">
        Saldo por colaborador {cargado ? '(ya aplicado)' : '(simulado)'}
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground">
                Colaborador
              </th>
              <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground sm:table-cell">
                Filas
              </th>
              <th className="p-3 text-right text-xs font-semibold text-muted-foreground">Antes</th>
              <th className="p-3 text-center text-xs font-semibold text-muted-foreground" />
              <th className="p-3 text-right text-xs font-semibold text-muted-foreground">
                Después
              </th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => (
              <Fragment key={c.empleado_id}>
                <tr className="border-b border-border last:border-0">
                  <td className="p-3 align-top">
                    <p className="text-sm font-medium">{c.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground">CC {c.documento}</p>
                  </td>

                  <td className="hidden p-3 align-top text-xs text-muted-foreground sm:table-cell">
                    {c.filas.join(', ')}
                  </td>

                  <td className="p-3 align-top text-right">
                    <CeldaSaldo saldo={c.saldo_antes} />
                  </td>

                  <td className="p-3 align-top text-center text-muted-foreground">
                    <ArrowRight className="mx-auto h-4 w-4" />
                  </td>

                  <td className="p-3 align-top text-right">
                    {c.saldo_despues ? (
                      <CeldaSaldo saldo={c.saldo_despues} />
                    ) : (
                      // Sin filas cargables no hay nada que simular.
                      <span className="text-sm text-muted-foreground">sin cambios</span>
                    )}
                  </td>
                </tr>

                {c.advertencias.length > 0 && (
                  <tr className="border-b border-border bg-muted/20 last:border-0">
                    <td colSpan={5} className="px-3 pb-3">
                      <ul className="space-y-1">
                        {c.advertencias.map((a, i) => (
                          <li
                            key={`${a.code}-${i}`}
                            className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              {a.mensaje ?? ADVERTENCIA_COLABORADOR_LABEL[a.code] ?? a.code}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CeldaSaldo({ saldo }: { saldo: SaldoColaborador }) {
  const estado = saldo.estado_vencimiento;
  return (
    <>
      <p className="text-sm font-medium">
        {fmtDias(saldo.dias_disponibles_exigibles)} días
      </p>
      {estado && (
        <Badge
          variant="outline"
          className={`mt-1 ${VENCIMIENTO_BADGE[estado] ?? 'border-border text-muted-foreground'}`}
        >
          {VENCIMIENTO_LABEL[estado] ?? estado}
        </Badge>
      )}
    </>
  );
}
