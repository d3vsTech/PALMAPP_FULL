import { useEffect, useRef, useState } from 'react';
import { comoBoton } from '../../hooks/comoBoton';
import { useNavigate, useParams, useLocation } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { cop } from '../../lib/formato';
import { colaboradoresApi } from '../../../api/colaboradores';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import WizardStepper from '../../components/nomina/WizardStepper';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/card';
import StatStrip from '../../components/common/StatStrip';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
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
  Users,
  Factory,
  UserPlus,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Info,
  Scale,
  Save,
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
import {
  describirOrigenPromedio,
  describirReglaFueraDelPeriodo,
  esPromedioEstimado,
} from '../../components/nomina/origenPromedioLote';
import {
  cargarFuentesPromedio,
  etiquetaFuentePromedio,
  type FuentePromedioLote,
} from '../../components/nomina/fuentePromedioLote';
import { configuracionApi } from '../../../api/configuracion';
import { operariosApi, tercerosApi, type OperarioSelectItem, type Tercero } from '../../../api/terceros';
import type { ApiError } from '../../../api/client';
import { Eyebrow, thead, th, td } from '../../components/nomina/piezas';
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
  { numero: 1, titulo: 'Período' },
  { numero: 2, titulo: 'Personal' },
  { numero: 3, titulo: 'Validar cosecha' },
  { numero: 4, titulo: 'Confirmación' },
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
  /** `ajustado_at` devuelto por el PUT de cada lote — manda sobre el
   *  `updated_at` del listado en la columna "Fecha Actualización". */
  const [fechasAjusteManual, setFechasAjusteManual] = useState<Map<number, string>>(new Map());
  /** lote_id → el viaje (o el baseline) del que salió el promedio automático. */
  const [fuentesPromedio, setFuentesPromedio] = useState<Map<number, FuentePromedioLote>>(new Map());

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
  useEffect(() => {
    if (!mostrarAjustePromedios) return;
    setPromediosEditados({});
  }, [mostrarAjustePromedios]);

  // De qué viaje salió el promedio de cada lote — pobla la primera columna
  // del modal. La fecha que importa es la del camión que midió, no la del
  // día en que alguien tocó el registro: el liquidador necesita saber con
  // qué pesaje se está pagando. Un lote que se paga con una estimación
  // (última medición anterior o baseline) tiene su fila fuera del rango,
  // así que se busca aparte. No bloquea la UI.
  useEffect(() => {
    if (!mostrarAjustePromedios) return;
    if (!fechaInicio || !fechaFin || !bundleCosecha) return;
    let vigente = true;
    cargarFuentesPromedio(bundleCosecha.promedios_por_lote, fechaInicio, fechaFin)
      .then((m) => {
        if (vigente) setFuentesPromedio(m);
      })
      .catch(() => {
        // Sin fuentes la columna muestra "—"; el ajuste de promedios sigue
        // funcionando, que es para lo que se abre el modal.
        if (vigente) setFuentesPromedio(new Map());
      });
    return () => {
      vigente = false;
    };
  }, [mostrarAjustePromedios, fechaInicio, fechaFin, bundleCosecha]);

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
      const resultados = await Promise.all(
        cambios.map(({ loteId, valor }) =>
          nominaApi.ajustarPromedioLote(nominaId, loteId, valor),
        ),
      );
      // El `ajustado_at` del PUT es la fecha real del ajuste manual — manda
      // sobre el `updated_at` del listado (que puede venir de un registro de
      // otra quincena) en la columna "Fecha Actualización".
      setFechasAjusteManual((prev) => {
        const m = new Map(prev);
        for (const r of resultados) {
          const d = r.data;
          if (d?.lote_id != null && d.ajustado_at) m.set(d.lote_id, d.ajustado_at);
        }
        return m;
      });
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
        ? 'Primera quincena'
        : 'Segunda quincena';

  const empleadosActivos = empleados;

  const req = <span className="text-destructive">*</span>;

  // Mostrar estado de carga mientras se hidrata el wizard en modo edición.
  if (cargandoEdicion) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando nómina...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/nomina"
        eyebrow="Pagos"
        title={esFlujoCreacion ? 'Nuevo período de pago' : 'Editar período de pago'}
        description={esFlujoCreacion
          ? 'Crea un período de nómina paso a paso.'
          : 'Modifica el período, agrega más colaboradores y vuelve a validar la cosecha.'}
      />

      <WizardStepper pasos={pasos} actual={pasoActual} />

      <div className="space-y-6">

          {/* Paso 1: Información del período */}
          {pasoActual === 1 && (
            <Card>
              <CardHeader>
                <h3>Información del período</h3>
                <CardDescription>Define el mes, la quincena y las fechas de corte.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* La periodicidad se muestra como en el diseño, pero fija: la
                    define Configuración → Parámetros de Nómina para toda la finca. */}
                <div className={`grid gap-4 ${periodicidad === 'QUINCENAL' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="mes">Mes {req}</Label>
                    <Select value={mes} onValueChange={setMes}>
                      <SelectTrigger id="mes"><SelectValue placeholder="Selecciona un mes" /></SelectTrigger>
                      <SelectContent>
                        {MESES.map((m) => (
                          <SelectItem key={m.valor} value={m.valor.toString()}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodicidad">Periodicidad {req}</Label>
                    <Select value={periodicidad} disabled>
                      <SelectTrigger id="periodicidad"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Se configura en Configuración → Parámetros de nómina.
                    </p>
                  </div>

                  {periodicidad === 'QUINCENAL' && (
                    <div className="space-y-2">
                      <Label htmlFor="quincena">Quincena {req}</Label>
                      <Select value={quincena} onValueChange={(v) => setQuincena(v as '1' | '2')}>
                        <SelectTrigger id="quincena"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">
                            Primera quincena ({diasQuincena.dia_inicio_q1}–{diasQuincena.dia_fin_q1})
                          </SelectItem>
                          <SelectItem value="2">
                            Segunda quincena ({diasQuincena.dia_inicio_q2}–{diasQuincena.dia_fin_q2 >= 31 ? 'fin de mes' : diasQuincena.dia_fin_q2})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* §2.6 — Fecha de inicio bloqueada (la deriva la periodicidad).
                    Fecha de fin editable: es el corte de días personalizado. */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fechaInicio">Fecha de inicio {req}</Label>
                    <Input id="fechaInicio" type="date" value={fechaInicio} readOnly className="bg-muted/40" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="fechaFin">Fecha de fin {req}</Label>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground" strokeWidth={2} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-64 text-center leading-snug">
                            Puedes ajustar la fecha de fin para usar un corte de días personalizado, útil en liquidaciones o períodos incompletos.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input id="fechaFin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                  </div>
                </div>

                {mes && fechaInicio && fechaFin && (
                  <div className="space-y-3 rounded-lg bg-muted/60 p-4">
                    <div>
                      <Eyebrow>Período seleccionado</Eyebrow>
                      <p className="mt-1 font-semibold text-foreground">{mesNombre} {ano} · {quincenaNombre}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Fecha de inicio</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Fecha de fin</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Seleccionar empleados */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2>Seleccionar personal</h2>
                  <p className="text-sm text-muted-foreground">
                    {esEdicion && colaboradoresYaAgregados > 0
                      ? `Esta nómina ya tiene ${colaboradoresYaAgregados} colaborador${colaboradoresYaAgregados !== 1 ? 'es' : ''} agregado${colaboradoresYaAgregados !== 1 ? 's' : ''}. Puedes agregar más o continuar.`
                      : 'Agrega colaboradores y empresas terceras a este período.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={agregarTodos}
                    disabled={
                      empleadosSeleccionados.length === empleadosActivos.length ||
                      empleadosActivos.length === 0
                    }
                  >
                    <UserPlus strokeWidth={2} />
                    Agregar todos
                  </Button>
                  <Button variant="ghost" onClick={quitarTodos} disabled={empleadosSeleccionados.length === 0}>
                    Quitar todos
                  </Button>
                </div>
              </div>

              {/* Ya agregados (solo en modo edición) — tabla informativa con
                  opción de quitar a los que aún están PENDIENTES. */}
              {esEdicion && colaboradoresAgregados.length > 0 && (
                <Card className="gap-0 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3.5">
                    <h3>Ya agregados en esta nómina</h3>
                    <Badge variant="secondary">{colaboradoresAgregados.length}</Badge>
                  </div>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className={thead}>
                        <tr>
                          <th className={`${th} pl-5 text-left`}>Colaborador</th>
                          <th className={`${th} text-left`}>Tipo</th>
                          <th className={`${th} hidden text-left sm:table-cell`}>Cargo</th>
                          <th className={`${th} text-left`}>Estado</th>
                          <th className={`${th} pr-5 text-right`}><span className="sr-only">Acciones</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...colaboradoresAgregados].sort((a, b) =>
                          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
                        ).map((c) => {
                          const liquidado = c.estado === 'LIQUIDADO';
                          return (
                            <tr key={c.nominaEmpleadoId}>
                              <td className={`${td} pl-5`}>
                                <span className="font-medium text-foreground">{c.nombre}</span>
                                {c.documento && (
                                  <span className="block text-xs text-muted-foreground">C.C. {c.documento}</span>
                                )}
                              </td>
                              <td className={td}>
                                {c.tipo === 'OP' ? (
                                  <Badge variant="secondary">{c.tercero ?? 'Tercero'}</Badge>
                                ) : (
                                  <Badge variant="outline">Empleado</Badge>
                                )}
                              </td>
                              <td className={`${td} hidden text-muted-foreground sm:table-cell`}>{c.cargo ?? '—'}</td>
                              <td className={td}>
                                <Badge variant={liquidado ? 'success' : 'warning'}>
                                  {c.estado.charAt(0) + c.estado.slice(1).toLowerCase()}
                                </Badge>
                              </td>
                              <td className={`${td} pr-5 text-right`}>
                                {!liquidado ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => quitarYaAgregado(c.nominaEmpleadoId)}
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label="Quitar de la nómina"
                                    title="Quitar de la nómina"
                                  >
                                    <Trash2 strokeWidth={2} />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground" title="No se puede quitar un colaborador ya liquidado">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* §3.1 — Banner de colaboradores excluidos por estar en otra
                  nómina cruzada. Sin esto, el usuario busca a Juan, no lo
                  encuentra y no sabe por qué. */}
              {excluidos.length > 0 && (
                <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  <div className="text-sm text-foreground">
                    <p className="font-medium">
                      {excluidos.length} colaborador{excluidos.length !== 1 ? 'es' : ''} no aparece{excluidos.length !== 1 ? 'n' : ''} en la lista
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {excluidos.map((e) => e.nombre_completo).join(', ')}: ya está{excluidos.length !== 1 ? 'n' : ''} en otra nómina cuyos días se cruzan con este período.
                    </p>
                  </div>
                </div>
              )}

              <Card className="gap-0 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <h3>{esEdicion ? 'Agregar más colaboradores' : 'Colaboradores internos'}</h3>
                  <Badge variant="secondary">Nómina</Badge>
                </div>
                {cargandoEmpleados ? (
                  <div className="flex items-center justify-center gap-2 border-t border-border py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando empleados...
                  </div>
                ) : empleadosActivos.length === 0 ? (
                  <p className="border-t border-border py-12 text-center text-sm text-muted-foreground">
                    No hay empleados activos.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className={thead}>
                        <tr>
                          <th className={`${th} w-10 pl-5 text-left`}><span className="sr-only">Seleccionar</span></th>
                          <th className={`${th} text-left`}>Nombre</th>
                          <th className={`${th} hidden text-left md:table-cell`}>Documento</th>
                          <th className={`${th} hidden text-left sm:table-cell`}>Cargo</th>
                          <th className={`${th} hidden text-right lg:table-cell`}>Salario base</th>
                          <th className={`${th} pr-5 text-left`}>Modalidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortByFirstName(empleadosActivos).map((empleado) => {
                          const isSelected = empleadosSeleccionados.includes(empleado.id);
                          const { nombres, apellidos } = nombreApellidoDe(empleado);
                          const alternar = () =>
                            isSelected ? quitarEmpleado(empleado.id) : agregarEmpleado(empleado.id);
                          return (
                            <tr
                              key={empleado.id}
                              className={`cursor-pointer transition-colors hover:bg-muted/40 ${isSelected ? 'bg-primary-soft/60' : ''}`}
                              {...comoBoton(alternar)}
                            >
                              <td className={`celda-seleccion ${td} pl-5`} onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  aria-label={`Seleccionar a ${nombres} ${apellidos}`}
                                  onCheckedChange={alternar}
                                />
                              </td>
                              <td className={td}>
                                <span className="font-medium text-foreground">{nombres} {apellidos}</span>
                                <span className="block text-xs text-muted-foreground sm:hidden">{empleado.cargo || 'Sin cargo'}</span>
                                {/* §3.1 — La lista incluye a los retirados dentro
                                    del rango: hay que liquidarles sus últimos días. */}
                                {empleado.fecha_retiro && (
                                  <span className="block text-xs text-muted-foreground">Retirado el {empleado.fecha_retiro}</span>
                                )}
                              </td>
                              <td className={`${td} hidden text-muted-foreground md:table-cell`}>{empleado.documento || '—'}</td>
                              <td className={`${td} hidden text-muted-foreground sm:table-cell`}>{empleado.cargo || 'Sin cargo'}</td>
                              {/* Salario base del maestro, como en el diseño. */}
                              <td className={`${td} hidden text-right tabular-nums text-muted-foreground lg:table-cell`}>
                                {empleado.salario_base > 0 ? cop(empleado.salario_base) : '—'}
                              </td>
                              <td className={`${td} pr-5`}>
                                <Badge variant="outline">
                                  {empleado.modalidad_pago === 'PRODUCCION'
                                    ? 'Producción'
                                    : empleado.modalidad_pago === 'FIJO'
                                      ? 'Fijo'
                                      : (empleado.modalidad_pago ?? 'N/A')}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

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
              <Card className="gap-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
                  <h3>Empresas terceras</h3>
                  <Badge variant="secondary">Prestación de servicios</Badge>
                  {operariosSeleccionados.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {operariosSeleccionados.length} operario{operariosSeleccionados.length !== 1 ? 's' : ''} seleccionado{operariosSeleccionados.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {grupos.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={agregarTodas} disabled={todosSeleccionadosGlobal}>
                        Agregar todas
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={quitarTodas} disabled={operariosSeleccionados.length === 0}>
                        Quitar todas
                      </Button>
                    </div>
                  )}
                </div>
                {grupos.length === 0 ? (
                  <p className="border-t border-border py-12 text-center text-sm text-muted-foreground">
                    No hay operarios de empresas contratistas disponibles.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className={thead}>
                        <tr>
                          <th className={`${th} w-10 pl-5 text-left`}><span className="sr-only">Seleccionar</span></th>
                          <th className={`${th} text-left`}>Empresa</th>
                          <th className={`${th} hidden text-left md:table-cell`}>NIT</th>
                          <th className={`${th} hidden text-right sm:table-cell`}>Operarios</th>
                          <th className={`${th} pr-5 text-right`}>Valor total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grupos.map((g) => {
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
                              className={`cursor-pointer transition-colors hover:bg-muted/40 ${todosSeleccionados ? 'bg-primary-soft/60' : ''}`}
                              {...comoBoton(toggleEmpresa)}
                            >
                              <td className={`celda-seleccion ${td} pl-5`} onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={todosSeleccionados || (algunosSeleccionados ? 'indeterminate' : false)}
                                  aria-label={`Seleccionar ${g.razon_social}`}
                                  onCheckedChange={toggleEmpresa}
                                />
                              </td>
                              <td className={td}>
                                <p className="font-medium text-foreground">{g.razon_social}</p>
                                {representante && <p className="text-xs text-muted-foreground">{representante}</p>}
                              </td>
                              <td className={`${td} hidden text-muted-foreground md:table-cell`}>{t?.nit ?? '—'}</td>
                              <td className={`${td} hidden text-right tabular-nums sm:table-cell`}>{g.operarios.length}</td>
                              <td className={`${td} pr-5 text-right tabular-nums`}>
                                {valorTotal > 0 ? cop(valorTotal) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2>Validar cosecha</h2>
                  <p className="text-sm text-muted-foreground">Compara lo registrado por cada colaborador con el reporte de la extractora.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Snapshot para poder revertir con Cancelar.
                    promediosEditadosSnapshot.current = { ...promediosEditados };
                    setMostrarAjustePromedios(true);
                  }}
                >
                  <Settings2 strokeWidth={2} />
                  Ajustar promedios
                </Button>
              </div>

              {cargandoBundle ? (
                <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculando comparación de cosecha...
                </Card>
              ) : (() => {
                const totalColabs = bundleCosecha?.total_kg_colaboradores ?? 0;
                // §4.6 (2026-09-05) — `total_kg_extractora` YA VIENE AJUSTADO:
                // incluye lo recibido en viajes de otra quincena por fruta de
                // este período y excluye la fruta ajena recibida acá. La resta
                // "Despachado fuera" desapareció de la cabecera; el campo
                // `total_kg_despachado_fuera_del_periodo` ya no se emite.
                const totalExtr = bundleCosecha?.total_kg_extractora ?? 0;
                // `diff` viene calculado por el backend: colaboradores − extractora.
                const diff = bundleCosecha?.diferencia_kg ?? 0;
                const cosechasFuera = bundleCosecha?.cosechas_despachadas_fuera_del_periodo ?? 0;
                // Desglose opcional de la extractora ajustada — solo se pinta
                // cuando alguno de los tres componentes es distinto de cero.
                const extrDelPeriodo = bundleCosecha?.total_kg_extractora_viajes_del_periodo ?? 0;
                const extrDeViajesFuera = bundleCosecha?.total_kg_extractora_de_viajes_fuera_del_periodo ?? 0;
                const extrDeCosechasFuera = bundleCosecha?.total_kg_extractora_de_cosechas_fuera_del_periodo ?? 0;
                const hayDesgloseExtr = extrDeViajesFuera !== 0 || extrDeCosechasFuera !== 0;
                const detalle = bundleCosecha?.detalle_por_colaborador ?? [];
                // §2.6 — El bundle recorre TODO el período aunque haya varias
                // nóminas (la conciliación es finca-vs-extractora). Cuando el
                // período está partido, estos campos evitan dar a entender que
                // toda esa fruta se liquida en ESTA nómina.
                const totalKgEstaNomina = bundleCosecha?.total_kg_de_esta_nomina;
                const colabsEstaNomina = bundleCosecha?.colaboradores_de_esta_nomina;
                const periodoPartido = totalKgEstaNomina != null
                  && Math.abs(totalKgEstaNomina - totalColabs) > 0.01;

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

                // §4.1 (2026-11-11) F4 — El promedio del lote puede ser una
                // medición o una estimación, y la fila se lee distinto según
                // cuál sea: con estimación los dos lados de la comparación
                // usan el mismo número y la diferencia da 0 sin que nadie
                // haya pesado esa fruta. Las filas van por nombre de lote.
                const promedioDeLote = (nombreLote: string) => {
                  const loteId = nombreALoteIdMap.get(nombreLote);
                  if (loteId === undefined) return undefined;
                  return promediosPorLote.find((x) => x.lote_id === loteId);
                };

                const kgTrabDeCosecha = (c: { lote: string; kg_trabajado: number; gajos_persona?: number }): number => {
                  const loteId = nombreALoteIdMap.get(c.lote);
                  if (loteId === undefined) return c.kg_trabajado;
                  const p = promediosPorLote.find((x) => x.lote_id === loteId);
                  const promOrig = p?.promedio_efectivo ?? 0;
                  const editado = promediosEditados[loteId];
                  const promNuevo = editado !== undefined && editado > 0 ? editado : promOrig;
                  if (promNuevo === promOrig || promOrig <= 0) return c.kg_trabajado;
                  // §4.1 (2026-09-05) — la fila trae `gajos_persona`: la porción
                  // EXACTA del cuadrillero (gajos_verificados / N, sin floor).
                  // Es la base oficial de kg_trabajado. El fallback dividiendo
                  // kg/promedio queda solo para un backend viejo; limpia ruido
                  // flotante a 4 decimales (precisión que persiste el backend).
                  const gajosPorMiembro = c.gajos_persona
                    ?? Math.round((c.kg_trabajado / promOrig) * 10000) / 10000;
                  return gajosPorMiembro * promNuevo;
                };

                const ajustarKgCosecha = (c: {
                  lote: string;
                  kg_trabajado: number;
                  kg_extractora: number;
                  diferencia_kg?: number | null;
                }) => {
                  const kgTrab = kgTrabDeCosecha(c);
                  // §4.6 (2026-09-05) — kg_extractora de la fila concilia
                  // contra su viaje sin importar la quincena de este. Cero
                  // solo implica sin medición (SIN_DESPACHAR / SIN_DATOS).
                  const kgExtr = c.kg_extractora ?? 0;
                  // Si el usuario editó localmente el promedio del lote,
                  // recalculamos la diferencia (simulación pre-guardar).
                  // Si no, respetamos la del API (`diferencia_kg` ya nunca
                  // llega null; el fallback es tolerancia defensiva).
                  const loteId = nombreALoteIdMap.get(c.lote);
                  const editado = loteId !== undefined ? promediosEditados[loteId] : undefined;
                  const hayEdicionLocal = editado !== undefined && editado > 0;
                  const difKg: number | null = hayEdicionLocal
                    ? kgTrab - kgExtr
                    : (c.diferencia_kg ?? null);
                  return { kgTrab, kgExtr, difKg };
                };
                // F7 (§4.6, 2026-09-05) — Semáforo por PORCENTAJE sobre
                // `total_kg_colaboradores` sin restar nada: la extractora ya
                // viene ajustada y la diferencia es directa. En camiones
                // mixtos el ruido típico es ±6 %.
                //   < 2 %  normal (ruido esperado)
                //   2-5 %  revisar
                //   > 5 %  significativa
                const pctDiff = totalColabs > 0 ? Math.abs(diff) / totalColabs : 0;
                const estadoDif: 'ok' | 'critico' | 'atencion' | 'vacio' =
                  totalColabs === 0 && totalExtr === 0 ? 'vacio'
                    : totalColabs === 0 ? 'vacio'
                      : pctDiff < 0.02 ? 'ok'
                        : pctDiff > 0.05 ? 'critico'
                          : 'atencion';
                const varianteEstado = estadoDif === 'ok'
                  ? 'success' as const
                  : estadoDif === 'critico'
                    ? 'destructive' as const
                    : estadoDif === 'atencion'
                      ? 'warning' as const
                      : 'secondary' as const;
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
                      <div className="flex flex-col gap-3 rounded-lg bg-warning-soft p-3 sm:flex-row sm:items-start">
                        <div className="flex flex-1 gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                          <div className="text-sm text-foreground">
                            <p className="font-medium">
                              {bundleCosecha?.total_gajos_pendientes_enviar} gajos sin despachar en {bundleCosecha?.cosechas_con_gajos_pendientes} cosecha{(bundleCosecha?.cosechas_con_gajos_pendientes ?? 0) !== 1 ? 's' : ''}
                            </p>
                            <p className="mt-0.5 text-muted-foreground">
                              Esa fruta se cortó en este período pero no está cargada a ningún camión, así que no entra en la liquidación. Cárgala a un viaje y vuelve a liquidar, o continúa si ya sabes que no va a despacharse.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 self-start"
                          onClick={() => {
                            // Los ajustes de cosecha cambian los previews de los
                            // colaboradores involucrados: se invalida el caché
                            // para forzar refresh al volver al paso 4.
                            if (idEditar) {
                              try {
                                sessionStorage.removeItem(`wizard_previews_${idEditar}`);
                              } catch { /* noop */ }
                            }
                            navigate('/viajes/ajustes-cosecha', {
                              state: { from: 'nomina', nominaId, paso: 3 },
                            });
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    )}

                    {/* Resumen de cosecha. §4.6 (2026-09-05): la extractora YA viene
                        ajustada por la conciliación cruzada entre períodos; el
                        desglose (si aplica) va como nota de Extractora. */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Eyebrow>Resumen de cosecha</Eyebrow>
                        <Badge variant={varianteEstado}>{labelEstado}</Badge>
                      </div>
                      <StatStrip
                        items={[
                          {
                            label: 'Colaboradores',
                            value: totalColabs > 0 ? totalColabs.toLocaleString('es-CO') : '—',
                            unit: 'kg',
                            note: (
                              <>
                                <span className="block">
                                  {detalle.length} colaborador{detalle.length !== 1 ? 'es' : ''} con cosecha
                                </span>
                                {periodoPartido && (
                                  <span className="block">
                                    Se liquida en esta nómina: {totalKgEstaNomina.toLocaleString('es-CO')} kg
                                    {colabsEstaNomina != null ? ` (${colabsEstaNomina} colaborador${colabsEstaNomina !== 1 ? 'es' : ''})` : ''}
                                  </span>
                                )}
                              </>
                            ),
                            icon: Users,
                            tone: 'green',
                          },
                          {
                            label: 'Extractora',
                            value: totalExtr > 0 ? totalExtr.toLocaleString('es-CO') : '—',
                            unit: 'kg',
                            note: hayDesgloseExtr ? (
                              <span title="La extractora se ajusta con la conciliación cruzada: suma la fruta de este período recibida en camiones de otra quincena y resta la fruta ajena recibida acá.">
                                <span className="block">Del período: {extrDelPeriodo.toLocaleString('es-CO')} kg</span>
                                {extrDeViajesFuera !== 0 && (
                                  <span className="block">Suma recibido de otro período: {extrDeViajesFuera.toLocaleString('es-CO')} kg</span>
                                )}
                                {extrDeCosechasFuera !== 0 && (
                                  <span className="block">Resta fruta de otro período: {extrDeCosechasFuera.toLocaleString('es-CO')} kg</span>
                                )}
                              </span>
                            ) : cosechasFuera > 0
                              ? `Ajustada · ${cosechasFuera} cosecha${cosechasFuera !== 1 ? 's' : ''} conciliada${cosechasFuera !== 1 ? 's' : ''} entre períodos`
                              : 'Viajes finalizados conciliados',
                            icon: Factory,
                            tone: 'lime',
                          },
                          {
                            label: 'Diferencia',
                            value: (
                              <span className={estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-warning' : estadoDif === 'ok' ? 'text-success' : undefined}>
                                {estadoDif === 'vacio' ? '—' : Math.abs(diff).toLocaleString('es-CO')}
                              </span>
                            ),
                            unit: 'kg',
                            note: estadoDif === 'vacio'
                              ? 'No hay datos para comparar'
                              : `${(pctDiff * 100).toFixed(1)}% · ${estadoDif === 'ok' ? 'Normal' : estadoDif === 'critico' ? 'Significativa' : 'Revisar'}`,
                            icon: Scale,
                            tone: estadoDif === 'critico' ? 'red' : estadoDif === 'atencion' ? 'amber' : 'green',
                          },
                        ]}
                      />
                    </div>

                    {/* Detalle por colaborador */}
                    <div className="space-y-3">
                      <h3>Detalle por trabajador</h3>
                      {detalle.length === 0 ? (
                        <Card className="items-center py-12 text-center">
                          <div className="max-w-md space-y-1 px-6">
                            <h3 className="text-base font-semibold text-foreground">Sin cosechas en el período</h3>
                            <p className="text-sm text-muted-foreground">Puedes continuar sin validar.</p>
                          </div>
                        </Card>
                      ) : (
                        detalle.map((d) => {
                          const expandido = empleadosExpandidos.has(d.colaborador_id);
                          const esTercero = d.tipo === 'OPERARIO';
                          return (
                            <Card key={`${d.tipo}-${d.colaborador_id}`} className="gap-0 overflow-hidden">
                              <button
                                type="button"
                                aria-expanded={expandido}
                                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                                onClick={() => toggleEmpleadoExpandido(d.colaborador_id)}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  {expandido
                                    ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />}
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="break-words font-semibold text-foreground">{d.nombre_completo}</p>
                                      {esTercero && <Badge variant="secondary">Tercero</Badge>}
                                      {d.en_esta_nomina === false && (
                                        <Badge
                                          variant="secondary"
                                          title="Este cuadrillero pertenece a otra nómina del mismo período. Su fruta entra a la conciliación pero se liquida allá."
                                        >
                                          Otra nómina
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="break-words text-xs text-muted-foreground">{d.cargo}</p>
                                  </div>
                                </div>
                                {(() => {
                                  // KPIs: Registrado / Extractora / Diferencia. §4.1 —
                                  // el backend manda los totales ya redondeados y se
                                  // pintan tal cual; la suma local solo aplica con un
                                  // promedio editado sin guardar (simulación en vivo).
                                  const cosechas = d.cosechas ?? [];
                                  const hayEdicion = cosechas.some((c) => {
                                    const loteId = nombreALoteIdMap.get(c.lote);
                                    const e = loteId !== undefined ? promediosEditados[loteId] : undefined;
                                    return e !== undefined && e > 0;
                                  });
                                  const ajustadas = cosechas.map((c) => ajustarKgCosecha(c));
                                  const totalTrab = !hayEdicion && d.kg != null
                                    ? d.kg
                                    : ajustadas.reduce((s, r) => s + r.kgTrab, 0);
                                  const totalExtr = d.kg_extractora
                                    ?? ajustadas.reduce((s, r) => s + r.kgExtr, 0);
                                  const diff = !hayEdicion && d.diferencia_kg != null
                                    ? d.diferencia_kg
                                    : ajustadas.reduce((s, r) => s + (r.difKg ?? 0), 0);
                                  const colorDiff = diff > 0 ? 'text-warning' : 'text-foreground';
                                  return (
                                    <div className="flex shrink-0 items-center gap-5 text-right">
                                      <div className={cosechas.length > 0 ? 'hidden sm:block' : undefined}>
                                        <p className="text-xs text-muted-foreground">Registrado</p>
                                        <p className="text-sm tabular-nums text-foreground">{totalTrab.toLocaleString('es-CO')} kg</p>
                                      </div>
                                      {cosechas.length > 0 && (
                                        <>
                                          <div className="hidden sm:block">
                                            <p className="text-xs text-muted-foreground">Extractora</p>
                                            <p className="text-sm tabular-nums text-foreground">{totalExtr.toLocaleString('es-CO')} kg</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Diferencia</p>
                                            <p className={`text-sm font-semibold tabular-nums ${colorDiff}`}>
                                              {Math.abs(diff).toLocaleString('es-CO')} kg
                                            </p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })()}
                              </button>
                              {expandido && (
                                <div className="border-t border-border">
                                  <p className="px-5 pt-3 pb-2 text-sm font-semibold text-foreground">
                                    Detalle por actividad · {mesNombre} {ano}
                                  </p>
                                  {d.cosechas && d.cosechas.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="pl-5">Fecha</TableHead>
                                            <TableHead>Lote</TableHead>
                                            <TableHead>Sublote</TableHead>
                                            <TableHead>Remisión</TableHead>
                                            <TableHead className="text-right">Gajos trab.</TableHead>
                                            <TableHead className="text-right">Gajos verif.</TableHead>
                                            <TableHead className="text-right">Dif. gajos</TableHead>
                                            {/* §4.1 (2026-09-05) — Porción exacta del cuadrillero:
                                                gajos_verificados / N sin floor. Es la base de los
                                                kg de la fila. Solo se pinta si el backend la manda. */}
                                            {d.cosechas.some((c) => c.gajos_persona != null) && (
                                              <TableHead className="text-right" title="Porción de este cuadrillero: gajos verificados divididos entre los miembros activos de la cuadrilla, sin truncar">
                                                Gajos persona
                                              </TableHead>
                                            )}
                                            {/* §4.6 F5 — Promedio efectivo (lote) vs aplicado
                                                (viaje). Solo se pinta si al menos una fila trae
                                                el dato — evita ruido cuando el backend responde
                                                en versión antigua. */}
                                            {d.cosechas.some((c) => c.promedio_efectivo != null || c.promedio_aplicado != null) && (
                                              <>
                                                <TableHead className="text-right" title="Promedio kg/gajo del lote para toda la quincena: los camiones homogéneos del período, o la última medición del lote si no hubo ninguno. El baseline del año solo aplica a un lote que nunca se ha pesado.">
                                                  Prom. lote
                                                </TableHead>
                                                <TableHead className="text-right" title="Promedio kg/gajo que aplicó el viaje al pesar: medición si el camión era homogéneo, estimación si iba revuelto">
                                                  Prom. viaje
                                                </TableHead>
                                              </>
                                            )}
                                            <TableHead className="text-right">Kg trab.</TableHead>
                                            <TableHead className="text-right">Kg extract.</TableHead>
                                            <TableHead className="pr-5 text-right">Dif. kg</TableHead>
                                            {/* §4.4 — Columna de gajos sin despachar. Solo se
                                                pinta cuando alguna fila del bloque tiene alerta,
                                                para no meter ruido visual innecesario. */}
                                            {d.cosechas.some((c) => (c.gajos_pendientes_enviar ?? 0) > 0) && (
                                              <TableHead className="pr-5 text-right">Sin despachar</TableHead>
                                            )}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {[...d.cosechas]
                                            .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
                                            .map((c, idx) => {
                                            const { kgTrab, kgExtr, difKg } = ajustarKgCosecha(c);
                                            const gajosPend = c.gajos_pendientes_enviar ?? 0;
                                            const hayCol = (d.cosechas ?? []).some((x) => (x.gajos_pendientes_enviar ?? 0) > 0);
                                            const tooltipAjuste = c.ajuste_gajos
                                              ? `${c.ajuste_gajos.accion} · ${c.ajuste_gajos.ajustado_por ?? 'sistema'}${c.ajuste_gajos.motivo ? ' — ' + c.ajuste_gajos.motivo : ''}`
                                              : undefined;
                                            return (
                                              <TableRow
                                                key={idx}
                                                className={c.alerta_despacho === 'ALTA' ? 'bg-warning-soft/60' : undefined}
                                                title={c.despachado_fuera_del_periodo
                                                  ? `El viaje salió el ${c.fecha_viaje ?? 'día siguiente'} (otra quincena), pero la fila SÍ concilia contra su báscula acá. ${describirReglaFueraDelPeriodo(c.regla_fuera_del_periodo) ?? ''}`.trim()
                                                  : undefined}
                                              >
                                                <TableCell className="pl-5 text-muted-foreground">{c.fecha}</TableCell>
                                                <TableCell>{c.lote}</TableCell>
                                                <TableCell className="text-muted-foreground">{c.sublote ?? '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                  <div className="flex flex-wrap items-center gap-1.5">
                                                    {/* Parche visual: normalizamos a 3 dígitos
                                                        exactos cuando la remisión es puramente
                                                        numérica. Se remueven ceros a la izquierda
                                                        y se re-paddea (`0074` → `074`, `69` → `069`).
                                                        Los prefijos con letras (GE-001, TX-42) se
                                                        dejan tal cual. Remisiones con más de 3
                                                        dígitos reales (`1234`) también se dejan
                                                        para no perder información. */}
                                                    <span className="tabular-nums">
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
                                                    {/* §4.6 (2026-09-05) — chip informativo: el viaje
                                                        salió en otra quincena, pero la fila SÍ concilia
                                                        contra su báscula acá. Ya no atenúa la fila. */}
                                                    {c.despachado_fuera_del_periodo && c.fecha_viaje && (
                                                      <Badge variant="secondary">
                                                        Despachado {c.fecha_viaje.slice(8, 10)}/{c.fecha_viaje.slice(5, 7)}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{c.gajos_trabajados}</TableCell>
                                                <TableCell className="text-right tabular-nums">{c.gajos_verificados}</TableCell>
                                                <TableCell className={`text-right font-medium tabular-nums ${c.diferencia_gajos === 0 ? 'text-muted-foreground' : c.diferencia_gajos > 0 ? 'text-warning' : 'text-foreground'}`}>
                                                  {Math.abs(c.diferencia_gajos)}
                                                </TableCell>
                                                {(d.cosechas ?? []).some((x) => x.gajos_persona != null) && (
                                                  <TableCell
                                                    className="text-right tabular-nums"
                                                    title={c.n_cuadrilla != null && c.n_cuadrilla > 1
                                                      ? `${c.gajos_verificados} gajos entre ${c.n_cuadrilla} miembros de la cuadrilla`
                                                      : undefined}
                                                  >
                                                    {c.gajos_persona != null
                                                      ? c.gajos_persona.toLocaleString('es-CO', { maximumFractionDigits: 4 })
                                                      : <span className="text-muted-foreground">—</span>}
                                                  </TableCell>
                                                )}
                                                {/* §4.6 F5 — Promedios efectivo/aplicado con
                                                    icono según origen. Solo se renderiza cuando
                                                    la fila los trae; garantiza consistencia con
                                                    la cabecera de la tabla. */}
                                                {(d.cosechas ?? []).some((x) => x.promedio_efectivo != null || x.promedio_aplicado != null) && (
                                                  <>
                                                    <TableCell className="text-right tabular-nums">
                                                      {/* §9 API_NOMINA — promedios kg/gajo con 4 decimales
                                                          (el cuarto decimal es lo que decide si cuadra o no).
                                                          §4.1 (2026-11-11) — el "≈" marca el lote que no tuvo
                                                          camión homogéneo en el período: su promedio está
                                                          estimado y su diferencia no confirma nada. */}
                                                      {c.promedio_efectivo != null ? (() => {
                                                        const pl = promedioDeLote(c.lote);
                                                        const org = pl
                                                          ? describirOrigenPromedio(pl.origen, pl.mediciones_bascula)
                                                          : null;
                                                        const estimado = org != null && !org.medido;
                                                        return (
                                                          <span
                                                            className={`inline-flex items-center gap-1 ${estimado ? 'text-warning' : 'text-muted-foreground'}`}
                                                            title={org?.detalle}
                                                          >
                                                            {estimado && <span aria-hidden="true">≈</span>}
                                                            {Number(c.promedio_efectivo).toFixed(4)}
                                                          </span>
                                                        );
                                                      })() : <span className="text-muted-foreground">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
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
                                                            className={`inline-flex items-center gap-1 ${esBaseline ? 'text-warning' : ''}`}
                                                            title={tooltip}
                                                          >
                                                            {esBascula && <Scale className="h-3 w-3" strokeWidth={2} aria-hidden="true" />}
                                                            {esBaseline && <span aria-hidden="true">≈</span>}
                                                            {Number(c.promedio_aplicado).toFixed(4)}
                                                          </span>
                                                        );
                                                      })() : <span className="text-muted-foreground">—</span>}
                                                    </TableCell>
                                                  </>
                                                )}
                                                {/* Sin redondear: el backend manda los kg con decimales
                                                    (945,9 / 929,7) y se pintan tal cual. El tope de 4
                                                    decimales solo limpia ruido flotante del recálculo
                                                    local de promedios. */}
                                                <TableCell className="text-right tabular-nums">{kgTrab.toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                  {kgExtr > 0
                                                    ? `${kgExtr.toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg`
                                                    : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className={`pr-5 text-right font-medium tabular-nums ${
                                                  difKg === null
                                                    ? 'text-muted-foreground'
                                                    : Math.abs(difKg) < 1
                                                      ? 'text-muted-foreground'
                                                      : difKg > 0
                                                        ? 'text-warning'
                                                        : 'text-foreground'
                                                }`}>
                                                  {/* §4.6 (2026-09-05) — `diferencia_kg` ya nunca llega
                                                      null: toda fila concilia contra su viaje sin importar
                                                      la quincena. El "—" queda solo como tolerancia
                                                      defensiva contra un backend viejo. */}
                                                  {difKg === null
                                                    ? '—'
                                                    : `${Math.abs(difKg).toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg`}
                                                </TableCell>
                                                {hayCol && (
                                                  <TableCell className="text-right tabular-nums">
                                                    {gajosPend > 0 ? (
                                                      <span
                                                        className={`inline-flex items-center gap-1 font-semibold ${c.alerta_despacho === 'ALTA' ? 'text-warning' : 'text-muted-foreground'}`}
                                                        title={tooltipAjuste}
                                                      >
                                                        {c.alerta_despacho === 'ALTA' && <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />}
                                                        {gajosPend}
                                                      </span>
                                                    ) : (
                                                      <span className="text-muted-foreground">—</span>
                                                    )}
                                                  </TableCell>
                                                )}
                                              </TableRow>
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
                                            const mostrarGajosPersona = d.cosechas.some((c) => c.gajos_persona != null);
                                            // §4.1 — `d.gajos` viene sumado y redondeado a 4 por el
                                            // backend; la suma local es fallback.
                                            const totGP = d.gajos
                                              ?? d.cosechas.reduce((s, c) => s + (c.gajos_persona ?? 0), 0);
                                            return (
                                              <TableRow className="bg-muted/60 font-semibold">
                                                <TableCell className="pl-5" colSpan={4}>Totales</TableCell>
                                                <TableCell className="text-right tabular-nums">{totGT.toLocaleString('es-CO')}</TableCell>
                                                <TableCell className="text-right tabular-nums">{totGV.toLocaleString('es-CO')}</TableCell>
                                                <TableCell className={`text-right tabular-nums ${totDifG === 0 ? 'text-muted-foreground' : totDifG > 0 ? 'text-warning' : 'text-foreground'}`}>
                                                  {Math.abs(totDifG)}
                                                </TableCell>
                                                {mostrarGajosPersona && (
                                                  <TableCell className="text-right tabular-nums">
                                                    {totGP.toLocaleString('es-CO', { maximumFractionDigits: 4 })}
                                                  </TableCell>
                                                )}
                                                {mostrarPromedios && (
                                                  <>
                                                    <TableCell />
                                                    <TableCell />
                                                  </>
                                                )}
                                                <TableCell className="text-right tabular-nums">{totKgT.toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg</TableCell>
                                                <TableCell className="text-right tabular-nums">{totKgE.toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg</TableCell>
                                                <TableCell className={`pr-5 text-right tabular-nums ${Math.abs(totDifKg) < 1 ? 'text-muted-foreground' : totDifKg > 0 ? 'text-warning' : 'text-foreground'}`}>
                                                  {Math.abs(totDifKg).toLocaleString('es-CO', { maximumFractionDigits: 4 })} kg
                                                </TableCell>
                                                {/* Celda de "Sin despachar" para que la fila no quede corta. */}
                                                {d.cosechas.some((x) => (x.gajos_pendientes_enviar ?? 0) > 0) && (
                                                  <TableCell className="pr-5 text-right tabular-nums">
                                                    {d.cosechas.reduce((s, x) => s + (x.gajos_pendientes_enviar ?? 0), 0)}
                                                  </TableCell>
                                                )}
                                              </TableRow>
                                            );
                                          })()}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <div className="m-5 mt-3 flex items-start gap-2 rounded-lg bg-info-soft p-3 text-sm text-foreground">
                                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
                                      <span>Este colaborador no tiene cosechas registradas en el período.</span>
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
                      <div className="flex gap-2 rounded-lg bg-success-soft p-3 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} />
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
              {/* §2.6 — Quincena partida: ya existen OTRAS nóminas en el mismo
                  (mes, año, quincena). Excluye la que se está creando aquí. */}
              {nominasMismoPeriodo.length > 0 && (
                <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  <div className="space-y-1 text-sm text-foreground">
                    <p className="font-medium">
                      Quincena partida: existe{nominasMismoPeriodo.length !== 1 ? 'n' : ''}{' '}
                      {nominasMismoPeriodo.length} nómina{nominasMismoPeriodo.length !== 1 ? 's' : ''} más para este período
                    </p>
                    <p className="text-muted-foreground">
                      Esta nómina no es la única del mes y quincena. Cada nómina cubre a un grupo distinto de colaboradores; ningún día se pagará dos veces.
                    </p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {nominasMismoPeriodo.map((n) => (
                        <li key={n.id}>
                          <span className="font-medium text-foreground">{n.etiqueta ?? 'Sin etiqueta'}</span>
                          {' · '}{n.fecha_inicio} al {n.fecha_fin}
                          {' · '}{n.estado}
                          {n.empleados_count != null && (
                            <> · {n.empleados_count} colaborador{n.empleados_count !== 1 ? 'es' : ''}</>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader>
                  <h3>Información del período</h3>
                  <CardDescription>Revisa los datos antes de ir a la nómina.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <div><dt className="text-xs text-muted-foreground">Año</dt><dd className="font-medium text-foreground">{ano}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Mes</dt><dd className="font-medium text-foreground">{mesNombre}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Periodicidad</dt><dd className="font-medium text-foreground">{quincenaNombre}</dd></div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fecha de inicio</dt>
                      <dd className="font-medium text-foreground">{new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fecha de fin</dt>
                      <dd className="font-medium text-foreground">{new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Personal incluido. Para los terceros el total sale del preview
                  del backend, igual que para los colaboradores. */}
              {(() => {
                const soloEmpleados = sortByFirstName(colaboradoresAgregados.filter((c) => c.tipo === 'EMP'));
                const soloTerceros = sortByFirstName(colaboradoresAgregados.filter((c) => c.tipo === 'OP'));
                const total = soloEmpleados.length + soloTerceros.length;

                const montoDe = (c: typeof colaboradoresAgregados[number], sinPreview: string | null) => {
                  const preview = previewsPorEmpleado.get(c.nominaEmpleadoId);
                  if (preview) {
                    return (
                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums text-foreground">{cop(preview.total_devengado)}</p>
                        <p className="text-xs text-muted-foreground">Total quincena</p>
                      </div>
                    );
                  }
                  if (cargandoPreviews) {
                    return <p className="shrink-0 text-xs text-muted-foreground">Calculando…</p>;
                  }
                  return sinPreview ? <p className="shrink-0 text-xs text-muted-foreground">{sinPreview}</p> : null;
                };

                const fila = (c: typeof colaboradoresAgregados[number], esTercero: boolean) => (
                  <li key={`${esTercero ? 'op' : 'emp'}-${c.nominaEmpleadoId}`} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-medium text-foreground">{c.nombre}</p>
                        <Badge variant="secondary">{esTercero ? 'Tercero' : 'Colaborador'}</Badge>
                      </div>
                      <p className="break-words text-xs text-muted-foreground">
                        {c.cargo ?? 'Sin cargo'}
                        {esTercero && c.tercero ? ` · ${c.tercero}` : ''}
                      </p>
                    </div>
                    {montoDe(c, esTercero ? 'Pago por labor' : null)}
                  </li>
                );

                return (
                  <Card className="gap-0 overflow-hidden">
                    <CardHeader className="border-b pb-5">
                      <h3>Personal incluido ({total})</h3>
                      <CardDescription>
                        {soloEmpleados.length} colaborador{soloEmpleados.length !== 1 ? 'es' : ''} · {soloTerceros.length} operario{soloTerceros.length !== 1 ? 's' : ''} de terceros
                      </CardDescription>
                    </CardHeader>
                    {total === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No hay personal en esta nómina.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {soloEmpleados.map((c) => fila(c, false))}
                        {soloTerceros.map((c) => fila(c, true))}
                      </ul>
                    )}
                  </Card>
                );
              })()}

              <div className="flex gap-2 rounded-lg bg-info-soft p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
                <p className="text-sm text-foreground">
                  {esEdicion
                    ? 'Al confirmar, se guardarán los cambios y podrás continuar con la liquidación desde el detalle de la nómina.'
                    : 'Al crear esta nómina, se generará un registro en borrador para cada persona seleccionada. Podrás calcular los valores y cerrar la nómina desde el detalle del período.'}
                </p>
              </div>
            </div>
          )}
      </div>

      {/* Navegación */}
      <div className="barra-acciones flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={handleAtras}
          disabled={pasoActual === 1 || procesando}
        >
          <ArrowLeft strokeWidth={2} />
          Atrás
        </Button>

        {pasoActual < 4 ? (
          <Button onClick={handleSiguiente} disabled={!puedeAvanzar() || procesando}>
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Siguiente
            <ArrowRight strokeWidth={2} />
          </Button>
        ) : (
          <Button onClick={handleFinalizar}>
            <Check strokeWidth={2} />
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
            <DialogTitle>Promedios por lote</DialogTitle>
            <DialogDescription>
              Kg promedio por gajo para cada lote. El valor automático lo calcula el sistema desde los viajes del período; el manual lo sobrescribe solo para esta nómina.
            </DialogDescription>
          </DialogHeader>

          {/* Card resumen de cosecha con RECÁLCULO EN VIVO al editar promedios.
              Fórmula del backend (doc §4.1, actualizada 2026-09-04):
                kg_trabajado = (gajos_efectivos / N) × promedio_efectivo
              El reparto de gajos es EXACTO — sin floor: 315 gajos entre 2 son
              157,5 por persona. Recuperamos esa fracción dividiendo
              kg_trabajado / promedio_original y limpiando ruido flotante a 4
              decimales (la precisión que persiste el backend). Luego
              multiplicamos por el promedio editado → resultado idéntico al que
              devolverá `GET /validar-cosecha` tras el PUT.
              Extractora es dato fijo del backend — no depende de promedios. */}
          {bundleCosecha && (() => {
            // §4.6 (2026-09-05) — `total_kg_extractora` YA viene ajustado por
            // la conciliación cruzada entre períodos. La resta "Despachado
            // fuera" desapareció del contrato.
            const totalExtr = bundleCosecha.total_kg_extractora ?? 0;

            // Mapa lote_id → promedio efectivo actual (editado o del bundle).
            const promedioEfectivoActual = new Map<number, number>();
            // El del bundle sin editar. Se guarda aquí para no recorrer la
            // lista entera por cada cosecha de cada colaborador.
            const promedioOriginal = new Map<number, number>();
            const nombreALoteId = new Map<string, number>();
            for (const p of bundleCosecha.promedios_por_lote) {
              const editado = promediosEditados[p.lote_id];
              // `promedio_efectivo` llega null en un lote sin mediciones ni
              // baseline (2026-11-11). Cero deja la simulación sin efecto,
              // que es lo correcto: no hay promedio con qué recalcular.
              const efectivo = p.promedio_efectivo ?? 0;
              promedioEfectivoActual.set(
                p.lote_id,
                editado !== undefined && editado > 0 ? editado : efectivo,
              );
              promedioOriginal.set(p.lote_id, efectivo);
              nombreALoteId.set(p.lote_nombre, p.lote_id);
            }

            // Recalcular kg_trabajado por cada cosecha con el nuevo promedio.
            // Replica (gajos_efectivos / N) × promedio_nuevo con el reparto
            // exacto (sin floor) — igual a como lo hará el backend al guardar.
            let totalColabs = 0;
            for (const d of bundleCosecha.detalle_por_colaborador) {
              for (const c of d.cosechas ?? []) {
                const loteId = nombreALoteId.get(c.lote);
                if (loteId === undefined) {
                  // Cosecha sin lote resuelto — no la podemos recalcular.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                const promOrig = promedioOriginal.get(loteId) ?? 0;
                const promNuevo = promedioEfectivoActual.get(loteId) ?? promOrig;
                if (promNuevo === promOrig) {
                  // Sin edición para este lote → usar el kg original tal cual.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                if (promOrig <= 0 && c.gajos_persona == null) {
                  // Sin promedio original ni porción de gajos → no podemos
                  // derivar los gajos base.
                  totalColabs += c.kg_trabajado;
                  continue;
                }
                // §4.1 (2026-09-05) — la fila trae `gajos_persona` (porción
                // exacta del cuadrillero, sin floor): es la base oficial de
                // kg_trabajado. El fallback dividiendo kg/promedio queda para
                // un backend viejo, limpiando ruido flotante a 4 decimales.
                const gajosPorMiembro = c.gajos_persona
                  ?? Math.round((c.kg_trabajado / promOrig) * 10000) / 10000;
                totalColabs += gajosPorMiembro * promNuevo;
              }
            }

            // §4.6 (2026-09-05) — Fórmula simplificada, igual que la card
            // grande de afuera: diff = colaboradores − extractora (ajustada).
            // El % se calcula sobre colaboradores sin restar nada.
            const diff = totalColabs - totalExtr;
            const pctModal = totalColabs > 0 ? Math.abs(diff) / totalColabs : 0;
            const estado: 'ok' | 'critico' | 'atencion' =
              pctModal < 0.02 ? 'ok' : pctModal > 0.05 ? 'critico' : 'atencion';
            // Semáforo: verde normal, ámbar revisar, rojo significativa.
            const colorTexto = estado === 'ok' ? 'text-success' : estado === 'critico' ? 'text-destructive' : 'text-warning';
            const fondoEstado = estado === 'ok' ? 'bg-success-soft' : estado === 'critico' ? 'bg-destructive-soft' : 'bg-warning-soft';

            return (
              <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
                <div className="px-4 py-3">
                  <Eyebrow>Colaboradores</Eyebrow>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {totalColabs.toLocaleString('es-CO', { maximumFractionDigits: 4 })} <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </p>
                </div>
                <div className="px-4 py-3">
                  <Eyebrow>Extractora</Eyebrow>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {totalExtr > 0 ? totalExtr.toLocaleString('es-CO') : '—'} <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </p>
                </div>
                <div className={`rounded-r-lg px-4 py-3 ${fondoEstado}`}>
                  <Eyebrow>Diferencia</Eyebrow>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${colorTexto}`}>
                    {Math.abs(diff).toLocaleString('es-CO', { maximumFractionDigits: 4 })} <span className="text-xs font-normal">kg</span>
                  </p>
                  <p className={`text-xs font-medium ${colorTexto}`}>
                    {(pctModal * 100).toFixed(1)}% · {estado === 'ok' ? 'Normal' : estado === 'critico' ? 'Significativa' : 'Revisar'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Tabla de promedios por lote (solo lotes con cosechas en el período).
              4 columnas: Medición | Lote | Auto | Ajuste Manual. */}
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    title="El viaje homogéneo que pesó esa fruta y el día que salió. Si en el período no hubo ninguno, de dónde se tomó el promedio."
                  >
                    Actualización
                  </TableHead>
                  <TableHead>Lote</TableHead>
                  {/* 2026-11-11 — El baseline del admin ya no entra al
                      promedio del período: diluía la báscula. */}
                  <TableHead
                    className="text-right"
                    title="Promedio del lote: camiones homogéneos del período. Si no hubo ninguno, la última medición del lote; el baseline del año solo si el lote nunca se ha pesado."
                  >
                    Automático
                  </TableHead>
                  <TableHead className="text-right" title="Solo para esta nómina">Ajuste manual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoBundle ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Cargando promedios...
                    </TableCell>
                  </TableRow>
                ) : !bundleCosecha || bundleCosecha.promedios_por_lote.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No hay lotes con cosechas en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  bundleCosecha.promedios_por_lote.map((p) => {
                    const valorActual = promedioValorActual(p.lote_id);
                    const origen = describirOrigenPromedio(p.origen, p.mediciones_bascula);
                    const fuente = fuentesPromedio.get(p.lote_id);
                    // Con ajuste manual el promedio ya no sale de ningún
                    // camión: lo puso una persona, y la fecha que explica el
                    // número es la de ese ajuste.
                    const esManual = p.promedio_manual != null;
                    const fechaFuente = esManual
                      ? fechasAjusteManual.get(p.lote_id) ?? null
                      : fuente?.fecha ?? null;
                    const fechaFmt = fechaFuente
                      ? new Date(`${fechaFuente.slice(0, 10)}T12:00:00`)
                        .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';
                    const etiquetaFuente = esManual
                      ? 'Ajuste manual'
                      : etiquetaFuentePromedio(p.origen, fuente);
                    return (
                      <TableRow key={p.lote_id}>
                        <TableCell>
                          <span className="block text-muted-foreground">{fechaFmt}</span>
                          <span
                            className={`block text-xs leading-tight ${!esManual && origen && !origen.medido ? 'text-warning' : 'text-muted-foreground'}`}
                            title={esManual ? 'Promedio puesto a mano para esta nómina' : origen?.detalle}
                          >
                            {etiquetaFuente}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{p.lote_nombre}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {/* §9 API_NOMINA — promedios kg/gajo con 4 decimales.
                              `promedio_auto` llega null cuando el lote no tiene
                              ni mediciones ni baseline (2026-11-11). */}
                          {p.promedio_auto != null ? p.promedio_auto.toFixed(4) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            {/* §9 — Backend valida decimal:0,4 en `promedio`.
                                Aceptamos hasta 4 decimales en la entrada. */}
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              className="w-28 text-right"
                              aria-label={`Ajuste manual para ${p.lote_nombre}`}
                              value={valorActual || ''}
                              placeholder={p.promedio_manual != null ? p.promedio_manual.toFixed(4) : '—'}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value);
                                // Redondeo a 4 decimales antes de guardar en state para
                                // no enviar valores con más precisión que la que acepta
                                // el backend (`decimal:0,4`).
                                const val = isNaN(raw) ? 0 : Math.round(raw * 10000) / 10000;
                                setPromediosEditados((prev) => ({ ...prev, [p.lote_id]: val }));
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* F4 — El lote sin camión homogéneo en el período paga una
              estimación, y el otro lado de la conciliación congela esa misma
              estimación: su diferencia da 0 por construcción. En pantalla se
              ve mejor que un lote medido, y es al revés. Hay que decirlo. */}
          {(() => {
            const estimados = (bundleCosecha?.promedios_por_lote ?? [])
              .filter((p) => esPromedioEstimado(p));
            if (estimados.length === 0) return null;
            return (
              <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                <p className="text-sm text-foreground">
                  <span className="font-medium">
                    {estimados.map((p) => p.lote_nombre).join(', ')}
                  </span>
                  {estimados.length === 1 ? ' no tuvo' : ' no tuvieron'} ningún camión homogéneo en
                  este período, así que {estimados.length === 1 ? 'su promedio está estimado' : 'sus promedios están estimados'}.
                  Los dos lados de la comparación usan el mismo número: una diferencia en 0 no
                  confirma que cuadre.
                </p>
              </div>
            );
          })()}

          {hayCambiosPromedios && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-foreground">
              Hay cambios sin guardar. Haz clic en «Guardar cambios» para aplicarlos.
            </p>
          )}

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
            >
              {ajustandoPromedio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save strokeWidth={2} />}
              Guardar cambios
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
              Puedes crear una nómina adicional para el mismo período, por ejemplo para separar administrativos de personal de campo o para un corte de días diferente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {nominasExistentes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/60 p-3">
                <p className="text-sm font-medium text-foreground">
                  {n.etiqueta ?? 'Sin etiqueta'} · {n.fecha_inicio} al {n.fecha_fin}
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
                        className={`rounded-lg p-3 ${sube ? 'bg-warning-soft' : 'bg-destructive-soft'}`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {c.lote_nombre}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Number(c.promedio_original).toFixed(2)} → {Number(c.promedio_nuevo).toFixed(2)} kg/gajo
                          {' '}({sube ? 'sube' : 'baja'} {Math.abs(c.delta).toFixed(2)})
                        </p>
                        <p className="mt-1.5 text-xs text-foreground">
                          Impacta a <strong>{c.colaboradores_impactados} colaborador{c.colaboradores_impactados !== 1 ? 'es' : ''}</strong>
                          {' '}({c.gajos_totales.toLocaleString('es-CO')} gajos):
                          {' '}
                          <strong className={sube ? 'text-warning' : 'text-destructive'}>
                            {sube ? 'sube' : 'baja'} {Math.abs(Math.round(deltaKg)).toLocaleString('es-CO')} kg
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
              {ajustandoPromedio && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar y aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
