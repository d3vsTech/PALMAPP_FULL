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
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import PageHeader from '../../../components/common/PageHeader';
import StatStrip from '../../../components/common/StatStrip';
import { Button } from '../../../components/ui/button';
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
  CheckCircle2,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  historicoCesantiasApi,
  aniosCargables,
  ACCEPT_ARCHIVO,
  ADVERTENCIA_FILA_LABEL,
  ESTADO_FILA_LABEL,
  ERROR_FILA_LABEL,
  HistoricoArchivoErrorCodes as E,
  MAX_FILAS_ARCHIVO,
  type AnalisisHistorico,
  type FilaHistorico,
} from '../../../../api/historicoCesantias';
import { descargarBlob, fmtCOP, fmtFecha } from '../final/comunes';
import {
  Aviso,
  BadgeEstadoFila,
  CabecerasIgnoradas,
  CeldaColaborador,
  EstadoValidacion,
  IncidenciasFila,
  BotonesPlantilla,
  PasoCard,
  Regla,
  VistaPreviaPlantilla,
  ZonaArchivo,
  TD,
  TH,
  THEAD,
  esApiError,
  mensajeArchivo,
} from './comunes';

const ANIOS = aniosCargables();

/**
 * Columnas del archivo, con el nombre exacto que el lector reconoce
 * (API_LIQUIDACIONES §12.1). El lector acepta alias ("cédula", "valor
 * cesantías"…) y descarta las columnas que no conoce, pero estos son los
 * nombres que trae la plantilla.
 *
 * Solo la cédula y el valor de las cesantías son obligatorios en la celda.
 * Las demás las rellena el backend con un valor por defecto: la fecha límite
 * legal, el fondo de la ficha, y un `intereses_valor` vacío significa "a este
 * colaborador no se le cargan intereses". La cabecera sí tiene que existir
 * siempre, incluida la de intereses.
 */
const COLUMNAS_PLANTILLA = [
  { nombre: 'documento', requerida: true },
  { nombre: 'nombres' },
  { nombre: 'apellidos' },
  { nombre: 'cesantias_valor', requerida: true },
  { nombre: 'cesantias_fecha_consignacion' },
  { nombre: 'cesantias_fondo' },
  { nombre: 'intereses_valor' },
  { nombre: 'intereses_fecha_pago' },
  { nombre: 'observacion' },
];

const FILAS_EJEMPLO = [
  ['1012345678', 'Juan Carlos', 'Pérez Gómez', '1.234.567', '2024-02-10', 'Porvenir',   '148.000', '2024-01-25', ''],
  ['52000002', 'Ana María', 'Rojas',   '2.100.000', '12/02/2024', 'Protección', '252.000', '28/01/2024', 'Giro conjunto'],
  ['1098765432', '', '', '980.000',   '',           '',           '',        '',           'Sin intereses'],
];

