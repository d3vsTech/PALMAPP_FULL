/**
 * Cargue del histórico de liquidaciones finales desde Excel o CSV (§15.5).
 *
 * La pestaña Liquidación calcula con el salario de la ficha y las nóminas
 * cerradas: no sirve para una liquidación de 2021 que ya se pagó. Esta pantalla
 * la registra tal como quedó, un archivo por año de la fecha de retiro.
 *
 * Es un registro, no una operación: el cargue no termina contratos, no escribe
 * el retiro en la ficha, no salda préstamos y no crea la vacación compensada.
 *
 * El paso de revisar no es opcional. El total de control (`neto_pagado` contra
 * la suma de los conceptos) es lo que atrapa la fila corrida o la columna que
 * se quedó por fuera, y solo se ve en esa tabla.
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  historicoLiquidacionFinalApi,
  aniosCargables,
  ADVERTENCIA_FILA_LABEL,
  ERROR_FILA_LABEL,
  type AnalisisHistoricoLiquidacionFinal,
  type FilaHistoricoLiquidacionFinal,
} from '../../../../api/historicoLiquidacionFinal';
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
 * Las 23 columnas del archivo, con el nombre exacto que reconoce el lector
 * (API_LIQUIDACIONES §15.1).
 *
 * Los prefijos `liq_` y `ded_` son deliberados: los lectores de cesantías y
 * prima aceptan `cesantias`, `prima`, `valor_pagado` y `valor` como nombres de
 * sus columnas obligatorias. Sin prefijo, este archivo subido a la pantalla de
 * cesantías se cargaría como cesantías consignadas al fondo.
 */
const COLUMNAS_PLANTILLA = [
  { nombre: 'documento', requerida: true },
  { nombre: 'fecha_retiro', requerida: true },
  { nombre: 'motivo_retiro' },
  { nombre: 'fecha_ingreso' },
  { nombre: 'tipo_contrato' },
  { nombre: 'salario_base' },
  { nombre: 'liq_salario_pendiente' },
  { nombre: 'liq_cesantias' },
  { nombre: 'liq_intereses' },
  { nombre: 'liq_prima' },
  { nombre: 'liq_vacaciones' },
  { nombre: 'liq_vacaciones_dias' },
  { nombre: 'liq_indemnizacion' },
  { nombre: 'liq_otros_devengados' },
  { nombre: 'ded_salud' },
  { nombre: 'ded_pension' },
  { nombre: 'ded_prestamos' },
  { nombre: 'ded_otras' },
  { nombre: 'neto_pagado', requerida: true },
  { nombre: 'fecha_pago' },
  { nombre: 'metodo_pago' },
  { nombre: 'referencia_pago' },
  { nombre: 'observacion' },
];

/** Las dos primeras filas del ejemplo del documento de estructura. */
const FILAS_EJEMPLO = [
  ['1012345678', '2023-08-15', 'RENUNCIA', '2021-03-01', 'INDEFINIDO', '1.160.000',
   '', '812.879', '60.966', '162.576', '580.000', '15', '', '',
   '', '', '', '', '1.616.421', '2023-08-18', 'TRANSFERENCIA', 'TRF-000123', ''],
  ['52.000.001', '30/06/2023', 'Despido sin justa causa', '', '', '1.300.000',
   '433.333', '720.303', '43.218', '720.303', '346.667', '8', '2.450.000', '',
   '17.333', '17.333', '200.000', '', '4.479.158', '05/07/2023', 'Cheque', 'CH-4471', ''],
  ['52000002', '2023-11-30', '', '2023-05-02', '', '',
   '', '', '', '', '', '', '', '',
   '', '', '', '', '1.250.000', '', '', '', 'Solo se conserva el recibo por el total'],
];

/** Cómo se enlazó el contrato, para la columna de la tabla. */
const ENLACE_LABEL: Record<string, string> = {
  EXACTO: 'Enlazado',
  FICHA: 'De la ficha',
  SIN_CONTRATO: 'Sin contrato',
};

