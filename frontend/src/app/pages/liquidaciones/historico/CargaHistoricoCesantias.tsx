/**
 * Cargue del histórico de cesantías e intereses desde Excel (§12.5).
 *
 * Es una pantalla de puesta en marcha: se usa una vez por año, al arrancar,
 * para registrar lo que la empresa consignó antes de que existiera el módulo.
 *
 * El paso de revisar no es opcional. El archivo se valida siempre antes de
 * cargar, porque esa tabla es lo único que muestra cómo el sistema interpretó
 * cada celda: contra qué colaborador cruzó la cédula, qué fecha entendió y
 * cuántos días le calculó. Un `10/02/2024` que alguien quiso escribir como
 * 2 de octubre se ve ahí, o no se ve en ninguna parte.
 */
import { useCallback, useRef, useState } from 'react';
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
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  historicoCesantiasApi,
  aniosCargables,
  ADVERTENCIA_FILA_LABEL,
  ESTADO_FILA_BADGE,
  ESTADO_FILA_LABEL,
  ERROR_FILA_LABEL,
  HistoricoArchivoErrorCodes as E,
  MAX_FILAS_ARCHIVO,
  MOTIVO_ARCHIVO_LABEL,
  type AnalisisHistorico,
  type FilaHistorico,
  type MotivoArchivoInvalido,
} from '../../../../api/historicoCesantias';
import { descargarBlob, fmtCOP, fmtFecha } from '../final/comunes';
import type { ApiError } from '../../../../api/client';

const ANIOS = aniosCargables();

function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'message' in e;
}

/** Los tres códigos que rechazan el archivo traen su propia explicación. */
function mensajeArchivo(e: unknown): string {
  if (!esApiError(e)) return 'No se pudo procesar el archivo';
  if (e.code === E.HISTORICO_ARCHIVO_INVALIDO) {
    const motivo = (e as { motivo?: MotivoArchivoInvalido }).motivo;
    const faltantes = (e as { faltantes?: string[] }).faltantes;
    const base = motivo ? MOTIVO_ARCHIVO_LABEL[motivo] : e.message;
    return faltantes?.length ? `${base} Faltan: ${faltantes.join(', ')}.` : base;
  }
  if (e.code === E.HISTORICO_ARCHIVO_VACIO) {
    return 'El archivo no tiene ninguna fila con datos.';
  }
  if (e.code === E.CONFIG_LEGAL_INCOMPLETA) {
    return 'Faltan constantes legales. Revise Configuración, Legal, Constantes legales.';
  }
  return e.message || 'No se pudo procesar el archivo';
}

