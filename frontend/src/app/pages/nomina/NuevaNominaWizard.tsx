import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { formatCOP } from '../../components/lib/format';
import { colaboradoresApi } from '../../../api/colaboradores';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Users,
  Calendar,
  UserPlus,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Building2,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { toast } from 'sonner';
import {
  nominaApi,
  Periodicidad,
  EmpleadoDisponible,
  OperarioDisponible,
  ValidacionCosechaBundle,
  NominaErrorCodes,
} from '../../../api/nomina';
import { configuracionApi } from '../../../api/configuracion';
import { operariosApi, tercerosApi, type OperarioSelectItem, type Tercero } from '../../../api/terceros';
import type { ApiError } from '../../../api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

/**
 * Wizard de creación de nómina — 4 pasos.
 *
 * Flujo de persistencia (alineado al doc API_NOMINA.md):
 *  - Paso 1 → 2: POST /nominas crea la nómina en BORRADOR. A partir de este
 *    momento todos los pasos operan sobre `nominaId`.
 *  - Paso 2 → 3: POST /nominas/{id}/empleados agrega empleados y operarios.
 *  - Paso 3: GET /nominas/{id}/validar-cosecha al entrar. Botones para ajustar
 *    promedios por lote y confirmar la validación (POST .../confirmar).
 *  - Paso 4: solo navega a /nomina/{id} (la nómina ya existe en BORRADOR).
 *
 * Si el usuario abandona el wizard a la mitad, queda una nómina BORRADOR vacía
 * o parcial — visible en el listado y puede continuarse desde NominaDetalle.
 */
function nombreApellidoDe(emp: EmpleadoDisponible): { nombres: string; apellidos: string } {
  const completo = (emp.nombre_completo ?? '').trim();
  if (!completo) return { nombres: 'Empleado', apellidos: String(emp.id) };
  const partes = completo.split(/\s+/);
  const mid = Math.ceil(partes.length / 2);
  return {
    nombres: partes.slice(0, mid).join(' '),
    apellidos: partes.slice(mid).join(' '),
  };
}

/**
 * Convierte la lista `n.empleados[]` del backend en el shape que usa la UI
 * para mostrar los colaboradores ya agregados a la nómina. Cada fila puede
 * ser un empleado interno (empleado_id) o un operario de tercero (operario_id).
 *
 * `operariosLookup` es un mapa opcional de `operario_id → OperarioSelectItem`
 * usado como fallback cuando el backend no eager-loadea el subobjeto
 * `operario` en `nomina_empleado`. Se llena desde `operariosApi.selectGlobal()`.
 */
function mapearAgregados(
  empleados: any[],
  operariosLookup?: Map<number, OperarioSelectItem & { cargo?: string | null }>,
) {
  return empleados.map((e) => {
    if (e.empleado_id) {
      const emp = e.empleado ?? {};
      const nombre = emp.nombre_completo
        || `${emp.primer_nombre ?? ''} ${emp.primer_apellido ?? ''}`.trim()
        || `Empleado #${e.empleado_id}`;
      return {
        nominaEmpleadoId: e.id,
        tipo: 'EMP' as const,
        nombre,
        documento: emp.documento,
        cargo: emp.cargo,
        salarioBase: Number(e.salario_base ?? 0) || undefined,
        salarioTipo: e.salario_tipo as string | null | undefined,
        estado: e.estado as 'PENDIENTE' | 'LIQUIDADO',
        empleadoId: Number(e.empleado_id) || undefined,
      };
    }
    const op = e.operario ?? {};
    // Fallback contra el lookup global de operarios cuando el backend no
    // pobla `e.operario` (caso común en `nominaApi.ver()` sin eager-loading).
    const opFallback = operariosLookup?.get(Number(e.operario_id));
    const nombre = op.nombre_completo
      || `${op.nombres ?? ''} ${op.apellidos ?? ''}`.trim()
      || opFallback?.nombre_completo
      || `Operario #${e.operario_id}`;
    return {
      nominaEmpleadoId: e.id,
      tipo: 'OP' as const,
      nombre,
      documento: op.cedula ?? opFallback?.cedula,
      cargo: op.cargo ?? opFallback?.cargo ?? undefined,
      tercero: op.tercero?.razon_social ?? opFallback?.tercero_nombre,
      salarioBase: Number(e.salario_base ?? 0) || undefined,
      salarioTipo: null,
      estado: e.estado as 'PENDIENTE' | 'LIQUIDADO',
      operarioId: Number(e.operario_id) || undefined,
    };
  });
}

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

const pasos = [
  { numero: 1, titulo: 'Información del Período', icono: Calendar },
  { numero: 2, titulo: 'Seleccionar Personal', icono: Users },
  { numero: 3, titulo: 'Validar Cosecha', icono: FileText },
  { numero: 4, titulo: 'Confirmación', icono: Check },
];

/**
 * Clave de localStorage para persistir el progreso del wizard al salir y
 * volver. Guardamos `{nominaId, pasoActual}`; el resto del estado se
 * rehidrata desde el backend cuando el modo edición carga la nómina.
 */
const STORAGE_KEY_NOMINA_WIZARD = 'palmapp:nomina-wizard:progreso';

interface ProgresoWizardPersistido {
  nominaId: number;
  pasoActual: number;
}

function leerProgresoPersistido(): ProgresoWizardPersistido | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOMINA_WIZARD);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<ProgresoWizardPersistido>;
    if (typeof obj.nominaId !== 'number' || typeof obj.pasoActual !== 'number') return null;
    if (obj.pasoActual < 1 || obj.pasoActual > 4) return null;
    return { nominaId: obj.nominaId, pasoActual: obj.pasoActual };
  } catch {
    return null;
  }
}