export default function CargaHistoricoLiquidacionFinal() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.editar');

  const [anio, setAnio] = useState<number>(ANIOS[0] ?? new Date().getFullYear());
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistoricoLiquidacionFinal | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState<'xlsx' | 'csv' | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async (formato: 'xlsx' | 'csv') => {
    setDescargandoPlantilla(formato);
    try {
      const blob = await historicoLiquidacionFinalApi.plantilla(formato);
      descargarBlob(blob, `plantilla_historico_liquidaciones_finales.${formato}`);
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
      const res = await historicoLiquidacionFinalApi.validar(file, anioSel, sobre);
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
      const res = await historicoLiquidacionFinalApi.importar(archivo, anio, sobrescribir);
      setAnalisis(res.data);
      setCargado(true);
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(res.message ?? 'Histórico de liquidaciones cargado');
    } catch (e) {
      // El 422 con errores trae la misma tabla: se repinta con lo que falló.
      if (esApiError(e) && e.code === E.HISTORICO_ARCHIVO_CON_ERRORES) {
        const data = (e as { data?: AnalisisHistoricoLiquidacionFinal }).data;
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
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">Cargar histórico de liquidaciones</h1>
            <p className="mt-0.5 text-muted-foreground">
              Registre las liquidaciones finales que ya pagó antes de usar el sistema. Un archivo
              por año de retiro.
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
          Las columnas <strong className="text-foreground">liq_</strong> son lo que se le pagó al
          colaborador y las <strong className="text-foreground">ded_</strong> lo que se le
          descontó, siempre en positivo. Formatos aceptados:{' '}
          <strong className="text-foreground">.xlsx, .xls, .csv</strong>. Las fechas se leen como
          día/mes: <strong className="text-foreground">05/08/2023 es el 5 de agosto</strong>.
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
            Año de la fecha de retiro <span className="text-destructive">*</span>
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
            Una liquidación de diciembre va en el archivo de ese año, no en el del siguiente. El
            año no va dentro del archivo.
          </p>
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
          Hasta {MAX_FILAS_ARCHIVO} liquidaciones por archivo. Al subirlo se revisa contra las
          fichas y los contratos, pero todavía no se guarda nada.
        </p>

        <EstadoValidacion validando={validando} error={errorArchivo} />

        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}
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
                <p className="text-xs text-muted-foreground">Neto total</p>
                <p className="text-lg font-bold text-foreground">{fmtCOP(resumen.total_neto)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtCOP(resumen.total_devengado)} − {fmtCOP(resumen.total_deducciones)}
                </p>
              </div>
            </div>

            {/* Los dos contadores que la pantalla debe dejar ver: una fila sin
                contrato no impide volver a liquidar ese contrato desde la
                pestaña, y una sin desglose se guarda como un solo concepto. */}
            {(resumen.sin_contrato > 0 || resumen.sin_desglose > 0) && (
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {resumen.sin_contrato > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {resumen.sin_contrato} sin contrato enlazado
                  </span>
                )}
                {resumen.sin_desglose > 0 && (
                  <span className="rounded-full border border-border px-3 py-1">
                    {resumen.sin_desglose} solo con el total
                  </span>
                )}
              </div>
            )}

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
                  <p className="text-sm font-medium">Reemplazar las que ya estaban cargadas</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    La liquidación anterior se borra y la nueva queda con{' '}
                    <strong>otro número LIQ-</strong>: un comprobante ya entregado conserva el
                    número viejo. Sin marcar esta casilla el archivo no se puede cargar.
                  </p>
                </div>
              </label>
            )}

            <TablaFilasLiquidacion filas={analisis.filas} />

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
                  Liquidaciones de {analisis.anio} cargadas.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/liquidaciones')}
                  >
                    Ver el listado
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
                  Cargar {aCargar} liquidación{aCargar === 1 ? '' : 'es'}
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
              <strong className="text-foreground">El colaborador debe existir.</strong> El cargue
              cruza por cédula y no crea fichas. A los ex-colaboradores que nunca estuvieron en el
              sistema impórtelos primero desde Colaboradores, con su fecha de retiro: eso crea el
              contrato terminado y el cruce sale exacto.
            </Regla>
            <Regla n={2}>
              <strong className="text-foreground">Un archivo por año</strong>, el de la fecha de
              retiro. Una fila por liquidación: quien se retiró y reingresó tiene una por cada
              retiro.
            </Regla>
            <Regla n={3}>
              <strong className="text-foreground">Cédula y fecha de retiro</strong>, obligatorias.
              La fecha de retiro es el último día del contrato, no el día siguiente.
            </Regla>
            <Regla n={4}>
              <strong className="text-foreground">Neto pagado</strong>, obligatorio. Es el total
              de control: tiene que ser lo pagado menos lo descontado. Una diferencia de hasta un
              peso se acepta; más, es error.
            </Regla>
            <Regla n={5}>
              <strong className="text-foreground">El desglose es opcional.</strong> Si solo
              conserva el recibo por el total, deje vacías las columnas de conceptos y escriba el
              total en neto pagado: se carga como un único concepto.
            </Regla>
            <Regla n={6}>
              <strong className="text-foreground">Fecha de ingreso</strong>, obligatoria solo
              cuando ningún contrato del colaborador termina en la fecha de retiro.
            </Regla>
            <Regla n={7}>
              <strong className="text-foreground">Los descuentos van en positivo</strong>, en las
              columnas <code>ded_</code>. Escribirlos en negativo es error.
            </Regla>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <Regla n={8}>
              El cargue <strong className="text-foreground">no cambia nada más</strong>: no
              termina contratos, no inactiva colaboradores, no salda préstamos y no toca el saldo
              de vacaciones. Solo registra lo pagado.
            </Regla>
            <Regla n={9}>
              Todo lo que se cargue queda pagado.{' '}
              <strong className="text-foreground">
                Si una sola fila tiene error no se carga nada:
              </strong>{' '}
              se corrige el archivo y se vuelve a subir.
            </Regla>
            <Regla n={10}>
              La observación <strong className="text-foreground">se imprime en el comprobante</strong>{' '}
              que recibe el colaborador. No escriba ahí notas internas.
            </Regla>
            <Regla n={11}>
              Una liquidación cargada no se edita ni se anula: se elimina desde el listado y se
              vuelve a cargar, o se recarga el archivo con la casilla de reemplazar.
            </Regla>
            <Regla n={12}>
              Máximo {MAX_FILAS_ARCHIVO} filas por archivo. En Excel solo se lee la primera hoja,
              así que la de instrucciones de la plantilla se ignora.
            </Regla>
          </div>

          <p className="flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            Si este archivo se sube por error a la pantalla de cesantías o de prima, esas lo
            rechazan por cabeceras. Los prefijos <code>liq_</code> y <code>ded_</code> existen
            justamente para eso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabla de filas ───────────────────────────────────────────────────────────