export default function CargaHistoricoCesantias() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.editar');

  const [anio, setAnio] = useState<number>(ANIOS[0] ?? new Date().getFullYear() - 1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistorico | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async () => {
    setDescargandoPlantilla(true);
    try {
      const blob = await historicoCesantiasApi.plantilla();
      descargarBlob(blob, 'plantilla_historico_cesantias.xlsx');
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargandoPlantilla(false);
    }
  }, []);

  /** Valida sin guardar nada. Se repite al cambiar el año o la casilla. */
  const validar = useCallback(
    async (file: File, anioSel: number, sobre: boolean) => {
      setValidando(true);
      setErrorArchivo(null);
      try {
        const res = await historicoCesantiasApi.validar(file, anioSel, sobre);
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

  const elegirArchivo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // permite volver a elegir el mismo archivo corregido
      if (!file) return;
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
      const res = await historicoCesantiasApi.importar(archivo, anio, sobrescribir);
      setAnalisis(res.data);
      setCargado(true);
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(res.message ?? 'Histórico cargado');
    } catch (e) {
      // El 422 con errores trae la misma tabla: se repinta con lo que falló.
      if (esApiError(e) && e.code === E.HISTORICO_ARCHIVO_CON_ERRORES) {
        const data = (e as { data?: AnalisisHistorico }).data;
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
  const hayYaCargados = (analisis?.filas ?? []).some((f) =>
    f.errores.some((x) => x.code === 'YA_CARGADO'),
  );
  const listoParaCargar =
    Boolean(archivo) && Boolean(analisis) && !hayErrores && !validando && !cargando && !cargado;

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
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Cargar histórico de cesantías</h1>
            <p className="mt-0.5 text-muted-foreground">
              Registre lo que ya consignó y pagó antes de usar el sistema. Un archivo por año.
            </p>
          </div>
        </div>
      </div>

      {/* Paso 1: año y plantilla */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>1. Elija el año y prepare el archivo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="anio">
              Año que va a cargar <span className="text-destructive">*</span>
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
            <p className="text-xs text-muted-foreground">
              Solo años ya cerrados. El año en curso se liquida con el asistente normal.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold">Use la plantilla</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Trae las columnas con el nombre correcto y la cédula en formato de texto, que es
                lo que evita que Excel la dañe.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void descargarPlantilla()}
              disabled={descargandoPlantilla}
              className="w-full gap-2"
            >
              {descargandoPlantilla ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paso 2: archivo */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>2. Suba el archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={elegirArchivo}
          />

          {!archivo ? (
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="h-12 w-full gap-2 border-dashed"
            >
              <Upload className="h-4 w-4" />
              Seleccionar archivo de Excel
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{archivo.name}</p>
                  {analisis && (
                    <p className="text-xs text-muted-foreground">
                      {analisis.archivo.filas_leidas} fila
                      {analisis.archivo.filas_leidas === 1 ? '' : 's'} leída
                      {analisis.archivo.filas_leidas === 1 ? '' : 's'} · año {analisis.anio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  Cambiar
                </Button>
                <Button variant="ghost" size="sm" onClick={limpiar} className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Formatos .xlsx o .xls, hasta {MAX_FILAS_ARCHIVO} colaboradores por archivo. Al
            subirlo se revisa contra las fichas, pero todavía no se guarda nada.
          </p>

          {validando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Revisando el archivo...
            </p>
          )}

          {errorArchivo && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorArchivo}
            </p>
          )}

          {analisis && analisis.archivo.cabeceras_ignoradas.length > 0 && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Se ignoraron estas columnas porque el sistema no las usa:{' '}
              {analisis.archivo.cabeceras_ignoradas.join(', ')}.
            </p>
          )}

          {analisis?.periodos.cesantias && !cargado && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              El año {analisis.anio} ya tiene un histórico cargado con{' '}
              {analisis.periodos.cesantias.total_colaboradores} colaboradores. Lo que suba ahora
              se agrega a ese mismo período.
            </p>
          )}
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground">Total cesantías</p>
                <p className="text-lg font-bold text-foreground">
                  {fmtCOP(resumen.total_cesantias)}
                </p>
                <p className="text-xs text-muted-foreground">
                  intereses {fmtCOP(resumen.total_intereses)}
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
                  <p className="text-sm font-medium">Reemplazar a los que ya estaban cargados</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Hay colaboradores con ese año ya registrado. Sin marcar esta casilla el
                    archivo no se puede cargar.
                  </p>
                </div>
              </label>
            )}

            <TablaFilas filas={analisis.filas} />

            {hayErrores && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Hay {resumen.con_error} fila{resumen.con_error === 1 ? '' : 's'} con error. El
                cargue es todo o nada: corrija el Excel y vuelva a subirlo.
              </p>
            )}

            {cargado ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Histórico de {analisis.anio} cargado.
                </p>
                <div className="flex gap-2">
                  {analisis.periodos.cesantias && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/liquidaciones/cesantias/${analisis.periodos.cesantias!.id}`)
                      }
                    >
                      Ver cesantías
                    </Button>
                  )}
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
                  Cargar {resumen.validas + resumen.a_sobrescribir} colaborador
                  {resumen.validas + resumen.a_sobrescribir === 1 ? '' : 'es'}
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
              <strong className="text-foreground">Un archivo por año.</strong> El año se elige
              arriba, no va dentro del archivo, y solo se admiten años ya terminados.
            </Regla>
            <Regla n={2}>
              <strong className="text-foreground">Una fila por colaborador.</strong> La cédula
              tiene que ser la misma de su ficha. Los puntos, espacios y guiones no importan.
            </Regla>
            <Regla n={3}>
              <strong className="text-foreground">Valor de las cesantías</strong>, obligatorio.
              Lo que se consignó al fondo por ese año, en pesos, mayor que cero.
            </Regla>
            <Regla n={4}>
              <strong className="text-foreground">Fecha de consignación</strong>, opcional.
              AÑO-MES-DÍA o DÍA/MES/AÑO. Si la deja vacía se usa el 14 de febrero del año
              siguiente, que es la fecha límite legal.
            </Regla>
            <Regla n={5}>
              <strong className="text-foreground">Fondo</strong>, opcional. Vacío toma el que
              esté registrado en la ficha del colaborador.
            </Regla>
            <Regla n={6}>
              <strong className="text-foreground">Valor de los intereses.</strong> Vacío o cero
              significa que a ese colaborador no se le cargan intereses.
            </Regla>
            <Regla n={7}>
              <strong className="text-foreground">Fecha de pago de los intereses</strong>,
              opcional. Vacía usa el 31 de enero del año siguiente.
            </Regla>
            <Regla n={8}>
              <strong className="text-foreground">Observación</strong>, opcional. Hasta 500
              caracteres; queda guardada con la consignación.
            </Regla>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <Regla n={9}>
              Los días de servicio de cada año los calcula el sistema desde los contratos. El
              archivo no lleva días ni salario base.
            </Regla>
            <Regla n={10}>
              Todo lo que se cargue queda consignado y pagado.{' '}
              <strong className="text-foreground">
                Si una sola fila tiene error no se carga nada:
              </strong>{' '}
              se corrige el Excel y se vuelve a subir.
            </Regla>
            <Regla n={11}>
              Un colaborador que ya tenga ese año cargado se rechaza. Para reemplazarlo hay que
              marcar la casilla de sobrescribir.
            </Regla>
            <Regla n={12}>
              Máximo {MAX_FILAS_ARCHIVO} filas por archivo. Solo se lee la primera hoja, así que
              la de instrucciones de la plantilla se ignora.
            </Regla>
          </div>

          <p className="flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            Las fechas se leen como día/mes. <strong>10/02/2024 es el 10 de febrero</strong>, no el
            2 de octubre. Revíselas en la tabla antes de cargar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Piezas de la ayuda ─────────────────────────────────────────

/** Una regla numerada, con el número alineado como en la plantilla. */
function Regla({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-5 shrink-0 text-right font-medium text-muted-foreground">{n}.</span>
      <span>{children}</span>
    </p>
  );
}

// ─── Tabla de filas ───────────────────────────────────────────────────────────

function TablaFilas({ filas }: { filas: FilaHistorico[] }) {
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
            <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground md:table-cell">
              Días
            </th>
            <th className="p-3 text-right text-xs font-semibold text-muted-foreground">
              Cesantías
            </th>
            <th className="p-3 text-right text-xs font-semibold text-muted-foreground">
              Intereses
            </th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              key={f.fila}
              className={`border-b border-border last:border-0 ${
                f.estado === 'ERROR' ? 'bg-destructive/[0.03]' : ''
              }`}
            >
              <td className="p-3 align-top text-sm text-muted-foreground">{f.fila}</td>

              <td className="p-3 align-top">
                {f.empleado ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.empleado.nombre_completo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      CC {f.empleado.documento}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Sin colaborador</p>
                    <p className="text-xs text-muted-foreground">
                      {f.documento ? `en el archivo: ${f.documento}` : 'sin cédula'}
                    </p>
                  </div>
                )}

                {/* Errores y advertencias debajo del nombre: es donde se leen. */}
                {f.errores.map((x, i) => (
                  <p
                    key={`e-${x.code}-${i}`}
                    className="mt-1 flex items-start gap-1.5 text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {x.mensaje || ERROR_FILA_LABEL[x.code] || x.code}
                  </p>
                ))}
                {f.advertencias.map((x, i) => (
                  <p
                    key={`a-${x.code}-${i}`}
                    className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                  >
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    {x.mensaje || ADVERTENCIA_FILA_LABEL[x.code] || x.code}
                  </p>
                ))}
              </td>

              <td className="hidden p-3 align-top text-sm text-muted-foreground md:table-cell">
                {f.dias ? `${f.dias.dias_computados}` : '—'}
              </td>

              <td className="p-3 align-top text-right">
                <p className="text-sm font-medium">
                  {f.cesantias?.valor != null ? fmtCOP(f.cesantias.valor) : '—'}
                </p>
                {f.cesantias?.fecha_consignacion && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.cesantias.fecha_consignacion)}
                    {f.cesantias.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
              </td>

              <td className="p-3 align-top text-right">
                <p className="text-sm font-medium">
                  {f.intereses?.valor ? fmtCOP(f.intereses.valor) : '—'}
                </p>
                {f.intereses?.fecha_pago && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.intereses.fecha_pago)}
                    {f.intereses.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
              </td>

              <td className="p-3 align-top">
                <Badge variant="outline" className={ESTADO_FILA_BADGE[f.estado]}>
                  {ESTADO_FILA_LABEL[f.estado]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
