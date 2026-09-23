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
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Gift, Info, Loader2, Upload } from 'lucide-react';
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
  ESTADO_FILA_BADGE,
  ESTADO_FILA_LABEL,
  HistoricoArchivoErrorCodes as E,
  MAX_FILAS_ARCHIVO,
} from '../../../../api/historicoComun';
import { descargarBlob, fmtCOP, fmtFecha } from '../final/comunes';
import {
  CabecerasIgnoradas,
  CeldaColaborador,
  EstadoValidacion,
  IncidenciasFila,
  Regla,
  SelectorArchivo,
  esApiError,
  mensajeArchivo,
} from './comunes';

const SEMESTRES = semestresCargables();

export default function CargaHistoricoPrima() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.editar');

  const [seleccion, setSeleccion] = useState<OpcionSemestre | null>(SEMESTRES[0] ?? null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistoricoPrima | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async () => {
    setDescargandoPlantilla(true);
    try {
      const blob = await historicoPrimaApi.plantilla();
      descargarBlob(blob, 'plantilla_historico_prima.xlsx');
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargandoPlantilla(false);
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

  const elegirArchivo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // permite volver a elegir el mismo archivo corregido
      if (!file || !seleccion) return;
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

  const rango = seleccion ? rangoSemestre(seleccion.semestre) : null;

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
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Cargar histórico de prima</h1>
            <p className="mt-0.5 text-muted-foreground">
              Registre la prima que ya pagó antes de usar el sistema. Un archivo por semestre.
            </p>
          </div>
        </div>
      </div>

      {/* Paso 1: semestre y plantilla */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>1. Elija el semestre y prepare el archivo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
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
                terminados. El que va en curso se liquida con el asistente normal.
              </p>
            )}
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold">Use la plantilla</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Trae las cuatro columnas con el nombre correcto y la cédula en formato de texto,
                que es lo que evita que Excel la dañe.
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
          <SelectorArchivo
            archivo={archivo}
            analisis={analisis?.archivo}
            inputRef={inputRef}
            accept={ACCEPT_ARCHIVO}
            onElegir={elegirArchivo}
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
            Archivos .xlsx, .xls o .csv, hasta {MAX_FILAS_ARCHIVO} colaboradores por archivo. Al
            subirlo se revisa contra las fichas, pero todavía no se guarda nada.
          </p>

          <EstadoValidacion validando={validando} error={errorArchivo} />

          {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}

          {analisis?.periodos.prima && !cargado && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              El {etiquetaSemestre(analisis.anio, analisis.semestre)} ya tiene un histórico
              cargado con {analisis.periodos.prima.total_colaboradores} colaboradores. Lo que
              suba ahora se agrega a ese mismo período.
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
                <p className="text-xs text-muted-foreground">Total prima</p>
                <p className="text-lg font-bold text-foreground">{fmtCOP(resumen.total_prima)}</p>
                <p className="text-xs text-muted-foreground">
                  límite legal: {fechaLimiteSemestre(analisis.semestre)}
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
                    Hay colaboradores con ese semestre ya registrado. Sin marcar esta casilla el
                    archivo no se puede cargar.
                  </p>
                </div>
              </label>
            )}

            <TablaFilasPrima filas={analisis.filas} />

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
                  Prima del {etiquetaSemestre(analisis.anio, analisis.semestre)} cargada.
                </p>
                <div className="flex gap-2">
                  {analisis.periodos.prima && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/liquidaciones/prima/${analisis.periodos.prima!.id}`)}
                    >
                      Ver período
                    </Button>
                  )}
                  <Button size="sm" onClick={limpiar}>
                    Cargar otro semestre
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
              DÍA/MES/AÑO. Si la deja vacía se usa el 30 de junio o el 20 de diciembre del mismo
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

// ─── Tabla de filas ───────────────────────────────────────────────────────────

/**
 * La columna "Base implícita" no está de adorno. Es `valor × 360 ÷ días`: el
 * salario mensual que explicaría la prima cargada. Un dígito de menos salta a
 * la vista ahí y en ninguna otra parte.
 */
function TablaFilasPrima({ filas }: { filas: FilaHistoricoPrima[] }) {
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
            <th className="p-3 text-right text-xs font-semibold text-muted-foreground">Prima</th>
            <th className="hidden p-3 text-right text-xs font-semibold text-muted-foreground lg:table-cell">
              Base implícita
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
                <CeldaColaborador
                  nombre={f.empleado?.nombre_completo}
                  documento={f.empleado?.documento}
                  documentoArchivo={f.documento}
                />
                <IncidenciasFila
                  errores={f.errores}
                  advertencias={f.advertencias}
                  etiquetasError={ERROR_FILA_PRIMA_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_FILA_PRIMA_LABEL}
                />
              </td>

              <td className="hidden p-3 align-top text-sm text-muted-foreground md:table-cell">
                {f.dias ? `${f.dias.dias_computados}` : '—'}
              </td>

              <td className="p-3 align-top text-right">
                <p className="text-sm font-medium">
                  {f.prima?.valor != null ? fmtCOP(f.prima.valor) : '—'}
                </p>
                {f.prima?.fecha_pago && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.prima.fecha_pago)}
                    {f.prima.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
              </td>

              <td className="hidden p-3 align-top text-right text-sm text-muted-foreground lg:table-cell">
                {f.prima?.base_implicita != null ? fmtCOP(f.prima.base_implicita) : '—'}
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