export default function NuevaNominaWizard() {
  const navigate = useNavigate();
  /**
   * Si la URL viene como `/nomina/:id/editar`, `id` trae la nómina existente
   * y el wizard arranca en modo edición: pre-pobla el paso 1, carga los
   * colaboradores ya agregados y permite continuar con el flujo normal sin
   * volver a crear.
   */
  const { id: idEditar } = useParams<{ id?: string }>();
  const esEdicion = !!idEditar;
  const location = useLocation();
  // Si el usuario está en un flujo de creación (empezó en /nomina/nueva,
  // la nómina se creó y el URL se replaceó a /nomina/{id}/editar), el
  // título sigue siendo "Nuevo Período de Pago". Solo cuando entra desde
  // el listado por "Editar" o vuelve después de terminar el flujo, aparece
  // "Editar Período de Pago". La marca vive en sessionStorage.
  const esFlujoCreacion = (() => {
    if (!idEditar) return true; // URL /nomina/nueva
    try {
      return sessionStorage.getItem('wizard_flujo_creacion') === idEditar;
    } catch {
      return false;
    }
  })();
  /**
   * Restauración inicial del paso al montar el wizard:
   *  - Si viene desde AjustesCosecha (state.from === 'ajustes-cosecha' o
   *    'nomina'), restaurar del sessionStorage el paso donde estaba —así
   *    conserva el contexto de trabajo.
   *  - En cualquier otro caso (clic en "Editar" desde el listado o el
   *    detalle), empezar SIEMPRE en el paso 1. Es lo que espera el usuario:
   *    ver la información del período primero.
   */
  const [pasoActual, setPasoActual] = useState<number>(() => {
    if (!esEdicion || !idEditar) return 1;
    const st = (location.state ?? null) as { from?: string } | null;
    const vieneDeAjustes = st?.from === 'ajustes-cosecha' || st?.from === 'nomina';
    if (!vieneDeAjustes) return 1;
    const p = leerProgresoPersistido();
    if (p && p.nominaId === parseInt(idEditar)) return p.pasoActual;
    return 1;
  });

  // ── Paso 1 ────────────────────────────────────────────────────────────────
  const [anoEdit, setAnoEdit] = useState<string | null>(null);
  const ano = anoEdit ?? new Date().getFullYear().toString();
  const [mes, setMes] = useState('');
  /**
   * La periodicidad viene de la configuración del tenant (Configuración →
   * Pagos y Liquidaciones → Parámetros de Nómina). El usuario no la elige
   * aquí — es una decisión de política de pago que afecta a toda la finca.
   * Se carga con `configuracionApi.configuracionNomina.obtener()` al montar.
   * En modo edición, se sobrescribe con el `tipo_pago_snapshot` de la nómina.
   */
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>('QUINCENAL');
  /**
   * Fechas de corte configuradas por el tenant (§8 API_PARAMETRICAS).
   * Reflejan lo que hay en Configuración → Nómina y se usan para calcular
   * `fechaInicio`/`fechaFin` y para el label del select de quincena.
   * Defaults 1/15/16/31 sirven de fallback mientras carga el fetch.
   */
  const [diasQuincena, setDiasQuincena] = useState<{
    dia_inicio_q1: number; dia_fin_q1: number;
    dia_inicio_q2: number; dia_fin_q2: number;
  }>({ dia_inicio_q1: 1, dia_fin_q1: 15, dia_inicio_q2: 16, dia_fin_q2: 31 });
  const [quincena, setQuincena] = useState<'1' | '2' | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  // §2.6 — Etiqueta opcional para distinguir dos nóminas del mismo período,
  // y toggle "Usar corte de días personalizado" que permite override manual
  // de fechaInicio/fechaFin (por default se derivan de mes+quincena).
  const [etiqueta, setEtiqueta] = useState('');
  const [cortePersonalizado, setCortePersonalizado] = useState(false);
  // §2.6 — Datos del diálogo de reintento cuando 409 NOMINA_DUPLICADA.
  const [nominasExistentes, setNominasExistentes] = useState<
    import('../../../api/nomina').NominaExistenteResumen[]
  >([]);
  const [dialogoDuplicadaOpen, setDialogoDuplicadaOpen] = useState(false);

  // ── Estado global del wizard ──────────────────────────────────────────────
  /** ID de la nómina creada al pasar del paso 1 al 2. null antes de eso. */
  const [nominaId, setNominaId] = useState<number | null>(
    idEditar ? parseInt(idEditar) : null,
  );
  /** True mientras se hidrata el estado del wizard con la nómina existente. */
  const [cargandoEdicion, setCargandoEdicion] = useState(esEdicion);
  /** Procesando paso (crear nómina, agregar empleados, confirmar cosecha…). */
  const [procesando, setProcesando] = useState(false);

  // ── Paso 2 — colaboradores y operarios disponibles ────────────────────────
  const [empleados, setEmpleados] = useState<EmpleadoDisponible[]>([]);
  const [operarios, setOperarios] = useState<OperarioDisponible[]>([]);
  // Terceros completos (con nit, representante) para el listado de empresas
  // contratistas del paso 2. Fetch en paralelo al de operarios.
  const [tercerosMap, setTercerosMap] = useState<Map<number, Tercero>>(new Map());
  // §3.1 — colaboradores filtrados de `data` porque están en otra nómina
  // cuyos días se cruzan. El backend los deja fuera pero los lista aquí
  // para que el frontend explique al usuario por qué no aparecen.
  const [excluidos, setExcluidos] = useState<
    import('../../../api/nomina').EmpleadoExcluido[]
  >([]);
  // Lookup de salario_base maestro por empleado_id — usado en paso 4 para
  // mostrar el mismo valor que la liquidacion. El snapshot en `nomina_empleado`
  // puede quedar viejo si el salario del colaborador cambio despues.
  const [salariosMaestros, setSalariosMaestros] = useState<Map<number, number>>(new Map());
  // §2.6 — Nóminas ya existentes en el mismo (mes, año, quincena). Consultado
  // en paso 4 ANTES del POST para avisar al usuario que va a crear una
  // "quincena partida" (segunda nómina en el mismo período). No bloquea.
  const [nominasMismoPeriodo, setNominasMismoPeriodo] = useState<Array<{
    id: number;
    etiqueta?: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    empleados_count?: number;
  }>>([]);
  // Preview de liquidacion por nomina_empleado_id — muestra el total que
  // efectivamente ganaria cada colaborador en la quincena (jornales +
  // cosecha + salario segun modalidad). Se carga en paso 4.
  //
  // Cacheado en sessionStorage por nominaId con TTL 10 min: sin caché una
  // nómina de 100 colaboradores dispara 100 peticiones al backend cada vez
  // que se entra al paso 4 (incluido volver desde AjustesCosecha). El caché
  // se invalida al navegar a "Revisar" desde la alerta de cosechas (§4.4).
  const [previewsPorEmpleado, setPreviewsPorEmpleado] = useState<Map<number, {
    total_devengado: number;
    total_neto_propuesto: number;
  }>>(() => {
    if (!idEditar) return new Map();
    try {
      const raw = sessionStorage.getItem(`wizard_previews_${idEditar}`);
      if (!raw) return new Map();
      const { data, timestamp } = JSON.parse(raw) as {
        data: Array<[number, { total_devengado: number; total_neto_propuesto: number }]>;
        timestamp: number;
      };
      if (Date.now() - timestamp > 10 * 60 * 1000) return new Map(); // 10 min TTL
      return new Map(data);
    } catch {
      return new Map();
    }
  });
  const [cargandoPreviews, setCargandoPreviews] = useState(false);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [operariosSeleccionados, setOperariosSeleccionados] = useState<number[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  /** Solo en modo edición: colaboradores ya agregados a la nómina.
   *  El endpoint `/empleados-disponibles` los excluye, así que los
   *  mostramos aparte en su propia tabla informativa. */
  const [colaboradoresAgregados, setColaboradoresAgregados] = useState<Array<{
    nominaEmpleadoId: number;
    tipo: 'EMP' | 'OP';
    nombre: string;
    documento?: string;
    cargo?: string;
    tercero?: string;
    salarioBase?: number;
    salarioTipo?: string | null;
    estado: 'PENDIENTE' | 'LIQUIDADO';
    /** Solo para tipo='EMP'. Permite hacer lookup en `empleados[]` (paso 2)
     *  para recuperar el `salario_base` maestro del colaborador cuando el
     *  backend guardo un valor distinto en `nomina_empleado` (p.ej. un valor
     *  antiguo antes de actualizar el salario del colaborador). */
    empleadoId?: number;
    /** Solo para tipo='OP'. Permite hacer lookup en `operarios[]` para
     *  recuperar `salario_base` / `tarifa_dia_estimada` cuando el backend
     *  no los persiste en el registro `nomina_empleado`. */
    operarioId?: number;
  }>>([]);
  const colaboradoresYaAgregados = colaboradoresAgregados.length;
  /** Filtro de la tabla de operarios por empresa (?tercero_id=N). */
  /**
   * Lookup global de operarios del tenant (id → OperarioSelectItem + cargo).
   * Se usa como fallback para resolver nombres/cargos/empresa cuando
   * `nominaApi.ver()` NO trae el subobjeto `operario` de cada fila
   * `nomina_empleado`. El `cargo` se enriquece en segunda fase desde
   * `operariosApi.listarPorTercero` (el select global no lo trae).
   */
  // Hidrata desde sessionStorage con TTL 10 min para no re-fetchear los
  // N+1 requests de operarios (select global + N terceros) cada vez que
  // se re-monta el wizard (por ejemplo al volver de AjustesCosecha).
  const [operariosLookup, setOperariosLookup] = useState<
    Map<number, OperarioSelectItem & { cargo?: string | null }>
  >(() => {
    try {
      const raw = sessionStorage.getItem('wizard_operarios_lookup');
      if (!raw) return new Map();
      const { data, timestamp } = JSON.parse(raw) as {
        data: Array<[number, OperarioSelectItem & { cargo?: string | null }]>;
        timestamp: number;
      };
      if (Date.now() - timestamp > 10 * 60 * 1000) return new Map();
      return new Map(data);
    } catch {
      return new Map();
    }
  });

  // ── Paso 3 — Validar Cosecha ──────────────────────────────────────────────
  const [bundleCosecha, setBundleCosecha] = useState<ValidacionCosechaBundle | null>(null);
  const [cargandoBundle, setCargandoBundle] = useState(false);
  /** Ids de colaboradores con su detalle de cosechas expandido en el paso 3.
   *  Es un Set para permitir varios abiertos al mismo tiempo. */
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Set<number>>(new Set());
  const toggleEmpleadoExpandido = (id: number) =>
    setEmpleadosExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [mostrarAjustePromedios, setMostrarAjustePromedios] = useState(false);
  /** Ediciones locales lote_id → nuevo promedio manual (solo lotes modificados).
   *  Se compara contra `bundleCosecha.promedios_por_lote[*].promedio_efectivo`. */
  const [promediosEditados, setPromediosEditados] = useState<Record<number, number>>({});
  // §4.6 F6 — Detalle del cambio pendiente para el diálogo de confirmación.
  // Se llena al hacer clic en "Guardar promedios" y se limpia al aceptar/cancelar.
  // Diálogo al salir del wizard en flujo de creación con nómina ya
  // persistida en el backend (paso 1 hace POST /nominas). Sin este diálogo,
  // el usuario que entra al wizard, revisa cosecha y no vuelve a terminar
  // deja una nómina huérfana en borrador.
  const [confirmarSalirWizard, setConfirmarSalirWizard] = useState(false);
  const [descartandoBorrador, setDescartandoBorrador] = useState(false);
  const [confirmarAjustePromedios, setConfirmarAjustePromedios] = useState<
    | null
    | Array<{
        lote_id: number;
        lote_nombre: string;
        promedio_original: number;
        promedio_nuevo: number;
        delta: number;
        colaboradores_impactados: number;
        gajos_totales: number;
      }>
  >(null);
  /** Snapshot al abrir el modal para poder revertir con "Cancelar". */
  const promediosEditadosSnapshot = useRef<Record<number, number>>({});
  const [ajustandoPromedio, setAjustandoPromedio] = useState(false);
  /** Año seleccionado en el selector del modal — arranca en el año de la nómina. */
  const [anioPromedios, setAnioPromedios] = useState<number>(new Date().getFullYear());
  /** lote_id → updated_at del último promedio del año seleccionado. */
  const [fechasPromedioLote, setFechasPromedioLote] = useState<Map<number, string>>(new Map());

  /**
   * Persistir progreso en localStorage cada vez que cambia `nominaId` o
   * `pasoActual`. Esto permite restaurar el wizard al volver desde otra
   * página sin perder en qué paso iba el usuario.
   */
  useEffect(() => {
    if (nominaId == null) return;
    try {
      localStorage.setItem(
        STORAGE_KEY_NOMINA_WIZARD,
        JSON.stringify({ nominaId, pasoActual }),
      );
    } catch {
      // ignore (storage lleno, modo privado, etc.)
    }
  }, [nominaId, pasoActual]);

  /**
   * Si el usuario entra a `/nomina/nueva` y hay un wizard a medio terminar
   * de otra sesión, lo redirigimos a `/nomina/:id/editar` para continuar
   * donde se quedó. Si la nómina ya no existe en backend (404), limpiamos
   * el storage y dejamos arrancar el flujo normal.
   */
  useEffect(() => {
    if (esEdicion) return;
    const p = leerProgresoPersistido();
    if (!p) return;
    nominaApi
      .ver(p.nominaId)
      .then((res) => {
        if (res.data.estado === 'CERRADA') {
          localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD);
          return;
        }
        navigate(`/nomina/${p.nominaId}/editar`, { replace: true });
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Modo edición — hidrata el wizard con la nómina existente ─────────────
  // Carga la nómina con sus empleados, pre-puebla paso 1 y marca los
  // colaboradores ya agregados como pre-seleccionados.
  useEffect(() => {
    if (!esEdicion || !idEditar) return;
    setCargandoEdicion(true);
    nominaApi
      .ver(parseInt(idEditar))
      .then((res) => {
        const n = res.data;
        if (n.estado === 'CERRADA') {
          toast.error('No se puede editar una nómina cerrada');
          navigate(`/nomina/${n.id}`);
          return;
        }
        setAnoEdit(String(n.anio));
        setMes(String(n.mes));
        setPeriodicidad(n.tipo_pago_snapshot);
        setQuincena(n.quincena ? (String(n.quincena) as '1' | '2') : '');
        setColaboradoresAgregados(mapearAgregados(n.empleados ?? [], operariosLookup));
      })
      .catch((err: ApiError) => {
        toast.error(err.message ?? 'No se pudo cargar la nómina');
        navigate('/nomina');
      })
      .finally(() => setCargandoEdicion(false));
  }, [esEdicion, idEditar, navigate]);

  // Cargar la periodicidad configurada del tenant en modo CREAR.
  // En modo EDICIÓN se sobrescribe luego con el `tipo_pago_snapshot` de la nómina.
  useEffect(() => {
    if (esEdicion) return;
    configuracionApi.configuracionNomina
      .obtener()
      .then((res) => {
        setPeriodicidad(res.data.tipo_pago_nomina);
        // Si es MENSUAL, no hay quincena — limpiar cualquier valor previo.
        if (res.data.tipo_pago_nomina === 'MENSUAL') setQuincena('');
        setDiasQuincena({
          dia_inicio_q1: res.data.dia_inicio_q1 ?? 1,
          dia_fin_q1: res.data.dia_fin_q1 ?? 15,
          dia_inicio_q2: res.data.dia_inicio_q2 ?? 16,
          dia_fin_q2: res.data.dia_fin_q2 ?? 31,
        });
      })
      .catch(() => {
        // silencioso — se queda con el default QUINCENAL del useState.
      });
  }, [esEdicion]);

  // Calcular fechas automáticamente. Las quincenas respetan las fechas de
  // corte del tenant (§8): `dia_inicio_q1..dia_fin_q2`. Si el día configurado
  // excede el último día del mes (ej. 31 en febrero) se hace clamp.
  //
  // §2.6 — Si `cortePersonalizado=true`, el useEffect NO sobrescribe las
  // fechas (el usuario las está editando manualmente).
  useEffect(() => {
    if (cortePersonalizado) return;
    if (!mes) {
      setFechaInicio('');
      setFechaFin('');
      return;
    }
    const a = parseInt(ano);
    const m = parseInt(mes);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    // Último día real del mes seleccionado (mes+1, día 0).
    const ultimoDiaMes = new Date(a, m, 0).getDate();
    const clamp = (d: number) => Math.min(Math.max(d, 1), ultimoDiaMes);
    if (periodicidad === 'MENSUAL') {
      setFechaInicio(fmt(new Date(a, m - 1, 1)));
      setFechaFin(fmt(new Date(a, m, 0)));
    } else if (periodicidad === 'QUINCENAL' && quincena === '1') {
      setFechaInicio(fmt(new Date(a, m - 1, clamp(diasQuincena.dia_inicio_q1))));
      setFechaFin(fmt(new Date(a, m - 1, clamp(diasQuincena.dia_fin_q1))));
    } else if (periodicidad === 'QUINCENAL' && quincena === '2') {
      setFechaInicio(fmt(new Date(a, m - 1, clamp(diasQuincena.dia_inicio_q2))));
      setFechaFin(fmt(new Date(a, m - 1, clamp(diasQuincena.dia_fin_q2))));
    } else {
      setFechaInicio('');
      setFechaFin('');
    }
  }, [ano, mes, periodicidad, quincena, diasQuincena, cortePersonalizado]);

  // Cargar empleados+operarios disponibles al entrar al paso 2.
  // Requiere nominaId — si no existe, no carga.
  useEffect(() => {
    if (pasoActual !== 2 || !nominaId) return;
    if (empleados.length > 0 || operarios.length > 0) return;
    setCargandoEmpleados(true);
    Promise.all([
      nominaApi.empleadosDisponibles(nominaId),
      // Terceros con nit + representante para la card de "Empresas Terceras".
      tercerosApi.listar({ per_page: 500 } as any).catch(() => ({ data: [] as Tercero[] })),
    ])
      .then(([empRes, terRes]) => {
        setEmpleados(empRes.data.empleados ?? []);
        setOperarios(empRes.data.operarios ?? []);
        // §3.1 — colaboradores excluidos por estar en nómina cruzada.
        setExcluidos(empRes.meta?.excluidos ?? []);
        const m = new Map<number, Tercero>();
        for (const t of (terRes.data ?? []) as Tercero[]) m.set(t.id, t);
        setTercerosMap(m);
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar colaboradores'))
      .finally(() => setCargandoEmpleados(false));
  }, [pasoActual, nominaId, empleados.length, operarios.length]);

  // Cargar bundle de validación de cosecha al entrar al paso 3.
  useEffect(() => {
    if (pasoActual !== 3 || !nominaId) return;
    setCargandoBundle(true);
    nominaApi
      .validarCosecha(nominaId)
      .then((res) => setBundleCosecha(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar validación de cosecha'))
      .finally(() => setCargandoBundle(false));
  }, [pasoActual, nominaId]);

  // §2.6 — Al entrar al paso 4, consultamos si ya existen otras nóminas para
  // el mismo (mes, año, quincena). Si hay, avisamos que va a ser una "quincena
  // partida" (varias nóminas del mismo período). Preventivo, así el usuario no
  // se lleva la sorpresa del 409 NOMINA_DUPLICADA al confirmar. No bloquea.
  useEffect(() => {
    if (pasoActual !== 4) return;
    if (!mes || !ano) return;
    const anioNum = parseInt(ano);
    const mesNum = parseInt(mes);
    if (!anioNum || !mesNum) return;
    nominaApi
      .listar({ mes: mesNum, anio: anioNum, per_page: 50 } as any)
      .then((res) => {
        const quincenaEsperada = periodicidad === 'MENSUAL' ? null : (quincena ? Number(quincena) : null);
        // Excluimos la nómina que ESTAMOS creando (ya existe en BORRADOR
        // desde el paso 1) y filtramos por misma quincena.
        const otras = (res.data ?? []).filter((n: any) => {
          if (nominaId && n.id === nominaId) return false;
          if (periodicidad === 'MENSUAL') return n.quincena == null;
          return n.quincena === quincenaEsperada;
        });
        setNominasMismoPeriodo(otras.map((n: any) => ({
          id: n.id,
          etiqueta: n.etiqueta ?? null,
          fecha_inicio: n.fecha_inicio,
          fecha_fin: n.fecha_fin,
          estado: n.estado,
          empleados_count: n.empleados_count,
        })));
      })
      .catch(() => setNominasMismoPeriodo([]));
  }, [pasoActual, nominaId, mes, ano, periodicidad, quincena]);

  // Al entrar al paso 4, cargamos el salario MAESTRO de cada colaborador
  // agregado a la nomina. Necesario porque el snapshot en `nomina_empleado`
  // puede estar desactualizado y la liquidacion usa el maestro.
  useEffect(() => {
    if (pasoActual !== 4) return;
    const empleadoIds = Array.from(
      new Set(
        colaboradoresAgregados
          .filter((c) => c.tipo === 'EMP' && c.empleadoId)
          .map((c) => c.empleadoId as number),
      ),
    );
    if (empleadoIds.length === 0) return;
    // Skip si ya tenemos todos.
    const faltantes = empleadoIds.filter((id) => !salariosMaestros.has(id));
    if (faltantes.length === 0) return;

    colaboradoresApi
      .listar({ per_page: 500 } as any)
      .then((res) => {
        const nuevo = new Map(salariosMaestros);
        for (const col of res.data ?? []) {
          const val = Number(col.salario_base ?? 0);
          if (Number.isFinite(val) && val > 0) nuevo.set(col.id, val);
        }
        setSalariosMaestros(nuevo);
      })
      .catch(() => { /* fallback al snapshot */ });
  }, [pasoActual, colaboradoresAgregados, salariosMaestros]);

  // Al entrar al paso 4, fetch preview por cada colaborador agregado.
  // Nos da el total que efectivamente ganaria en esa quincena (jornales +
  // cosecha + salario segun modalidad). Es el mismo calculo que la
  // liquidacion, asi que el numero coincide con lo que se ve al liquidar.
  useEffect(() => {
    if (pasoActual !== 4) return;
    if (colaboradoresAgregados.length === 0) return;
    const faltantes = colaboradoresAgregados.filter(
      (c) => !previewsPorEmpleado.has(c.nominaEmpleadoId),
    );
    if (faltantes.length === 0) return;

    setCargandoPreviews(true);
    Promise.allSettled(
      faltantes.map((c) => nominaApi.preview(c.nominaEmpleadoId)),
    )
      .then((results) => {
        const nuevo = new Map(previewsPorEmpleado);
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const p = r.value.data;
            nuevo.set(faltantes[i].nominaEmpleadoId, {
              total_devengado: Number(p.total_devengado ?? 0),
              total_neto_propuesto: Number(p.total_neto_propuesto ?? 0),
            });
          }
        });
        setPreviewsPorEmpleado(nuevo);
        // Persistir en sessionStorage con TTL 10 min para no re-fetchear al
        // volver desde AjustesCosecha o al re-montar el wizard.
        if (idEditar) {
          try {
            sessionStorage.setItem(
              `wizard_previews_${idEditar}`,
              JSON.stringify({ data: Array.from(nuevo.entries()), timestamp: Date.now() }),
            );
          } catch { /* quota excedida — se re-fetchea */ }
        }
      })
      .finally(() => setCargandoPreviews(false));
  }, [pasoActual, colaboradoresAgregados, previewsPorEmpleado, idEditar]);

  // Al abrir el modal, simplemente reseteamos las ediciones locales — los
  // promedios vienen del bundle de cosecha (`promedios_por_lote`), ya cargado.
  // Si el bundle aún no está, se cargará al entrar al paso 3.
  // También iniciamos el selector de año en el año de la nómina (ano).
  useEffect(() => {
    if (!mostrarAjustePromedios) return;
    setPromediosEditados({});
    setAnioPromedios(parseInt(ano) || new Date().getFullYear());
  }, [mostrarAjustePromedios, ano]);

  // Traer fecha de actualización por lote del año seleccionado — pobla la
  // columna "Fecha Actualización" del modal combinado. No bloquea la UI.
  useEffect(() => {
    if (!mostrarAjustePromedios) return;
    configuracionApi.promediosLote
      .listar({ anio: anioPromedios, per_page: 100 })
      .then((res) => {
        const m = new Map<number, string>();
        for (const p of res.data ?? []) {
          const updated = (p as any).updated_at as string | undefined;
          if (!updated) continue;
          const existente = m.get(p.lote_id);
          if (!existente || new Date(updated).getTime() > new Date(existente).getTime()) {
            m.set(p.lote_id, updated);
          }
        }
        setFechasPromedioLote(m);
      })
      .catch(() => setFechasPromedioLote(new Map()));
  }, [mostrarAjustePromedios, anioPromedios]);

  /** Guarda los promedios editados — un PUT por cada lote modificado.
   *  El valor original es el `promedio_efectivo` del bundle (que ya considera
   *  el manual sobre el auto). Solo se envía lo que cambió. Tras el batch de
   *  PUTs se recarga el bundle (doc §4.2: "el frontend debe llamar GET
   *  /validar-cosecha después del PUT"). */
  /** §4.6 F6 — Antes de guardar, calcula el impacto (por lote: promedio,
   *  cuántos colaboradores usan ese lote, cuántos gajos totales) y abre el
   *  diálogo de confirmación. El PUT solo se dispara si el usuario acepta.
   *
   *  Motivo: el ajuste manual del promedio escribe en
   *  `nomina_promedio_lote.promedio_efectivo`, que es el peldaño 1 de la
   *  escalera que PAGA. No es un ajuste de conciliación — cambia lo que
   *  cobra la gente. */
  const pedirConfirmacionGuardarPromedios = () => {
    if (!nominaId || !bundleCosecha) return;
    const cambios = Object.entries(promediosEditados)
      .map(([loteId, valor]) => ({ loteId: parseInt(loteId), valor }))
      .filter(({ loteId, valor }) => {
        const original = bundleCosecha.promedios_por_lote
          .find((p) => p.lote_id === loteId)?.promedio_efectivo ?? 0;
        return valor !== original && valor > 0;
      });
    if (cambios.length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }
    // Construye la lista rica para el diálogo.
    const detalle = cambios.map(({ loteId, valor }) => {
      const p = bundleCosecha.promedios_por_lote.find((x) => x.lote_id === loteId);
      const promedioOriginal = p?.promedio_efectivo ?? 0;
      // Colaboradores impactados = los que tienen al menos una cosecha del lote.
      // Se usa lote_nombre como match porque los cosechas del bundle vienen
      // por nombre, no por id.
      const nombreLote = p?.lote_nombre ?? '';
      const colabsSet = new Set<number>();
      let gajosTotales = 0;
      for (const d of bundleCosecha.detalle_por_colaborador ?? []) {
        for (const c of d.cosechas ?? []) {
          if (c.lote === nombreLote) {
            colabsSet.add(d.colaborador_id);
            gajosTotales += c.gajos_verificados ?? c.gajos_trabajados ?? 0;
          }
        }
      }
      return {
        lote_id: loteId,
        lote_nombre: nombreLote,
        promedio_original: promedioOriginal,
        promedio_nuevo: valor,
        delta: valor - promedioOriginal,
        colaboradores_impactados: colabsSet.size,
        gajos_totales: gajosTotales,
      };
    });
    setConfirmarAjustePromedios(detalle);
  };

  /** Ejecuta el guardado real después de confirmar. */
  const ejecutarGuardarPromedios = async () => {
    if (!nominaId || !bundleCosecha) return;
    const cambios = Object.entries(promediosEditados)
      .map(([loteId, valor]) => ({ loteId: parseInt(loteId), valor }))
      .filter(({ loteId, valor }) => {
        const original = bundleCosecha.promedios_por_lote
          .find((p) => p.lote_id === loteId)?.promedio_efectivo ?? 0;
        return valor !== original && valor > 0;
      });
    if (cambios.length === 0) {
      setConfirmarAjustePromedios(null);
      return;
    }
    setAjustandoPromedio(true);
    try {
      await Promise.all(
        cambios.map(({ loteId, valor }) =>
          nominaApi.ajustarPromedioLote(nominaId, loteId, valor),
        ),
      );
      toast.success(`${cambios.length} promedio${cambios.length !== 1 ? 's' : ''} actualizado${cambios.length !== 1 ? 's' : ''}`);
      const res = await nominaApi.validarCosecha(nominaId);
      setBundleCosecha(res.data);
      promediosEditadosSnapshot.current = { ...promediosEditados };
      setMostrarAjustePromedios(false);
      setConfirmarAjustePromedios(null);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron guardar los promedios');
    } finally {
      setAjustandoPromedio(false);
    }
  };

  /** Valor que el input muestra: lo editado si existe, sino el efectivo del backend. */
  const promedioValorActual = (loteId: number): number => {
    if (promediosEditados[loteId] !== undefined) return promediosEditados[loteId];
    return bundleCosecha?.promedios_por_lote
      .find((p) => p.lote_id === loteId)?.promedio_efectivo ?? 0;
  };

  const hayCambiosPromedios = Object.keys(promediosEditados).some((k) => {
    const id = parseInt(k);
    const valor = promediosEditados[id];
    const original = bundleCosecha?.promedios_por_lote
      .find((p) => p.lote_id === id)?.promedio_efectivo ?? 0;
    return valor !== original;
  });

  /** Recarga la lista de colaboradores ya agregados desde el backend.
   *  Se llama tras agregar/quitar y al entrar al paso 4 para tener nombres. */
  const recargarAgregados = async () => {
    if (!nominaId) return;
    try {
      const res = await nominaApi.ver(nominaId);
      setColaboradoresAgregados(mapearAgregados(res.data.empleados ?? [], operariosLookup));
    } catch {
      // silencioso — no crítico
    }
  };

  /**
   * Cargar lookup global de operarios al montar el wizard, en dos fases:
   *  1. `GET /operarios/select` — un solo request que trae {id, nombre,
   *     cedula, tercero_nombre} de TODOS los operarios activos del tenant.
   *     Con esto ya se pueden mostrar nombres y empresa.
   *  2. Para cada tercero único, `GET /terceros/{id}/operarios` — trae los
   *     objetos completos con `cargo`. Se enriquece el lookup con esos datos.
   *
   * La fase 2 se hace en background: si la nómina se ve antes de que termine,
   * los cargos aparecen después sin recarga manual.
   */
  useEffect(() => {
    // Si ya hidratamos desde caché (>0 entries), no re-fetcheamos: los
    // operarios activos del tenant no cambian entre navegaciones internas.
    if (operariosLookup.size > 0) return;
    operariosApi
      .selectGlobal()
      .then(async (res) => {
        const map = new Map<number, OperarioSelectItem & { cargo?: string | null }>();
        for (const op of res.data ?? []) map.set(op.id, op);
        setOperariosLookup(new Map(map));

        // Fase 2 — enriquecer con cargos. Terceros únicos.
        const tercerosIds = Array.from(new Set((res.data ?? []).map((o) => o.tercero_id)));
        if (tercerosIds.length === 0) return;
        await Promise.all(
          tercerosIds.map((tid) =>
            operariosApi
              .listarPorTercero(tid)
              .then((rr) => {
                for (const op of rr.data ?? []) {
                  const existente = map.get(op.id);
                  if (existente) {
                    existente.cargo = op.cargo ?? null;
                  }
                }
              })
              .catch(() => {}),
          ),
        );
        setOperariosLookup(new Map(map));
        // Persistir con TTL 10 min para evitar N+1 en la próxima navegación.
        try {
          sessionStorage.setItem(
            'wizard_operarios_lookup',
            JSON.stringify({ data: Array.from(map.entries()), timestamp: Date.now() }),
          );
        } catch { /* quota — se re-fetchea */ }
      })
      .catch(() => {
        // silencioso — sin lookup solo veremos "Operario #N" como fallback
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cuando llega/actualiza el lookup DESPUÉS de haber cargado la nómina,
   *  refresca los agregados para que los operarios muestren nombres y
   *  cargos reales. Se dispara tanto en la fase 1 (nombres) como en la
   *  fase 2 (cargos). */
  useEffect(() => {
    if (operariosLookup.size === 0 || !nominaId) return;
    const necesitaRefresh = colaboradoresAgregados.some(
      (c) => c.tipo === 'OP'
        && (c.nombre.startsWith('Operario #') || !c.cargo),
    );
    if (necesitaRefresh) recargarAgregados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operariosLookup]);

  /** Quita un colaborador ya agregado de la nómina (solo PENDIENTE).
   *  Recarga la lista local y la tabla de disponibles. */
  const quitarYaAgregado = async (nominaEmpleadoId: number) => {
    try {
      await nominaApi.quitarEmpleado(nominaEmpleadoId);
      toast.success('Colaborador quitado de la nómina');
      await recargarAgregados();
      // Reiniciar el caché de empleados disponibles para que se vuelva a cargar.
      setEmpleados([]);
      setOperarios([]);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.EMPLEADO_LIQUIDADO) {
        toast.error('No se puede quitar: el colaborador ya está liquidado');
      } else {
        toast.error(e.message ?? 'No se pudo quitar el colaborador');
      }
    }
  };

  const agregarEmpleado = (id: number) =>
    setEmpleadosSeleccionados((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const quitarEmpleado = (id: number) =>
    setEmpleadosSeleccionados((prev) => prev.filter((x) => x !== id));
  const agregarTodos = () => setEmpleadosSeleccionados(empleados.map((e) => e.id));
  const quitarTodos = () => setEmpleadosSeleccionados([]);

  const toggleOperario = (id: number) =>
    setOperariosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAtras = () => {
    if (pasoActual > 1) setPasoActual(pasoActual - 1);
  };

  /**
   * Paso 1 → 2:
   *  - Modo crear: POST si todavía no hay nómina.
   *  - Modo edición: PUT solo si los datos del paso 1 cambiaron respecto a
   *    la nómina cargada (mes / quincena / periodicidad). Si no hay cambios,
   *    avanza sin tocar el backend.
   */
  const crearNominaSiHaceFalta = async (
    permitirMultiple = false,
  ): Promise<boolean> => {
    const payload: Parameters<typeof nominaApi.crear>[0] = {
      mes: parseInt(mes),
      anio: parseInt(ano),
      periodicidad,
      quincena: periodicidad === 'QUINCENAL' ? (parseInt(quincena) as 1 | 2) : null,
      // §2.6 — extras opcionales. `etiqueta` está oculta del UI pero el
      // state se conserva por si vuelve a mostrarse. `fecha_inicio`/`fecha_fin`
      // se envían siempre que existan: la Fecha Fin es editable en el UI, y
      // el backend valida que ambas caigan dentro del mes/año declarados.
      ...(etiqueta.trim() ? { etiqueta: etiqueta.trim() } : {}),
      ...(fechaInicio && fechaFin
        ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
        : {}),
      ...(permitirMultiple ? { permitir_multiple: true } : {}),
    };

    if (nominaId) {
      // Si estamos editando, intentamos PUT con los datos del paso 1.
      if (!esEdicion) return true; // ya creada en una sesión anterior del wizard
      setProcesando(true);
      try {
        await nominaApi.editar(nominaId, payload);
        return true;
      } catch (err) {
        const e = err as ApiError;
        if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
          // Hay liquidados — no se puede cambiar el período. Igual avanzamos
          // para que el usuario pueda agregar más colaboradores.
          toast.warning('No se pudo actualizar el período (hay liquidados), continúa con el resto');
          return true;
        }
        if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
          toast.error('Ya existe otra nómina para ese período');
          return false;
        }
        if (e.code === NominaErrorCodes.COLABORADOR_EN_NOMINA_SOLAPADA) {
          toast.error('Cambio bloqueado: algún colaborador quedaría en dos nóminas con días cruzados');
          return false;
        }
        if (e.code === NominaErrorCodes.CALENDARIO_FESTIVOS_AUSENTE) {
          // §9.9 — El backend adjunta el comando artisan literal en el mensaje.
          // Lo mostramos en un toast largo para que el usuario pueda copiarlo.
          toast.error(
            e.message ?? 'Falta el calendario de festivos para ese año. Pide al soporte que lo materialice.',
            { duration: 15000 },
          );
          return false;
        }
        toast.error(e.message ?? 'No se pudo actualizar la nómina');
        return false;
      } finally {
        setProcesando(false);
      }
    }

    setProcesando(true);
    try {
      const res = await nominaApi.crear(payload);
      setNominaId(res.data.id);
      // Marcamos esta nómina como "flujo de creación en curso" — así el
      // título del wizard sigue diciendo "Nuevo Período de Pago" aunque el
      // URL redirija a `/nomina/{id}/editar`. Se limpia al cerrar la nómina
      // o al salir del wizard hacia el listado.
      try {
        sessionStorage.setItem('wizard_flujo_creacion', String(res.data.id));
      } catch { /* noop */ }
      toast.success('Nómina creada en borrador');
      return true;
    } catch (err) {
      const e = err as ApiError & { data?: { nominas_existentes?: any[] } };
      if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
        // §2.6 — El backend adjunta `nominas_existentes[]` en el error para
        // que el frontend ofrezca crear una nómina adicional.
        const existentes = (e.data as any)?.nominas_existentes
          ?? (e as any)?.nominas_existentes
          ?? [];
        if (existentes.length > 0 && !permitirMultiple) {
          setNominasExistentes(existentes);
          setDialogoDuplicadaOpen(true);
        } else {
          toast.error('Ya existe una nómina para ese período');
        }
      } else if (e.code === NominaErrorCodes.COLABORADOR_EN_NOMINA_SOLAPADA) {
        toast.error('Alguno de los colaboradores ya está en otra nómina con días cruzados');
      } else if (e.code === NominaErrorCodes.CALENDARIO_FESTIVOS_AUSENTE) {
        toast.error(
          e.message ?? 'Falta el calendario de festivos para ese año. Pide al soporte que lo materialice.',
          { duration: 15000 },
        );
      } else {
        toast.error(e.message ?? 'No se pudo crear la nómina');
      }
      return false;
    } finally {
      setProcesando(false);
    }
  };

  /** Paso 2 → 3: agrega empleados y operarios a la nómina. */
  const agregarColaboradores = async (): Promise<boolean> => {
    if (!nominaId) return false;
    const hayNuevos = empleadosSeleccionados.length > 0 || operariosSeleccionados.length > 0;
    // En modo edición se permite avanzar sin agregar más (basta con los ya agregados).
    if (!hayNuevos) {
      if (esEdicion && colaboradoresYaAgregados > 0) return true;
      toast.error('Selecciona al menos un colaborador');
      return false;
    }
    setProcesando(true);
    try {
      const res = await nominaApi.agregarEmpleados(nominaId, {
        empleado_ids: empleadosSeleccionados,
        operario_ids: operariosSeleccionados,
      });
      // §3.2 — Éxito parcial: leer `omitidos[]` y avisar al usuario. Sin
      // esto el usuario cree que agregó 20 personas y liquidó con 18.
      if (res.omitidos && res.omitidos.length > 0) {
        for (const om of res.omitidos) {
          const razon = om.code === 'TERCERO_EN_NOMINA_SOLAPADA'
            ? `su empresa ya tiene gente en la nómina "${om.nomina.etiqueta ?? 'sin etiqueta'}"`
            : `ya está en la nómina "${om.nomina.etiqueta ?? 'sin etiqueta'}"`;
          toast.warning(`${om.nombre_completo} no se agregó: ${razon}`, { duration: 7000 });
        }
      }
      // Refrescar la lista de agregados con los nuevos ya incluidos para
      // que el paso 4 los muestre con nombres correctos.
      await recargarAgregados();
      // Limpiar selección local — ya se persistieron en el backend.
      setEmpleadosSeleccionados([]);
      setOperariosSeleccionados([]);
      // Reiniciar el caché de disponibles para reflejar los que ya no están.
      setEmpleados([]);
      setOperarios([]);
      return true;
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron agregar los colaboradores');
      return false;
    } finally {
      setProcesando(false);
    }
  };

  /** Paso 3 → 4: confirma snapshot del bundle de validación cosecha. */
  const confirmarValidacionCosecha = async (): Promise<boolean> => {
    if (!nominaId || !bundleCosecha) return true; // si no hay bundle, no es obligatorio
    if (bundleCosecha.total_kg_colaboradores === 0) return true; // sin cosechas, paso opcional
    setProcesando(true);
    try {
      await nominaApi.confirmarValidacionCosecha(nominaId);
      return true;
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo confirmar la validación');
      return false;
    } finally {
      setProcesando(false);
    }
  };

  const handleSiguiente = async () => {
    if (pasoActual === 1) {
      const ok = await crearNominaSiHaceFalta();
      if (ok) setPasoActual(2);
      return;
    }
    if (pasoActual === 2) {
      const ok = await agregarColaboradores();
      if (ok) setPasoActual(3);
      return;
    }
    if (pasoActual === 3) {
      const ok = await confirmarValidacionCosecha();
      if (ok) setPasoActual(4);
      return;
    }
  };

  /** Paso 4: la nómina ya existe — solo navegar al detalle. */
  const handleFinalizar = () => {
    if (!nominaId) {
      toast.error('La nómina no se ha creado correctamente');
      return;
    }
    // Wizard completado → limpiar progreso persistido y la marca de flujo
    // de creación (para que la próxima vez que se entre a esta nómina el
    // título sea "Editar Período de Pago", no "Nuevo").
    try {
      localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD);
      sessionStorage.removeItem('wizard_flujo_creacion');
    } catch {}
    toast.success('Nómina lista. Continúa con las liquidaciones.');
    navigate(`/nomina/${nominaId}`);
  };

  const puedeAvanzar = () => {
    if (pasoActual === 1) {
      if (!mes || !fechaInicio || !fechaFin) return false;
      if (periodicidad === 'QUINCENAL' && !quincena) return false;
      return true;
    }
    if (pasoActual === 2) {
      // En modo edición, basta con que ya haya colaboradores agregados.
      if (esEdicion && colaboradoresYaAgregados > 0) return true;
      return empleadosSeleccionados.length > 0 || operariosSeleccionados.length > 0;
    }
    return true;
  };

  const mesNombre = MESES.find((m) => m.valor.toString() === mes)?.nombre ?? '';
  const quincenaNombre =
    periodicidad === 'MENSUAL'
      ? 'Mensual'
      : quincena === '1'
        ? 'Primera Quincena'
        : 'Segunda Quincena';

  const empleadosActivos = empleados;

  const getIniciales = (nombres: string, apellidos: string) => {
    const n = (nombres ?? '').trim();
    const a = (apellidos ?? '').trim();
    const ini = `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
    return ini || '?';
  };

  // Mostrar estado de carga mientras se hidrata el wizard en modo edición.
  if (cargandoEdicion) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando nómina...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Si estamos creando y ya hay nómina persistida (paso 1 la crea
            // en el backend), preguntar si descartar el borrador o dejarlo.
            // Si es edición o aún no se persistió nada, volver directo.
            if (esFlujoCreacion && nominaId) {
              setConfirmarSalirWizard(true);
            } else {
              navigate('/nomina');
            }
          }}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-primary">
          {esFlujoCreacion ? 'Nuevo Período de Pago' : 'Editar Período de Pago'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {esFlujoCreacion
            ? 'Crea un nuevo período de nómina paso a paso'
            : 'Modifica el período, agrega más colaboradores y vuelve a validar la cosecha'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10" />
        <div
          className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500 -z-10"
          style={{ width: `${((pasoActual - 1) / (pasos.length - 1)) * 100}%` }}
        />
        {pasos.map((paso) => {
          const Icon = paso.icono;
          const isCompleted = pasoActual > paso.numero;
          const isCurrent = pasoActual === paso.numero;
          return (
            <div
              key={paso.numero}
              className="flex flex-col items-center gap-2 bg-background px-4"
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary'
                    : isCurrent
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <Icon
                    className={`h-6 w-6 ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                )}
              </div>
              <div className="text-center">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Paso {paso.numero}
                </p>
                <p
                  className={`text-xs ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {paso.titulo}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="border-border">
        <CardContent className="p-8">
          {/* Paso 1: Información del período */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Información del Período
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Define el período de la nómina
                  </p>
                </div>
              </div>

              {/* Fila de 2 columnas: Mes | Quincena. Periodicidad viene de
                  Configuración → Parámetros de Nómina y ni siquiera se
                  muestra: es fija para toda la finca. */}
              <div className={`grid gap-6 ${periodicidad === 'QUINCENAL' ? 'md:grid-cols-2' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes *</Label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger id="mes">
                      <SelectValue placeholder="Selecciona un mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.valor} value={m.valor.toString()}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {periodicidad === 'QUINCENAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="quincena">Quincena *</Label>
                    <Select value={quincena} onValueChange={(v) => setQuincena(v as '1' | '2')}>
                      <SelectTrigger id="quincena">
                        <SelectValue placeholder="Selecciona quincena" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          Primera Quincena ({diasQuincena.dia_inicio_q1}-{diasQuincena.dia_fin_q1})
                        </SelectItem>
                        <SelectItem value="2">
                          Segunda Quincena ({diasQuincena.dia_inicio_q2}-{diasQuincena.dia_fin_q2 >= 31 ? 'fin de mes' : diasQuincena.dia_fin_q2})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* §2.6 — Fechas del período. Fecha Inicio siempre bloqueada
                  (la deriva la periodicidad). Fecha Fin editable con tooltip
                  explicativo — es el "corte de días personalizado" del backend
                  sin exponer un toggle explícito. */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    readOnly
                    className="bg-muted/40 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin" className="flex items-center gap-1.5">
                    Fecha Fin
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center text-muted-foreground cursor-help">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="center"
                          className="max-w-xs bg-primary text-primary-foreground text-xs leading-relaxed px-3 py-2"
                        >
                          Puedes ajustar la fecha fin para usar un corte de días personalizado — útil en casos especiales como liquidaciones o períodos incompletos.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>

              {mes && fechaInicio && fechaFin && (
                <Card className="border-primary bg-primary/5 mt-6">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Período seleccionado:</p>
                        <p className="text-lg font-bold text-primary">
                          {mesNombre} {ano} - {quincenaNombre}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/20">
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Inicio:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Fin:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paso 2: Seleccionar empleados */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Seleccionar Personal
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {esEdicion && colaboradoresYaAgregados > 0
                        ? `Esta nómina ya tiene ${colaboradoresYaAgregados} colaborador${colaboradoresYaAgregados !== 1 ? 'es' : ''} agregado${colaboradoresYaAgregados !== 1 ? 's' : ''}. Puedes agregar más o continuar.`
                        : 'Agrega colaboradores y operarios a este período de nómina'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={agregarTodos}
                    disabled={
                      empleadosSeleccionados.length === empleadosActivos.length ||
                      empleadosActivos.length === 0
                    }
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={quitarTodos}
                    disabled={empleadosSeleccionados.length === 0}
                  >
                    Quitar Todos
                  </Button>
                </div>
              </div>

              {/* Ya agregados (solo en modo edición) — tabla informativa con
                  opción de quitar a los que aún están PENDIENTES. */}
              {esEdicion && colaboradoresAgregados.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">
                    Ya agregados en esta nómina{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({colaboradoresAgregados.length})
                    </span>
                  </p>
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Colaborador
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Tipo
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Cargo
                              </th>
                              <th className="text-center p-4 font-semibold text-sm text-muted-foreground">
                                Estado
                              </th>
                              <th className="text-right p-4 font-semibold text-sm text-muted-foreground w-20">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...colaboradoresAgregados].sort((a, b) =>
                              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
                            ).map((c, idx) => {
                              const iniciales = c.nombre.split(' ')
                                .slice(0, 2)
                                .map((n) => n[0] ?? '')
                                .join('')
                                .toUpperCase() || '?';
                              const liquidado = c.estado === 'LIQUIDADO';
                              return (
                                <tr
                                  key={c.nominaEmpleadoId}
                                  className={`border-b border-border last:border-0 ${
                                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  }`}
                                >
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                        c.tipo === 'OP'
                                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                          : 'bg-primary/10 text-primary border-primary/20'
                                      }`}>
                                        <span className="text-sm font-bold">{iniciales}</span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-sm">{c.nombre}</span>
                                        {c.documento && (
                                          <p className="text-xs text-muted-foreground">CC {c.documento}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    {c.tipo === 'OP' ? (
                                      <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                                        {c.tercero ?? 'Tercero'}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Empleado</Badge>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm">{c.cargo ?? '—'}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <Badge className={`text-xs ${
                                      liquidado
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-200'
                                    }`}>
                                      {c.estado}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-right">
                                    {!liquidado ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => quitarYaAgregado(c.nominaEmpleadoId)}
                                        className="text-destructive hover:bg-destructive/10"
                                        title="Quitar de la nómina"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <span
                                        className="text-xs text-muted-foreground"
                                        title="No se puede quitar un colaborador ya liquidado"
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* §3.1 — Banner de colaboradores excluidos por estar en otra
                  nómina cruzada. Sin esto, el usuario busca a Juan, no lo
                  encuentra y no sabe por qué. */}
              {excluidos.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {excluidos.length} colaborador{excluidos.length !== 1 ? 'es' : ''} no aparece{excluidos.length !== 1 ? 'n' : ''} en la lista
                      </p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                        {excluidos.map((e) => e.nombre_completo).join(', ')}
                        {' — '}ya está{excluidos.length !== 1 ? 'n' : ''} en otra nómina cuyos días se cruzan con este período.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-medium">
                    {esEdicion ? 'Agregar más colaboradores' : 'Colaboradores Internos'}
                  </p>
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/30">
                    Nómina
                  </Badge>
                </div>
                <Card className="border-border">
                  <CardContent className="p-0">
                    {cargandoEmpleados ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Cargando empleados...
                      </div>
                    ) : empleadosActivos.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No hay empleados activos.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground w-12">
                                <span className="sr-only">Seleccionar</span>
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Nombre
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Cargo
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Modalidad
                              </th>
                              <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                                Salario Base
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortByFirstName(empleadosActivos).map((empleado, index) => {
                              const isSelected = empleadosSeleccionados.includes(empleado.id);
                              return (
                                <tr
                                  key={empleado.id}
                                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                                    index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${isSelected ? 'bg-primary/5' : ''}`}
                                  onClick={() =>
                                    isSelected
                                      ? quitarEmpleado(empleado.id)
                                      : agregarEmpleado(empleado.id)
                                  }
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        isSelected
                                          ? quitarEmpleado(empleado.id)
                                          : agregarEmpleado(empleado.id)
                                      }
                                    />
                                  </td>
                                  <td className="p-4">
                                    {(() => {
                                      const { nombres, apellidos } = nombreApellidoDe(empleado);
                                      return (
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                              isSelected
                                                ? 'bg-primary/10 text-primary border-primary/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                            }`}
                                          >
                                            <span className="text-sm font-bold">
                                              {getIniciales(nombres, apellidos)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-sm">
                                              {nombres} {apellidos}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm font-medium">
                                      {empleado.cargo || 'Sin cargo'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <Badge variant="outline" className="text-xs">
                                      {empleado.modalidad_pago === 'PRODUCCION'
                                        ? 'Producción'
                                        : empleado.modalidad_pago === 'FIJO'
                                          ? 'Fijo'
                                          : (empleado.modalidad_pago ?? 'N/A')}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="text-sm font-medium">
                                      ${(empleado.salario_base ?? 0).toLocaleString('es-CO')}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Empresas Terceras — tabla resumen. Cada fila es una empresa
                  contratista con checkbox que selecciona todos sus operarios
                  a la vez. Nombre, NIT, operarios activos y valor total (suma
                  de tarifas de todos los operarios). */}
              {(() => {
                // Agrupar operarios por empresa. Cada grupo lleva:
                //  - tercero completo (para NIT + representante)
                //  - operarios de esa empresa
                //  - valor total = suma de tarifa/dia
                const gruposMap = new Map<number, {
                  terceroId: number;
                  razon_social: string;
                  operarios: OperarioDisponible[];
                }>();
                for (const op of operarios) {
                  const g = gruposMap.get(op.tercero.id);
                  if (g) g.operarios.push(op);
                  else gruposMap.set(op.tercero.id, {
                    terceroId: op.tercero.id,
                    razon_social: op.tercero.razon_social,
                    operarios: [op],
                  });
                }
                const grupos = Array.from(gruposMap.values()).sort((a, b) =>
                  a.razon_social.localeCompare(b.razon_social, 'es', { sensitivity: 'base' }),
                );

                const iniciales2 = (nombre: string): string => {
                  const p = (nombre ?? '').split(/\s+/).filter(Boolean);
                  const a = p[0]?.[0] ?? '';
                  const b = p[1]?.[0] ?? '';
                  return (a + b).toUpperCase() || '?';
                };
                const tarifaDe = (op: OperarioDisponible): number => {
                  if (op.salario_base && op.salario_base > 0) return Number(op.salario_base);
                  if (op.tarifa_dia_estimada && op.tarifa_dia_estimada > 0) return Number(op.tarifa_dia_estimada);
                  return 0;
                };

                // Ids de todos los operarios visibles, para los botones
                // "Agregar todas" / "Quitar todas" del header.
                const todosLosIds = grupos.flatMap((g) => g.operarios.map((o) => o.id));
                const todosSeleccionadosGlobal =
                  todosLosIds.length > 0 &&
                  todosLosIds.every((id) => operariosSeleccionados.includes(id));
                const agregarTodas = () =>
                  setOperariosSeleccionados((prev) =>
                    Array.from(new Set([...prev, ...todosLosIds])),
                  );
                const quitarTodas = () =>
                  setOperariosSeleccionados((prev) =>
                    prev.filter((id) => !todosLosIds.includes(id)),
                  );
                return (
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h3 className="text-base font-bold">Empresas Terceras</h3>
                  <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                    Prestación de Servicios
                  </Badge>
                  {operariosSeleccionados.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({operariosSeleccionados.length} operario{operariosSeleccionados.length !== 1 ? 's' : ''} seleccionado{operariosSeleccionados.length !== 1 ? 's' : ''})
                    </span>
                  )}
                  {grupos.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={agregarTodas}
                        disabled={todosSeleccionadosGlobal}
                        className="h-8 text-xs"
                      >
                        Agregar todas
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={quitarTodas}
                        disabled={operariosSeleccionados.length === 0}
                        className="h-8 text-xs"
                      >
                        Quitar todas
                      </Button>
                    </div>
                  )}
                </div>

                <Card className="border-border">
                  <CardContent className="p-0">
                    {grupos.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No hay operarios de empresas contratistas disponibles.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground w-12">
                                <span className="sr-only">Seleccionar</span>
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Nombre Empresa
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                NIT
                              </th>
                              <th className="text-center p-4 font-semibold text-sm text-muted-foreground">
                                Operarios
                              </th>
                              <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                                Valor Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupos.map((g, idx) => {
                              const t = tercerosMap.get(g.terceroId);
                              const seleccionadosEmpresa = g.operarios.filter((o) => operariosSeleccionados.includes(o.id)).length;
                              const todosSeleccionados = seleccionadosEmpresa === g.operarios.length && g.operarios.length > 0;
                              const algunosSeleccionados = seleccionadosEmpresa > 0 && !todosSeleccionados;
                              const valorTotal = g.operarios.reduce((s, o) => s + tarifaDe(o), 0);
                              const representante = t?.representante ?? '';
                              const toggleEmpresa = () =>
                                setOperariosSeleccionados((prev) =>
                                  todosSeleccionados
                                    ? prev.filter((id) => !g.operarios.some((o) => o.id === id))
                                    : Array.from(new Set([...prev, ...g.operarios.map((o) => o.id)])),
                                );
                              return (
                                <tr
                                  key={`empresa-${g.terceroId}`}
                                  className={`border-b border-border last:border-0 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors cursor-pointer ${
                                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${todosSeleccionados ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
                                  onClick={toggleEmpresa}
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={todosSeleccionados || (algunosSeleccionados ? 'indeterminate' : false)}
                                      onCheckedChange={toggleEmpresa}
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border">
                                        <span className="text-sm font-bold">{iniciales2(g.razon_social)}</span>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">{g.razon_social}</p>
                                        {representante && (
                                          <p className="text-xs text-muted-foreground">{representante}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm text-muted-foreground font-mono">
                                      {t?.nit ?? '—'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="text-sm font-semibold">
                                      {g.operarios.length}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="text-sm font-bold text-amber-700">
                                      {valorTotal > 0 ? formatCOP(valorTotal) : '—'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
                );
              })()}
            </div>
          )}

          {/* ── PASO 3: Validar Cosecha ──
              Conectado a GET /nominas/{id}/validar-cosecha (doc §4).
              Si no hay cosechas en el período (total_kg_colaboradores=0), el
              paso se puede saltar; el cierre no lo exige. */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Validar Cosecha</h2>
                    <p className="text-sm text-muted-foreground">
                      Compara lo registrado por cada colaborador con el reporte de la extractora
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Snapshot para poder revertir con Cancelar.
                    promediosEditadosSnapshot.current = { ...promediosEditados };
                    setMostrarAjustePromedios(true);
                  }}
                  className="gap-2 border-primary/50 text-primary hover:bg-primary/5"
                >
                  <Settings2 className="h-4 w-4" />
                  Ajustar Promedios
                </Button>
              </div>

              {cargandoBundle ? (
                <Card className="border-border">
                  <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Calculando comparación de cosecha...
                  </CardContent>
                </Card>
              ) : (() => {
                const totalColabs = bundleCosecha?.total_kg_colaboradores ?? 0;
                const totalExtr = bundleCosecha?.total_kg_extractora ?? 0;
                // §4.6 — Nueva cifra: kilos que se pagan acá pero cuyo peso se
                // concilia en la quincena siguiente porque el viaje salió fuera
                // del rango. `diff` viene ya calculado por el backend:
                //   diff = colaboradores − fuera − extractora
                const totalFuera = bundleCosecha?.total_kg_despachado_fuera_del_periodo ?? 0;
                const cosechasFuera = bundleCosecha?.cosechas_despachadas_fuera_del_periodo ?? 0;
                const diff = bundleCosecha?.diferencia_kg ?? 0;
                const detalle = bundleCosecha?.detalle_por_colaborador ?? [];

                // F1 (§4.6) — kg_extractora y diferencia_kg se pintan TAL CUAL
                // llegan del API. El prorrateo global anterior (factor sobre el
                // total) hacía que cada fila mostrara ~11 % de descuadre
                // uniforme, imposible de usar para diagnosticar cuál cosecha
                // realmente descuadra. Se elimina.
                //
                // kg_trabajado sí se simula localmente cuando el usuario está
                // editando el promedio del lote (aún no persistido). En cuanto
                // el promedio se guarda con PUT, el backend recalcula y ya no
                // hay ajuste local.
                const promediosPorLote = bundleCosecha?.promedios_por_lote ?? [];
                const nombreALoteIdMap = new Map<string, number>();
                for (const p of promediosPorLote) nombreALoteIdMap.set(p.lote_nombre, p.lote_id);

                const kgTrabDeCosecha = (c: { lote: string; kg_trabajado: number }): number => {
                  const loteId = nombreALoteIdMap.get(c.lote);
                  if (loteId === undefined) return c.kg_trabajado;
                  const p = promediosPorLote.find((x) => x.lote_id === loteId);
                  const promOrig = p?.promedio_efectivo ?? 0;
                  const editado = promediosEditados[loteId];
                  const promNuevo = editado !== undefined && editado > 0 ? editado : promOrig;
                  if (promNuevo === promOrig || promOrig <= 0) return c.kg_trabajado;
                  const gajosPorMiembro = Math.round(c.kg_trabajado / promOrig);
                  return gajosPorMiembro * promNuevo;
                };

                const ajustarKgCosecha = (c: {
                  lote: string;
                  kg_trabajado: number;
                  kg_extractora: number;
                  diferencia_kg?: number | null;
                }) => {
                  const kgTrab = kgTrabDeCosecha(c);
                  // §4.6 — kg_extractora viene ya filtrado por rango. Cero
                  // implica sin medición o despachado_fuera_del_periodo; en
                  // ese caso `diferencia_kg` del API llega null.
                  const kgExtr = c.kg_extractora ?? 0;
                  // Si el usuario editó localmente el promedio del lote,
                  // recalculamos la diferencia (simulación pre-guardar).
                  // Si no, respetamos la del API (que puede ser null cuando
                  // la fila no es conciliable en este período).
                  const loteId = nombreALoteIdMap.get(c.lote);
                  const editado = loteId !== undefined ? promediosEditados[loteId] : undefined;
                  const hayEdicionLocal = editado !== undefined && editado > 0;
                  const difKg: number | null = hayEdicionLocal
                    ? kgTrab - kgExtr
                    : (c.diferencia_kg ?? null);
                  return { kgTrab, kgExtr, difKg };
                };
                // F7 (§4.6) — Semáforo por PORCENTAJE, no por kilos absolutos.
                // Base = colaboradores − despachado_fuera (lo realmente
                // conciliable en este período). En camiones mixtos el ruido
                // típico es ±6 %, y el residuo del floor es <1 %.
                //   < 2 %  normal (ruido esperado)
                //   2-5 %  revisar
                //   > 5 %  significativa
                const baseConciliable = Math.max(0, totalColabs - totalFuera);
                const pctDiff = baseConciliable > 0 ? Math.abs(diff) / baseConciliable : 0;
                const estadoDif: 'ok' | 'critico' | 'atencion' | 'vacio' =
                  totalColabs === 0 && totalExtr === 0 ? 'vacio'
                    : baseConciliable === 0 ? 'vacio'
                      : pctDiff < 0.02 ? 'ok'
                        : pctDiff > 0.05 ? 'critico'
                          : 'atencion';
                const colorBadge = estadoDif === 'ok'
                  ? 'bg-success/10 text-success'
                  : estadoDif === 'critico'
                    ? 'bg-destructive/10 text-destructive'
                    : estadoDif === 'atencion'
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-muted text-muted-foreground';
                const labelEstado = estadoDif === 'vacio'
                  ? 'Sin cosechas en el período'
                  : estadoDif === 'ok'
                    ? `${(pctDiff * 100).toFixed(1)}% · Normal`
                    : estadoDif === 'critico'
                      ? `${(pctDiff * 100).toFixed(1)}% · Significativa`
                      : `${(pctDiff * 100).toFixed(1)}% · Revisar`;

                return (
                  <>
                    {/* §4.4 — Banner de alerta cuando hay cosechas con gajos
                        sin cargar a ningún camión. Es EL único caso donde se
                        liquida DE MENOS. Se resuelve cargando la fruta al
                        viaje y volviendo a liquidar. */}
                    {(bundleCosecha?.cosechas_con_gajos_pendientes ?? 0) > 0 && (
                      <div className="rounded-lg border-2 border-orange-500/40 bg-orange-50/60 dark:bg-orange-950/20 p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 mt-0.5 text-orange-700 shrink-0" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                              {bundleCosecha?.total_gajos_pendientes_enviar} gajos sin despachar en {bundleCosecha?.cosechas_con_gajos_pendientes} cosecha{(bundleCosecha?.cosechas_con_gajos_pendientes ?? 0) !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-orange-800/80 dark:text-orange-200/80">
                              Esa fruta se cortó en este período pero no está cargada a ningún camión, así que no entra en la liquidación. Cárgala a un viaje y vuelve a liquidar, o continúa si ya sabes que no va a despacharse.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              // Los ajustes de cosecha cambian los previews
                              // de los colaboradores involucrados, así que
                              // invalidamos el caché para forzar refresh al
                              // volver al paso 4.
                              if (idEditar) {
                                try {
                                  sessionStorage.removeItem(`wizard_previews_${idEditar}`);
                                } catch { /* noop */ }
                              }
                              navigate('/viajes/ajustes-cosecha', {
                                state: { from: 'nomina', nominaId, paso: 3 },
                              });
                            }}
                            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Revisar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Card resumen totales con datos reales */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold text-foreground">Resumen de Cosecha</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colorBadge}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {labelEstado}
                        </span>
                      </div>
                      {/* §4.6 F2 — Cabecera de 4 líneas. Cuando no hay fruta
                          despachada fuera del período (`totalFuera === 0`),
                          la línea intermedia se colapsa a 3 columnas para no
                          confundir con un dato inexistente. */}
                      <div className={`grid divide-x divide-border ${totalFuera > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <div className="px-6 py-5 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colaboradores</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-bold text-foreground leading-none">
                              {totalColabs > 0 ? totalColabs.toLocaleString('es-CO') : '—'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <p className="text-xs text-muted-foreground">{detalle.length} colaborador{detalle.length !== 1 ? 'es' : ''} con cosecha</p>
                          </div>
                        </div>
                        {totalFuera > 0 && (
                          <div
                            className="px-6 py-5 space-y-2 bg-muted/10"
                            title="Esta fruta se cortó en este período y se paga acá. Su peso viajó en un camión de otra quincena, así que se concilia en la siguiente. No es un descuadre real."
                          >
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Despachado fuera</p>
                            <div className="flex items-end gap-1.5">
                              <p className="text-3xl font-bold text-muted-foreground leading-none">
                                −{totalFuera.toLocaleString('es-CO')}
                              </p>
                              <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {cosechasFuera} cosecha{cosechasFuera !== 1 ? 's' : ''} · se concilia en la siguiente
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="px-6 py-5 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extractora</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-bold text-foreground leading-none">
                              {totalExtr > 0 ? `−${totalExtr.toLocaleString('es-CO')}` : '—'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <p className="text-xs text-muted-foreground">Viajes FINALIZADOS del período</p>
                          </div>
                        </div>
                        <div className={`px-6 py-5 space-y-2 ${estadoDif === 'ok' ? 'bg-success/5' : estadoDif === 'critico' ? 'bg-destructive/5' : estadoDif === 'atencion' ? 'bg-amber-500/5' : 'bg-muted/10'}`}>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diferencia real</p>
                          <div className="flex items-end gap-1.5">
                            <p className={`text-3xl font-bold leading-none ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio' ? '—' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-CO')}`}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${estadoDif === 'ok' ? 'bg-success' : estadoDif === 'critico' ? 'bg-destructive' : estadoDif === 'atencion' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                            <p className={`text-xs font-medium ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio'
                                ? 'No hay datos para comparar'
                                : `${(pctDiff * 100).toFixed(1)}% · ${estadoDif === 'ok' ? 'Normal' : estadoDif === 'critico' ? 'Significativa' : 'Revisar'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalle por colaborador */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Detalle por Colaborador</h3>
                      {detalle.length === 0 ? (
                        <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
                          <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              No hay cosechas registradas en este período. Puedes continuar sin validar.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        detalle.map((d) => {
                          const expandido = empleadosExpandidos.has(d.colaborador_id);
                          const partes = d.nombre_completo.split(' ');
                          const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                          const esTercero = d.tipo === 'OPERARIO';
                          return (
                            <Card key={`${d.tipo}-${d.colaborador_id}`} className="border-border overflow-hidden">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => toggleEmpleadoExpandido(d.colaborador_id)}
                              >
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${esTercero ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                                      <span className="text-sm font-bold">{iniciales}</span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">{d.nombre_completo}</p>
                                        {esTercero && (
                                          <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-300">
                                            Tercero
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{d.cargo}</p>
                                    </div>
                                  </div>
                                  {(() => {
                                    // KPIs del header — igual que la imagen 2:
                                    // Registrado / Transportadora / Diferencia
                                    // kg_trabajado y kg_extractora se recalculan
                                    // con el promedio ajustado y la proporción de gajos.
                                    const cosechas = d.cosechas ?? [];
                                    const ajustadas = cosechas.map((c) => ajustarKgCosecha(c));
                                    const totalTrab = ajustadas.reduce((s, r) => s + r.kgTrab, 0);
                                    const totalExtr = ajustadas.reduce((s, r) => s + r.kgExtr, 0);
                                    // §4.6 — Diferencia = suma de diferencias conciliables (no null).
                                    const diff = ajustadas.reduce((s, r) => s + (r.difKg ?? 0), 0);
                                    const colorDiff = diff === 0
                                      ? 'text-success'
                                      : diff > 0
                                        ? 'text-amber-600'
                                        : 'text-primary';
                                    return (
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="text-xs text-muted-foreground">Registrado</p>
                                          <p className="text-sm font-bold">
                                            {(totalTrab || d.kg).toLocaleString('es-CO')} kg
                                          </p>
                                        </div>
                                        {cosechas.length > 0 && (
                                          <>
                                            <div className="text-right hidden sm:block">
                                              <p className="text-xs text-muted-foreground">Transportadora</p>
                                              <p className="text-sm font-bold">
                                                {totalExtr.toLocaleString('es-CO')} kg
                                              </p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                              <p className="text-xs text-muted-foreground">Diferencia</p>
                                              <p className={`text-sm font-bold ${colorDiff}`}>
                                                {diff > 0 ? '+' : ''}{diff.toLocaleString('es-CO')} kg
                                              </p>
                                            </div>
                                          </>
                                        )}
                                        {expandido ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </button>
                              {expandido && (
                                <div className="border-t border-border p-4 space-y-3 bg-muted/10">
                                  {d.cosechas && d.cosechas.length > 0 ? (
                                    <div className="rounded-lg border overflow-x-auto bg-background">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-border bg-muted/30 text-[10px] uppercase text-muted-foreground">
                                            <th className="text-left p-2">Fecha</th>
                                            <th className="text-left p-2">Lote</th>
                                            <th className="text-left p-2">Sublote</th>
                                            <th className="text-left p-2">Remisión</th>
                                            <th className="text-right p-2">Gajos Totales</th>
                                            <th className="text-right p-2">Gajos Verificados</th>
                                            <th className="text-right p-2">Diferencia Gajos</th>
                                            {/* §4.6 F5 — Promedio efectivo (lote) vs aplicado
                                                (viaje). Solo se pinta si al menos una fila trae
                                                el dato — evita ruido cuando el backend responde
                                                en versión antigua. */}
                                            {d.cosechas.some((c) => c.promedio_efectivo != null || c.promedio_aplicado != null) && (
                                              <>
                                                <th className="text-right p-2" title="Promedio kg/gajo del lote para toda la quincena">
                                                  Prom. lote
                                                </th>
                                                <th className="text-right p-2" title="Promedio kg/gajo que aplicó el viaje al pesar (BÁSCULA si medido, BASELINE si estimado)">
                                                  Prom. viaje
                                                </th>
                                              </>
                                            )}
                                            <th className="text-right p-2">Kg Trabajados</th>
                                            <th className="text-right p-2">Kg Extractora</th>
                                            <th className="text-right p-2">Diferencia Kg</th>
                                            {/* §4.4 — Columna de gajos sin despachar. Solo se
                                                pinta cuando alguna fila del bloque tiene alerta,
                                                para no meter ruido visual innecesario. */}
                                            {d.cosechas.some((c) => (c.gajos_pendientes_enviar ?? 0) > 0) && (
                                              <th className="text-right p-2">Sin despachar</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {[...d.cosechas]
                                            .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
                                            .map((c, idx) => {
                                            const { kgTrab, kgExtr, difKg } = ajustarKgCosecha(c);
                                            const gajosPend = c.gajos_pendientes_enviar ?? 0;
                                            const hayCol = d.cosechas.some((x) => (x.gajos_pendientes_enviar ?? 0) > 0);
                                            const tooltipAjuste = c.ajuste_gajos
                                              ? `${c.ajuste_gajos.accion} · ${c.ajuste_gajos.ajustado_por ?? 'sistema'}${c.ajuste_gajos.motivo ? ' — ' + c.ajuste_gajos.motivo : ''}`
                                              : undefined;
                                            return (
                                              <tr
                                                key={idx}
                                                className={`border-b border-border/40 last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'} ${c.alerta_despacho === 'ALTA' ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''} ${c.despachado_fuera_del_periodo ? 'opacity-70' : ''}`}
                                                title={c.despachado_fuera_del_periodo
                                                  ? `Esta cosecha se pagó en esta nómina; su peso se concilia en la siguiente porque el viaje salió el ${c.fecha_viaje ?? 'día siguiente'}.`
                                                  : undefined}
                                              >
                                                <td className="p-2 whitespace-nowrap">{c.fecha}</td>
                                                <td className="p-2">{c.lote}</td>
                                                <td className="p-2 text-muted-foreground">{c.sublote ?? '—'}</td>
                                                <td className="p-2 text-muted-foreground">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {/* Parche visual: normalizamos a 3 dígitos
                                                        exactos cuando la remisión es puramente
                                                        numérica. Se remueven ceros a la izquierda
                                                        y se re-paddea (`0074` → `074`, `69` → `069`).
                                                        Los prefijos con letras (GE-001, TX-42) se
                                                        dejan tal cual. Remisiones con más de 3
                                                        dígitos reales (`1234`) también se dejan
                                                        para no perder información. */}
                                                    <span className="font-mono">
                                                      {c.remision == null
                                                        ? '—'
                                                        : (() => {
                                                            if (!/^\d+$/.test(c.remision)) return c.remision;
                                                            const sinCeros = c.remision.replace(/^0+/, '') || '0';
                                                            return sinCeros.length > 3
                                                              ? sinCeros
                                                              : sinCeros.padStart(3, '0');
                                                          })()}
                                                    </span>
                                                    {/* §4.6 F3 — chip cuando la cosecha se despachó
                                                        en otra quincena. Su peso no se concilia acá. */}
                                                    {c.despachado_fuera_del_periodo && c.fecha_viaje && (
                                                      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide bg-muted/60 text-muted-foreground border border-border rounded-md px-1.5 py-0.5">
                                                        despachado {c.fecha_viaje.slice(8, 10)}/{c.fecha_viaje.slice(5, 7)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-2 text-right">{c.gajos_trabajados}</td>
                                                <td className="p-2 text-right">{c.gajos_verificados}</td>
                                                <td className={`p-2 text-right font-semibold ${c.diferencia_gajos === 0 ? 'text-muted-foreground' : c.diferencia_gajos > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                  {c.diferencia_gajos > 0 ? '+' : ''}{c.diferencia_gajos}
                                                </td>
                                                {/* §4.6 F5 — Promedios efectivo/aplicado con
                                                    icono según origen. Solo se renderiza cuando
                                                    la fila los trae; garantiza consistencia con
                                                    la cabecera de la tabla. */}
                                                {d.cosechas.some((x) => x.promedio_efectivo != null || x.promedio_aplicado != null) && (
                                                  <>
                                                    <td className="p-2 text-right text-muted-foreground">
                                                      {c.promedio_efectivo != null
                                                        ? Number(c.promedio_efectivo).toFixed(2)
                                                        : '—'}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                      {c.promedio_aplicado != null ? (() => {
                                                        // §4.6 — Origen del kg_extractora:
                                                        // BASCULA = medición real, MIXTO = mixto,
                                                        // BASELINE = estimación (±6 % típico),
                                                        // PESO_CONFIRMADO = pesaje manual.
                                                        const o = c.origen_kg_extractora;
                                                        const esBascula = o === 'BASCULA' || o === 'PESO_CONFIRMADO';
                                                        const esBaseline = o === 'BASELINE' || o === 'MIXTO';
                                                        const tooltip =
                                                          o === 'BASCULA' ? 'Medición real (viaje homogéneo)'
                                                            : o === 'PESO_CONFIRMADO' ? 'Pesaje registrado a mano'
                                                              : o === 'MIXTO' ? 'Cosecha partida entre viaje homogéneo y mixto'
                                                                : o === 'BASELINE' ? 'Estimación (camión mixto, sin medición real). Puede desviar ±6 %.'
                                                                  : o === 'FALLBACK_SNAPSHOT' ? 'Dato legacy sin promedio aplicado'
                                                                    : (o ?? '');
                                                        return (
                                                          <span
                                                            className={`inline-flex items-center gap-1 ${esBaseline ? 'text-amber-700' : ''}`}
                                                            title={tooltip}
                                                          >
                                                            {esBascula && <span aria-hidden="true">⚖</span>}
                                                            {esBaseline && <span aria-hidden="true">≈</span>}
                                                            {Number(c.promedio_aplicado).toFixed(2)}
                                                          </span>
                                                        );
                                                      })() : <span className="text-muted-foreground">—</span>}
                                                    </td>
                                                  </>
                                                )}
                                                <td className="p-2 text-right">{Math.round(kgTrab).toLocaleString('es-CO')}</td>
                                                <td className="p-2 text-right">
                                                  {kgExtr > 0
                                                    ? Math.round(kgExtr).toLocaleString('es-CO')
                                                    : <span className="text-muted-foreground">—</span>}
                                                </td>
                                                <td className={`p-2 text-right font-semibold ${
                                                  difKg === null
                                                    ? 'text-muted-foreground'
                                                    : Math.abs(difKg) < 1
                                                      ? 'text-muted-foreground'
                                                      : difKg > 0
                                                        ? 'text-amber-600'
                                                        : 'text-primary'
                                                }`}>
                                                  {/* §4.6 — `null` = no conciliable en este período (típico:
                                                      despachado_fuera_del_periodo). Nunca pintar `0`. */}
                                                  {difKg === null
                                                    ? '—'
                                                    : `${difKg > 0 ? '+' : ''}${Math.round(difKg).toLocaleString('es-CO')}`}
                                                </td>
                                                {hayCol && (
                                                  <td className="p-2 text-right">
                                                    {gajosPend > 0 ? (
                                                      <span
                                                        className={`inline-flex items-center gap-1 font-semibold ${c.alerta_despacho === 'ALTA' ? 'text-orange-700' : 'text-muted-foreground'}`}
                                                        title={tooltipAjuste}
                                                      >
                                                        {c.alerta_despacho === 'ALTA' && <AlertCircle className="h-3 w-3" />}
                                                        {gajosPend}
                                                      </span>
                                                    ) : (
                                                      <span className="text-muted-foreground">—</span>
                                                    )}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                          {/* Fila TOTALES */}
                                          {(() => {
                                            const totGT = d.cosechas.reduce((s, c) => s + c.gajos_trabajados, 0);
                                            const totGV = d.cosechas.reduce((s, c) => s + c.gajos_verificados, 0);
                                            const totDifG = d.cosechas.reduce((s, c) => s + c.diferencia_gajos, 0);
                                            // §4.6 — Sumar solo lo conciliable en este período. Las
                                            // filas con difKg = null (despachado_fuera_del_periodo)
                                            // no entran al total de descuadre — su peso se
                                            // reconcilia en la nómina siguiente.
                                            const filasAjustadas = d.cosechas.map((c) => ajustarKgCosecha(c));
                                            const totKgT = filasAjustadas.reduce((s, r) => s + r.kgTrab, 0);
                                            const totKgE = filasAjustadas.reduce((s, r) => s + r.kgExtr, 0);
                                            const totDifKg = filasAjustadas.reduce(
                                              (s, r) => s + (r.difKg ?? 0),
                                              0,
                                            );
                                            const mostrarPromedios = d.cosechas.some(
                                              (c) => c.promedio_efectivo != null || c.promedio_aplicado != null,
                                            );
                                            return (
                                              <tr className="border-t-2 border-primary/40 bg-primary/5 font-semibold">
                                                <td className="p-2 font-bold uppercase text-primary" colSpan={4}>Totales</td>
                                                <td className="p-2 text-right font-bold">{totGT.toLocaleString('es-CO')}</td>
                                                <td className="p-2 text-right font-bold">{totGV.toLocaleString('es-CO')}</td>
                                                <td className={`p-2 text-right font-bold ${totDifG === 0 ? 'text-muted-foreground' : totDifG > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                  {totDifG > 0 ? '+' : ''}{totDifG}
                                                </td>
                                                {mostrarPromedios && (
                                                  <>
                                                    <td className="p-2" />
                                                    <td className="p-2" />
                                                  </>
                                                )}
                                                <td className="p-2 text-right font-bold">{Math.round(totKgT).toLocaleString('es-CO')} kg</td>
                                                <td className="p-2 text-right font-bold">{Math.round(totKgE).toLocaleString('es-CO')} kg</td>
                                                <td className={`p-2 text-right font-bold ${Math.abs(totDifKg) < 1 ? 'text-success' : totDifKg > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                  {totDifKg > 0 ? '+' : ''}{Math.round(totDifKg).toLocaleString('es-CO')} kg
                                                </td>
                                              </tr>
                                            );
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-muted text-muted-foreground border border-border">
                                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <span>
                                        Este colaborador no tiene cosechas registradas en el período.
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })
                      )}
                    </div>

                    {bundleCosecha?.validado_at && (
                      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                        <Check className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Validación confirmada por <strong>{bundleCosecha.validado_por}</strong> el{' '}
                          {new Date(bundleCosecha.validado_at).toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {pasoActual === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Confirmación</h2>
                  <p className="text-sm text-muted-foreground">
                    Revisa la información antes de crear la nómina
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* §2.6 — Aviso de "quincena partida". Ya existen OTRAS
                    nóminas en el mismo (mes, año, quincena). Excluye la
                    nómina que se está creando en este wizard (que ya vive en
                    BORRADOR desde el paso 1). */}
                {nominasMismoPeriodo.length > 0 && (
                  <Card className="border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5 text-amber-700 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            Quincena partida — existe{nominasMismoPeriodo.length !== 1 ? 'n' : ''}{' '}
                            {nominasMismoPeriodo.length} nómina{nominasMismoPeriodo.length !== 1 ? 's' : ''} más para este período
                          </p>
                          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mb-2">
                            Esta nómina no es la única del mes/quincena. Cada nómina cubre a un grupo distinto de colaboradores; ningún día se pagará dos veces (Postgres lo bloquea).
                          </p>
                          <ul className="text-xs text-amber-900/90 dark:text-amber-100/90 space-y-0.5">
                            {nominasMismoPeriodo.map((n) => (
                              <li key={n.id}>
                                <strong>{n.etiqueta ?? 'Sin etiqueta'}</strong>{' '}
                                · {n.fecha_inicio} al {n.fecha_fin}
                                {' · '}{n.estado}
                                {n.empleados_count != null && (
                                  <> · {n.empleados_count} colaborador{n.empleados_count !== 1 ? 'es' : ''}</>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-border">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Información del Período
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Año</p>
                        <p className="font-medium">{ano}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mes</p>
                        <p className="font-medium">{mesNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Periodicidad</p>
                        <p className="font-medium">{quincenaNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Inicio</p>
                        <p className="font-medium">
                          {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Fin</p>
                        <p className="font-medium">
                          {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal incluido — se separa en dos tarjetas para no mezclar
                    colaboradores internos con operarios de terceros. Para los
                    terceros hacemos lookup en `operarios[]` (cargado en el
                    paso 2) buscando `salario_base` o `tarifa_dia_estimada`
                    como fallback si el backend no persistió `salario_base` en
                    el registro `nomina_empleado`. */}
                {(() => {
                  const soloEmpleados = sortByFirstName(colaboradoresAgregados.filter((c) => c.tipo === 'EMP'));
                  const soloTerceros = sortByFirstName(colaboradoresAgregados.filter((c) => c.tipo === 'OP'));

                  const renderFilaEmp = (c: typeof colaboradoresAgregados[number]) => {
                    const partes = c.nombre.split(' ');
                    const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                    // Total que efectivamente ganaria en esta quincena
                    // segun el preview del backend (mismo calculo que la
                    // liquidacion): salario + jornales + cosecha.
                    const preview = previewsPorEmpleado.get(c.nominaEmpleadoId);
                    return (
                      <div
                        key={`emp-${c.nominaEmpleadoId}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                          <span className="text-sm font-medium">{iniciales}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{c.nombre}</p>
                            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                              Colaborador
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.cargo ?? 'Sin cargo'}
                          </p>
                        </div>
                        {/* Total que gana en esta quincena — mismo calculo
                            que la liquidacion (salario + jornales + cosecha). */}
                        {preview ? (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCOP(preview.total_devengado)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Total quincena</p>
                          </div>
                        ) : cargandoPreviews ? (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Calculando…</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  };

                  const renderFilaOp = (c: typeof colaboradoresAgregados[number]) => {
                    const partes = c.nombre.split(' ');
                    const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                    // Total que gana en la quincena via preview del backend.
                    const preview = previewsPorEmpleado.get(c.nominaEmpleadoId);
                    return (
                      <div
                        key={`op-${c.nominaEmpleadoId}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5"
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500/10 text-amber-700">
                          <span className="text-sm font-medium">{iniciales}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{c.nombre}</p>
                            <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">
                              Tercero
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.cargo ?? 'Sin cargo'}
                            {c.tercero ? ` · ${c.tercero}` : ''}
                          </p>
                        </div>
                        {preview ? (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCOP(preview.total_devengado)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Total quincena</p>
                          </div>
                        ) : cargandoPreviews ? (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Calculando…</p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Pago por labor</p>
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      <Card className="border-border">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Colaboradores Incluidos ({soloEmpleados.length})
                          </h3>
                          {soloEmpleados.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay colaboradores internos en esta nómina.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {soloEmpleados.map(renderFilaEmp)}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-border">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-700" />
                            Terceros Incluidos ({soloTerceros.length})
                          </h3>
                          {soloTerceros.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay operarios de terceros en esta nómina.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {soloTerceros.map(renderFilaOp)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}

                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      {esEdicion
                        ? 'Al confirmar, se guardarán los cambios y podrás continuar con la liquidación desde el detalle de la nómina.'
                        : 'Al crear esta nómina, se generará un registro en estado BORRADOR para cada colaborador seleccionado. Podrás calcular los valores y cerrar la nómina desde el detalle del período.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleAtras}
          disabled={pasoActual === 1 || procesando}
          className="gap-2"
          title="Volver al paso anterior"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>

        {pasoActual < 4 ? (
          <Button
            onClick={handleSiguiente}
            disabled={!puedeAvanzar() || procesando}
            className="gap-2"
          >
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinalizar} className="gap-2">
            <Check className="h-4 w-4" />
            Ir a la nómina
          </Button>
        )}
      </div>

      {/* Modal — Ajustar Promedios efectivos por lote (doc §4.2).
          Los promedios vienen del bundle de validar-cosecha (`promedios_por_lote`).
          Solo aparecen los lotes con cosechas en el período. */}
      <Dialog
        open={mostrarAjustePromedios}
        onOpenChange={(open) => {
          if (!open) {
            // Cerrar por overlay/ESC/X → revertir cambios no guardados.
            setPromediosEditados(promediosEditadosSnapshot.current);
          }
          setMostrarAjustePromedios(open);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          style={{ width: 'min(780px, 95vw)', maxWidth: 'min(780px, 95vw)' }}
        >
          <DialogHeader>
            <div className="flex items-start gap-2">
              <Settings2 className="h-6 w-6 text-primary mt-0.5" />
              <div>
                <DialogTitle>Promedios por Lote</DialogTitle>
                <DialogDescription className="mt-1">
                  Kg promedio por gajo para cada lote. El "Auto" lo calcula el sistema
                  desde los viajes del período; el "Manual" lo sobrescribe solo para esta nómina.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Card resumen de cosecha con RECÁLCULO EN VIVO al editar promedios.
              Fórmula del backend (doc §4.1):
                kg_trabajado = floor(gajos_efectivos / N) × promedio_efectivo
              Extraemos `floor(gajos_efectivos / N)` de cada cosecha usando
              `Math.round(kg_trabajado_original / promedio_original)` — ese
              redondeo recupera el ENTERO exacto que produjo el backend,
              incluso si el kg_trabajado viene con decimales imprecisos.
              Luego multiplicamos por el promedio editado → resultado idéntico
              al que devolverá `GET /validar-cosecha` tras el PUT.
              Extractora es dato fijo del backend — no depende de promedios. */}
          {bundleCosecha && (() => {
            const totalExtr = bundleCosecha.total_kg_extractora ?? 0;
            // §4.6 — La diferencia real descuenta la fruta que se despachó
            // fuera del período (peso conciliable en la quincena siguiente).
            const totalFueraModal = bundleCosecha.total_kg_despachado_fuera_del_periodo ?? 0;

            // Mapa lote_id → promedio efectivo actual (editado o del bundle).
            const promedioEfectivoActual = new Map<number, number>();
            const nombreALoteId = new Map<string, number>();
            for (const p of bundleCosecha.promedios_por_lote) {
              const editado = promediosEditados[p.lote_id];
              promedioEfectivoActual.set(
                p.lote_id,
                editado !== undefined && editado > 0 ? editado : p.promedio_efectivo,
              );
              nombreALoteId.set(p.lote_nombre, p.lote_id);
            }

            // Recalcular kg_trabajado por cada cosecha con el nuevo promedio.
            // El cálculo replica floor(gajos_efectivos / N) × promedio_nuevo
            // de forma EXACTA — igual a como lo hará el backend al guardar.
            let totalColabs = 0;
            for (const d of bundleCosecha.detalle_por_colaborador) {
              for (const c of d.cosechas ?? []) {
                const loteId = nombreALoteId.get(c.lote);
                if (loteId === undefined) {
                  // Cosecha sin lote resuelto — no la podemos recalcular.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                const promOrig = bundleCosecha.promedios_por_lote
                  .find((p) => p.lote_id === loteId)?.promedio_efectivo ?? 0;
                const promNuevo = promedioEfectivoActual.get(loteId) ?? promOrig;
                if (promNuevo === promOrig) {
                  // Sin edición para este lote → usar el kg original tal cual.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                if (promOrig <= 0) {
                  // Sin promedio original → no podemos derivar el entero base.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                // Recuperar el entero `floor(gajos_efectivos / N)` del backend.
                // Math.round elimina el ruido de decimales en la división.
                const gajosPorMiembro = Math.round(c.kg_trabajado / promOrig);
                totalColabs += gajosPorMiembro * promNuevo;
              }
            }

            // §4.6 — Misma fórmula que en la card grande de afuera:
            //   diff = colaboradores − despachado_fuera − extractora
            const diff = totalColabs - totalFueraModal - totalExtr;
            const baseConciliable = Math.max(0, totalColabs - totalFueraModal);
            const pctModal = baseConciliable > 0 ? Math.abs(diff) / baseConciliable : 0;
            const estado: 'ok' | 'critico' | 'atencion' =
              pctModal < 0.02 ? 'ok' : pctModal > 0.05 ? 'critico' : 'atencion';
            const colorTexto = estado === 'ok' ? 'text-success' : estado === 'critico' ? 'text-destructive' : 'text-amber-700';

            return (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center px-5 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold">Resumen de Cosecha</p>
                </div>
                {/* §4.6 — Cuando hay fruta despachada fuera del período, la
                    tarjeta se abre a 4 celdas para reflejar la misma fórmula
                    que la card grande de afuera. Si no hay, se colapsa a 3. */}
                <div className={`grid divide-x divide-border ${totalFueraModal > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Colaboradores
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(totalColabs).toLocaleString('es-CO')} <span className="text-sm text-muted-foreground font-normal">kg</span>
                    </p>
                  </div>
                  {totalFueraModal > 0 && (
                    <div
                      className="px-6 py-4 bg-muted/10"
                      title="Fruta cortada en este período pero despachada en otra quincena. Se paga acá; su peso se concilia allá."
                    >
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Despachado fuera
                      </p>
                      <p className="text-2xl font-bold text-muted-foreground">
                        −{Math.round(totalFueraModal).toLocaleString('es-CO')} <span className="text-sm font-normal">kg</span>
                      </p>
                    </div>
                  )}
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Extractora
                    </p>
                    <p className="text-2xl font-bold">
                      {totalExtr > 0 ? `−${totalExtr.toLocaleString('es-CO')}` : '—'} <span className="text-sm text-muted-foreground font-normal">kg</span>
                    </p>
                  </div>
                  <div className={`px-6 py-4 ${estado === 'ok' ? 'bg-success/5' : estado === 'critico' ? 'bg-destructive/5' : 'bg-amber-500/5'}`}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Diferencia real
                    </p>
                    <p className={`text-2xl font-bold ${colorTexto}`}>
                      {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString('es-CO')}
                      <span className="text-sm text-muted-foreground font-normal ml-1">kg</span>
                    </p>
                    <p className={`text-xs mt-1 ${colorTexto}`}>
                      {(pctModal * 100).toFixed(1)}% · {estado === 'ok' ? 'Normal' : estado === 'critico' ? 'Significativa' : 'Revisar'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabla de promedios por lote (solo lotes con cosechas en el período).
              4 columnas: Fecha Actualización | Lote | Auto | Ajuste Manual. */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="text-left p-3 pl-5 font-semibold">
                    Fecha <span className="font-normal text-[10px] block leading-tight">Actualización</span>
                  </th>
                  <th className="text-left p-3 font-semibold">Lote</th>
                  <th className="text-right p-3 font-semibold">
                    Auto <span className="font-normal text-[10px] block leading-tight">(viajes período)</span>
                  </th>
                  <th className="text-right p-3 pr-5 font-semibold">
                    Ajuste Manual <span className="font-normal text-[10px] block leading-tight">(esta nómina)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargandoBundle ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Cargando promedios...
                    </td>
                  </tr>
                ) : !bundleCosecha || bundleCosecha.promedios_por_lote.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      No hay lotes con cosechas en este período.
                    </td>
                  </tr>
                ) : (
                  bundleCosecha.promedios_por_lote.map((p) => {
                    const valorActual = promedioValorActual(p.lote_id);
                    const fechaAct = fechasPromedioLote.get(p.lote_id);
                    const fechaFmt = fechaAct
                      ? new Date(fechaAct).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';
                    return (
                      <tr
                        key={p.lote_id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 pl-5 text-xs text-muted-foreground">
                          {fechaFmt}
                        </td>
                        <td className="p-3 font-medium text-sm">{p.lote_nombre}</td>
                        <td className="p-3 text-right text-sm text-muted-foreground">
                          {p.promedio_auto.toFixed(2)}
                        </td>
                        <td className="p-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number" step="0.001"
                              step="0.1"
                              min="0"
                              className="w-24 h-8 text-right text-sm"
                              value={valorActual || ''}
                              placeholder={p.promedio_manual != null ? p.promedio_manual.toFixed(2) : '—'}
                              onChange={(e) =>
                                setPromediosEditados((prev) => ({
                                  ...prev,
                                  [p.lote_id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Revertir cambios no guardados al snapshot inicial.
                setPromediosEditados(promediosEditadosSnapshot.current);
                setMostrarAjustePromedios(false);
              }}
              disabled={ajustandoPromedio}
            >
              Cancelar
            </Button>
            <Button
              onClick={pedirConfirmacionGuardarPromedios}
              disabled={ajustandoPromedio || !hayCambiosPromedios}
              className="gap-2"
            >
              {ajustandoPromedio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* §2.6 — Diálogo cuando POST /nominas responde 409 con
          `nominas_existentes[]`. Ofrece crear una nómina adicional para el
          mismo período (reintenta con `permitir_multiple: true`). */}
      <Dialog open={dialogoDuplicadaOpen} onOpenChange={setDialogoDuplicadaOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ya existe una nómina para este período</DialogTitle>
            <DialogDescription>
              Puedes crear una nómina adicional para el mismo período (p.ej. para separar administrativos de personal de campo, o para un corte de días diferente).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {nominasExistentes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-semibold">
                  {n.etiqueta ?? 'Sin etiqueta'} — {n.fecha_inicio} al {n.fecha_fin}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estado: {n.estado} · {n.empleados_count ?? 0} colaboradores
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoDuplicadaOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setDialogoDuplicadaOpen(false);
                const ok = await crearNominaSiHaceFalta(true);
                if (ok) setPasoActual(2);
              }}
              disabled={procesando}
              className="gap-2"
            >
              {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear nómina adicional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* §4.6 F6 — Confirmación al guardar promedios manuales.
          El ajuste cambia lo que cobra la gente (peldaño 1 de la escalera
          que paga cosecha), no solo la conciliación de la pantalla. */}
      <AlertDialog
        open={confirmarAjustePromedios !== null}
        onOpenChange={(open) => !open && setConfirmarAjustePromedios(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajuste de promedios</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Estos cambios afectan lo que cobra cada colaborador por cosecha, no solo la conciliación de esta pantalla. Revísalos antes de guardar.
                </p>
                <ul className="space-y-2">
                  {(confirmarAjustePromedios ?? []).map((c) => {
                    const deltaKg = c.gajos_totales * c.delta;
                    const sube = c.delta > 0;
                    return (
                      <li
                        key={c.lote_id}
                        className={`rounded-lg border p-3 ${sube ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20' : 'border-destructive/30 bg-destructive/5'}`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {c.lote_nombre}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Number(c.promedio_original).toFixed(2)} → {Number(c.promedio_nuevo).toFixed(2)} kg/gajo
                          {' '}({sube ? '+' : ''}{c.delta.toFixed(2)})
                        </p>
                        <p className="text-xs text-foreground mt-1.5">
                          Impacta a <strong>{c.colaboradores_impactados} colaborador{c.colaboradores_impactados !== 1 ? 'es' : ''}</strong>
                          {' '}({c.gajos_totales.toLocaleString('es-CO')} gajos):
                          {' '}
                          <strong className={sube ? 'text-amber-700' : 'text-destructive'}>
                            {sube ? '+' : ''}{Math.round(deltaKg).toLocaleString('es-CO')} kg
                          </strong>
                          {' '}en el pago total de cosecha del lote.
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground">
                  El cambio se aplica desde ya y afecta todos los cálculos de esta nómina hasta que se cierre.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ajustandoPromedio}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={ejecutarGuardarPromedios}
              disabled={ajustandoPromedio}
            >
              {ajustandoPromedio && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar y aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar al salir del wizard con borrador persistido.
          Sin este diálogo, entrar al wizard → revisar cosecha → salirse
          dejaba una nómina huérfana en la lista de Pagos. */}
      <AlertDialog
        open={confirmarSalirWizard}
        onOpenChange={(open) => !open && !descartandoBorrador && setConfirmarSalirWizard(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar la nómina en borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              La nómina ya se guardó en el backend como borrador desde el paso 1. Si sales sin terminar puedes descartarla, o dejarla guardada para continuarla después desde el listado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={descartandoBorrador}>
              Seguir editando
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                // Dejar el borrador tal cual y salir. Limpiamos la marca
                // de "flujo de creación" para que la próxima vez que entre
                // el título diga "Editar" y no "Nuevo".
                try {
                  sessionStorage.removeItem('wizard_flujo_creacion');
                  localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD);
                } catch { /* noop */ }
                setConfirmarSalirWizard(false);
                navigate('/nomina');
              }}
              disabled={descartandoBorrador}
            >
              Dejar borrador
            </Button>
            <AlertDialogAction
              onClick={async () => {
                if (!nominaId) {
                  setConfirmarSalirWizard(false);
                  navigate('/nomina');
                  return;
                }
                setDescartandoBorrador(true);
                try {
                  await nominaApi.eliminar(nominaId);
                  toast.success('Borrador descartado');
                  try {
                    sessionStorage.removeItem('wizard_flujo_creacion');
                    localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD);
                  } catch { /* noop */ }
                  setConfirmarSalirWizard(false);
                  navigate('/nomina');
                } catch (err) {
                  const e = err as ApiError;
                  toast.error(e.message ?? 'No se pudo descartar el borrador');
                } finally {
                  setDescartandoBorrador(false);
                }
              }}
              disabled={descartandoBorrador}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {descartandoBorrador && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Descartar borrador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
