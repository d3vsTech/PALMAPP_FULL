import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
} from 'lucide-react';
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
import { operariosApi, type OperarioSelectItem } from '../../../api/terceros';
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
  /**
   * Restauración inicial del paso al volver al wizard:
   *  - URL `/nomina/:id/editar` → si en localStorage el progreso es del mismo
   *    `nominaId`, arrancamos en `pasoActual` guardado. Si no, paso 1.
   *  - URL `/nomina/nueva` → siempre paso 1.
   * El paso queda al final de este hook (no rompe lazy initialization).
   */
  const [pasoActual, setPasoActual] = useState<number>(() => {
    if (esEdicion && idEditar) {
      const p = leerProgresoPersistido();
      if (p && p.nominaId === parseInt(idEditar)) return p.pasoActual;
    }
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
  const [quincena, setQuincena] = useState<'1' | '2' | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

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
  }>>([]);
  const colaboradoresYaAgregados = colaboradoresAgregados.length;
  /** Filtro de la tabla de operarios por empresa (?tercero_id=N). */
  const [filtroTerceroId, setFiltroTerceroId] = useState<string>('todos');
  /**
   * Lookup global de operarios del tenant (id → OperarioSelectItem + cargo).
   * Se usa como fallback para resolver nombres/cargos/empresa cuando
   * `nominaApi.ver()` NO trae el subobjeto `operario` de cada fila
   * `nomina_empleado`. El `cargo` se enriquece en segunda fase desde
   * `operariosApi.listarPorTercero` (el select global no lo trae).
   */
  const [operariosLookup, setOperariosLookup] = useState<
    Map<number, OperarioSelectItem & { cargo?: string | null }>
  >(new Map());

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
  const [ajustandoPromedio, setAjustandoPromedio] = useState(false);

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
      })
      .catch(() => {
        // silencioso — se queda con el default QUINCENAL del useState.
      });
  }, [esEdicion]);

  // Calcular fechas automáticamente
  useEffect(() => {
    if (!mes) {
      setFechaInicio('');
      setFechaFin('');
      return;
    }
    const a = parseInt(ano);
    const m = parseInt(mes);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (periodicidad === 'MENSUAL') {
      setFechaInicio(fmt(new Date(a, m - 1, 1)));
      setFechaFin(fmt(new Date(a, m, 0)));
    } else if (periodicidad === 'QUINCENAL' && quincena === '1') {
      setFechaInicio(fmt(new Date(a, m - 1, 1)));
      setFechaFin(fmt(new Date(a, m - 1, 15)));
    } else if (periodicidad === 'QUINCENAL' && quincena === '2') {
      setFechaInicio(fmt(new Date(a, m - 1, 16)));
      setFechaFin(fmt(new Date(a, m, 0)));
    } else {
      setFechaInicio('');
      setFechaFin('');
    }
  }, [ano, mes, periodicidad, quincena]);

  // Cargar empleados+operarios disponibles al entrar al paso 2.
  // Requiere nominaId — si no existe, no carga.
  useEffect(() => {
    if (pasoActual !== 2 || !nominaId) return;
    if (empleados.length > 0 || operarios.length > 0) return;
    setCargandoEmpleados(true);
    nominaApi
      .empleadosDisponibles(nominaId)
      .then((res) => {
        setEmpleados(res.data.empleados ?? []);
        setOperarios(res.data.operarios ?? []);
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

  // Al abrir el modal, simplemente reseteamos las ediciones locales — los
  // promedios vienen del bundle de cosecha (`promedios_por_lote`), ya cargado.
  // Si el bundle aún no está, se cargará al entrar al paso 3.
  useEffect(() => {
    if (!mostrarAjustePromedios) return;
    setPromediosEditados({});
  }, [mostrarAjustePromedios]);

  /** Guarda los promedios editados — un PUT por cada lote modificado.
   *  El valor original es el `promedio_efectivo` del bundle (que ya considera
   *  el manual sobre el auto). Solo se envía lo que cambió. Tras el batch de
   *  PUTs se recarga el bundle (doc §4.2: "el frontend debe llamar GET
   *  /validar-cosecha después del PUT"). */
  const guardarPromedios = async () => {
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
      setMostrarAjustePromedios(false);
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
  const crearNominaSiHaceFalta = async (): Promise<boolean> => {
    const payload = {
      mes: parseInt(mes),
      anio: parseInt(ano),
      periodicidad,
      quincena: periodicidad === 'QUINCENAL' ? (parseInt(quincena) as 1 | 2) : null,
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
      toast.success('Nómina creada en borrador');
      return true;
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
        toast.error('Ya existe una nómina para ese período');
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
      await nominaApi.agregarEmpleados(nominaId, {
        empleado_ids: empleadosSeleccionados,
        operario_ids: operariosSeleccionados,
      });
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
    // Wizard completado → limpiar progreso persistido.
    try { localStorage.removeItem(STORAGE_KEY_NOMINA_WIZARD); } catch {}
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
          onClick={() => navigate('/nomina')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-primary">
          {esEdicion ? 'Editar Período de Pago' : 'Nuevo Período de Pago'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {esEdicion
            ? 'Modifica el período, agrega más colaboradores y vuelve a validar la cosecha'
            : 'Crea un nuevo período de nómina paso a paso'}
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
                        <SelectItem value="1">Primera Quincena (1-15)</SelectItem>
                        <SelectItem value="2">Segunda Quincena (16-fin de mes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Periodicidad readonly — viene de Configuración → Parámetros de Nómina */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Periodicidad: <span className="text-primary font-bold">{periodicidad === 'QUINCENAL' ? 'Quincenal' : 'Mensual'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Este valor se define en <strong>Configuración → Pagos y Liquidaciones → Parámetros de Nómina</strong>
                    {' '}y aplica a todas las nóminas de la finca.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                  <Input id="fechaInicio" type="date" value={fechaInicio} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha Fin *</Label>
                  <Input id="fechaFin" type="date" value={fechaFin} readOnly />
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
                            {colaboradoresAgregados.map((c, idx) => {
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
                            {empleadosActivos.map((empleado, index) => {
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

              {/* Operarios de terceros — segunda tabla */}
              {(() => {
                // Terceros únicos en la lista, para el filtro.
                const tercerosUnicos = Array.from(
                  new Map(operarios.map((o) => [o.tercero.id, o.tercero])).values(),
                );
                const operariosFiltrados = filtroTerceroId === 'todos'
                  ? operarios
                  : operarios.filter((o) => String(o.tercero.id) === filtroTerceroId);

                return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      Colaboradores Terceros{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({operariosSeleccionados.length} seleccionado{operariosSeleccionados.length !== 1 ? 's' : ''})
                      </span>
                    </p>
                    <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                      Prestación de Servicios
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {tercerosUnicos.length > 1 && (
                      <Select value={filtroTerceroId} onValueChange={setFiltroTerceroId}>
                        <SelectTrigger className="w-56 h-9">
                          <SelectValue placeholder="Filtrar por empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas las empresas</SelectItem>
                          {tercerosUnicos.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.razon_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {operariosFiltrados.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOperariosSeleccionados((prev) =>
                              Array.from(new Set([...prev, ...operariosFiltrados.map((o) => o.id)])),
                            )
                          }
                          disabled={operariosFiltrados.every((o) => operariosSeleccionados.includes(o.id))}
                        >
                          Agregar {filtroTerceroId === 'todos' ? 'Todos' : 'Visibles'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOperariosSeleccionados([])}
                          disabled={operariosSeleccionados.length === 0}
                        >
                          Quitar Todos
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Card className="border-border">
                  <CardContent className="p-0">
                    {operariosFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        {operarios.length === 0
                          ? 'No hay operarios de empresas contratistas disponibles.'
                          : 'No hay operarios para la empresa seleccionada.'}
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
                                Empresa
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Cargo
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {operariosFiltrados.map((op, index) => {
                              const isSelected = operariosSeleccionados.includes(op.id);
                              const partes = op.nombre_completo.split(' ');
                              const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                              return (
                                <tr
                                  key={op.id}
                                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                                    index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${isSelected ? 'bg-amber-500/5' : ''}`}
                                  onClick={() => toggleOperario(op.id)}
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleOperario(op.id)}
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                          isSelected
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                            : 'bg-muted text-muted-foreground border-border'
                                        }`}
                                      >
                                        <span className="text-sm font-bold">{iniciales}</span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-sm">{op.nombre_completo}</span>
                                        <p className="text-xs text-muted-foreground">CC {op.cedula}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm text-muted-foreground">
                                      {op.tercero.razon_social}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm font-medium">{op.cargo}</span>
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
                  onClick={() => setMostrarAjustePromedios(true)}
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
                const diff = bundleCosecha?.diferencia_kg ?? 0;
                const detalle = bundleCosecha?.detalle_por_colaborador ?? [];
                const estadoDif: 'ok' | 'critico' | 'atencion' | 'vacio' =
                  totalColabs === 0 && totalExtr === 0 ? 'vacio'
                    : diff === 0 ? 'ok'
                      : Math.abs(diff) > 500 ? 'critico'
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
                    ? 'Sin diferencias'
                    : estadoDif === 'critico'
                      ? 'Revisar remisiones'
                      : 'Verificar registros';

                return (
                  <>
                    {/* Card resumen totales con datos reales */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold text-foreground">Resumen de Cosecha</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colorBadge}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {labelEstado}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-border">
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
                        <div className="px-6 py-5 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extractora</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-bold text-foreground leading-none">
                              {totalExtr > 0 ? totalExtr.toLocaleString('es-CO') : '—'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <p className="text-xs text-muted-foreground">Viajes FINALIZADOS del período</p>
                          </div>
                        </div>
                        <div className={`px-6 py-5 space-y-2 ${estadoDif === 'ok' ? 'bg-success/5' : estadoDif === 'critico' ? 'bg-destructive/5' : estadoDif === 'atencion' ? 'bg-amber-500/5' : 'bg-muted/10'}`}>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diferencia</p>
                          <div className="flex items-end gap-1.5">
                            <p className={`text-3xl font-bold leading-none ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio' ? '—' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-CO')}`}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${estadoDif === 'ok' ? 'bg-success' : estadoDif === 'critico' ? 'bg-destructive' : estadoDif === 'atencion' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                            <p className={`text-xs font-medium ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio' ? 'No hay datos para comparar' : estadoDif === 'ok' ? 'Cuadre perfecto' : estadoDif === 'critico' ? 'Diferencia significativa' : 'Diferencia menor'}
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
                                    const cosechas = d.cosechas ?? [];
                                    const totalTrab = cosechas.reduce((s, c) => s + c.kg_trabajado, 0);
                                    const totalExtr = cosechas.reduce((s, c) => s + c.kg_extractora, 0);
                                    const diff = totalTrab - totalExtr;
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
                                            <th className="text-right p-2">Gajos T.</th>
                                            <th className="text-right p-2">Gajos V.</th>
                                            <th className="text-right p-2">Dif. G.</th>
                                            <th className="text-right p-2">Kg Trab.</th>
                                            <th className="text-right p-2">Kg Extr.</th>
                                            <th className="text-right p-2">Dif. Kg</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {d.cosechas.map((c, idx) => (
                                            <tr
                                              key={idx}
                                              className={`border-b border-border/40 last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                                            >
                                              <td className="p-2 whitespace-nowrap">{c.fecha}</td>
                                              <td className="p-2">{c.lote}</td>
                                              <td className="p-2 text-muted-foreground">{c.sublote ?? '—'}</td>
                                              <td className="p-2 text-muted-foreground">{c.remision ?? '—'}</td>
                                              <td className="p-2 text-right">{c.gajos_trabajados}</td>
                                              <td className="p-2 text-right">{c.gajos_verificados}</td>
                                              <td className={`p-2 text-right font-semibold ${c.diferencia_gajos === 0 ? 'text-muted-foreground' : c.diferencia_gajos > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                {c.diferencia_gajos > 0 ? '+' : ''}{c.diferencia_gajos}
                                              </td>
                                              <td className="p-2 text-right">{c.kg_trabajado.toLocaleString('es-CO')}</td>
                                              <td className="p-2 text-right">{c.kg_extractora.toLocaleString('es-CO')}</td>
                                              <td className={`p-2 text-right font-semibold ${c.diferencia_kg === 0 ? 'text-muted-foreground' : c.diferencia_kg > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                {c.diferencia_kg > 0 ? '+' : ''}{c.diferencia_kg.toLocaleString('es-CO')}
                                              </td>
                                            </tr>
                                          ))}
                                          {/* Fila TOTALES */}
                                          {(() => {
                                            const totGT = d.cosechas.reduce((s, c) => s + c.gajos_trabajados, 0);
                                            const totGV = d.cosechas.reduce((s, c) => s + c.gajos_verificados, 0);
                                            const totDifG = d.cosechas.reduce((s, c) => s + c.diferencia_gajos, 0);
                                            const totKgT = d.cosechas.reduce((s, c) => s + c.kg_trabajado, 0);
                                            const totKgE = d.cosechas.reduce((s, c) => s + c.kg_extractora, 0);
                                            const totDifKg = totKgT - totKgE;
                                            return (
                                              <tr className="border-t-2 border-primary/40 bg-primary/5 font-semibold">
                                                <td className="p-2 font-bold uppercase text-primary" colSpan={4}>Totales</td>
                                                <td className="p-2 text-right font-bold">{totGT.toLocaleString('es-CO')}</td>
                                                <td className="p-2 text-right font-bold">{totGV.toLocaleString('es-CO')}</td>
                                                <td className={`p-2 text-right font-bold ${totDifG === 0 ? 'text-muted-foreground' : totDifG > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                  {totDifG > 0 ? '+' : ''}{totDifG}
                                                </td>
                                                <td className="p-2 text-right font-bold">{totKgT.toLocaleString('es-CO')} kg</td>
                                                <td className="p-2 text-right font-bold">{totKgE.toLocaleString('es-CO')} kg</td>
                                                <td className={`p-2 text-right font-bold ${totDifKg === 0 ? 'text-success' : totDifKg > 0 ? 'text-amber-600' : 'text-primary'}`}>
                                                  {totDifKg > 0 ? '+' : ''}{totDifKg.toLocaleString('es-CO')} kg
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

                {/* Colaboradores Incluidos — lista los ya persistidos en la
                    nómina con badge Colaborador (verde) o Tercero (ámbar) y
                    salario base / tarifa mensual estimada a la derecha. */}
                <Card className="border-border">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Colaboradores Incluidos ({colaboradoresAgregados.length})
                    </h3>
                    {colaboradoresAgregados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay colaboradores en esta nómina.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {colaboradoresAgregados.map((c) => {
                          const partes = c.nombre.split(' ');
                          const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                          const esOp = c.tipo === 'OP';
                          return (
                            <div
                              key={`col-${c.nominaEmpleadoId}`}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                esOp ? 'bg-amber-500/5' : 'bg-muted/30'
                              }`}
                            >
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                esOp ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary'
                              }`}>
                                <span className="text-sm font-medium">{iniciales}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{c.nombre}</p>
                                  {esOp ? (
                                    <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">
                                      Tercero
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                      Colaborador
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {c.cargo ?? 'Sin cargo'}
                                  {esOp && c.tercero ? ` · ${c.tercero}` : ''}
                                </p>
                              </div>
                              {/* Salario base solo aplica a empleados internos.
                                  Los operarios cobran por labor (no tienen salario/tarifa fija). */}
                              {!esOp && c.salarioBase && c.salarioBase > 0 && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-foreground">
                                    ${c.salarioBase.toLocaleString('es-CO')}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">Salario base</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

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
          disabled={
            pasoActual === 1 || procesando ||
            // En modo CREAR: una vez creada (paso 2+), no se puede volver atrás
            // porque cambiar el período de una nómina existente requiere PUT y
            // si hay liquidados el backend lo rechazaría.
            // En modo EDITAR: sí permitimos volver al paso 1 para reintentar PUT.
            (!esEdicion && pasoActual === 2 && !!nominaId)
          }
          className="gap-2"
          title={!esEdicion && pasoActual === 2 && nominaId ? 'La nómina ya está creada, no puedes cambiar el período' : undefined}
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
      <Dialog open={mostrarAjustePromedios} onOpenChange={setMostrarAjustePromedios}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle>Ajustar Promedios por Lote</DialogTitle>
                <DialogDescription className="mt-1">
                  Kg promedio por gajo para esta nómina. El "Auto" lo calcula el sistema
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

            const diff = totalColabs - totalExtr;
            const estado: 'ok' | 'critico' | 'atencion' =
              Math.abs(diff) < 1 ? 'ok' : Math.abs(diff) > 500 ? 'critico' : 'atencion';
            const colorPunto = estado === 'ok' ? 'bg-success' : estado === 'critico' ? 'bg-destructive' : 'bg-amber-500';
            const colorTexto = estado === 'ok' ? 'text-success' : estado === 'critico' ? 'text-destructive' : 'text-amber-700';
            const label = estado === 'ok' ? 'Sin diferencias' : estado === 'critico' ? 'Revisar remisiones' : 'Verificar registros';
            const hayEdiciones = Object.keys(promediosEditados).length > 0 && hayCambiosPromedios;

            return (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Resumen de Cosecha</p>
                    {hayEdiciones && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
                        Preview con ajustes
                      </Badge>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colorTexto}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colorPunto}`} />
                    {label}
                  </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Colaboradores
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(totalColabs).toLocaleString('es-CO')} <span className="text-sm text-muted-foreground font-normal">kg</span>
                    </p>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Extractora
                    </p>
                    <p className="text-2xl font-bold">
                      {totalExtr.toLocaleString('es-CO')} <span className="text-sm text-muted-foreground font-normal">kg</span>
                    </p>
                  </div>
                  <div className={`px-6 py-4 ${estado === 'ok' ? 'bg-success/5' : estado === 'critico' ? 'bg-destructive/5' : 'bg-amber-500/5'}`}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Diferencia
                    </p>
                    <p className={`text-2xl font-bold ${colorTexto}`}>
                      {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString('es-CO')}
                      <span className="text-sm text-muted-foreground font-normal ml-1">kg</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabla de promedios por lote (solo lotes con cosechas en el período) */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="text-left p-3 pl-5 font-semibold">Lote</th>
                  <th className="text-right p-3 font-semibold">
                    Auto <span className="font-normal text-[10px] block leading-tight">(viajes período)</span>
                  </th>
                  <th className="text-right p-3 font-semibold">
                    Manual <span className="font-normal text-[10px] block leading-tight">(esta nómina)</span>
                  </th>
                  <th className="text-right p-3 pr-5 font-semibold">
                    Efectivo <span className="font-normal text-[10px] block leading-tight">(kg/gajo)</span>
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
                    const efectivoMostrado = valorActual > 0 ? valorActual : p.promedio_efectivo;
                    return (
                      <tr
                        key={p.lote_id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 pl-5 font-medium text-sm">{p.lote_nombre}</td>
                        <td className="p-3 text-right text-sm text-muted-foreground">
                          {p.promedio_auto.toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
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
                        <td className="p-3 pr-5 text-right text-sm font-semibold text-primary">
                          {efectivoMostrado.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Manual</strong> sobrescribe el promedio efectivo solo para esta nómina —
            no afecta los promedios históricos de viajes (tabla `promedio_lote` es de solo lectura).
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMostrarAjustePromedios(false)}
              disabled={ajustandoPromedio}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarPromedios}
              disabled={ajustandoPromedio || !hayCambiosPromedios}
              className="gap-2"
            >
              {ajustandoPromedio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