/**
 * Una fila por liquidación, con el desglose de conceptos al expandir.
 *
 * La columna del neto muestra el del archivo al lado del calculado cuando no
 * coinciden: esa diferencia es lo único que delata una columna omitida.
 */
function TablaFilasLiquidacion({ filas }: { filas: FilaHistoricoLiquidacionFinal[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);

  if (filas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">El archivo está vacío.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-8 p-3" />
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Fila</th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">
              Colaborador
            </th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Retiro</th>
            <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground lg:table-cell">
              Motivo
            </th>
            <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground md:table-cell">
              Contrato
            </th>
            <th className="p-3 text-right text-xs font-semibold text-muted-foreground">Neto</th>
            <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const l = f.liquidacion;
            const t = l?.totales;
            const descuadre = t != null && t.diferencia !== 0;
            const expandible = (l?.conceptos.devengados.length ?? 0) > 0;
            const abierto = abierta === f.fila;

            return (
              <Fragment key={f.fila}>
                <tr
                  className={`border-b border-border last:border-0 ${
                    f.estado === 'ERROR' ? 'bg-destructive/[0.03]' : ''
                  }`}
                >
                  <td className="p-3 align-top">
                    {expandible && (
                      <button
                        type="button"
                        onClick={() => setAbierta(abierto ? null : f.fila)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={abierto ? 'Ocultar conceptos' : 'Ver conceptos'}
                      >
                        {abierto ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>

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
                    <p className="text-sm">{l ? fmtFecha(l.fecha_retiro) : '—'}</p>
                    {l?.dias_servicio != null && (
                      <p className="text-xs text-muted-foreground">
                        {l.dias_servicio} días de servicio
                      </p>
                    )}
                  </td>

                  <td className="hidden p-3 align-top lg:table-cell">
                    <p className="text-sm">{l?.motivo_etiqueta ?? '—'}</p>
                    {l?.motivo_por_defecto && (
                      <p className="text-xs text-muted-foreground">por defecto</p>
                    )}
                  </td>

                  <td className="hidden p-3 align-top md:table-cell">
                    {l ? (
                      <span
                        className={`text-xs ${
                          l.contrato_enlace === 'SIN_CONTRATO'
                            ? 'font-medium text-amber-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {ENLACE_LABEL[l.contrato_enlace] ?? l.contrato_enlace}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="p-3 align-top text-right">
                    <p className="text-sm font-medium">{t ? fmtCOP(t.total_neto) : '—'}</p>
                    {descuadre && (
                      <p className="text-xs text-destructive">
                        archivo: {fmtCOP(t.neto_archivo)}
                      </p>
                    )}
                    {l?.sin_desglose && (
                      <p className="text-xs text-muted-foreground">solo el total</p>
                    )}
                  </td>

                  <td className="p-3 align-top">
                    <Badge variant="outline" className={ESTADO_FILA_BADGE[f.estado]}>
                      {ESTADO_FILA_LABEL[f.estado]}
                    </Badge>
                  </td>
                </tr>

                {abierto && l && (
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={8} className="p-4">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold text-muted-foreground">
                            Devengados
                          </p>
                          <ul className="space-y-1">
                            {l.conceptos.devengados.map((c) => (
                              <li key={c.codigo} className="flex justify-between gap-4 text-sm">
                                <span>
                                  {c.nombre}
                                  {c.dias != null && (
                                    <span className="text-muted-foreground"> · {c.dias} días</span>
                                  )}
                                </span>
                                <span className="font-medium">{fmtCOP(c.valor)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold text-muted-foreground">
                            Deducciones
                          </p>
                          {l.conceptos.deducciones.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin deducciones.</p>
                          ) : (
                            <ul className="space-y-1">
                              {l.conceptos.deducciones.map((c) => (
                                <li key={c.codigo} className="flex justify-between gap-4 text-sm">
                                  <span>{c.nombre}</span>
                                  <span className="font-medium">{fmtCOP(c.valor)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