export default function CargaHistoricoCesantias() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.importar');

  const [anio, setAnio] = useState<number>(ANIOS[0] ?? new Date().getFullYear() - 1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisHistorico | null>(null);

  const [validando, setValidando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState<'xlsx' | 'csv' | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const descargarPlantilla = useCallback(async (formato: 'xlsx' | 'csv') => {
    setDescargandoPlantilla(formato);
    try {
      const blob = await historicoCesantiasApi.plantilla(formato);
      descargarBlob(blob, `plantilla_historico_cesantias.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargandoPlantilla(null);
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backTo="/liquidaciones?tab=cesantias"
        eyebrow="Cesantías"
        title="Cargar histórico de cesantías"
        description="Registre lo que ya consignó y pagó antes de usar el sistema. Un archivo por año."
      />

      {/* Paso 1: plantilla + el año, que en cesantías no va dentro del
          archivo sino que se elige aquí. */}
      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Prepara tus datos con las columnas que espera el sistema."
        accion={
          <BotonesPlantilla
            descargando={descargandoPlantilla}
            onDescargar={(formato) => void descargarPlantilla(formato)}
          />
        }
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_PLANTILLA} filas={FILAS_EJEMPLO} />

        <p className="text-xs text-muted-foreground">
          La plantilla trae estas columnas y la cédula en formato de texto, que es lo que
          evita que Excel le quite los ceros de la izquierda. Formatos aceptados:{' '}
          <strong className="text-foreground">.xlsx, .xls, .csv</strong>. Las fechas se leen
          como día/mes: <strong className="text-foreground">10/02/2024 es el 10 de febrero</strong>.
        </p>
      </PasoCard>

      {/* Paso 2: archivo */}
      <PasoCard
        n={2}
        titulo="Carga tu archivo"
        subtitulo="Arrastra el archivo o haz clic para seleccionarlo."
      >
        {/* El año va aquí y no en el paso 1: el paso 1 solo baja la plantilla,
            y el año es lo que define contra qué se valida este archivo. */}
        <div className="max-w-sm space-y-2">
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
            Solo años ya cerrados. El año no va dentro del archivo.
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
          Hasta {MAX_FILAS_ARCHIVO} colaboradores por archivo. Al subirlo se revisa contra las
          fichas, pero todavía no se guarda nada.
        </p>

        <EstadoValidacion validando={validando} error={errorArchivo} />

        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo.cabeceras_ignoradas} />}

        {analisis?.periodos.cesantias && !cargado && (
          <Aviso tono="warning" icono={Info}>
            El año {analisis.anio} ya tiene un histórico cargado con{' '}
            {analisis.periodos.cesantias.total_colaboradores} colaboradores. Lo que suba ahora
            se agrega a ese mismo período.
          </Aviso>
        )}
      </PasoCard>

      {/* Paso 3: revisión */}
      {analisis && resumen && (
        <PasoCard
          n={3}
          titulo="Revisa los datos"
          subtitulo="Confirma que todo esté bien antes de cargarlo."
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
                  label: 'Total cesantías',
                  value: fmtCOP(resumen.total_cesantias),
                  note: `Intereses ${fmtCOP(resumen.total_intereses)}`,
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
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-warning-soft p-4">
                <Checkbox
                  checked={sobrescribir}
                  onCheckedChange={(v) => cambiarSobrescribir(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Reemplazar a los que ya estaban cargados</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Hay colaboradores con ese año ya registrado. Sin marcar esta casilla el
                    archivo no se puede cargar.
                  </p>
                </div>
              </label>
            )}

            <TablaFilas filas={analisis.filas} />

            {hayErrores && (
              <Aviso tono="destructive" icono={AlertTriangle}>
                Hay {resumen.con_error} fila{resumen.con_error === 1 ? '' : 's'} con error. El
                cargue es todo o nada: corrija el Excel y vuelva a subirlo.
              </Aviso>
            )}

            {cargado ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success-soft p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} />
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
                >
                  {cargando ? (
                    <Loader2 className="animate-spin" strokeWidth={2} />
                  ) : (
                    <Upload strokeWidth={2} />
                  )}
                  Cargar {resumen.validas + resumen.a_sobrescribir} colaborador
                  {resumen.validas + resumen.a_sobrescribir === 1 ? '' : 'es'}
                </Button>
              </div>
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
              Máximo {MAX_FILAS_ARCHIVO} filas por archivo. En Excel solo se lee la primera hoja,
              así que la de instrucciones de la plantilla se ignora.
            </Regla>
            <Regla n={13}>
              También se acepta CSV. Si lo guarda desde Excel en español el separador es el punto
              y coma; el sistema lo detecta solo y le dice arriba cómo lo leyó.
            </Regla>
          </div>

          <Aviso tono="warning" icono={AlertTriangle}>
            Las fechas se leen como día/mes. <strong>10/02/2024 es el 10 de febrero</strong>, no el
            2 de octubre. Revíselas en la tabla antes de cargar.
          </Aviso>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabla de filas ───────────────────────────────────────────────────────────

function TablaFilas({ filas }: { filas: FilaHistorico[] }) {
  if (filas.length === 0) {
    return <p className="rounded-lg bg-muted/60 py-6 text-center text-sm text-muted-foreground">El archivo está vacío.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Fila</th>
            <th className={TH}>
              Colaborador
            </th>
            <th className={`${TH} hidden md:table-cell`}>
              Días
            </th>
            <th className={`${TH} text-right`}>
              Cesantías
            </th>
            <th className={`${TH} text-right`}>
              Intereses
            </th>
            <th className={TH}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((f) => (
            <tr
              key={f.fila}
              className={f.estado === 'ERROR' ? 'bg-destructive-soft/40' : undefined}
            >
              <td className={`${TD} text-muted-foreground`}>{f.fila}</td>

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
                  etiquetasError={ERROR_FILA_LABEL}
                  etiquetasAdvertencia={ADVERTENCIA_FILA_LABEL}
                />
              </td>

              <td className={`${TD} hidden text-muted-foreground md:table-cell`}>
                {f.dias ? `${f.dias.dias_computados}` : '—'}
              </td>

              <td className={`${TD} text-right`}>
                <p className="font-medium tabular-nums text-foreground">
                  {f.cesantias?.valor != null ? fmtCOP(f.cesantias.valor) : '—'}
                </p>
                {f.cesantias?.fecha_consignacion && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.cesantias.fecha_consignacion)}
                    {f.cesantias.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
              </td>

              <td className={`${TD} text-right`}>
                <p className="font-medium tabular-nums text-foreground">
                  {f.intereses?.valor ? fmtCOP(f.intereses.valor) : '—'}
                </p>
                {f.intereses?.fecha_pago && (
                  <p className="text-xs text-muted-foreground">
                    {fmtFecha(f.intereses.fecha_pago)}
                    {f.intereses.fecha_por_defecto && ' (por defecto)'}
                  </p>
                )}
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
