import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { MultiSelectColaboradores } from '../../components/operaciones/MultiSelectColaboradores';
import { SelectActividadLabor } from '../../components/operaciones/SelectActividadLabor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  Save,
  Check,
  FileText,
  Leaf,
  Scissors,
  Droplets,
  Shield,
  Wrench,
  ClipboardList,
  Clock,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { operacionesApi, cosechasApi, jornalesApi, jornalGruposApi, horasExtraApi, ausenciasApi, selectsApi } from '../../../api/operaciones';
import { configuracionApi, ConfiguracionErrorCodes } from '../../../api/configuracion';
import { toast } from 'sonner';

// Los fertilizantes se cargan desde Configuración → Insumos vía el bundle
// `selectsApi.wizardInit` (campo `parametricas.insumos`). Se persisten en
// `insumosLista` (nombres) e `insumosMap` (nombre → id). El Select de tipo
// de fertilizante usa `insumosLista`. La opción "Otro" queda como fallback
// para texto libre.

// Las labores de Finca se cargan desde el API (`/v1/tenant/labores/select`,
// §4 del doc paramétricas) — se guardan en `laboresLista` al montar el wizard.

// Los motivos de ausentismo vienen del catálogo del tenant vía
// `parametricas.motivos_ausencia` (se cargan en `motivosLista` al montar).
// La opción "Otro" se añade en el Select para permitir texto libre.

// Tipos de horas extras
const tiposHoraExtra = [
  'Hora Extra Diurna',
  'Hora Extra Nocturna',
  'Hora Extra Dominical',
  'Hora Extra Festiva',
  'Recargo Nocturno',
  'Recargo Dominical',
];

interface TrabajoCosecha {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  gajosRecogidos: number;
  kilos: number;
}

/**
 * Campo común opcional para los 5 tipos de labores de palma con N miembros.
 *
 * Cuando la tarjeta representa un GRUPO persistido en el backend (`jornal_grupos`),
 * este campo lleva el id numérico del grupo (como string). Cuando la tarjeta
 * es un jornal INDIVIDUAL (1 colaborador), este campo es `undefined` y el `id`
 * apunta al `jornales.id` clásico.
 *
 * El wizard usa esta bandera para decidir qué endpoint llamar al persistir:
 *   - N === 1 sin grupoId  → jornalesApi (bulk POST / PUT individual)
 *   - N >= 2 sin grupoId   → jornalGruposApi.crear (nuevo grupo)
 *   - grupoId presente     → jornalGruposApi.editar (grupo existente)
 */
interface TrabajoPlateo {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoPoda {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoFertilizacion {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  palmas: number;
  tipoFertilizante: string;
  otroFertilizante?: string;
  cantidadGramos: number;
}

interface TrabajoSanidad {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  /** Nombre visible del trabajo. Snapshot para render. */
  trabajoRealizado: string;
  /**
   * §4.7 LABORES_JORNALES — FK a `labor_actividades`. Se envía al backend
   * cuando existe. `null` significa "texto libre" (histórico o el usuario
   * escribió a mano) — el backend acepta ambos casos en SANIDAD.
   */
  laborActividadId?: number | null;
}

interface TrabajoOtros {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  /**
   * Referencia al catálogo unificado de Labores (categoria=PALMA, custom, tipo=null).
   * El wizard envía `labor_id = laborOtrosRawId` al endpoint unificado.
   */
  laborOtrosKey?: string;          // ej. "palma-3"
  laborOtrosRawId?: number;
  /** Snapshot del `tipo_pago` de la labor — define qué campos pinta el form
   *  (POR_PALMA → cantidad_palmas; JORNAL_FIJO → nombre_trabajo). */
  laborOtrosTipoPago?: 'POR_PALMA' | 'JORNAL_FIJO';
  nombre: string;
  laborRealizada: string;
  /**
   * §4.7 LABORES_JORNALES — FK a `labor_actividades`. Ver nota en
   * `TrabajoSanidad.laborActividadId`.
   */
  laborActividadId?: number | null;
  /** Solo POR_PALMA — autofill desde sublote.cantidad_palmas, editable. */
  numeroPalmas?: number;
  /** Solo JORNAL_FIJO — opcional, texto libre para detallar el trabajo. */
  nombreTrabajo?: string;
  lote: string;
  sublote: string;
}

interface TrabajoAuxiliar {
  id: string;
  nombre: string;
  labor: string;
  otraLabor?: string;
  lugar: string;
}

interface AusenteRegistro {
  id: string;
  colaboradorId: string;
  motivo: string;
  otroMotivo?: string;
  /**
   * ID del motivo del catálogo (`motivos_ausencia.id`) — se guarda al cargar
   * la planilla desde el backend para que el render pueda resolver el nombre
   * contra `motivosMap` incluso si al momento del prefill ese mapa no estaba
   * listo (evita mostrar texto libre viejo en lugar del nombre correcto).
   */
  motivoAusenciaId?: number;
}

interface HoraExtra {
  id: string;
  colaboradorId: string;
  tipoHora: string;
  numeroHoras: number;
  observacion: string;
}

const ETAPAS = [
  { numero: 1, nombre: 'Info. General' },
  { numero: 2, nombre: 'Labores de Palma' },
  { numero: 3, nombre: 'Labores de Finca' },
  { numero: 4, nombre: 'Horas Extras' },
  { numero: 5, nombre: 'Finalización' },
];

interface NuevaPlanillaWizardProps {
  modoLectura?: boolean;
}

/**
 * Chip con el nombre de un colaborador/operario para las tarjetas de palma.
 *
 * Estados visuales (§3.2 y §3.2.1):
 *  - Operario de tercero → fondo naranja, badge del nombre del tercero.
 *  - Empleado propio con `modalidad_pago = 'FIJO'` → badge extra gris
 *    "FIJO · $0" para dejar claro que su jornal cierra en cero (la nómina
 *    lo paga por salario_base).
 *  - Empleado propio con `modalidad_pago = 'PRODUCCION'` → chip neutro.
 */
function ColaboradorChip({
  col,
}: {
  col: {
    id: string;
    nombres: string;
    apellidos: string;
    terceroNombre?: string;
    modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
  };
}) {
  const esFijo = !col.terceroNombre && col.modalidad_pago === 'FIJO';
  const primerApellido = (col.apellidos || '').split(' ')[0] ?? '';
  const nombreCorto = `${col.nombres} ${primerApellido}`.trim();
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        col.terceroNombre
          ? 'bg-orange-50 text-orange-800 border-orange-300'
          : esFijo
            ? 'bg-muted/60 text-muted-foreground border-border'
            : ''
      }`}
      title={
        col.terceroNombre
          ? `Tercero · ${col.terceroNombre}`
          : esFijo
            ? 'Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base.'
            : 'Colaborador interno · pago por producción'
      }
    >
      {nombreCorto}
      {col.terceroNombre && (
        <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide bg-orange-200/70 text-orange-900 rounded px-1 py-[1px]">
          {col.terceroNombre}
        </span>
      )}
      {esFijo && (
        <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide bg-slate-200 text-slate-700 rounded px-1 py-[1px]">
          FIJO · $0
        </span>
      )}
    </Badge>
  );
}

export default function NuevaPlanillaWizard({ modoLectura = false }: NuevaPlanillaWizardProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: idParam } = useParams<{ id?: string }>();
  const isEditMode = Boolean(idParam) && !modoLectura;
  const [etapaActual, setEtapaActual] = useState(1);
  const [estadoPlanilla, setEstadoPlanilla] = useState<string>('');
  const [aprobando, setAprobando] = useState(false);
  // Modal de confirmación con la lista de personas faltantes (cobertura).
  // Se abre solo si el backend reporta `tiene_faltantes = true` antes de
  // aprobar la planilla. El usuario decide si aprueba con faltantes o
  // vuelve a editar.
  const [coberturaFaltantes, setCoberturaFaltantes] = useState<
    import('../../../api/operaciones').CoberturaPlanilla | null
  >(null);
  // Diferencia el contexto del modal de cobertura:
  //   - 'aprobar' → botones "Volver a editar" + "Aprobar de todas formas".
  //   - 'guardar' → botones "Volver a editar" + "Ir al listado".
  const [coberturaModo, setCoberturaModo] = useState<'aprobar' | 'guardar'>('aprobar');
  // Alerta informativa: la planilla está completamente vacía o hay
  // colaboradores sin actividad. NO bloquea — muestra el modal con la
  // opción de "Continuar de todas formas" según `accionPendiente`.
  const [alertaPlanillaVacia, setAlertaPlanillaVacia] = useState(false);
  /**
   * Acción que el usuario intentó cuando se disparó una alerta informativa
   * (planilla vacía / cobertura incompleta). Al confirmar "Continuar de
   * todas formas" desde el modal, ejecutamos la acción original.
   */
  const [accionPendiente, setAccionPendiente] = useState<'aprobar' | 'guardar' | null>(null);

  // ── Estado planilla ID + loading ─────────────────────────────────────────
  const [planillaId, setPlanillaId] = useState<number | null>(idParam ? Number(idParam) : null);
  const [guardando, setGuardando] = useState(false);
  /** Se vuelve true tras un Guardado exitoso (explícito o autosave). Inhibe el
   *  autosave al desmontar para que no dispare un segundo POST que duplicaría
   *  los jornales/cosechas/horas-extra/ausencias del flujo legacy. */
  const [planillaPersistida, setPlanillaPersistida] = useState(false);
  const [resumen, setResumen] = useState<import('../../../api/operaciones').Resumen | null>(null);

  const cargarResumen = async (pid: number) => {
    try {
      const r = await operacionesApi.resumen(pid);
      setResumen(r.data);
    } catch {}
  };

  /**
   * Decodifica el id local del selector de persona en el shape XOR del payload
   * (§3.1 y §3.2 de API_OPERACIONES.md). Empleado propio = id numérico.
   * Operario de tercero = id con prefijo 'O_'.
   */
  const decodeIdPersona = (cid: string): { empleado_id?: number; operario_id?: number } => {
    if (typeof cid === 'string' && cid.startsWith('O_')) {
      const n = parseInt(cid.slice(2), 10);
      return Number.isFinite(n) ? { operario_id: n } : {};
    }
    const n = parseInt(cid, 10);
    return Number.isFinite(n) ? { empleado_id: n } : {};
  };

  /**
   * Codifica al revés: dado un jornal o miembro de cuadrilla del backend, lo
   * convierte al id local del wizard (`'10'` para empleado, `'O_5'` para
   * operario). Si el backend devuelve ambos (no debería pasar por XOR), prioriza
   * `empleado_id` porque históricamente el wizard solo manejaba empleados.
   */
  const encodeIdFromBackend = (item: { empleado_id?: number | null; operario_id?: number | null }): string => {
    if (item.empleado_id != null) return String(item.empleado_id);
    if (item.operario_id != null) return 'O_' + String(item.operario_id);
    return '';
  };

  /**
   * Distingue si un id es del backend (numérico puro, ej. `'123'`) o local
   * generado en el wizard (ej. `'plateo-1750000000000'`).
   *
   * Se usa en el guardado para decidir si se hace POST (crear) o PUT (editar)
   * de cada jornal/cosecha. Sin esto, editar una planilla existente duplicaría
   * los registros en el backend al pulsar "Guardar Planilla".
   */
  const isBackendId = (id: string): boolean => /^\d+$/.test(id);

  /**
   * Dirty tracking: snapshot serializado de cada item hidratado del backend
   * al abrir la planilla en modo edición. Al guardar, comparamos el estado
   * actual contra el snapshot y solo enviamos PUT para los items que cambiaron.
   * Evita gatillar N PUTs cuando el usuario solo tocó la fecha del paso 1.
   *
   * Clave: `${bucket}:${backendId}` (ej. "plateo:346", "cosecha:12").
   * Valor: `JSON.stringify(item)` al momento de la hidratación.
   */
  const snapshotItemsRef = useRef<Map<string, string>>(new Map());
  const snapshotKey = (bucket: string, id: string) => `${bucket}:${id}`;
  /** Serializa un item de forma determinista para comparar. */
  const serializarItem = (item: unknown): string => {
    try { return JSON.stringify(item); } catch { return ''; }
  };
  /** true si el item viene del backend y no coincide con su snapshot. */
  const itemCambio = (bucket: string, item: { id: string }): boolean => {
    if (!isBackendId(item.id)) return false; // item nuevo, aplica POST
    const original = snapshotItemsRef.current.get(snapshotKey(bucket, item.id));
    if (!original) return true; // sin snapshot = asumir cambio (defensivo)
    return original !== serializarItem(item);
  };
  /** Registra el snapshot inicial de todos los items de un bucket. */
  const guardarSnapshot = (bucket: string, items: Array<{ id: string }>) => {
    items.forEach((it) => {
      if (isBackendId(it.id)) {
        snapshotItemsRef.current.set(snapshotKey(bucket, it.id), serializarItem(it));
      }
    });
  };

  // ── Datos de catálogos cargados desde API (reemplazan al mockData del diseño) ──
  /**
   * Lista combinada de colaboradores + operarios para el selector de "Persona"
   * en jornales y cuadrillas (§3.1 y §3.2 de API_OPERACIONES.md).
   *  - Empleados propios: `id = String(empleado.id)`.
   *  - Operarios de tercero: `id = 'O_' + String(operario.id)`. El prefijo nos
   *    sirve de discriminador para decidir si al guardar enviamos `empleado_id`
   *    u `operario_id` (XOR). Ver `decodeIdPersona()`.
   *
   * `terceroNombre` solo aparece en operarios — la UI lo pinta con badge
   * naranja al lado del nombre en el dropdown.
   */
  const [colaboradores, setColaboradores] = useState<Array<{
    id: string;
    nombres: string;
    apellidos: string;
    nombre_completo: string;
    /**
     * Solo presente en empleados propios. Los operarios de tercero no
     * usan este campo (siempre cobran por producción vía tercero).
     *
     * `FIJO`: la nómina paga por `salario_base`; los jornales quedan en
     * `valor_total = 0.00`. Se pinta un badge en la UI para que el
     * operador entienda por qué el pago diario es 0.
     * `PRODUCCION`: cobra por lo trabajado.
     */
    modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
    /** Solo presente en operarios. */
    terceroNombre?: string;
    _raw?: any;
  }>>([]);
  const [lotesData, setLotesData] = useState<Array<{id: string; nombre: string}>>([]);
  const [sublotes, setSublotes] = useState<Array<{id: string; nombre: string; loteId: string; cantidadPalmas: number}>>([]);

  // Mapas auxiliares para resolver nombres → IDs al guardar
  const [insumosMap, setInsumosMap] = useState<Map<string, number>>(new Map());
  /** Labores de FINCA: nombre → id (catálogo unificado, categoria='FINCA'). */
  const [laboresMap, setLaboresMap] = useState<Map<string, number>>(new Map());
  /**
   * Labores fijas de PALMA: tipo → id. Una sola por tenant para cada uno de
   * PLATEO, PODA, FERTILIZACION, SANIDAD (y COSECHA, aunque se usa el endpoint
   * dedicado). Se llena con `es_sistema=true` del catálogo PALMA.
   */
  const [palmaTipoToId, setPalmaTipoToId] = useState<Map<string, number>>(new Map());
  /** Snapshot de las labores fijas de PALMA para conocer su `tipo_pago`. */
  const [palmaFijasInfo, setPalmaFijasInfo] = useState<Map<string, { id: number; tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO' }>>(new Map());
  /**
   * Overrides activos de precio/modo por tercero+labor (ver §1.1 de
   * API_OPERACIONES.md). Vienen del bundle. Se usan en
   * `resolverPrecioPersonaLabor` y `overrideForTerceroLabor` para preview
   * cuando la persona elegida en un jornal es un operario de tercero.
   */
  const [terceroLaborOverrides, setTerceroLaborOverrides] = useState<
    import('../../../api/operaciones').TerceroLaborOverride[]
  >([]);

  /**
   * Lookup `(tercero_id:labor_id) → override`. Sirve para preview en O(1)
   * en cualquier punto del wizard que quiera mostrar el precio efectivo
   * antes de enviar al backend (el backend igualmente recalcula).
   */
  const overrideForTerceroLabor = useMemo(() => {
    const map = new Map<string, import('../../../api/operaciones').TerceroLaborOverride>();
    for (const o of terceroLaborOverrides) {
      map.set(`${o.tercero_id}:${o.labor_id}`, o);
    }
    return map;
  }, [terceroLaborOverrides]);

  /**
   * Indica si el id local del wizard corresponde a un operario con override
   * configurado para la `labor_id` dada. Útil para mostrar un indicador
   * "precio personalizado" junto al chip del operario en los selects.
   */
  const tieneOverrideOperario = (cid: string, laborId: number | undefined): boolean => {
    if (!laborId || !cid.startsWith('O_')) return false;
    const op = colaboradores.find((c) => c.id === cid);
    const terceroId = (op?._raw as { tercero_id?: number } | undefined)?.tercero_id;
    if (!terceroId) return false;
    return overrideForTerceroLabor.has(`${terceroId}:${laborId}`);
  };
  const [motivosMap, setMotivosMap] = useState<Map<string, number>>(new Map());
  const [tiposHoraExtraMap, setTiposHoraExtraMap] = useState<Map<string, number>>(new Map());
  const [insumosLista, setInsumosLista] = useState<string[]>([]);
  const [laboresLista, setLaboresLista] = useState<string[]>([]);
  const [motivosLista, setMotivosLista] = useState<string[]>([]);
  const [tiposHoraExtraLista, setTiposHoraExtraLista] = useState<string[]>([]);
  /**
   * Catálogo para el select "Nombre" del tab OTROS — labores custom de palma
   * (categoria='PALMA', es_sistema=false, tipo=null) del catálogo unificado.
   * Se envía `labor_id = rawId` al endpoint /jornales.
   *
   * `tipo_pago` viaja con el item para que al elegirlo en el dropdown el form
   * sepa repintarse (§10 doc API_OPERACIONES.md): POR_PALMA muestra Número de
   * Palmas (autofill desde sublote); JORNAL_FIJO muestra Nombre del Trabajo.
   */
  type LaborOtrosOpcion = {
    key: string;
    nombre: string;
    rawId: number;
    tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
  };
  const [laboresOtrosOpciones, setLaboresOtrosOpciones] = useState<LaborOtrosOpcion[]>([]);
  /**
   * §19 API_PARAMETRICAS — actividades predefinidas indexadas por `labor_id`.
   * Alimenta el select "Trabajo realizado" en las tabs SANIDAD y OTROS.
   * Puede quedar vacío si el tenant aún no ha creado actividades.
   */
  const [actividadesPorLabor, setActividadesPorLabor] = useState<
    Record<string, Array<{ id: number; labor_id: number; nombre: string }>>
  >({});

  /** Planilla cruda traída por `wizard-init`. La consume el useEffect de
   *  prefill más abajo para hidratar los estados del wizard sin disparar una
   *  segunda petición a `/operaciones/{id}`. */
  const [planillaBundle, setPlanillaBundle] = useState<(import('../../../api/operaciones').Planilla & Record<string, any>) | null>(null);

  /**
   * Bundle único de inicialización del wizard.
   *
   * Antes: 9–10 peticiones al montar (7 catálogos + sublotes en serie + ver +
   * resumen) que tardaban 6–8 s. Ahora una sola petición a
   * `GET /operaciones[/{id}]/wizard-init` trae todos los catálogos cacheados
   * por tenant + la planilla con sus relaciones + el resumen calculado.
   *
   * Se vuelve a disparar si cambia `idParam`/`isEditMode`/`modoLectura`
   * (navegación entre planillas dentro del SPA).
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = idParam ? Number(idParam) : undefined;
        const bundle = await operacionesApi.wizardInit(id);
        if (cancelled) return;

        const { parametricas, planilla, resumen: resumenData } = bundle.data;

        // ── Catálogos ─────────────────────────────────────────────────────
        // Labores PALMA: separar fijas (es_sistema=true, tipo!=null) de las
        // custom (es_sistema=false, tipo=null). Las fijas alimentan los 5
        // tabs específicos; las custom alimentan el dropdown del tab OTROS.
        const palmaItems = parametricas.labores_palma ?? [];
        const tipoMap = new Map<string, number>();
        const infoMap = new Map<string, { id: number; tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO' }>();
        // Las 5 tabs específicas (Cosecha/Plateo/Poda/Fertilización/Sanidad)
        // se alimentan de las labores fijas de esos 5 tipos. Excluimos la
        // fija OTROS a propósito — va al catálogo del tab OTROS junto con
        // las labores custom.
        palmaItems
          .filter((x: any) => x.es_sistema === true && x.tipo && x.tipo !== 'OTROS')
          .forEach((x: any) => {
            tipoMap.set(x.tipo, x.id);
            infoMap.set(x.tipo, { id: x.id, tipo_pago: x.tipo_pago });
          });
        setPalmaTipoToId(tipoMap);
        setPalmaFijasInfo(infoMap);
        // §19: actividades predefinidas para el select "Trabajo realizado"
        // en las tabs SANIDAD y OTROS. Ya viene indexado por labor_id.
        setActividadesPorLabor((parametricas as any).actividades_por_labor ?? {});

        // Tab OTROS (§3 API_OPERACIONES agosto 2026): la fija OTROS del sistema
        // (`es_sistema=true`, `tipo='OTROS'`) + labores custom PALMA
        // (`es_sistema=false`, `tipo=null`). Excluimos labores custom heredadas
        // del código legacy que se llamaban "Otros" (evita duplicar la fija).
        const opcionesPalma: LaborOtrosOpcion[] = palmaItems
          .filter((x: any) =>
            (x.es_sistema === true && x.tipo === 'OTROS') ||
            (x.es_sistema !== true && x.tipo == null &&
             (x.nombre ?? '').trim().toLowerCase() !== 'otros'),
          )
          .map((x: any) => ({
            key: `palma-${x.id}`,
            nombre: x.nombre,
            rawId: x.id,
            tipo_pago: (x.tipo_pago === 'POR_PALMA' ? 'POR_PALMA' : 'JORNAL_FIJO') as 'POR_PALMA' | 'JORNAL_FIJO',
          }));
        setLaboresOtrosOpciones(opcionesPalma);

        // 1. Colaboradores propios (empleado_id en payloads).
        const empleadosLista = (parametricas.colaboradores ?? []).map((c: any) => {
          let nombres   = c.primer_nombre   ?? c.nombres   ?? c.nombre   ?? '';
          let apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? '';
          const nombreCompletoApi = c.nombre_completo ?? c.full_name ?? c.name ?? '';

          // Si no llegan separados pero sí llega el completo, partirlo en 2
          // mitades para que el badge muestre algo (en vez de quedar vacío y
          // verse como un bloque verde).
          if ((!nombres && !apellidos) && nombreCompletoApi) {
            const partes = String(nombreCompletoApi).trim().split(/\s+/);
            const mid = Math.ceil(partes.length / 2);
            nombres   = partes.slice(0, mid).join(' ');
            apellidos = partes.slice(mid).join(' ');
          }
          if (!nombres && !apellidos) {
            nombres = `Colaborador`;
            apellidos = String(c.id);
          }
          const nombreCompleto = nombreCompletoApi || `${nombres} ${apellidos}`.trim();
          return {
            id: String(c.id),
            nombres,
            apellidos,
            nombre_completo: nombreCompleto,
            // La UI pinta un badge cuando `modalidad_pago === 'FIJO'`
            // para explicar por qué el jornal cerrará en $0 (§3.2).
            modalidad_pago: c.modalidad_pago as ('FIJO' | 'PRODUCCION' | string | undefined),
            _raw: c,
          };
        });

        // 2. Operarios de terceros (operario_id en payloads). Vienen del bundle
        // como `parametricas.operarios` (§7 de API_OPERACIONES.md). El id se
        // prefijo con 'O_' para distinguirlo del empleado al guardar.
        const operariosLista = (parametricas.operarios ?? []).map((op: any) => {
          const nombreCompleto = String(op.nombre_completo ?? '').trim() || `Operario ${op.id}`;
          const partes = nombreCompleto.split(/\s+/);
          const mid = Math.ceil(partes.length / 2);
          const nombres = partes.slice(0, mid).join(' ');
          const apellidos = partes.slice(mid).join(' ');
          return {
            id: 'O_' + String(op.id),
            nombres,
            apellidos,
            nombre_completo: nombreCompleto,
            terceroNombre: String(op.tercero_nombre ?? ''),
            _raw: op,
          };
        });

        setColaboradores([...empleadosLista, ...operariosLista]);

        // Overrides de precio/modo por tercero — los usaremos en
        // `resolverPrecioPersonaLabor(labor, persona, overrides)` para mostrar
        // el preview correcto cuando se elige un operario en un jornal.
        const overrides = (parametricas as any).tercero_labor_overrides ?? [];
        setTerceroLaborOverrides(overrides);

        setLotesData((parametricas.lotes ?? []).map((l: any) => ({ id: String(l.id), nombre: l.nombre })));

        setSublotes((parametricas.sublotes ?? []).map((s: any) => ({
          id: String(s.id),
          nombre: s.nombre,
          loteId: String(s.lote_id),
          cantidadPalmas: Number(s.cantidad_palmas ?? (s as any).palmas ?? 0),
        })));

        const insumos = (parametricas.insumos ?? []).map((i: any) => ({ nombre: i.nombre as string, id: i.id as number }));
        // El dropdown "Labor" del Paso 3 solo lista labores de FINCA.
        const laboresFinca = (parametricas.labores_finca ?? []).map((l: any) => ({ nombre: l.nombre as string, id: l.id as number }));
        const motivos = (parametricas.motivos_ausencia ?? []).map((m: any) => ({ nombre: m.nombre as string, id: m.id as number }));
        const tipos   = (parametricas.tipos_hora_extra ?? []).map((t: any) => ({ nombre: t.nombre as string, id: t.id as number }));
        setInsumosMap(new Map(insumos.map((x: any) => [x.nombre, x.id] as [string, number])));
        setLaboresMap(new Map(laboresFinca.map((x: any) => [x.nombre, x.id] as [string, number])));
        setMotivosMap(new Map(motivos.map((x: any) => [x.nombre, x.id] as [string, number])));
        setTiposHoraExtraMap(new Map(tipos.map((x: any) => [x.nombre, x.id] as [string, number])));
        setInsumosLista(insumos.map((x: any) => x.nombre));
        setLaboresLista(laboresFinca.map((x: any) => x.nombre));
        setMotivosLista(motivos.map((x: any) => x.nombre));
        setTiposHoraExtraLista(tipos.map((x: any) => x.nombre));

        // ── Planilla + resumen (modo edición/lectura) ─────────────────────
        // El segundo useEffect (prefill desde API) lee `planillaBundle` y
        // dispara la hidratación cuando hay valores. Setearlos aquí evita
        // una segunda petición HTTP.
        if (resumenData) setResumen(resumenData);
        setPlanillaBundle(planilla ?? null);
      } catch (e) {
        if (!cancelled) console.warn('Error cargando wizard-init:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [idParam, isEditMode, modoLectura]);


  // Información General
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [elaboradoPor, setElaboradoPor] = useState(user?.nombre ?? '');

  // Sincroniza el nombre del usuario logueado al campo "Elaborado por" en cuanto
  // el AuthContext termina de cargar (puede llegar tarde por su naturaleza async).
  useEffect(() => {
    if (user?.nombre && !elaboradoPor) setElaboradoPor(user.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.nombre]);
  const [huboLluvia, setHuboLluvia] = useState<'si' | 'no' | ''>('');
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('06:00');
  
  // Observaciones y Ausentes (Final)
  const [observaciones, setObservaciones] = useState('');
  const [ausentes, setAusentes] = useState<AusenteRegistro[]>([]);
  const [colaboradorAusenteSeleccionado, setColaboradorAusenteSeleccionado] = useState('');
  const [motivoAusenteSeleccionado, setMotivoAusenteSeleccionado] = useState('');
  const [otroMotivoAusente, setOtroMotivoAusente] = useState('');
  
  // Estados de trabajos
  const [trabajosCosecha, setTrabajosCosecha] = useState<TrabajoCosecha[]>([]);
  const [cosechaEnEdicion, setCosechaEnEdicion] = useState<TrabajoCosecha | null>(null);
  const [trabajosPlateo, setTrabajosPlateo] = useState<TrabajoPlateo[]>([]);
  const [plateoEnEdicion, setPlateoEnEdicion] = useState<TrabajoPlateo | null>(null);
  const [trabajosPoda, setTrabajosPoda] = useState<TrabajoPoda[]>([]);
  const [podaEnEdicion, setPodaEnEdicion] = useState<TrabajoPoda | null>(null);
  const [trabajosFertilizacion, setTrabajosFertilizacion] = useState<TrabajoFertilizacion[]>([]);
  const [fertilizacionEnEdicion, setFertilizacionEnEdicion] = useState<TrabajoFertilizacion | null>(null);
  const [trabajosSanidad, setTrabajosSanidad] = useState<TrabajoSanidad[]>([]);
  const [sanidadEnEdicion, setSanidadEnEdicion] = useState<TrabajoSanidad | null>(null);
  const [trabajosOtros, setTrabajosOtros] = useState<TrabajoOtros[]>([]);
  const [otrosEnEdicion, setOtrosEnEdicion] = useState<TrabajoOtros | null>(null);
  /**
   * Flag local del select "Trabajo Realizado" del tab OTROS: `true` cuando el
   * usuario eligió "Otra" para escribir una labor nueva. Se resetea al cerrar
   * el form (cancelar/guardar) o al elegir una labor del catálogo.
   */
  const [otrosModoOtra, setOtrosModoOtra] = useState(false);
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);
  const [auxiliarEnEdicion, setAuxiliarEnEdicion] = useState<TrabajoAuxiliar | null>(null);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);
  const [horaExtraEnEdicion, setHoraExtraEnEdicion] = useState<HoraExtra | null>(null);

  // Alerta de planilla duplicada (popup grande)
  const [alertaDuplicada, setAlertaDuplicada] = useState(false);

  // ── Refs para auto-scroll a formularios inline al abrirlos ────────────────
  const formRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setFormRef = (key: string) => (el: HTMLDivElement | null) => {
    formRefs.current[key] = el;
  };
  useEffect(() => {
    // Toma el primer form en edición y hace scroll suave hacia él.
    const open: string | null =
      cosechaEnEdicion ? 'cosecha' :
      plateoEnEdicion ? 'plateo' :
      podaEnEdicion ? 'poda' :
      fertilizacionEnEdicion ? 'fertilizacion' :
      sanidadEnEdicion ? 'sanidad' :
      otrosEnEdicion ? 'otros' :
      auxiliarEnEdicion ? 'auxiliar' :
      horaExtraEnEdicion ? 'horaExtra' :
      null;
    if (!open) return;
    requestAnimationFrame(() => {
      formRefs.current[open]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [
    cosechaEnEdicion, plateoEnEdicion, podaEnEdicion, fertilizacionEnEdicion,
    sanidadEnEdicion, otrosEnEdicion, auxiliarEnEdicion, horaExtraEnEdicion,
  ]);

  // ── Prefill desde API en modo edición o lectura ─────────────────────────
  // El bundle `wizard-init` ya trae la planilla y el resumen; este effect solo
  // hidrata los estados del wizard a partir del objeto en memoria. Antes hacía
  // 2 peticiones HTTP adicionales (`ver` + `resumen`) que ya están en el bundle.
  useEffect(() => {
    if (!idParam) return;
    if (!isEditMode && !modoLectura) return;
    if (!planillaBundle) return; // todavía no llega el bundle
    let cancelled = false;
    (async () => {
      try {
        const p: any = planillaBundle ?? {};
        if (cancelled) return;
        setEstadoPlanilla(String(p.estado ?? ''));
        const fechaRaw = p.fecha ?? '';
        const fechaNorm = typeof fechaRaw === 'string'
          ? (fechaRaw.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '')
          : '';
        if (fechaNorm) setFecha(fechaNorm);
        if (p.hora_inicio) setInicioLabores(String(p.hora_inicio).slice(0, 5));
        // DEBUG: qué llega del backend para la lluvia. Si el usuario
        // reporta "aparece No aunque puse Sí", este log revela si el
        // problema es de hidratación o de persistencia (backend).
        console.log(
          '[wizard-init][lluvia] hubo_lluvia:', p.hubo_lluvia,
          '(typeof:', typeof p.hubo_lluvia + ')',
          '· cantidad_lluvia:', p.cantidad_lluvia,
        );
        // Hidratación defensiva: solo actualizamos el estado si el backend
        // envía un valor reconocible. Si `hubo_lluvia` viene undefined/null,
        // preservamos el estado local (evita falsos "No" cuando el bundle
        // no traiga el campo por algún motivo).
        const lluviaRaw = p.hubo_lluvia;
        if (lluviaRaw !== undefined && lluviaRaw !== null) {
          const lluviaBool =
            lluviaRaw === true || lluviaRaw === 1 || lluviaRaw === '1' ||
            (typeof lluviaRaw === 'string' && lluviaRaw.toLowerCase() === 'true');
          setHuboLluvia(lluviaBool ? 'si' : 'no');
        }
        if (p.cantidad_lluvia != null) {
          const n = parseFloat(String(p.cantidad_lluvia));
          setLluvia(Number.isFinite(n) && n > 0 ? String(n) : '');
        }
        setObservaciones(p.observaciones ?? '');
        const elaboradoApi =
          p.creado_por_rel?.name ?? p.creado_por_rel?.nombre ??
          p.creadoPor?.name ?? p.creado_por?.name ?? '';
        if (elaboradoApi) setElaboradoPor(elaboradoApi);

        const cosechasHidratadas = (p.cosechas ?? []).map((c: any) => ({
          id: String(c.id),
          colaboradores: (c.cuadrilla ?? []).map((q: any) => encodeIdFromBackend(q)),
          lote: c.lote_id != null ? String(c.lote_id) : '',
          sublote: c.sublote_id != null ? String(c.sublote_id) : '',
          gajosRecogidos: Number(c.gajos_reportados ?? 0),
          kilos: c.peso_confirmado != null ? Number(c.peso_confirmado) : 0,
        }));
        setTrabajosCosecha(cosechasHidratadas);
        guardarSnapshot('cosecha', cosechasHidratadas);
        // ── Hidratación de labores de palma (§3.2.1) ─────────────────────
        // El bundle expone los jornales por dos vías posibles:
        //   (a) `p.jornales` con `jornal_grupo_id` → jornal miembro de un
        //       grupo. Reagrupamos en cliente si el backend NO envía el
        //       array oficial `p.jornal_grupos`.
        //   (b) `p.jornal_grupos` (oficial) → cada grupo trae `jornales[]`
        //       expandidos. Es la fuente preferida cuando llega.
        // La lógica cubre 3 fases de la migración del backend:
        //   1. Ni `jornal_grupo_id` ni `jornal_grupos` → todo suelto.
        //   2. `jornal_grupo_id` sí, `jornal_grupos` no → reagrupamos aquí.
        //   3. `jornal_grupos` sí → filtramos jornales miembros del listado.
        // Todos los caminos terminan con `jornalesSueltos` (tarjetas
        // individuales) + `grupos` (tarjetas con N colaboradores).
        const jornalesTodos = (p.jornales ?? []) as any[];
        const gruposDelBackend = ((p as any).jornal_grupos ?? []) as any[];
        const backendEnviaGrupos = Array.isArray((p as any).jornal_grupos);

        let jornalesSueltos: any[] = [];
        let grupos: any[] = [...gruposDelBackend];

        if (backendEnviaGrupos) {
          // Fase 3: usar el array oficial y filtrar miembros del listado.
          jornalesSueltos = jornalesTodos.filter(j => j.jornal_grupo_id == null);
        } else {
          // Fases 1-2: reagrupar por `jornal_grupo_id` si viene, tratando
          // los jornales sin él como sueltos. Al sumar `cantidad_palmas` de
          // los miembros recuperamos el valor original del grupo (el backend
          // divide `cantidad_palmas / N` al guardar cada miembro).
          const porGrupoId = new Map<number, any[]>();
          for (const j of jornalesTodos) {
            const gid = j.jornal_grupo_id;
            if (gid != null) {
              const arr = porGrupoId.get(gid) ?? [];
              arr.push(j);
              porGrupoId.set(gid, arr);
            } else {
              jornalesSueltos.push(j);
            }
          }
          for (const [gid, miembros] of porGrupoId.entries()) {
            const primero = miembros[0];
            grupos.push({
              id: gid,
              labor_id: primero.labor_id,
              labor: primero.labor,
              lote_id: primero.lote_id,
              lote: primero.lote,
              sublote_id: primero.sublote_id,
              sublote: primero.sublote,
              insumo_id: primero.insumo_id,
              insumo: primero.insumo,
              gramos_por_palma: primero.gramos_por_palma,
              descripcion: primero.descripcion,
              nombre_trabajo: primero.nombre_trabajo,
              // §3.2.1: `cantidad_palmas` es del GRUPO — el backend la
              // replica igual en cada jornal miembro, no la divide (lo
              // que sí se divide es `valor_total`). Por eso tomamos el
              // valor del primero, no la suma.
              cantidad_palmas: primero.cantidad_palmas,
              jornales: miembros,
            });
          }
        }

        const porTipoJornal = (tipo: string) =>
          jornalesSueltos.filter(j => j.categoria === 'PALMA' && j.tipo === tipo);
        const porTipoGrupo = (tipo: string) =>
          grupos.filter(g => g.labor?.tipo === tipo);
        const miembrosDeGrupo = (g: any): string[] =>
          ((g.jornales ?? []) as any[])
            .map((m) => encodeIdFromBackend(m))
            .filter(Boolean);

        const plateoHidratado = [
          ...porTipoGrupo('PLATEO').map((g: any) => ({
            id: String(g.id),
            grupoId: String(g.id),
            colaboradores: miembrosDeGrupo(g),
            lote: g.lote_id != null ? String(g.lote_id) : '',
            sublote: g.sublote_id != null ? String(g.sublote_id) : '',
            numeroPalmas: Number(g.cantidad_palmas ?? 0),
          })),
          ...porTipoJornal('PLATEO').map(j => ({
            id: String(j.id),
            colaboradores: [encodeIdFromBackend(j)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            numeroPalmas: Number(j.cantidad_palmas ?? 0),
          })),
        ];
        setTrabajosPlateo(plateoHidratado);
        guardarSnapshot('plateo', plateoHidratado);

        const podaHidratado = [
          ...porTipoGrupo('PODA').map((g: any) => ({
            id: String(g.id),
            grupoId: String(g.id),
            colaboradores: miembrosDeGrupo(g),
            lote: g.lote_id != null ? String(g.lote_id) : '',
            sublote: g.sublote_id != null ? String(g.sublote_id) : '',
            numeroPalmas: Number(g.cantidad_palmas ?? 0),
          })),
          ...porTipoJornal('PODA').map(j => ({
            id: String(j.id),
            colaboradores: [encodeIdFromBackend(j)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            numeroPalmas: Number(j.cantidad_palmas ?? 0),
          })),
        ];
        setTrabajosPoda(podaHidratado);
        guardarSnapshot('poda', podaHidratado);

        const fertHidratado = [
          ...porTipoGrupo('FERTILIZACION').map((g: any) => ({
            id: String(g.id),
            grupoId: String(g.id),
            colaboradores: miembrosDeGrupo(g),
            lote: g.lote_id != null ? String(g.lote_id) : '',
            sublote: g.sublote_id != null ? String(g.sublote_id) : '',
            palmas: Number(g.cantidad_palmas ?? 0),
            tipoFertilizante: (g.insumo?.nombre ?? '') as string,
            otroFertilizante: '',
            cantidadGramos: Number(g.gramos_por_palma ?? 0),
          })),
          ...porTipoJornal('FERTILIZACION').map(j => ({
            id: String(j.id),
            colaboradores: [encodeIdFromBackend(j)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            palmas: Number(j.cantidad_palmas ?? 0),
            tipoFertilizante: (j.insumo?.nombre ?? '') as string,
            otroFertilizante: '',
            cantidadGramos: Number(j.gramos_por_palma ?? 0),
          })),
        ];
        setTrabajosFertilizacion(fertHidratado);
        guardarSnapshot('fert', fertHidratado);

        const sanidadHidratado = [
          ...porTipoGrupo('SANIDAD').map((g: any) => ({
            id: String(g.id),
            grupoId: String(g.id),
            colaboradores: miembrosDeGrupo(g),
            lote: g.lote_id != null ? String(g.lote_id) : '',
            sublote: g.sublote_id != null ? String(g.sublote_id) : '',
            trabajoRealizado: (g.descripcion ?? '') as string,
            laborActividadId: g.labor_actividad_id != null ? Number(g.labor_actividad_id) : null,
          })),
          ...porTipoJornal('SANIDAD').map(j => ({
            id: String(j.id),
            colaboradores: [encodeIdFromBackend(j)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            trabajoRealizado: (j.descripcion ?? '') as string,
            laborActividadId: (j as any).labor_actividad_id != null ? Number((j as any).labor_actividad_id) : null,
          })),
        ];
        setTrabajosSanidad(sanidadHidratado);
        guardarSnapshot('sanidad', sanidadHidratado);
        // Otros: fija OTROS (tipo='OTROS') + labores custom de PALMA (tipo=null).
        // Quedan fuera de los 4 tipos fijos específicos (PLATEO/PODA/FERT/SANIDAD).
        // Cambio agosto 2026: OTROS ahora es fija con `tipo='OTROS'`.
        const jornalesOtros = jornalesSueltos.filter(
          j => j.categoria === 'PALMA' && (j.tipo == null || j.tipo === 'OTROS'),
        );
        const gruposOtros = grupos.filter(
          (g: any) => g.labor?.categoria === 'PALMA' && (g.labor?.tipo == null || g.labor?.tipo === 'OTROS'),
        );
        const mapOtroBase = (obj: any, colaboradores: string[]) => {
          const laborId = obj.labor_id != null ? Number(obj.labor_id) : undefined;
          const tipoPagoRaw = obj.labor?.tipo_pago;
          const tipoPago: 'POR_PALMA' | 'JORNAL_FIJO' =
            tipoPagoRaw === 'POR_PALMA' ? 'POR_PALMA' : 'JORNAL_FIJO';
          return {
            colaboradores,
            laborOtrosKey: laborId ? `palma-${laborId}` : undefined,
            laborOtrosRawId: laborId,
            laborOtrosTipoPago: tipoPago,
            nombre: obj.labor?.nombre ?? obj.nombre_trabajo ?? '',
            laborRealizada: obj.descripcion ?? '',
            numeroPalmas: tipoPago === 'POR_PALMA' && obj.cantidad_palmas != null
              ? Number(obj.cantidad_palmas)
              : undefined,
            nombreTrabajo: tipoPago === 'JORNAL_FIJO' ? (obj.nombre_trabajo ?? '') : undefined,
            lote: obj.lote_id != null ? String(obj.lote_id) : '',
            sublote: obj.sublote_id != null ? String(obj.sublote_id) : '',
            laborActividadId: obj.labor_actividad_id != null ? Number(obj.labor_actividad_id) : null,
          };
        };
        const otrosHidratado = [
          ...gruposOtros.map((g: any) => ({
            id: String(g.id),
            grupoId: String(g.id),
            ...mapOtroBase(g, miembrosDeGrupo(g)),
          })),
          ...jornalesOtros.map((j: any) => ({
            id: String(j.id),
            ...mapOtroBase(j, [encodeIdFromBackend(j)]),
          })),
        ];
        setTrabajosOtros(otrosHidratado);
        guardarSnapshot('otros', otrosHidratado);

        // Labores de Finca — `nombre` ahora guarda el id local de la persona
        // (`'10'` empleado, `'O_5'` operario) para soportar XOR al guardar.
        // La visualización del nombre se hace via lookup en `colaboradores`.
        // No usan grupo: cada labor de finca es 1 colaborador × 1 lugar.
        const fincaHidratado = jornalesSueltos.filter(j => j.categoria === 'FINCA').map(j => ({
          id: String(j.id),
          nombre: encodeIdFromBackend(j),
          labor: j.labor?.nombre ?? '',
          otraLabor: '',
          lugar: j.ubicacion ?? '',
        }));
        setTrabajosAuxiliares(fincaHidratado);
        guardarSnapshot('finca', fincaHidratado);
        // Horas extras — según §1.1 del doc, el bundle wizard-init trae las
        // tarjetas en `planilla.horas_extra` (snake_case) con eager-load de
        // `horasExtra.tipoHoraExtra` (camelCase). Probamos varios nombres por
        // si el serializer cambia de convención.
        const horasExtraRaw: any[] =
          p.horas_extra
          ?? p.horasExtra
          ?? p.horas_extras
          ?? p.horasExtras
          ?? [];
        const heHidratadas = horasExtraRaw.map((h: any) => {
          let nombreTipo = h.tipoHoraExtra?.nombre
            ?? h.tipo_hora_extra?.nombre
            ?? h.tipo_hora?.nombre
            ?? '';
          if (!nombreTipo && h.tipo_hora_extra_id != null) {
            for (const [n, id] of tiposHoraExtraMap.entries()) {
              if (id === Number(h.tipo_hora_extra_id)) { nombreTipo = n; break; }
            }
          }
          return {
            id: String(h.id),
            colaboradorId: String(h.empleado_id ?? ''),
            tipoHora: nombreTipo,
            numeroHoras: Number(h.cantidad_horas ?? 0),
            observacion: h.observacion ?? '',
          };
        });
        setHorasExtras(heHidratadas);
        guardarSnapshot('he', heHidratadas);

        // Horas extras — según §4 del doc, `NO existe GET /operaciones/{id}/horas-extra`
        // (responde 405). Las tarjetas vienen dentro de `planilla.horas_extra`
        // del bundle wizard-init. Si el array llegó vacío pero la BD sí tiene
        // registros, es problema del backend — no hacemos petición separada.
        // Ausencias — el campo `motivo` (texto libre) es la fuente de verdad
        // para mostrar al usuario: es lo que el operario escribió/seleccionó
        // cuando creó la ausencia. Los IDs del catálogo (`motivo_ausencia_id`)
        // pueden desincronizarse si el admin renombra o reasigna motivos.
        // Guardamos `motivo` (texto libre) en `otroMotivo` y el nombre del
        // catálogo en `motivo` para tener ambos disponibles.
        const ausenciasHidratadas = (p.ausencias ?? []).map((a: any) => {
          const nombreCatalogo = a.motivoAusencia?.nombre
            ?? a.motivo_ausencia?.nombre
            ?? a.motivo_ausencia_nombre
            ?? '';
          return {
            id: String(a.id),
            colaboradorId: String(a.empleado_id ?? ''),
            motivo: nombreCatalogo,
            // El texto libre del backend es la fuente primaria de display.
            otroMotivo: a.motivo ?? '',
            motivoAusenciaId: a.motivo_ausencia_id != null
              ? Number(a.motivo_ausencia_id)
              : undefined,
          };
        });
        setAusentes(ausenciasHidratadas);
        guardarSnapshot('ausencia', ausenciasHidratadas);
        // El resumen ya se hidrató en el effect de `wizard-init` arriba.
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message ?? 'Error al cargar la planilla');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam, isEditMode, modoLectura, planillaBundle]);

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

  const siguienteEtapa = async () => {
    if (etapaActual >= ETAPAS.length) return;

    // Validar campos obligatorios del Paso 1 antes de avanzar.
    // La API exige fecha (§2.1), hora_inicio y la consistencia
    // hubo_lluvia ↔ cantidad_lluvia. Bloqueamos aquí antes de que el
    // usuario avance sin llenar el dropdown "¿Hubo lluvia?".
    if (etapaActual === 1) {
      if (!fecha) {
        toast.error('Selecciona una fecha para la planilla.');
        return;
      }
      if (!elaboradoPor.trim()) {
        toast.error('Indica quién elabora la planilla.');
        return;
      }
      if (!inicioLabores) {
        toast.error('Indica la hora de inicio de labores.');
        return;
      }
      if (huboLluvia === '') {
        toast.error('Selecciona si hubo lluvia o no.');
        return;
      }
      if (huboLluvia === 'si') {
        const mm = parseFloat(lluvia);
        if (!lluvia || isNaN(mm) || mm <= 0) {
          toast.error('Ingresa la cantidad de lluvia en milímetros.');
          return;
        }
      }
    }

    // Validar al avanzar desde la etapa 1: que no exista ya planilla para esa fecha (solo en creación nueva).
    if (etapaActual === 1 && !isEditMode && !planillaId && fecha) {
      try {
        // Traemos las últimas 100 planillas y filtramos client-side por fecha exacta.
        // (Si el filtro fecha_desde/fecha_hasta del API no es estricto, igual funciona.)
        const dup = await operacionesApi.listar({ per_page: 100 });
        const lista: any[] = (dup as any).data ?? [];
        console.log('[planilla-dup] total planillas:', lista.length, 'fecha buscada:', fecha);
        const yaExiste = lista.some((p: any) => {
          const f = String(p.fecha ?? p.fecha_planilla ?? '').slice(0, 10);
          return f === fecha;
        });
        if (yaExiste) {
          console.log('[planilla-dup] DUPLICADA — abriendo alerta');
          setAlertaDuplicada(true);
          return;
        }
      } catch (err) {
        console.warn('[planilla-dup] error verificando duplicado:', err);
      }
    }

    setEtapaActual(etapaActual + 1);
  };

  const etapaAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  /**
   * Persiste la planilla y todos sus hijos (cosechas/jornales/horas-extra/ausencias).
   *
   * Modo silencioso (`opts.silent`): usado por el autosave al salir del wizard
   * sin pulsar "Guardar Planilla". Skipea el chequeo de duplicados, no muestra
   * toasts ni navega. Cualquier error se traga (no hay UI activa para mostrarlo).
   */
  const guardarTodo = async (opts: { silent?: boolean; stayHere?: boolean; bypassAlertas?: boolean } = {}) => {
    const silent = opts.silent === true;
    const bypassAlertas = opts.bypassAlertas === true;
    if (!silent) setGuardando(true);
    try {
      // La fecha SIEMPRE viaja en el PUT (aunque no haya cambiado). Antes se
      // omitía como `undefined` cuando estaba vacía, lo que impedía que el
      // backend detectara el cambio al editar el input `type="date"`.
      if (!fecha) {
        if (!silent) toast.error('La fecha es obligatoria');
        setGuardando(false);
        return;
      }
      // Aviso informativo de planilla vacía. YA NO bloquea el guardado —
      // solo abre el modal para que el usuario decida. Al confirmar
      // "Continuar de todas formas", el modal re-invoca esta función con
      // `bypassAlertas: true` y salta este chequeo.
      if (!silent && !planillaId && !bypassAlertas) {
        const hayContenido =
          trabajosCosecha.length > 0
          || trabajosPlateo.length > 0
          || trabajosPoda.length > 0
          || trabajosFertilizacion.length > 0
          || trabajosSanidad.length > 0
          || trabajosOtros.length > 0
          || trabajosAuxiliares.length > 0
          || horasExtras.length > 0
          || ausentes.length > 0;
        if (!hayContenido) {
          setAccionPendiente('guardar');
          setAlertaPlanillaVacia(true);
          setGuardando(false);
          return;
        }
      }
      const headerBody = {
        fecha,
        elaborado_por: elaboradoPor || undefined,
        hora_inicio: inicioLabores || undefined,
        hubo_lluvia: huboLluvia === 'si',
        cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
        observaciones: observaciones || null,
      };
      let pid = planillaId;
      if (!pid) {
        // Validar que no exista ya una planilla para esa fecha (solo en modo
        // interactivo — el autosave salta la verificación porque si llegó aquí
        // sin pid es porque el usuario nunca pulsó Guardar; mejor un BORRADOR
        // duplicable que perder los datos).
        if (!silent && fecha) {
          try {
            const dup = await operacionesApi.listar({ fecha_desde: fecha, fecha_hasta: fecha, per_page: 5 });
            const yaExiste = (dup.data ?? []).some((p: any) => {
              const f = String(p.fecha ?? '').slice(0, 10);
              return f === fecha;
            });
            if (yaExiste) {
              setAlertaDuplicada(true);
              setGuardando(false);
              return;
            }
          } catch { /* si la verificación falla, dejamos que el backend responda */ }
        }
        const res = await operacionesApi.crear(headerBody);
        pid = res.data.id;
        setPlanillaId(pid);
      } else {
        // Captura el response para actualizar el estado local sin borrar la
        // fecha que el usuario acaba de escribir. Se conserva `fechaEnviada`
        // en `planillaBundle` para que el useEffect de hidratación no la
        // sobrescriba con un valor viejo del backend.
        const fechaEnviada = fecha;
        // DEBUG: logs de diagnóstico para el bug de "la fecha no se guarda".
        // Abre la consola (F12) para ver qué se envía y qué responde el backend.
        console.log('[PUT /operaciones/' + pid + '] body enviado:', headerBody);
        const resEditar = await operacionesApi.editar(pid, headerBody);
        const p: any = (resEditar as any)?.data ?? null;
        console.log('[PUT /operaciones/' + pid + '] response.data.fecha:', p?.fecha, '(esperada:', fechaEnviada + ')');
        if (p) {
          setPlanillaBundle((prev) => ({ ...(prev ?? {}), ...p, fecha: fechaEnviada }));
        }
      }

      // ── Pre-paso: resolver insumos de fertilización ──────────────────────────
      // Los insumos "Otro" requieren un POST secuencial (UNIQUE por tenant+nombre).
      // Una vez resueltos los IDs, los jornales de fertilización se suman al batch
      // paralelo junto con todos los demás tipos.
      type FertResuelta = { t: TrabajoFertilizacion; insumoId: number };
      const fertResueltas: FertResuelta[] = [];
      const fertSaltadas: string[] = [];
      const fertLaborId = palmaTipoToId.get('FERTILIZACION');
      if (fertLaborId) {
        for (const t of trabajosFertilizacion) {
          let insumoId: number | undefined;
          if (t.tipoFertilizante === 'Otro') {
            const nombreNuevo = (t.otroFertilizante || '').trim();
            if (!nombreNuevo) { fertSaltadas.push('fertilización sin nombre de insumo'); continue; }
            const matchLocal = Array.from(insumosMap.entries())
              .find(([n]) => n.toLowerCase().trim() === nombreNuevo.toLowerCase());
            if (matchLocal) insumoId = matchLocal[1];
            else {
              try {
                const res = await selectsApi.crearInsumo(nombreNuevo);
                insumoId = res.data.id;
                setInsumosMap(prev => new Map(prev).set(res.data.nombre, res.data.id));
              } catch (e) {
                console.error('[NuevaPlanillaWizard] No se pudo crear insumo "' + nombreNuevo + '":', e);
                fertSaltadas.push(nombreNuevo);
                continue;
              }
            }
          } else {
            // Lookup case-insensitive + trim para tolerar diferencias mínimas
            // entre el nombre que viene del bundle y el del dropdown.
            const tipoNorm = (t.tipoFertilizante ?? '').toLowerCase().trim();
            if (!tipoNorm) { fertSaltadas.push('fertilización sin tipo seleccionado'); continue; }
            insumoId = insumosMap.get(t.tipoFertilizante);
            if (!insumoId) {
              const matchInsensitive = Array.from(insumosMap.entries())
                .find(([n]) => n.toLowerCase().trim() === tipoNorm);
              insumoId = matchInsensitive?.[1];
            }
          }
          if (!insumoId) {
            console.error('[NuevaPlanillaWizard] Fertilización descartada — insumo no encontrado:', t.tipoFertilizante);
            fertSaltadas.push(t.tipoFertilizante || '(sin nombre)');
            continue;
          }
          fertResueltas.push({ t, insumoId });
        }
      }

      // ── Pre-paso §19: resolver actividades nuevas ("Otra") ──────────────────
      // Cuando el usuario elige "Otra" y escribe un nombre en SANIDAD u OTROS,
      // el estado guarda `laborActividadId=null`. Aquí llamamos al endpoint
      // quick-create para obtener el id antes de crear el jornal. Si el nombre
      // ya existe en el catálogo local (case-insensitive) reusamos ese id sin
      // llamar al backend.
      const resolverActividad = async (
        laborId: number | undefined,
        nombre: string,
      ): Promise<number | null> => {
        const nombreLimpio = nombre.trim();
        if (!laborId || !nombreLimpio) return null;
        const key = String(laborId);
        const catalogo = actividadesPorLabor[key] ?? [];
        const matchLocal = catalogo.find(
          (a) => a.nombre.toLowerCase() === nombreLimpio.toLowerCase(),
        );
        if (matchLocal) return matchLocal.id;
        try {
          const res = await configuracionApi.laborActividades.crearDesdeWizard(
            laborId, nombreLimpio,
          );
          setActividadesPorLabor((prev) => {
            const actuales = prev[key] ?? [];
            if (actuales.some((a) => a.id === res.data.id)) return prev;
            return { ...prev, [key]: [...actuales, res.data] };
          });
          return res.data.id;
        } catch (err: any) {
          // Si el backend responde 409 con la existente, la usamos.
          if (err?.body?.data?.id) return err.body.data.id as number;
          console.error('[NuevaPlanillaWizard] No se pudo crear actividad:', err);
          return null;
        }
      };

      // Resolver actividades de SANIDAD (una labor fija).
      const sanidadLaborIdPrev = palmaTipoToId.get('SANIDAD');
      const sanidadActividadIds = new Map<string, number | null>();
      if (sanidadLaborIdPrev) {
        for (const t of trabajosSanidad) {
          if (t.laborActividadId) {
            sanidadActividadIds.set(t.id, t.laborActividadId);
          } else if (t.trabajoRealizado?.trim()) {
            const id = await resolverActividad(sanidadLaborIdPrev, t.trabajoRealizado);
            sanidadActividadIds.set(t.id, id);
          }
        }
      }
      // Resolver actividades de OTROS (§19 agosto 2026). Aplica a la fija
      // OTROS + labores custom PALMA — ambas admiten `labor_actividades`.
      // Si el usuario ya seleccionó una actividad del catálogo, se manda su id.
      // Si escribió una nueva ("Otra"), se hace quick-create y se toma el id.
      // Las labores recién creadas por "Otra Labor" NO llevan actividad — el
      // nombre de la labor ya describe el trabajo.
      const otrosActividadIds = new Map<string, number | null>();
      for (const t of trabajosOtros) {
        if (!t.laborOtrosRawId) continue; // labor nueva → sin actividad separada
        if (t.laborActividadId) {
          otrosActividadIds.set(t.id, t.laborActividadId);
        } else if (t.laborRealizada?.trim()) {
          // Usuario escribió una actividad nueva → quick-create.
          const id = await resolverActividad(t.laborOtrosRawId, t.laborRealizada);
          otrosActividadIds.set(t.id, id);
        }
      }

      // ── Construir batch de operaciones bulk ───────────────────────────────────
      // Ítems NUEVOS se acumulan en arrays tipados y se envían en una sola
      // petición bulk por tipo (4 peticiones HTTP total en vez de N).
      // Ítems EXISTENTES (PUT) se disparan en paralelo con Promise.allSettled.
      // Posición en el array → localId, para mapear backendId al resolver.
      type BulkJornalItem = { localId: string; tipo: string; payload: any };
      /**
       * Grupos nuevos (§3.2.1): tarjetas de palma con N >= 2 colaboradores.
       * Van por `POST /operaciones/{id}/jornal-grupos` — el backend calcula
       * `valor_grupo = cantidad_palmas * precio` y lo divide entre miembros.
       * NO se puede combinar con el bulk de jornales (endpoints distintos).
       */
      const newGrupos: Array<{ localId: string; tipo: string; payload: any }> = [];
      const newJornales:  BulkJornalItem[] = [];
      const newCosechas:  Array<{ localId: string; payload: any }> = [];
      const newHE:        Array<{ localId: string; payload: any }> = [];
      const newAusencias: Array<{ localId: string; payload: any }> = [];
      /**
       * §Fix jornales — jornales individuales existentes que cambiaron
       * respecto al snapshot inicial. Al terminar el batch, se envían en
       * UNA sola llamada `PUT /operaciones/{id}/jornales/bulk-update`,
       * reemplazando N PUTs individuales.
       */
      const jornalesParaBulkUpdate: Array<{ id: number; payload: any; tipoLocal: string }> = [];
      const updates: Promise<any>[] = [];
      const erroresGuardado: string[] = [];
      let heOperarios = 0, heSinTipo = 0, heSinColab = 0, heHorasInvalidas = 0;
      let otrosSinLabor = 0;
      let fincaSinLabor = 0;

      // === COSECHAS ===
      for (const t of trabajosCosecha) {
        if (!t.lote || t.colaboradores.length === 0) continue;
        if (isBackendId(t.id)) {
          // Dirty tracking: no reenviar cosecha si el snapshot no cambió.
          if (!itemCambio('cosecha', t)) continue;
          updates.push(
            cosechasApi.editar(parseInt(t.id), {
              gajos_reportados: t.gajosRecogidos || 0,
              peso_confirmado: t.kilos || null,
              cuadrilla: t.colaboradores.map(c => decodeIdPersona(c)),
            }).catch(() => {}),
          );
        } else {
          newCosechas.push({
            localId: t.id,
            payload: {
              lote_id: parseInt(t.lote),
              sublote_id: t.sublote ? parseInt(t.sublote) : undefined,
              gajos_reportados: t.gajosRecogidos || 0,
              peso_confirmado: t.kilos || null,
              cuadrilla: t.colaboradores.map(c => decodeIdPersona(c)),
            },
          });
        }
      }

      // === Helper: persistir una tarjeta de labor de palma con N colaboradores.
      //
      // Regla §3.2.1:
      //   N === 1 → un `jornal` individual (endpoint bulk /jornales/bulk).
      //   N >= 2 → un `jornal-grupo` (endpoint /jornal-grupos). El backend
      //            distribuye `valor_grupo` entre los miembros según su
      //            modalidad_pago (FIJO recibe 0.00, el resto se divide por N).
      //
      // Detección de edición:
      //   - `t.grupoId` presente → tarjeta es un grupo persistido → PUT al grupo.
      //   - `t.id` es backend id (jornal individual) → PUT al jornal.
      //   - En otro caso → creación nueva (bulk o grupo).
      const persistirLaborPalma = (
        t: { id: string; grupoId?: string; colaboradores: string[] },
        tipoLocal: string,
        payloadBase: Record<string, any>,
      ) => {
        const miembros = t.colaboradores
          .map((c) => decodeIdPersona(c))
          .filter((m) => m.empleado_id || m.operario_id);
        if (miembros.length === 0) return;

        // Grupo persistido → PUT al grupo. Solo si el snapshot detecta cambios,
        // para no enviar el PUT cuando el usuario no tocó la tarjeta.
        if (t.grupoId && /^\d+$/.test(t.grupoId)) {
          if (!itemCambio(tipoLocal, t)) return;
          const payloadGrupo = { ...payloadBase, miembros };
          updates.push(
            jornalGruposApi
              .editar(parseInt(t.grupoId), payloadGrupo as any)
              .catch((err: any) => {
                erroresGuardado.push(`${tipoLocal}: ${err?.message ?? 'error grupo'}`);
              }),
          );
          return;
        }

        if (miembros.length === 1) {
          // Individual: jornal directo (nuevo o edición).
          const payload = { ...payloadBase, ...miembros[0] };
          if (isBackendId(t.id)) {
            // Dirty tracking: si el jornal no cambió respecto al snapshot
            // inicial, no lo mandamos. Ahorra N-M PUTs cuando el usuario
            // solo editó M jornales de N.
            if (!itemCambio(tipoLocal, t)) return;
            jornalesParaBulkUpdate.push({
              id: parseInt(t.id),
              payload,
              tipoLocal,
            });
          } else {
            newJornales.push({ localId: t.id, tipo: tipoLocal, payload });
          }
        } else {
          // Grupo nuevo: 1 sola llamada a POST /jornal-grupos (N miembros).
          const payloadGrupo = { ...payloadBase, miembros };
          newGrupos.push({ localId: t.id, tipo: tipoLocal, payload: payloadGrupo });
        }
      };

      // === PLATEO ===
      const plateoLaborId = palmaTipoToId.get('PLATEO');
      if (plateoLaborId) {
        for (const t of trabajosPlateo) {
          const base: Record<string, any> = {
            labor_id: plateoLaborId,
            lote_id: t.lote ? parseInt(t.lote) : null,
            sublote_id: t.sublote ? parseInt(t.sublote) : null,
          };
          if (t.numeroPalmas && t.numeroPalmas > 0) base.cantidad_palmas = t.numeroPalmas;
          persistirLaborPalma(t, 'plateo', base);
        }
      }

      // === PODA ===
      const podaLaborId = palmaTipoToId.get('PODA');
      if (podaLaborId) {
        for (const t of trabajosPoda) {
          const base: Record<string, any> = {
            labor_id: podaLaborId,
            lote_id: t.lote ? parseInt(t.lote) : null,
            sublote_id: t.sublote ? parseInt(t.sublote) : null,
          };
          if (t.numeroPalmas && t.numeroPalmas > 0) base.cantidad_palmas = t.numeroPalmas;
          persistirLaborPalma(t, 'poda', base);
        }
      }

      // === FERTILIZACION (insumos ya resueltos en el pre-paso) ===
      for (const { t, insumoId } of fertResueltas) {
        const base: Record<string, any> = {
          labor_id: fertLaborId!,
          lote_id: t.lote ? parseInt(t.lote) : null,
          sublote_id: t.sublote ? parseInt(t.sublote) : null,
          insumo_id: insumoId,
          gramos_por_palma: t.cantidadGramos || 0,
        };
        if (t.palmas && t.palmas > 0) base.cantidad_palmas = t.palmas;
        persistirLaborPalma(t, 'fert', base);
      }

      // === SANIDAD ===
      const sanidadLaborId = palmaTipoToId.get('SANIDAD');
      const sanidadInfo = palmaFijasInfo.get('SANIDAD');
      if (sanidadLaborId) {
        for (const t of trabajosSanidad) {
          const base: Record<string, any> = {
            labor_id: sanidadLaborId,
            lote_id: t.lote ? parseInt(t.lote) : null,
            sublote_id: t.sublote ? parseInt(t.sublote) : null,
          };
          // §4.7: preferimos mandar el FK. Si el pre-paso resolvió la actividad
          // (existente o quick-created), usamos su id. Si no hay id ni texto,
          // caemos a un placeholder para no romper la validación del backend.
          const actividadIdSan = sanidadActividadIds.get(t.id) ?? null;
          if (actividadIdSan) {
            base.labor_actividad_id = actividadIdSan;
          } else {
            base.descripcion = t.trabajoRealizado || 'Sanidad';
          }
          // Sanidad no tiene input propio de palmas — si está en POR_PALMA
          // reusamos las del sublote.
          if (sanidadInfo?.tipo_pago === 'POR_PALMA') {
            base.cantidad_palmas = Number(sublotes.find(s => s.id === t.sublote)?.cantidadPalmas ?? 0);
          }
          persistirLaborPalma(t, 'sanidad', base);
        }
      }

      // === OTROS (fija OTROS + labores custom de PALMA con tipo=null) ===
      // El flujo es idéntico a SANIDAD: labor ya resuelta desde el bundle,
      // y la actividad (obligatoria u opcional) se envía como `labor_actividad_id`
      // o `descripcion` texto libre.
      for (const t of trabajosOtros) {
        if (!t.laborOtrosRawId) { otrosSinLabor++; continue; }
        const base: Record<string, any> = {
          labor_id: t.laborOtrosRawId,
          lote_id: t.lote ? parseInt(t.lote) : null,
          sublote_id: t.sublote ? parseInt(t.sublote) : null,
        };
        if (t.laborOtrosTipoPago === 'POR_PALMA') {
          base.cantidad_palmas = Number(t.numeroPalmas ?? 0);
        } else if (t.laborOtrosTipoPago === 'JORNAL_FIJO') {
          if (t.nombreTrabajo?.trim()) base.nombre_trabajo = t.nombreTrabajo.trim();
        }
        // §4.7: FK a `labor_actividades`. Si el pre-paso resolvió una nueva
        // ("Otra" + texto), usamos su id. Si no, mandamos descripción libre.
        const actividadIdOtros = otrosActividadIds.get(t.id) ?? null;
        if (actividadIdOtros) {
          base.labor_actividad_id = actividadIdOtros;
        } else if (t.laborRealizada?.trim()) {
          base.descripcion = t.laborRealizada.trim();
        }
        persistirLaborPalma(t, 'otros', base);
      }

      // === PRE-PASO FINCA: resolver labores "Otro" on-the-fly ===
      // Para cada trabajo de FINCA con `labor === 'Otro'` y un nombre nuevo
      // (`otraLabor`), llamamos POST /operaciones/labores-finca ANTES del
      // bulk. Igual patrón que insumos de fertilización.
      //   - 201 → usar data.id.
      //   - 409 LABOR_FINCA_DUPLICADA → el backend devuelve data.id igual.
      // El id resuelto se cachea en `laboresMap` para que el loop siguiente
      // lo use sin re-crear.
      const laboresFincaSaltadas: string[] = [];
      const laboresMapLocal = new Map(laboresMap);
      for (const t of trabajosAuxiliares) {
        if (t.labor !== 'Otro') continue;
        const nombreNuevo = (t.otraLabor || '').trim();
        if (!nombreNuevo) continue;
        // Ya cacheado (por otro trabajo del mismo lote o por prefill).
        const existente = Array.from(laboresMapLocal.entries())
          .find(([n]) => n.toLowerCase().trim() === nombreNuevo.toLowerCase());
        if (existente) continue;
        try {
          const res = await selectsApi.crearLaborFinca(nombreNuevo);
          laboresMapLocal.set(res.data.nombre, res.data.id);
        } catch (err: any) {
          if (err?.code === 'LABOR_FINCA_DUPLICADA' && err?.data?.id) {
            const nombreBackend = err.data.nombre ?? nombreNuevo;
            laboresMapLocal.set(nombreBackend, err.data.id as number);
          } else {
            console.error('[NuevaPlanillaWizard] No se pudo crear labor de finca "' + nombreNuevo + '":', err);
            laboresFincaSaltadas.push(nombreNuevo);
          }
        }
      }
      // Propagar el mapa nuevo al estado por si el usuario re-guarda sin
      // recargar (evita re-crear las mismas labores otra vez).
      if (laboresMapLocal.size !== laboresMap.size) {
        setLaboresMap(new Map(laboresMapLocal));
        setLaboresLista(Array.from(laboresMapLocal.keys()));
      }

      // === AUXILIARES (FINCA) ===
      for (const t of trabajosAuxiliares) {
        if (!t.labor || !t.nombre) continue;
        const laborKey = t.labor === 'Otro' ? (t.otraLabor || '').trim() : t.labor;
        // Lookup case-insensitive contra el mapa recién actualizado.
        const matchInsensitive = Array.from(laboresMapLocal.entries())
          .find(([n]) => n.toLowerCase().trim() === laborKey.toLowerCase());
        const laborId = matchInsensitive?.[1] ?? laboresMapLocal.get(t.labor);
        if (!laborId) { fincaSinLabor++; continue; }
        const personaIds = decodeIdPersona(t.nombre);
        if (!personaIds.empleado_id && !personaIds.operario_id) continue;
        const payload = { labor_id: laborId, ...personaIds, ubicacion: t.lugar || undefined };
        if (isBackendId(t.id)) {
          // Dirty tracking: skip si no cambió respecto al snapshot inicial.
          if (!itemCambio('finca', t)) continue;
          jornalesParaBulkUpdate.push({
            id: parseInt(t.id),
            payload,
            tipoLocal: 'finca',
          });
        } else {
          newJornales.push({ localId: t.id, tipo: 'finca', payload });
        }
      }

      // === HORAS EXTRAS ===
      for (const h of horasExtras) {
        if (!h.colaboradorId) { heSinColab++; continue; }
        if (!h.tipoHora) { heSinTipo++; continue; }
        const horas = Number(h.numeroHoras);
        if (!horas || horas < 0.25 || horas > 12) { heHorasInvalidas++; continue; }
        if (h.colaboradorId.startsWith('O_')) { heOperarios++; continue; }
        const empleadoId = parseInt(h.colaboradorId);
        if (Number.isNaN(empleadoId)) { heSinColab++; continue; }
        let tipoId = tiposHoraExtraMap.get(h.tipoHora);
        if (!tipoId) {
          for (const [n, i] of tiposHoraExtraMap.entries()) {
            if (n.toLowerCase().includes(h.tipoHora.toLowerCase())) { tipoId = i; break; }
          }
        }
        if (!tipoId) { heSinTipo++; continue; }
        const payload = {
          empleado_id: empleadoId,
          tipo_hora_extra_id: tipoId,
          cantidad_horas: horas,
          observacion: h.observacion || undefined,
        };
        if (isBackendId(h.id)) {
          // Dirty tracking: skip PUT si el snapshot inicial coincide.
          if (!itemCambio('he', h)) continue;
          updates.push(
            horasExtraApi.editar(parseInt(h.id), payload).catch((err: any) => {
              erroresGuardado.push(`Horas extra: ${err?.message ?? 'error desconocido'}`);
            }),
          );
        } else {
          newHE.push({ localId: h.id, payload });
        }
      }

      // === AUSENCIAS ===
      for (const a of ausentes) {
        if (!a.colaboradorId) continue;
        let motivoId = motivosMap.get(a.motivo);
        if (!motivoId) {
          for (const [n, i] of motivosMap.entries()) {
            if (n.toLowerCase().includes(a.motivo.toLowerCase())) { motivoId = i; break; }
          }
        }
        if (!motivoId) continue;
        // `motivo` en el backend es texto LIBRE (observación) según §5.1 del doc.
        // Solo se envía cuando el usuario eligió "Otro" y escribió texto propio.
        const esMotivoOtro = a.motivo === 'Otro';
        const payload = {
          empleado_id: parseInt(a.colaboradorId),
          motivo_ausencia_id: motivoId,
          motivo: esMotivoOtro ? (a.otroMotivo ?? '') : '',
        };
        if (isBackendId(a.id)) {
          // Dirty tracking: skip PUT si el snapshot inicial coincide.
          if (!itemCambio('ausencia', a)) continue;
          updates.push(ausenciasApi.editar(parseInt(a.id), payload).catch(() => {}));
        } else {
          newAusencias.push({ localId: a.id, payload });
        }
      }

      // ── Disparar bulk creates y updates en paralelo ───────────────────────────
      // 4 peticiones HTTP (una por tipo) + PUTs individuales, todo en paralelo.
      // Cada bulk es una transacción en el backend → consistencia atómica por tipo.
      /** Detecta CALC_ERROR de precio_abono y devuelve un mensaje amigable
       *  con el gramaje faltante, para guiar al usuario a Configuración. */
      const parseErrorJornal = (e: any): string => {
        const msg: string = e?.message ?? '';
        const code: string = e?.code ?? '';
        if (code === 'CALC_ERROR' && /precio_abono/i.test(msg)) {
          const m = msg.match(/(\d+(?:[.,]\d+)?\s*g)/i);
          const escala = m ? m[1] : 'la escala configurada';
          return `Falta configurar precio de abono para ${escala}. Ve a Configuración → Precios de Abono y crea la escala con su precio antes de guardar.`;
        }
        return msg || 'error en bulk';
      };
      // Grupos: no hay bulk (§3.2.1 solo expone POST unitario), pero los
      // disparamos en paralelo. Cada respuesta trae `data.id` = jornal_grupos.id.
      const gruposReqs = newGrupos.map((g) =>
        jornalGruposApi
          .crear(pid!, g.payload)
          .catch((e: any) => {
            erroresGuardado.push(`Grupo ${g.tipo}: ${parseErrorJornal(e)}`);
            return null;
          }),
      );
      const [jornalBulkRes, cosechaBulkRes, heBulkRes, ausenciaBulkRes, , , gruposRes] = (await Promise.all([
        newJornales.length > 0
          ? jornalesApi.bulkCrear(pid!, newJornales.map(i => i.payload))
              .catch((e: any) => { erroresGuardado.push(`Jornales: ${parseErrorJornal(e)}`); return null; })
          : Promise.resolve(null),
        newCosechas.length > 0
          ? cosechasApi.bulkCrear(pid!, newCosechas.map(i => i.payload))
              .catch((e: any) => { erroresGuardado.push(`Cosechas: ${e?.message ?? 'error en bulk'}`); return null; })
          : Promise.resolve(null),
        newHE.length > 0
          ? horasExtraApi.bulkCrear(pid!, newHE.map(i => i.payload))
              .catch((e: any) => { erroresGuardado.push(`Horas extra: ${e?.message ?? 'error en bulk'}`); return null; })
          : Promise.resolve(null),
        newAusencias.length > 0
          ? ausenciasApi.bulkCrear(pid!, newAusencias.map(i => i.payload))
              .catch((e: any) => { erroresGuardado.push(`Ausencias: ${e?.message ?? 'error en bulk'}`); return null; })
          : Promise.resolve(null),
        // Bulk update de jornales individuales modificados — 1 sola petición.
        jornalesParaBulkUpdate.length > 0
          ? jornalesApi.bulkUpdate(pid!, jornalesParaBulkUpdate.map(i => ({ id: i.id, ...i.payload })))
              .catch((e: any) => { erroresGuardado.push(`Jornales edit: ${parseErrorJornal(e)}`); return null; })
          : Promise.resolve(null),
        Promise.allSettled(updates),
        Promise.all(gruposReqs),
      ])) as [any, any, any, any, any, any, Array<{ data: { id: number } } | null>];

      // ── Construir mapeos localId → backendId desde las respuestas bulk ────────
      // Posición idx en la respuesta corresponde a posición idx en el array enviado.
      const mapeoIdsCosecha:  Record<string, string> = {};
      const mapeoIdsPlateo:   Record<string, string> = {};
      const mapeoIdsPoda:     Record<string, string> = {};
      const mapeoIdsFert:     Record<string, string> = {};
      const mapeoIdsSanidad:  Record<string, string> = {};
      const mapeoIdsOtros:    Record<string, string> = {};
      const mapeoIdsFinca:    Record<string, string> = {};
      const mapeoIdsHE:       Record<string, string> = {};
      const mapeoIdsAusencia: Record<string, string> = {};

      if (jornalBulkRes) {
        (jornalBulkRes.data as Array<{ id: number }>).forEach((item, idx) => {
          const { localId, tipo } = newJornales[idx];
          if (!localId) return; // colaborador adicional, no necesita mapeo
          const bid = String(item.id);
          switch (tipo) {
            case 'plateo':  mapeoIdsPlateo[localId]  = bid; break;
            case 'poda':    mapeoIdsPoda[localId]     = bid; break;
            case 'fert':    mapeoIdsFert[localId]     = bid; break;
            case 'sanidad': mapeoIdsSanidad[localId]  = bid; break;
            case 'otros':   mapeoIdsOtros[localId]    = bid; break;
            case 'finca':   mapeoIdsFinca[localId]    = bid; break;
          }
        });
      }
      if (cosechaBulkRes) {
        (cosechaBulkRes.data as Array<{ id: number }>).forEach((item, idx) => {
          mapeoIdsCosecha[newCosechas[idx].localId] = String(item.id);
        });
      }
      if (heBulkRes) {
        (heBulkRes.data as Array<{ id: number }>).forEach((item, idx) => {
          mapeoIdsHE[newHE[idx].localId] = String(item.id);
        });
      }
      if (ausenciaBulkRes) {
        (ausenciaBulkRes.data as Array<{ id: number }>).forEach((item, idx) => {
          mapeoIdsAusencia[newAusencias[idx].localId] = String(item.id);
        });
      }
      // Grupos: cada respuesta corresponde a `newGrupos[idx]`. Aparte del
      // `data.id` (jornal_grupos.id) que guardamos en `grupoId`, refrescamos
      // también el `id` del wizard para que apunte al mismo grupo — así al
      // re-guardar cae en la rama de PUT al grupo.
      const mapeoGruposPorTipo: Record<string, Record<string, string>> = {
        plateo: {}, poda: {}, fert: {}, sanidad: {}, otros: {},
      };
      if (gruposRes) {
        gruposRes.forEach((res, idx) => {
          const { localId, tipo } = newGrupos[idx];
          if (!res || !localId) return;
          const grupoId = String(res.data.id);
          if (mapeoGruposPorTipo[tipo]) {
            mapeoGruposPorTipo[tipo][localId] = grupoId;
          }
        });
      }

      // ── Aplicar mapeos al estado local ───────────────────────────────────────
      // Sin esto, al volver a pulsar "Guardar Planilla" sin recargar, los items
      // locales conservan su id temporal y se duplican en el backend.
      const aplicarMapeo = <T extends { id: string }>(
        items: T[], mapeo: Record<string, string>,
      ): T[] => items.map(x => mapeo[x.id] ? { ...x, id: mapeo[x.id] } : x);

      /**
       * Igual que `aplicarMapeo`, pero setea `grupoId` en lugar de `id`.
       * Se usa para tarjetas persistidas como jornal-grupo (N>=2).
       */
      const aplicarMapeoGrupo = <T extends { id: string; grupoId?: string }>(
        items: T[], mapeo: Record<string, string>,
      ): T[] => items.map(x => mapeo[x.id] ? { ...x, grupoId: mapeo[x.id] } : x);

      if (Object.keys(mapeoIdsCosecha).length > 0)
        setTrabajosCosecha(prev => aplicarMapeo(prev, mapeoIdsCosecha));
      if (Object.keys(mapeoIdsPlateo).length > 0)
        setTrabajosPlateo(prev => aplicarMapeo(prev, mapeoIdsPlateo));
      if (Object.keys(mapeoGruposPorTipo.plateo).length > 0)
        setTrabajosPlateo(prev => aplicarMapeoGrupo(prev, mapeoGruposPorTipo.plateo));
      if (Object.keys(mapeoIdsPoda).length > 0)
        setTrabajosPoda(prev => aplicarMapeo(prev, mapeoIdsPoda));
      if (Object.keys(mapeoGruposPorTipo.poda).length > 0)
        setTrabajosPoda(prev => aplicarMapeoGrupo(prev, mapeoGruposPorTipo.poda));
      if (Object.keys(mapeoIdsFert).length > 0)
        setTrabajosFertilizacion(prev => aplicarMapeo(prev, mapeoIdsFert));
      if (Object.keys(mapeoGruposPorTipo.fert).length > 0)
        setTrabajosFertilizacion(prev => aplicarMapeoGrupo(prev, mapeoGruposPorTipo.fert));
      if (Object.keys(mapeoIdsSanidad).length > 0)
        setTrabajosSanidad(prev => aplicarMapeo(prev, mapeoIdsSanidad));
      if (Object.keys(mapeoGruposPorTipo.sanidad).length > 0)
        setTrabajosSanidad(prev => aplicarMapeoGrupo(prev, mapeoGruposPorTipo.sanidad));
      if (Object.keys(mapeoIdsOtros).length > 0)
        setTrabajosOtros(prev => aplicarMapeo(prev, mapeoIdsOtros));
      if (Object.keys(mapeoGruposPorTipo.otros).length > 0)
        setTrabajosOtros(prev => aplicarMapeoGrupo(prev, mapeoGruposPorTipo.otros));
      if (Object.keys(mapeoIdsFinca).length > 0)
        setTrabajosAuxiliares(prev => aplicarMapeo(prev, mapeoIdsFinca));
      if (Object.keys(mapeoIdsHE).length > 0)
        setHorasExtras(prev => aplicarMapeo(prev, mapeoIdsHE));
      if (Object.keys(mapeoIdsAusencia).length > 0)
        setAusentes(prev => aplicarMapeo(prev, mapeoIdsAusencia));

      setPlanillaPersistida(true);

      // ── Reportes de advertencias y errores ───────────────────────────────────
      if (!silent) {
        if (otrosSinLabor > 0) {
          toast.error(
            `${otrosSinLabor} registro(s) de "Otros" no se guardaron: falta configurar labores custom en Configuración → Labores de Palma.`,
            { duration: 6000 },
          );
        }
        if (fincaSinLabor > 0) {
          toast.error(
            `${fincaSinLabor} registro(s) de "Finca" no se guardaron: la labor seleccionada no existe en el catálogo. Configúrala en Configuración → Labores de Finca.`,
            { duration: 6000 },
          );
        }
        const heMsgs: string[] = [];
        if (heSinColab > 0)       heMsgs.push(`${heSinColab} sin colaborador`);
        if (heSinTipo > 0)        heMsgs.push(`${heSinTipo} sin tipo de hora`);
        if (heHorasInvalidas > 0) heMsgs.push(`${heHorasInvalidas} con cantidad fuera de rango (0.25–12)`);
        if (heOperarios > 0)      heMsgs.push(`${heOperarios} de operarios de tercero (no permitido)`);
        if (heMsgs.length > 0) {
          toast.error(`Horas extras no guardadas: ${heMsgs.join(', ')}.`, { duration: 6000 });
        }
        if (erroresGuardado.length > 0) {
          const primeros = erroresGuardado.slice(0, 3).join(' · ');
          toast.error(
            `${erroresGuardado.length} error(es) al guardar: ${primeros}${
              erroresGuardado.length > 3 ? ` (+${erroresGuardado.length - 3} más)` : ''
            }`,
            { duration: 7000 },
          );
        }
        if (fertSaltadas.length > 0) {
          toast.warning(
            `Planilla guardada, pero ${fertSaltadas.length} fertilización(es) no se guardaron porque no se pudo resolver el insumo: ${fertSaltadas.join(', ')}. Verifica el tipo de fertilizante seleccionado.`,
            { duration: 8000 },
          );
        }
        if (laboresFincaSaltadas.length > 0) {
          toast.warning(
            `Planilla guardada, pero ${laboresFincaSaltadas.length} labor(es) de finca no se crearon: ${laboresFincaSaltadas.join(', ')}. Puedes crearlas manualmente en Configuración → Labores de Finca.`,
            { duration: 8000 },
          );
        }
        if (fertSaltadas.length === 0 && laboresFincaSaltadas.length === 0) {
          toast.success(planillaId ? 'Planilla actualizada' : 'Planilla guardada');
        }

        // ── Rehidratar snapshot de dirty tracking ────────────────────────────
        // Después del guardado, todas las tarjetas con backend id están
        // persistidas con su estado actual. Rehidratar el snapshot para que el
        // próximo "Guardar" NO reenvíe items que no se hayan tocado.
        // Usamos setState callbacks solo para leer el estado ya actualizado
        // por los aplicarMapeo de arriba (no muta, solo lee).
        snapshotItemsRef.current.clear();
        setTrabajosCosecha(prev => { guardarSnapshot('cosecha', prev); return prev; });
        setTrabajosPlateo(prev => { guardarSnapshot('plateo', prev); return prev; });
        setTrabajosPoda(prev => { guardarSnapshot('poda', prev); return prev; });
        setTrabajosFertilizacion(prev => { guardarSnapshot('fert', prev); return prev; });
        setTrabajosSanidad(prev => { guardarSnapshot('sanidad', prev); return prev; });
        setTrabajosOtros(prev => { guardarSnapshot('otros', prev); return prev; });
        setTrabajosAuxiliares(prev => { guardarSnapshot('finca', prev); return prev; });
        setHorasExtras(prev => { guardarSnapshot('he', prev); return prev; });
        setAusentes(prev => { guardarSnapshot('ausencia', prev); return prev; });

        // Aviso de cobertura tras un guardado exitoso. Si hay faltantes,
        // mostramos el mismo modal que en el flujo de aprobar (§7.1). El
        // usuario decide si vuelve a editar o va al listado. NO bloquea el
        // guardado — la planilla ya está persistida como BORRADOR.
        let mostrandoCobertura = false;
        if (pid) {
          try {
            const cov = await operacionesApi.cobertura(pid);
            if (cov.data?.tiene_faltantes) {
              setCoberturaModo('guardar');
              setCoberturaFaltantes(cov.data);
              mostrandoCobertura = true;
            }
          } catch { /* no bloqueamos el flujo si el aviso falla */ }
        }
        // Solo navegar cuando el guardado viene de la etapa final (o de
        // creación nueva). Al guardar desde etapas intermedias (`stayHere`),
        // el usuario se queda en el wizard editando.
        // Si estamos mostrando el modal de cobertura, el propio modal
        // maneja la navegación en su botón "Ir al listado".
        if (!opts.stayHere && !mostrandoCobertura) navigate('/operaciones');
      }
    } catch (err: any) {
      if (!silent) toast.error(err?.message ?? 'Error al guardar la planilla');
    } finally {
      if (!silent) setGuardando(false);
    }
  };

  // ── Autosave al salir del wizard sin pulsar "Guardar Planilla" ───────────
  //
  // Se mantiene un ref con la closure fresca para que el cleanup del useEffect
  // (que solo corre con array vacío en el primer mount) tenga acceso al estado
  // más reciente. `guardarTodo()` ya distingue ítems nuevos (POST bulk) de
  // existentes (PUT paralelo con `isBackendId`) y hace PUT del header cuando
  // hay planillaId — así que llamarlo siempre es seguro, no duplica hijos.
  //
  // Guarda como BORRADOR si:
  //   - No estamos en modo lectura.
  //   - Hay datos mínimos para que el backend acepte el POST (fecha + elaborado_por).
  //   - El usuario ya agregó AL MENOS un trabajo/novedad. Sin esto, salir de la
  //     pantalla apenas se abrió (con `fecha` y `elaboradoPor` autofill)
  //     crearía una planilla en BORRADOR completamente vacía en el listado.
  //
  // NO se filtra por `planillaPersistida`: aunque el usuario haya pulsado
  // "Guardar" antes, si sigue agregando ítems y luego sale, queremos que el
  // autosave los persista. Como `guardarTodo()` distingue ítems con backendId
  // (PUT) de ítems locales (POST bulk), re-ejecutarlo es idempotente.
  const guardarBorradorRef = useRef<() => void>(() => {});
  guardarBorradorRef.current = () => {
    if (modoLectura) return;
    if (!fecha || !elaboradoPor) return;
    const hayContenido =
      trabajosCosecha.length > 0
      || trabajosPlateo.length > 0
      || trabajosPoda.length > 0
      || trabajosFertilizacion.length > 0
      || trabajosSanidad.length > 0
      || trabajosOtros.length > 0
      || trabajosAuxiliares.length > 0
      || horasExtras.length > 0
      || ausentes.length > 0;
    // Si nunca se persistió y no hay ningún trabajo/novedad, no creamos
    // planilla vacía. Si ya se persistió (planillaId), sí guardamos las
    // ediciones del header (fecha/lluvia/hora) aunque no haya hijos nuevos.
    if (!planillaId && !hayContenido) return;
    // Disparado en background. No espera la promesa: el componente ya se está
    // desmontando o la página se está cerrando. La petición termina sola.
    void guardarTodo({ silent: true });
  };

  useEffect(() => {
    return () => { guardarBorradorRef.current(); };
  }, []);

  /**
   * Aprueba la planilla llamando a `POST /operaciones/{id}/aprobar` sin
   * verificar alertas previas — se usa como "Continuar de todas formas"
   * desde los modales informativos (planilla vacía / cobertura incompleta)
   * y también como camino directo cuando no hay alertas que mostrar.
   */
  const ejecutarAprobar = async () => {
    if (!idParam) return;
    setAprobando(true);
    try {
      const res = await operacionesApi.aprobar(Number(idParam));
      const casc = res.aprobaciones_cascada;
      if (casc && (casc.horas_extra > 0 || casc.ausencias > 0)) {
        toast.success(
          `Planilla aprobada. Aprobadas en cascada: ${casc.horas_extra} horas extra, ${casc.ausencias} ausencias.`,
          { duration: 6000 },
        );
      } else {
        toast.success('Planilla aprobada');
      }
      setEstadoPlanilla('APROBADA');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al aprobar');
    } finally {
      setAprobando(false);
      setAccionPendiente(null);
    }
  };

  // Aviso del navegador antes de refresh / cerrar pestaña cuando hay datos
  // sin persistir. No podemos disparar una petición fiable aquí (el navegador
  // suele matar el fetch), así que solo pedimos confirmación al usuario para
  // que use "Guardar" primero. El autosave del useEffect cleanup cubre las
  // navegaciones internas (react-router), donde sí hay tiempo para el fetch.
  useEffect(() => {
    if (modoLectura) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (planillaPersistida) return;
      if (!fecha) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [modoLectura, planillaPersistida, fecha]);

  // Funciones para agregar trabajos
  const agregarCosecha = () => {
    setCosechaEnEdicion({
      id: `cosecha-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      gajosRecogidos: 0,
      kilos: 0
    });
  };

  const guardarCosecha = () => {
    if (cosechaEnEdicion) {
      const existe = trabajosCosecha.some(t => t.id === cosechaEnEdicion.id);
      if (existe) {
        setTrabajosCosecha(trabajosCosecha.map(t => t.id === cosechaEnEdicion.id ? cosechaEnEdicion : t));
      } else {
        setTrabajosCosecha([cosechaEnEdicion, ...trabajosCosecha]);
      }
      setCosechaEnEdicion(null);
    }
  };

  const cancelarCosecha = () => {
    setCosechaEnEdicion(null);
  };

  const agregarPlateo = () => {
    setPlateoEnEdicion({
      id: `plateo-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      numeroPalmas: 0
    });
  };

  const guardarPlateo = () => {
    if (plateoEnEdicion) {
      const existe = trabajosPlateo.some(t => t.id === plateoEnEdicion.id);
      if (existe) {
        setTrabajosPlateo(trabajosPlateo.map(t => t.id === plateoEnEdicion.id ? plateoEnEdicion : t));
      } else {
        setTrabajosPlateo([plateoEnEdicion, ...trabajosPlateo]);
      }
      setPlateoEnEdicion(null);
    }
  };

  const cancelarPlateo = () => {
    setPlateoEnEdicion(null);
  };

  const agregarPoda = () => {
    setPodaEnEdicion({
      id: `poda-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      numeroPalmas: 0
    });
  };

  const guardarPoda = () => {
    if (podaEnEdicion) {
      const existe = trabajosPoda.some(t => t.id === podaEnEdicion.id);
      if (existe) {
        setTrabajosPoda(trabajosPoda.map(t => t.id === podaEnEdicion.id ? podaEnEdicion : t));
      } else {
        setTrabajosPoda([podaEnEdicion, ...trabajosPoda]);
      }
      setPodaEnEdicion(null);
    }
  };

  const cancelarPoda = () => {
    setPodaEnEdicion(null);
  };

  const agregarFertilizacion = () => {
    setFertilizacionEnEdicion({
      id: `fertilizacion-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      palmas: 0,
      tipoFertilizante: '',
      otroFertilizante: '',
      cantidadGramos: 0
    });
  };

  const guardarFertilizacion = () => {
    if (fertilizacionEnEdicion) {
      const existe = trabajosFertilizacion.some(t => t.id === fertilizacionEnEdicion.id);
      if (existe) {
        setTrabajosFertilizacion(trabajosFertilizacion.map(t => t.id === fertilizacionEnEdicion.id ? fertilizacionEnEdicion : t));
      } else {
        setTrabajosFertilizacion([fertilizacionEnEdicion, ...trabajosFertilizacion]);
      }
      setFertilizacionEnEdicion(null);
    }
  };

  const cancelarFertilizacion = () => {
    setFertilizacionEnEdicion(null);
  };

  const agregarSanidad = () => {
    setSanidadEnEdicion({
      id: `sanidad-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      trabajoRealizado: '',
      laborActividadId: null,
    });
  };

  const guardarSanidad = () => {
    if (sanidadEnEdicion) {
      const existe = trabajosSanidad.some(t => t.id === sanidadEnEdicion.id);
      if (existe) {
        setTrabajosSanidad(trabajosSanidad.map(t => t.id === sanidadEnEdicion.id ? sanidadEnEdicion : t));
      } else {
        setTrabajosSanidad([sanidadEnEdicion, ...trabajosSanidad]);
      }
      setSanidadEnEdicion(null);
    }
  };

  const cancelarSanidad = () => {
    setSanidadEnEdicion(null);
  };

  const agregarOtros = () => {
    // Preseleccionar la fija "Otros" del sistema (tipo='OTROS') — el usuario
    // puede cambiar a otra custom PALMA desde el dropdown "Labor" o escribir
    // "Otra" para crear una custom nueva al vuelo.
    const fijaOtros = laboresOtrosOpciones.find(
      (l) => l.nombre.trim().toLowerCase() === 'otros',
    );
    setOtrosModoOtra(false);
    setOtrosEnEdicion({
      id: `otros-${Date.now()}`,
      colaboradores: [],
      nombre: fijaOtros?.nombre ?? '',
      laborOtrosKey: fijaOtros?.key,
      laborOtrosRawId: fijaOtros?.rawId,
      laborOtrosTipoPago: fijaOtros?.tipo_pago ?? 'JORNAL_FIJO',
      laborRealizada: '',
      laborActividadId: null,
      lote: '',
      sublote: ''
    });
  };

  const guardarOtros = () => {
    if (!otrosEnEdicion) return;
    // §3.2 del doc: si la labor seleccionada es POR_PALMA, cantidad_palmas es
    // requerido (el backend devuelve 422 si llega vacío). Validamos en cliente
    // para evitar el viaje inútil.
    if (otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA') {
      if (!otrosEnEdicion.numeroPalmas || otrosEnEdicion.numeroPalmas <= 0) {
        toast.error('Esta labor se paga por palma — indica el número de palmas');
        return;
      }
    }
    const existe = trabajosOtros.some(t => t.id === otrosEnEdicion.id);
    if (existe) {
      setTrabajosOtros(trabajosOtros.map(t => t.id === otrosEnEdicion.id ? otrosEnEdicion : t));
    } else {
      setTrabajosOtros([otrosEnEdicion, ...trabajosOtros]);
    }
    setOtrosEnEdicion(null);
    setOtrosModoOtra(false);
  };

  const cancelarOtros = () => {
    setOtrosEnEdicion(null);
    setOtrosModoOtra(false);
  };

  // Funciones para horas extras
  const agregarHoraExtra = () => {
    setHoraExtraEnEdicion({
      id: `horaextra-${Date.now()}`,
      colaboradorId: '',
      tipoHora: '',
      numeroHoras: 0,
      observacion: ''
    });
  };

  const guardarHoraExtra = () => {
    if (horaExtraEnEdicion) {
      const existe = horasExtras.some(h => h.id === horaExtraEnEdicion.id);
      if (existe) {
        setHorasExtras(horasExtras.map(h => h.id === horaExtraEnEdicion.id ? horaExtraEnEdicion : h));
      } else {
        setHorasExtras([horaExtraEnEdicion, ...horasExtras]); // LIFO
      }
      setHoraExtraEnEdicion(null);
    }
  };

  const cancelarHoraExtra = () => {
    setHoraExtraEnEdicion(null);
  };

  const eliminarHoraExtra = async (id: string) => {
    if (isBackendId(id)) {
      try {
        await horasExtraApi.eliminar(parseInt(id));
      } catch (err: any) {
        // 404 → ya no existe, idempotente.
        if (err?.status !== 404) {
          toast.error(err?.message ?? 'No se pudo eliminar la hora extra');
          return;
        }
      }
    }
    setHorasExtras(prev => prev.filter(h => h.id !== id));
  };

  const agregarAuxiliar = () => {
    setAuxiliarEnEdicion({
      id: `auxiliar-${Date.now()}`,
      nombre: '',
      labor: '',
      otraLabor: '',
      lugar: '',
    });
  };

  const guardarAuxiliar = async () => {
    if (!auxiliarEnEdicion) return;
    if (!auxiliarEnEdicion.nombre || !auxiliarEnEdicion.labor) {
      toast.error('Selecciona colaborador y labor antes de guardar');
      return;
    }
    if (auxiliarEnEdicion.labor === 'Otro' && !auxiliarEnEdicion.otraLabor?.trim()) {
      toast.error('Especifica el tipo de labor');
      return;
    }
    // Si es "Otro" con nombre nuevo, crear la labor en el catálogo ahora mismo
    // (§3.3.1 POST /operaciones/labores-finca). Así aparece inmediatamente en
    // el dropdown de la próxima tarjeta y también en Configuración → Labores.
    let auxFinal = auxiliarEnEdicion;
    if (auxiliarEnEdicion.labor === 'Otro') {
      const nombreNuevo = (auxiliarEnEdicion.otraLabor || '').trim();
      const existente = Array.from(laboresMap.entries())
        .find(([n]) => n.toLowerCase() === nombreNuevo.toLowerCase());
      if (existente) {
        // Ya existe en el catálogo local — reutilizamos y limpiamos "Otro".
        auxFinal = { ...auxiliarEnEdicion, labor: existente[0], otraLabor: '' };
      } else {
        try {
          const res = await selectsApi.crearLaborFinca(nombreNuevo);
          const nombreCreado = res.data.nombre;
          const idCreado = res.data.id;
          setLaboresMap((prev) => new Map(prev).set(nombreCreado, idCreado));
          setLaboresLista((prev) => prev.includes(nombreCreado) ? prev : [...prev, nombreCreado]);
          auxFinal = { ...auxiliarEnEdicion, labor: nombreCreado, otraLabor: '' };
          toast.success(`Labor "${nombreCreado}" creada`);
        } catch (err: any) {
          if (err?.code === 'LABOR_FINCA_DUPLICADA' && err?.data?.id) {
            const nombreBackend = err.data.nombre ?? nombreNuevo;
            setLaboresMap((prev) => new Map(prev).set(nombreBackend, err.data.id));
            setLaboresLista((prev) => prev.includes(nombreBackend) ? prev : [...prev, nombreBackend]);
            auxFinal = { ...auxiliarEnEdicion, labor: nombreBackend, otraLabor: '' };
          } else {
            toast.error(err?.message ?? 'No se pudo crear la labor');
            return;
          }
        }
      }
    }
    const existe = trabajosAuxiliares.some(t => t.id === auxFinal.id);
    if (existe) {
      setTrabajosAuxiliares(trabajosAuxiliares.map(t => (t.id === auxFinal.id ? auxFinal : t)));
    } else {
      setTrabajosAuxiliares([auxFinal, ...trabajosAuxiliares]);
    }
    setAuxiliarEnEdicion(null);
  };

  const cancelarAuxiliar = () => {
    setAuxiliarEnEdicion(null);
  };

  const editarAuxiliar = (id: string) => {
    const t = trabajosAuxiliares.find(x => x.id === id);
    if (!t) return;
    setAuxiliarEnEdicion({ ...t });
  };

  // Funciones para eliminar trabajos
  /**
   * Borra una tarjeta de labor de palma (§3.2.1) del backend según su tipo:
   *   - `grupoId` presente     → DELETE /jornal-grupos/{grupoId} (cascada
   *     elimina el maestro y todos sus jornales miembro en una transacción).
   *   - `isBackendId(id)`      → DELETE /jornales/{id} (jornal individual).
   *   - Ninguno de los dos     → tarjeta local sin persistir, solo se saca
   *     del estado.
   * Si el backend responde error (típicamente 409 `OPERACION_APROBADA`)
   * no se toca el estado local — el usuario ve el toast y decide.
   */
  const eliminarTarjetaLaborPalma = async (
    tarjeta: { id: string; grupoId?: string },
  ): Promise<boolean> => {
    try {
      if (tarjeta.grupoId && /^\d+$/.test(tarjeta.grupoId)) {
        await jornalGruposApi.eliminar(parseInt(tarjeta.grupoId));
      } else if (isBackendId(tarjeta.id)) {
        await jornalesApi.eliminar(parseInt(tarjeta.id));
      }
      return true;
    } catch (err: any) {
      const code = err?.code ?? '';
      const status = err?.status;
      // 404: el registro ya no existe en el backend (doble-click / retry).
      // Idempotente: sacamos la tarjeta del UI igual.
      if (status === 404) return true;
      if (code === 'OPERACION_APROBADA') {
        toast.error('No se puede eliminar: la planilla ya fue aprobada');
      } else {
        toast.error(err?.message ?? 'No se pudo eliminar el registro');
      }
      return false;
    }
  };

  const eliminarCosecha = async (id: string) => {
    if (isBackendId(id)) {
      try {
        await cosechasApi.eliminar(parseInt(id));
      } catch (err: any) {
        const code = err?.code ?? '';
        const status = err?.status;
        // 404: la cosecha ya no existe en el backend (doble-click / retry).
        // Tratamos como éxito idempotente y sacamos la fila del UI.
        if (status !== 404) {
          if (code === 'COSECHA_EN_VIAJE') {
            toast.error('No se puede eliminar: la cosecha ya fue asignada a un viaje. Desasóciala del viaje primero.');
          } else if (code === 'OPERACION_APROBADA') {
            toast.error('No se puede eliminar: la planilla ya fue aprobada');
          } else {
            toast.error(err?.message ?? 'No se pudo eliminar la cosecha');
          }
          return;
        }
      }
    }
    setTrabajosCosecha(prev => prev.filter(t => t.id !== id));
  };

  const eliminarPlateo = async (id: string) => {
    const t = trabajosPlateo.find(x => x.id === id);
    if (!t) return;
    if (!(await eliminarTarjetaLaborPalma(t))) return;
    setTrabajosPlateo(prev => prev.filter(x => x.id !== id));
  };

  const eliminarPoda = async (id: string) => {
    const t = trabajosPoda.find(x => x.id === id);
    if (!t) return;
    if (!(await eliminarTarjetaLaborPalma(t))) return;
    setTrabajosPoda(prev => prev.filter(x => x.id !== id));
  };

  const eliminarFertilizacion = async (id: string) => {
    const t = trabajosFertilizacion.find(x => x.id === id);
    if (!t) return;
    if (!(await eliminarTarjetaLaborPalma(t))) return;
    setTrabajosFertilizacion(prev => prev.filter(x => x.id !== id));
  };

  const eliminarSanidad = async (id: string) => {
    const t = trabajosSanidad.find(x => x.id === id);
    if (!t) return;
    if (!(await eliminarTarjetaLaborPalma(t))) return;
    setTrabajosSanidad(prev => prev.filter(x => x.id !== id));
  };

  const eliminarOtros = async (id: string) => {
    const t = trabajosOtros.find(x => x.id === id);
    if (!t) return;
    if (!(await eliminarTarjetaLaborPalma(t))) return;
    setTrabajosOtros(prev => prev.filter(x => x.id !== id));
  };

  const eliminarAuxiliar = async (id: string) => {
    // Labores de finca no usan grupo — cada tarjeta es 1 colaborador × 1 lugar,
    // así que basta con el DELETE al jornal individual.
    if (isBackendId(id)) {
      try {
        await jornalesApi.eliminar(parseInt(id));
      } catch (err: any) {
        const code = err?.code ?? '';
        const status = err?.status;
        // 404 → ya no existe, idempotente.
        if (status !== 404) {
          if (code === 'OPERACION_APROBADA') {
            toast.error('No se puede eliminar: la planilla ya fue aprobada');
          } else {
            toast.error(err?.message ?? 'No se pudo eliminar la labor de finca');
          }
          return;
        }
      }
    }
    setTrabajosAuxiliares(prev => prev.filter(t => t.id !== id));
  };

  // Funciones para editar trabajos guardados (cargan el item al formulario sin removerlo de la lista)
  // Si el usuario cancela, el item original queda intacto. Si guarda, se reemplaza por id.
  const editarCosecha = (id: string) => {
    const t = trabajosCosecha.find(x => x.id === id);
    if (!t) return;
    setCosechaEnEdicion({ ...t });
  };

  const editarPlateo = (id: string) => {
    const t = trabajosPlateo.find(x => x.id === id);
    if (!t) return;
    setPlateoEnEdicion({ ...t });
  };

  const editarPoda = (id: string) => {
    const t = trabajosPoda.find(x => x.id === id);
    if (!t) return;
    setPodaEnEdicion({ ...t });
  };

  const editarFertilizacion = (id: string) => {
    const t = trabajosFertilizacion.find(x => x.id === id);
    if (!t) return;
    setFertilizacionEnEdicion({ ...t });
  };

  const editarSanidad = (id: string) => {
    const t = trabajosSanidad.find(x => x.id === id);
    if (!t) return;
    setSanidadEnEdicion({ ...t });
  };

  const editarOtros = (id: string) => {
    const t = trabajosOtros.find(x => x.id === id);
    if (!t) return;
    // Al editar un trabajo ya existente la labor viene del catálogo → NO
    // estamos en modo "Otra". El input "Especificar otro trabajo" solo se
    // muestra si el usuario elige "Otra" explícitamente después.
    setOtrosModoOtra(false);
    setOtrosEnEdicion({ ...t });
  };

  const editarHoraExtra = (id: string) => {
    const t = horasExtras.find(x => x.id === id);
    if (!t) return;
    setHoraExtraEnEdicion({ ...t });
  };

  // Funciones para manejar colaboradores en cosecha en edición
  const agregarColaboradorEnEdicion = (colaboradorId: string) => {
    if (cosechaEnEdicion && !cosechaEnEdicion.colaboradores.includes(colaboradorId)) {
      setCosechaEnEdicion({
        ...cosechaEnEdicion,
        colaboradores: [...cosechaEnEdicion.colaboradores, colaboradorId]
      });
    }
  };

  const eliminarColaboradorEnEdicion = (colaboradorId: string) => {
    if (cosechaEnEdicion) {
      setCosechaEnEdicion({
        ...cosechaEnEdicion,
        colaboradores: cosechaEnEdicion.colaboradores.filter(id => id !== colaboradorId)
      });
    }
  };

  // Funciones para manejar colaboradores en cosecha
  const agregarColaboradorACosecha = (trabajoId: string, colaboradorId: string) => {
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeCosecha = (trabajoId: string, colaboradorId: string) => {
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };


  // Funciones para plateo
  const agregarColaboradorAPlateo = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePlateo = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para poda
  const agregarColaboradorAPoda = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePoda = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para fertilización
  const agregarColaboradorAFertilizacion = (trabajoId: string, colaboradorId: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeFertilizacion = (trabajoId: string, colaboradorId: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };


  // Funciones para ausentes
  const agregarAusente = () => {
    if (colaboradorAusenteSeleccionado && motivoAusenteSeleccionado) {
      if (motivoAusenteSeleccionado === 'Otro' && !otroMotivoAusente) {
        return;
      }
      const nuevoAusente: AusenteRegistro = {
        id: `ausente-${Date.now()}`,
        colaboradorId: colaboradorAusenteSeleccionado,
        motivo: motivoAusenteSeleccionado,
        otroMotivo: motivoAusenteSeleccionado === 'Otro' ? otroMotivoAusente : undefined
      };
      setAusentes([...ausentes, nuevoAusente]);
      setColaboradorAusenteSeleccionado('');
      setMotivoAusenteSeleccionado('');
      setOtroMotivoAusente('');
    }
  };

  const eliminarAusente = async (id: string) => {
    if (isBackendId(id)) {
      try {
        await ausenciasApi.eliminar(parseInt(id));
      } catch (err: any) {
        const code = err?.code ?? '';
        const status = err?.status;
        // 404 → ya no existe, idempotente.
        if (status !== 404) {
          if (code === 'OPERACION_APROBADA') {
            toast.error('No se puede eliminar: la planilla ya fue aprobada');
          } else if (code === 'AUSENCIA_LIQUIDADA') {
            toast.error('No se puede eliminar: la ausencia ya fue liquidada en nómina');
          } else {
            toast.error(err?.message ?? 'No se pudo eliminar la ausencia');
          }
          return;
        }
      }
    }
    setAusentes(prev => prev.filter(a => a.id !== id));
  };

  const puedeAvanzarEtapa1 = fecha && elaboradoPor;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl relative">
      {/* Overlay de carga durante el guardado */}
      {guardando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold text-foreground">Guardando planilla...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/operaciones')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1>
              {modoLectura
                ? 'Ver Planilla del Día'
                : isEditMode
                  ? 'Editar Planilla del Día'
                  : 'Crear Nueva Planilla'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {modoLectura
                ? `Detalle de la planilla${estadoPlanilla ? ` — Estado: ${estadoPlanilla}` : ''}`
                : 'Configura tu planilla paso a paso'}
            </p>
          </div>
          {/* Los botones "Editar" y "Aprobar Planilla" del header se eliminaron
              a pedido del usuario. Ambas acciones ya están disponibles desde el
              listado /operaciones (columna Acciones por fila) y desde el paso 5
              del wizard en modo lectura ("Finalizar"). */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stepper horizontal */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  // En modo lectura el usuario abre una planilla ya creada → puede
                  // saltar a cualquier etapa sin restricción (no hay "futuros").
                  const navegable = estaActiva || estaCompleta || modoLectura;
                  return (
                    <div key={etapa.numero} className="flex items-center" style={{ flex: index < ETAPAS.length - 1 ? 1 : 'none' }}>
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${
                          navegable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!navegable}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                            estaCompleta
                              ? 'bg-primary border-primary text-white'
                              : estaActiva
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {estaCompleta ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="font-bold">{etapa.numero}</span>
                          )}
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-sm font-semibold whitespace-nowrap ${
                              estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>

                      {/* Línea conectora */}
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-3 bg-border relative min-w-[20px]">
                          <div
                            className={`absolute inset-0 bg-primary transition-all ${
                              estaCompleta ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contenido de las etapas */}
          {modoLectura && (
            <style>{`
              /* Ocultar acciones de edición (los íconos que sí mutan datos). */
              .wizard-modo-lectura button:has(svg.lucide-pencil),
              .wizard-modo-lectura button:has(svg.lucide-trash-2),
              .wizard-modo-lectura button:has(svg.lucide-plus),
              .wizard-modo-lectura button:has(svg.lucide-x) {
                display: none !important;
              }
              /* Inputs/textareas/selects quedan visibles pero no editables.
                 Usamos pointer-events en vez de fieldset disabled para que
                 las Tabs (Cosecha/Plateo/Poda/...) y el stepper sigan
                 navegables. */
              .wizard-modo-lectura input,
              .wizard-modo-lectura textarea,
              .wizard-modo-lectura [role="combobox"] {
                pointer-events: none !important;
                background-color: transparent !important;
                opacity: 1 !important;
                cursor: default !important;
              }
              /* Garantizar que tabs y el stepper sí reciban clicks. */
              .wizard-modo-lectura [role="tablist"],
              .wizard-modo-lectura [role="tab"] {
                pointer-events: auto !important;
              }
            `}</style>
          )}
          <fieldset
            className={`space-y-6 m-0 p-0 border-0 ${modoLectura ? 'wizard-modo-lectura' : ''}`}
          >
            {/* ETAPA 1: INFORMACIÓN GENERAL */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información General</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ingresa los datos básicos de la planilla
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha *</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="elaboradoPor">Elaborado por *</Label>
                      <Input
                        id="elaboradoPor"
                        placeholder="Nombre completo"
                        value={elaboradoPor}
                        onChange={(e) => setElaboradoPor(e.target.value)}
                        readOnly
                        className="bg-muted/30 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="huboLluvia">¿Hubo lluvia?</Label>
                      <Select
                        value={huboLluvia}
                        onValueChange={(value) => {
                          setHuboLluvia(value as 'si' | 'no');
                          if (value === 'no') {
                            setLluvia('');
                          }
                        }}
                      >
                        <SelectTrigger id="huboLluvia">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {huboLluvia === 'si' && (
                      <div className="space-y-2">
                        <Label htmlFor="lluvia">Lluvia (mm)</Label>
                        <Input
                          id="lluvia"
                          type="number" step="0.001"
                          placeholder="Ej: 15"
                          value={lluvia}
                          onChange={(e) => setLluvia(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="inicioLabores">Inicio de Labores</Label>
                      <Input
                        id="inicioLabores"
                        type="time"
                        value={inicioLabores}
                        onChange={(e) => setInicioLabores(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: LABORES DE PALMA */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div>
                    <CardTitle>Labores de Palma</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Cosecha, plateo, poda, fertilización, sanidad y otros
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="cosecha" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="cosecha">Cosecha</TabsTrigger>
                      <TabsTrigger value="plateo">Plateo</TabsTrigger>
                      <TabsTrigger value="poda">Poda</TabsTrigger>
                      <TabsTrigger value="fertilizacion">Fertilización</TabsTrigger>
                      <TabsTrigger value="sanidad">Sanidad</TabsTrigger>
                      <TabsTrigger value="otros">Otros</TabsTrigger>
                    </TabsList>

                    {/* TAB: COSECHA */}
                    <TabsContent value="cosecha" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarCosecha} className="gap-2" disabled={cosechaEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Cosecha
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {cosechaEnEdicion && (
                        <div ref={setFormRef('cosecha')} className="scroll-mt-24">
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={cosechaEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {cosechaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {cosechaEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                            {!col.terceroNombre && col.modalidad_pago === 'FIJO' && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 font-medium align-middle"
                                                title="Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base."
                                              >
                                                FIJO · $0
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorEnEdicion(colId)}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={cosechaEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, lote: value, sublote: '' });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={cosechaEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, sublote: value });
                                  }}
                                  disabled={!cosechaEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === cosechaEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Gajos Recogidos</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={cosechaEnEdicion.gajosRecogidos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, gajosRecogidos: parseFloat(e.target.value) || 0 });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Kilos (opcional)</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={cosechaEnEdicion.kilos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, kilos: parseFloat(e.target.value) || 0 });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarCosecha} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarCosecha} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de cosechas guardadas */}
                      {trabajosCosecha.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>

                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {sublote?.nombre || 'Sublote no especificado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Gajos */}
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Gajos</p>
                                  <p className="font-bold text-lg">{trabajo.gajosRecogidos}</p>
                                </div>

                                {/* Kilos (si existe) */}
                                {trabajo.kilos > 0 && (
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">Kilos</p>
                                    <p className="font-semibold">{trabajo.kilos}</p>
                                  </div>
                                )}

                                {/* Botones acción */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarCosecha(trabajo.id)}
                                    disabled={cosechaEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarCosecha(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosCosecha.length === 0 && !cosechaEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de cosecha</p>
                          <p className="text-sm">Haz clic en "Agregar Cosecha" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: PLATEO */}
                    <TabsContent value="plateo" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarPlateo} className="gap-2" disabled={plateoEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Plateo
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {plateoEnEdicion && (
                        <div ref={setFormRef('plateo')} className="scroll-mt-24">
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={plateoEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {plateoEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {plateoEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      const conOverride = tieneOverrideOperario(colId, palmaTipoToId.get('PLATEO'));
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>{col.nombres} {col.apellidos}{col.terceroNombre ? <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle">Tercero · {col.terceroNombre}</span> : null}{conOverride ? <span className="ml-1 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium align-middle" title="Este operario tiene precio personalizado para Plateo">$</span> : null}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: plateoEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={plateoEnEdicion.lote}
                                  onValueChange={(value) => setPlateoEnEdicion({ ...plateoEnEdicion, lote: value, sublote: '' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={plateoEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    const sub = sublotes.find(s => s.id === value);
                                    setPlateoEnEdicion({
                                      ...plateoEnEdicion,
                                      sublote: value,
                                      numeroPalmas: Number(sub?.cantidadPalmas ?? 0),
                                    });
                                  }}
                                  disabled={!plateoEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === plateoEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={plateoEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPlateoEnEdicion({ ...plateoEnEdicion, numeroPalmas: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarPlateo} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarPlateo} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de plateos guardados */}
                      {trabajosPlateo.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarPlateo(trabajo.id)}
                                    disabled={plateoEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarPlateo(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosPlateo.length === 0 && !plateoEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de plateo</p>
                          <p className="text-sm">Haz clic en "Agregar Plateo" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: PODA */}
                    <TabsContent value="poda" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarPoda} className="gap-2" disabled={podaEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Poda
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {podaEnEdicion && (
                        <div ref={setFormRef('poda')} className="scroll-mt-24">
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={podaEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setPodaEnEdicion({ ...podaEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {podaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {podaEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                            {!col.terceroNombre && col.modalidad_pago === 'FIJO' && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 font-medium align-middle"
                                                title="Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base."
                                              >
                                                FIJO · $0
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setPodaEnEdicion({ ...podaEnEdicion, colaboradores: podaEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={podaEnEdicion.lote}
                                  onValueChange={(value) => setPodaEnEdicion({ ...podaEnEdicion, lote: value, sublote: '' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={podaEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    const sub = sublotes.find(s => s.id === value);
                                    setPodaEnEdicion({
                                      ...podaEnEdicion,
                                      sublote: value,
                                      numeroPalmas: Number(sub?.cantidadPalmas ?? 0),
                                    });
                                  }}
                                  disabled={!podaEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === podaEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={podaEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPodaEnEdicion({ ...podaEnEdicion, numeroPalmas: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarPoda} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarPoda} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de podas guardadas */}
                      {trabajosPoda.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarPoda(trabajo.id)}
                                    disabled={podaEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarPoda(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosPoda.length === 0 && !podaEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de poda</p>
                          <p className="text-sm">Haz clic en "Agregar Poda" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: FERTILIZACIÓN */}
                    <TabsContent value="fertilizacion" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarFertilizacion} className="gap-2" disabled={fertilizacionEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Fertilización
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {fertilizacionEnEdicion && (
                        <div ref={setFormRef('fertilizacion')} className="scroll-mt-24">
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={fertilizacionEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {fertilizacionEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fertilizacionEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                            {!col.terceroNombre && col.modalidad_pago === 'FIJO' && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 font-medium align-middle"
                                                title="Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base."
                                              >
                                                FIJO · $0
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: fertilizacionEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={fertilizacionEnEdicion.lote}
                                  onValueChange={(value) => {
                                    // Autofill: al elegir lote sin sublote,
                                    // se asume que fertilizó el lote completo →
                                    // suma las palmas de todos sus sublotes.
                                    const totalLote = sublotes
                                      .filter((s) => s.loteId === value)
                                      .reduce((acc, s) => acc + Number(s.cantidadPalmas ?? 0), 0);
                                    setFertilizacionEnEdicion({
                                      ...fertilizacionEnEdicion,
                                      lote: value,
                                      sublote: '',
                                      palmas: totalLote,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={fertilizacionEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    const sub = sublotes.find(s => s.id === value);
                                    setFertilizacionEnEdicion({
                                      ...fertilizacionEnEdicion,
                                      sublote: value,
                                      palmas: Number(sub?.cantidadPalmas ?? 0),
                                    });
                                  }}
                                  disabled={!fertilizacionEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === fertilizacionEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.palmas || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, palmas: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo de Fertilizante</Label>
                                <Select
                                  value={fertilizacionEnEdicion.tipoFertilizante}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, tipoFertilizante: value, otroFertilizante: value !== 'Otro' ? '' : fertilizacionEnEdicion.otroFertilizante })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={insumosLista.length === 0 ? 'Sin insumos registrados' : 'Seleccionar tipo'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {insumosLista.length === 0 ? (
                                      <div className="px-2 py-3 text-xs text-muted-foreground">
                                        No hay insumos registrados. Agrégalos en Configuración → Insumos.
                                      </div>
                                    ) : (
                                      <>
                                        {insumosLista.map((fert) => (
                                          <SelectItem key={fert} value={fert}>
                                            {fert}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="Otro">Otro (especificar)</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              {fertilizacionEnEdicion.tipoFertilizante === 'Otro' && (
                                <div className="space-y-2">
                                  <Label>Especificar otro fertilizante</Label>
                                  <Input
                                    placeholder="Ingrese el tipo de fertilizante"
                                    value={fertilizacionEnEdicion.otroFertilizante || ''}
                                    onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, otroFertilizante: e.target.value })}
                                  />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Cantidad (gramos)</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.cantidadGramos || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, cantidadGramos: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarFertilizacion} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarFertilizacion} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de fertilizaciones guardadas */}
                      {trabajosFertilizacion.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        const fertTipo = trabajo.tipoFertilizante === 'Otro' ? trabajo.otroFertilizante : trabajo.tipoFertilizante;
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.palmas}</p>
                                </div>
                                <div className="text-right shrink-0 min-w-[100px]">
                                  <p className="text-xs text-muted-foreground">Fertilizante</p>
                                  <p className="font-semibold text-xs truncate">{fertTipo || 'No especificado'}</p>
                                  <p className="text-xs text-muted-foreground">{trabajo.cantidadGramos}g</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarFertilizacion(trabajo.id)}
                                    disabled={fertilizacionEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarFertilizacion(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosFertilizacion.length === 0 && !fertilizacionEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de fertilización</p>
                          <p className="text-sm">Haz clic en "Agregar Fertilización" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: SANIDAD */}
                    <TabsContent value="sanidad" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarSanidad} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Sanidad
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {sanidadEnEdicion && (
                        <div ref={setFormRef('sanidad')} className="scroll-mt-24">
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={sanidadEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {sanidadEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {sanidadEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                            {!col.terceroNombre && col.modalidad_pago === 'FIJO' && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 font-medium align-middle"
                                                title="Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base."
                                              >
                                                FIJO · $0
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSanidadEnEdicion({
                                                ...sanidadEnEdicion,
                                                colaboradores: sanidadEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={sanidadEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, lote: value, sublote: '' });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={sanidadEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, sublote: value });
                                  }}
                                  disabled={!sanidadEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === sanidadEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Trabajo Realizado</Label>
                                <SelectActividadLabor
                                  laborId={palmaTipoToId.get('SANIDAD')}
                                  actividades={actividadesPorLabor[String(palmaTipoToId.get('SANIDAD') ?? '')] ?? []}
                                  value={sanidadEnEdicion.trabajoRealizado}
                                  actividadId={sanidadEnEdicion.laborActividadId ?? null}
                                  onChange={(nombre, id) => setSanidadEnEdicion({
                                    ...sanidadEnEdicion,
                                    trabajoRealizado: nombre,
                                    laborActividadId: id,
                                  })}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarSanidad}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarSanidad} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosSanidad.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>

                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Sin lote'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Trabajo realizado */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Trabajo</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.trabajoRealizado || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarSanidad(trabajo.id)}
                                    disabled={sanidadEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarSanidad(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosSanidad.length === 0 && !sanidadEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de sanidad vegetal</p>
                          <p className="text-sm">Haz clic en "Agregar Sanidad" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: OTROS */}
                    <TabsContent value="otros" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarOtros} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Otros
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {otrosEnEdicion && (
                        <div ref={setFormRef('otros')} className="scroll-mt-24">
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={otrosEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setOtrosEnEdicion({ ...otrosEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {otrosEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {otrosEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                            {!col.terceroNombre && col.modalidad_pago === 'FIJO' && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 font-medium align-middle"
                                                title="Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base."
                                              >
                                                FIJO · $0
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOtrosEnEdicion({
                                                ...otrosEnEdicion,
                                                colaboradores: otrosEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={otrosEnEdicion.lote}
                                  onValueChange={(value) => {
                                    // Al cambiar de lote también limpiamos sublote y numeroPalmas
                                    // (queda inválido el autofill previo).
                                    setOtrosEnEdicion({
                                      ...otrosEnEdicion,
                                      lote: value,
                                      sublote: '',
                                      numeroPalmas: otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA' ? 0 : undefined,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={otrosEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    // Autofill de Número de Palmas solo si la labor es POR_PALMA.
                                    const sub = sublotes.find(s => s.id === value);
                                    setOtrosEnEdicion({
                                      ...otrosEnEdicion,
                                      sublote: value,
                                      numeroPalmas: otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA'
                                        ? Number(sub?.cantidadPalmas ?? 0)
                                        : otrosEnEdicion.numeroPalmas,
                                    });
                                  }}
                                  disabled={!otrosEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === otrosEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Trabajo Realizado — mismo componente que Sanidad,
                                  apuntando a la fija OTROS (§19 API_PARAMETRICAS).
                                  Al elegir "Otra" y escribir un trabajo nuevo, al
                                  guardar la tarjeta se crea la actividad en el catálogo
                                  y aparece en Configuración → Labores → Otros. */}
                              <div className="space-y-2 md:col-span-2">
                                <Label>Trabajo Realizado</Label>
                                <SelectActividadLabor
                                  laborId={otrosEnEdicion.laborOtrosRawId}
                                  actividades={actividadesPorLabor[String(otrosEnEdicion.laborOtrosRawId ?? '')] ?? []}
                                  value={otrosEnEdicion.laborRealizada}
                                  actividadId={otrosEnEdicion.laborActividadId ?? null}
                                  onChange={(nombre, id) => setOtrosEnEdicion({
                                    ...otrosEnEdicion,
                                    laborRealizada: nombre,
                                    laborActividadId: id,
                                  })}
                                />
                              </div>

                              {/* Campos dependientes del tipo_pago de la labor seleccionada
                                  (§10 doc API_OPERACIONES.md). Solo se renderizan cuando ya
                                  hay una labor escogida. */}
                              {otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA' && (
                                <div className="space-y-2">
                                  <Label>
                                    Número de Palmas <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    type="number" step="0.001"
                                    placeholder="0"
                                    value={otrosEnEdicion.numeroPalmas ?? ''}
                                    onChange={(e) =>
                                      setOtrosEnEdicion({
                                        ...otrosEnEdicion,
                                        numeroPalmas: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                              )}

                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarOtros}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarOtros} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosOtros.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>

                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{trabajo.nombre || 'Sin nombre'}</h4>
                                    <p className="text-xs text-muted-foreground">{lote?.nombre || 'Sin lote'} - {sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Labor realizada */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Labor</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.laborRealizada || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarOtros(trabajo.id)}
                                    disabled={otrosEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarOtros(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosOtros.length === 0 && !otrosEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de otros trabajos</p>
                          <p className="text-sm">Haz clic en "Agregar Otros" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: LABORES DE FINCA (AUXILIARES) */}
            {etapaActual === 3 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Labores de Finca</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Reparaciones, mantenimiento y trabajos complementarios
                      </p>
                    </div>
                    <Button
                      onClick={agregarAuxiliar}
                      className="gap-2"
                      disabled={auxiliarEnEdicion !== null}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Labor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Formulario de edición */}
                  {auxiliarEnEdicion && (
                    <div ref={setFormRef('auxiliar')} className="scroll-mt-24">
                    <Card className="border-border border-2 border-primary/50">
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Colaborador</Label>
                            <Select
                              value={auxiliarEnEdicion.nombre}
                              onValueChange={(value) =>
                                setAuxiliarEnEdicion({ ...auxiliarEnEdicion, nombre: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar colaborador" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Labores de Finca §3.3 — sí soporta operarios
                                    (mismo endpoint /jornales que palma). El
                                    `value` es el id local (`10` o `'O_5'`)
                                    para distinguir colaborador vs operario
                                    al guardar. Visualmente muestra el nombre
                                    con badge "Tercero" si aplica. */}
                                {colaboradores.map((col) => {
                                  const fullName = `${col.nombres} ${col.apellidos}`.trim();
                                  return (
                                    <SelectItem key={col.id} value={col.id}>
                                      {fullName}
                                      {col.terceroNombre ? (
                                        <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle">
                                          Tercero · {col.terceroNombre}
                                        </span>
                                      ) : null}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Labor</Label>
                            <Select
                              value={auxiliarEnEdicion.labor}
                              onValueChange={(value) =>
                                setAuxiliarEnEdicion({
                                  ...auxiliarEnEdicion,
                                  labor: value,
                                  otraLabor: value !== 'Otro' ? '' : auxiliarEnEdicion.otraLabor,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar labor" />
                              </SelectTrigger>
                              <SelectContent>
                                {laboresLista.length === 0 ? (
                                  <SelectItem value="__sin_labores__" disabled>
                                    No hay labores configuradas
                                  </SelectItem>
                                ) : (
                                  laboresLista.map((labor) => (
                                    <SelectItem key={labor} value={labor}>
                                      {labor}
                                    </SelectItem>
                                  ))
                                )}
                                <SelectItem value="Otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {auxiliarEnEdicion.labor === 'Otro' && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Especificar otra labor</Label>
                              <Input
                                placeholder="Ingrese el tipo de labor"
                                value={auxiliarEnEdicion.otraLabor || ''}
                                onChange={(e) =>
                                  setAuxiliarEnEdicion({ ...auxiliarEnEdicion, otraLabor: e.target.value })
                                }
                              />
                            </div>
                          )}
                          <div className="space-y-2 md:col-span-2">
                            <Label>Lugar</Label>
                            <Input
                              placeholder="Ubicación"
                              value={auxiliarEnEdicion.lugar}
                              onChange={(e) =>
                                setAuxiliarEnEdicion({ ...auxiliarEnEdicion, lugar: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button variant="outline" onClick={cancelarAuxiliar} className="gap-2">
                            <X className="h-4 w-4" />
                            Cancelar
                          </Button>
                          <Button onClick={guardarAuxiliar} className="gap-2 bg-success hover:bg-success/90">
                            <Save className="h-4 w-4" />
                            Guardar Labor
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    </div>
                  )}

                  {/* Cards de labores guardadas */}
                  {trabajosAuxiliares.map((trabajo) => {
                    const labelLabor =
                      trabajo.labor === 'Otro' && trabajo.otraLabor ? trabajo.otraLabor : trabajo.labor;
                    // `trabajo.nombre` ahora es el id local — resolvemos al
                    // nombre vía lookup en `colaboradores`. Si la persona
                    // es operario, mostramos el badge del tercero.
                    const personaSel = colaboradores.find((c) => c.id === trabajo.nombre);
                    const personaTexto = personaSel
                      ? `${personaSel.nombres} ${personaSel.apellidos}`.trim()
                      : trabajo.nombre || 'Sin colaborador';
                    return (
                      <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Colaborador</p>
                              <p className="font-semibold text-sm">
                                {personaTexto}
                                {personaSel?.terceroNombre ? (
                                  <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle">
                                    Tercero · {personaSel.terceroNombre}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Labor</p>
                              <p className="text-sm font-medium">{labelLabor || 'Sin labor'}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Lugar</p>
                              <p className="text-sm">{trabajo.lugar || '—'}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editarAuxiliar(trabajo.id)}
                                disabled={auxiliarEnEdicion !== null}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarAuxiliar(trabajo.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {trabajosAuxiliares.length === 0 && !auxiliarEnEdicion && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No hay registros de labores de finca</p>
                      <p className="text-sm">Haz clic en "Agregar Labor" para crear uno</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 4: HORAS EXTRAS */}
            {etapaActual === 4 && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={agregarHoraExtra} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Hora Extra
                  </Button>
                </div>

                {/* Formulario de edición */}
                {horaExtraEnEdicion && (
                  <div ref={setFormRef('horaExtra')} className="scroll-mt-24">
                  <Card className="border-primary/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Horas Extras</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Registra las horas extras de los colaboradores
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Colaborador (siempre primero) */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Colaborador</Label>
                          <Select
                            value={horaExtraEnEdicion.colaboradorId}
                            onValueChange={(value) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, colaboradorId: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Otro selector sin XOR de operario (paso 4/5). */}
                              {colaboradores.filter(c => !c.terceroNombre).map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.nombres} {col.apellidos}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo de Hora</Label>
                          <Select
                            value={horaExtraEnEdicion.tipoHora}
                            onValueChange={(value) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, tipoHora: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                tiposHoraExtraLista.length === 0
                                  ? 'No hay tipos configurados'
                                  : 'Seleccionar tipo de hora'
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Usa los nombres reales del tenant traídos por
                                  `wizard-init`; el hardcoded viejo `tiposHoraExtra`
                                  no matcheaba con `tiposHoraExtraMap` al guardar. */}
                              {tiposHoraExtraLista.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {tipo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Número de Horas</Label>
                          <Input
                            type="number" step="0.001"
                            placeholder="0"
                            value={horaExtraEnEdicion.numeroHoras || ''}
                            onChange={(e) => {
                              setHoraExtraEnEdicion({
                                ...horaExtraEnEdicion,
                                numeroHoras: parseFloat(e.target.value) || 0
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Observación</Label>
                          <Textarea
                            placeholder="Observaciones sobre la hora extra..."
                            value={horaExtraEnEdicion.observacion}
                            onChange={(e) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, observacion: e.target.value });
                            }}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelarHoraExtra}>
                          Cancelar
                        </Button>
                        <Button onClick={guardarHoraExtra} className="gap-2">
                          <Check className="h-4 w-4" />
                          Guardar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                )}

                {/* Lista de horas extras guardadas */}
                {horasExtras.map((hora) => {
                  const colaborador = colaboradores.find(c => c.id === hora.colaboradorId);

                  return (
                    <Card key={hora.id} className="border-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Icon + Colaborador */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                              <Clock className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {colaborador ? `${colaborador.nombres} ${colaborador.apellidos}` : 'Sin colaborador'}
                              </h4>
                              <p className="text-xs text-muted-foreground">{hora.tipoHora}</p>
                            </div>
                          </div>

                          {/* Horas */}
                          <div className="text-center shrink-0">
                            <p className="text-xs text-muted-foreground">Horas</p>
                            <p className="font-bold text-lg">{hora.numeroHoras}</p>
                          </div>

                          {/* Observación */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Observación</p>
                            <p className="text-sm truncate">{hora.observacion || 'Sin observación'}</p>
                          </div>

                          {/* Botón eliminar */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editarHoraExtra(hora.id)}
                              disabled={horaExtraEnEdicion !== null}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarHoraExtra(hora.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {horasExtras.length === 0 && !horaExtraEnEdicion && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay horas extras registradas</p>
                    <p className="text-sm">Haz clic en "Agregar Hora Extra" para crear una</p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 5: FINALIZACIÓN (OBSERVACIONES Y AUSENTES) */}
            {etapaActual === 5 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Finalización</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Observaciones y ausentes
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      placeholder="Notas o comentarios sobre la jornada..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Novedades</Label>
                    {!modoLectura && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="colaboradorAusente">Colaborador</Label>
                            <Select
                              value={colaboradorAusenteSeleccionado}
                              onValueChange={setColaboradorAusenteSeleccionado}
                            >
                              <SelectTrigger id="colaboradorAusente">
                                <SelectValue placeholder="Seleccionar colaborador" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Ausencias: solo empleados propios.
                                    §5 del doc no contempla operario_id. */}
                                {colaboradores
                                  .filter(col => !col.terceroNombre)
                                  .filter(col => !ausentes.some(a => a.colaboradorId === col.id))
                                  .map((col) => (
                                    <SelectItem key={col.id} value={col.id}>
                                      {col.nombres} {col.apellidos}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="motivoAusente">Motivo</Label>
                            <Select
                              value={motivoAusenteSeleccionado}
                              onValueChange={(value) => {
                                setMotivoAusenteSeleccionado(value);
                                if (value !== 'Otro') {
                                  setOtroMotivoAusente('');
                                }
                              }}
                            >
                              <SelectTrigger id="motivoAusente">
                                <SelectValue placeholder="Seleccionar motivo" />
                              </SelectTrigger>
                              <SelectContent>
                                {motivosLista.map((motivo) => (
                                  <SelectItem key={motivo} value={motivo}>
                                    {motivo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>&nbsp;</Label>
                            <Button
                              type="button"
                              onClick={agregarAusente}
                              disabled={!colaboradorAusenteSeleccionado || !motivoAusenteSeleccionado}
                              className="w-full gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {ausentes.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 text-sm font-semibold">Colaborador</th>
                              <th className="text-left p-3 text-sm font-semibold">Motivo</th>
                              <th className="text-right p-3 text-sm font-semibold">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ausentes.map((ausente) => {
                              const col = colaboradores.find(c => c.id === ausente.colaboradorId);
                              // El campo `motivo` (texto libre) del backend
                              // es la fuente de verdad — es lo que el usuario
                              // escribió/eligió al crear la ausencia. Se
                              // carga en `otroMotivo` desde el prefill.
                              // Prioridad de display:
                              // 1) texto libre del backend (`otroMotivo`).
                              // 2) nombre del catálogo (fallback).
                              // 3) lookup por ID contra `motivosMap`.
                              // 4) '—' si nada.
                              let motivoMostrar = ausente.otroMotivo || ausente.motivo;
                              if (!motivoMostrar && ausente.motivoAusenciaId != null) {
                                for (const [n, id] of motivosMap.entries()) {
                                  if (id === ausente.motivoAusenciaId) { motivoMostrar = n; break; }
                                }
                              }
                              motivoMostrar = motivoMostrar || '—';
                              return (
                                <tr key={ausente.id} className="border-t border-border">
                                  <td className="p-3 text-sm">
                                    {col ? `${col.nombres} ${col.apellidos}` : '-'}
                                  </td>
                                  <td className="p-3 text-sm">{motivoMostrar}</td>
                                  <td className="p-3 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => eliminarAusente(ausente.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {ausentes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                        <p className="text-sm">No hay ausentes registrados</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </fieldset>

          {/* Botones de navegación */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={etapaAnterior}
              disabled={etapaActual === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {/* En modo edición sobre planilla BORRADOR, permitir guardar
                  desde cualquier etapa (no solo la última). */}
              {!modoLectura && isEditMode && estadoPlanilla === 'BORRADOR' && etapaActual < ETAPAS.length && (
                <Button
                  variant="outline"
                  onClick={() => guardarTodo()}
                  disabled={guardando}
                  className="gap-2 border-success text-success hover:bg-success/10"
                  title="Guardar cambios y volver al listado"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              )}
              {etapaActual < ETAPAS.length ? (
                <Button
                  onClick={siguienteEtapa}
                  disabled={etapaActual === 1 && !puedeAvanzarEtapa1 && !modoLectura}
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : modoLectura ? (
                // Modo lectura, última etapa: botón de cierre para volver
                // al listado. Sin él, el usuario solo puede usar la flecha
                // superior o "Anterior", lo cual no es evidente.
                <Button
                  onClick={() => navigate('/operaciones')}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4" />
                  Finalizar
                </Button>
              ) : (
                <Button
                  onClick={() => guardarTodo()} disabled={guardando} className="gap-2 bg-success hover:bg-success/90"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar Planilla
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel de resumen (1/3) - sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progreso general */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold">{etapaActual} de {ETAPAS.length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(etapaActual / ETAPAS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* RESUMEN DETALLADO */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Resumen Detallado
                  </h4>

                  {!fecha && !elaboradoPor ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No hay información para mostrar</p>
                      <p className="text-xs mt-1">Completa las etapas anteriores</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {fecha && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Fecha</span>
                          <span className="font-semibold text-sm">
                            {(() => {
                              // Parseo manual para EVITAR el desfase por zona
                              // horaria de `new Date("YYYY-MM-DD")` (que
                              // interpreta como UTC y en GMT-5 resta un día).
                              const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
                              return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
                            })()}
                          </span>
                        </div>
                      )}
                      {elaboradoPor && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Elaborado por</span>
                          <span className="font-semibold text-sm truncate ml-2 max-w-[150px]" title={elaboradoPor}>
                            {elaboradoPor}
                          </span>
                        </div>
                      )}
                      {huboLluvia && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Lluvia</span>
                          <span className="font-semibold text-sm">
                            {huboLluvia === 'si' && lluvia ? `${lluvia} mm` : 'No'}
                          </span>
                        </div>
                      )}
                      {inicioLabores && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Inicio Labores</span>
                          <span className="font-semibold text-sm">{inicioLabores}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* Contadores de labores */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Labores Registradas
                  </h4>

                  {/* Cosecha */}
                  {trabajosCosecha.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Cosecha</span>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {trabajosCosecha.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-success/20">
                        {trabajosCosecha.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {lote?.nombre} - {sublote?.nombre}
                                </span>
                                <span className="font-medium">{trabajo.gajosRecogidos} gajos</span>
                              </div>
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Cosecha</span>
                            <span className="text-xs text-success">
                              {trabajosCosecha.reduce((sum, t) => sum + (t.gajosRecogidos ?? 0), 0).toLocaleString('es-CO')} gajos
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plateo */}
                  {trabajosPlateo.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Plateo</span>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {trabajosPlateo.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-primary/20">
                        {trabajosPlateo.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {lote?.nombre} - {sublote?.nombre}
                                </span>
                                <span className="font-medium">{trabajo.numeroPalmas} palmas</span>
                              </div>
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Plateo</span>
                            <span className="text-xs text-primary">
                              {trabajosPlateo.reduce((sum, t) => sum + t.numeroPalmas, 0).toLocaleString('es-CO')} palmas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Poda */}
                  {trabajosPoda.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Poda</span>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {trabajosPoda.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-warning/20">
                        {trabajosPoda.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {lote?.nombre} - {sublote?.nombre}
                                </span>
                                <span className="font-medium">{trabajo.numeroPalmas} palmas</span>
                              </div>
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Poda</span>
                            <span className="text-xs text-warning">
                              {trabajosPoda.reduce((sum, t) => sum + t.numeroPalmas, 0).toLocaleString('es-CO')} palmas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fertilización */}
                  {trabajosFertilizacion.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fertilización</span>
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                          {trabajosFertilizacion.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-accent/20">
                        {trabajosFertilizacion.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {lote?.nombre} - {sublote?.nombre}
                                </span>
                                <span className="font-medium">{trabajo.palmas} palmas</span>
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.tipoFertilizante}
                                {trabajo.cantidadGramos > 0 && (
                                  <> · <span className="font-medium">{trabajo.cantidadGramos} g/palma</span></>
                                )}
                              </div>
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sanidad */}
                  {trabajosSanidad.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sanidad</span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          {trabajosSanidad.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-destructive/20">
                        {trabajosSanidad.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="text-muted-foreground">
                                {lote?.nombre}
                                {sublote?.nombre ? ` - ${sublote.nombre}` : ''}
                              </div>
                              {trabajo.trabajoRealizado && (
                                <div className="text-muted-foreground">
                                  {trabajo.trabajoRealizado}
                                </div>
                              )}
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Labores de Finca (lo que antes se llamaba "Auxiliares" en el
                      doc; ahora el backend lo agrega como `resumen.labores.labores_finca`). */}
                  {trabajosAuxiliares.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Labores de Finca</span>
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                          {trabajosAuxiliares.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-border">
                        {trabajosAuxiliares.map((trabajo) => {
                          const labelLabor =
                            trabajo.labor === 'Otro' && trabajo.otraLabor
                              ? trabajo.otraLabor
                              : trabajo.labor;
                          const col = colaboradores.find((c) => c.id === trabajo.nombre);
                          const nombreCol = col?.nombre_completo
                            ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="text-muted-foreground">
                                {labelLabor || 'Sin labor'}
                                {trabajo.lugar ? ` · ${trabajo.lugar}` : ''}
                              </div>
                              {nombreCol && (
                                <div className="text-muted-foreground">{nombreCol}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Otros */}
                  {trabajosOtros.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Otros</span>
                        <Badge variant="outline">{trabajosOtros.length}</Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-border">
                        {trabajosOtros.map((trabajo) => {
                          const lote = lotesData.find(l => l.id === trabajo.lote);
                          const sublote = sublotes.find(s => s.id === trabajo.sublote);
                          const nombresColabs = (trabajo.colaboradores ?? [])
                            .map((colId) => {
                              const col = colaboradores.find((c) => c.id === colId);
                              return col?.nombre_completo
                                ?? `${col?.nombres ?? ''} ${col?.apellidos ?? ''}`.trim();
                            })
                            .filter(Boolean);
                          const labelLabor =
                            trabajo.laborRealizada || trabajo.nombreTrabajo || trabajo.nombre;
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {lote?.nombre}{sublote?.nombre ? ` - ${sublote.nombre}` : ''}
                                </span>
                                {trabajo.laborOtrosTipoPago === 'POR_PALMA' && trabajo.numeroPalmas != null && (
                                  <span className="font-medium">{trabajo.numeroPalmas} palmas</span>
                                )}
                              </div>
                              {labelLabor && (
                                <div className="text-muted-foreground">{labelLabor}</div>
                              )}
                              {nombresColabs.length > 0 && (
                                <div className="text-muted-foreground">
                                  {nombresColabs.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Si no hay labores */}
                  {trabajosCosecha.length === 0 &&
                   trabajosPlateo.length === 0 &&
                   trabajosPoda.length === 0 &&
                   trabajosFertilizacion.length === 0 &&
                   trabajosSanidad.length === 0 &&
                   trabajosOtros.length === 0 &&
                   trabajosAuxiliares.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No hay labores registradas</p>
                    </div>
                  )}
                </div>

                {/* Horas Extras */}
                {horasExtras.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Horas Extras
                        </h4>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {horasExtras.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {horasExtras.map((he) => {
                          const col = colaboradores.find(c => c.id === he.colaboradorId);
                          return (
                            <div key={he.id} className="p-2 bg-muted/30 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {col ? `${col.nombres} ${col.apellidos}` : '-'}
                                </span>
                                <span className="text-xs font-bold text-warning">{he.numeroHoras}h</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {he.tipoHora}
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Horas</span>
                            <span className="text-xs text-warning">
                              {horasExtras.reduce((sum, he) => sum + he.numeroHoras, 0)} horas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Novedades (ausencias) */}
                {ausentes.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Novedades
                        </h4>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          {ausentes.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {ausentes.map((ausente) => {
                          const col = colaboradores.find(c => c.id === ausente.colaboradorId);
                          // Mismo criterio que la tabla principal — el texto
                          // libre del backend (`otroMotivo`) es primario.
                          let motivoMostrar = ausente.otroMotivo || ausente.motivo;
                          if (!motivoMostrar && ausente.motivoAusenciaId != null) {
                            for (const [n, id] of motivosMap.entries()) {
                              if (id === ausente.motivoAusenciaId) { motivoMostrar = n; break; }
                            }
                          }
                          motivoMostrar = motivoMostrar || '—';
                          return (
                            <div key={ausente.id} className="p-2 bg-muted/30 rounded-md">
                              <div className="text-xs font-medium">
                                {col ? `${col.nombres} ${col.apellidos}` : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {motivoMostrar}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Alerta: planilla duplicada para esa fecha */}
      <AlertDialog open={alertaDuplicada} onOpenChange={setAlertaDuplicada}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ya existe una planilla para esa fecha</AlertDialogTitle>
            <AlertDialogDescription>
              No puedes crear otra planilla para el mismo día. Cambia la fecha o edita la planilla existente desde el listado de operaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertaDuplicada(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alerta: planilla vacía — bloquea la aprobación cuando no se ha
          registrado ninguna labor de palma, labor de finca, ausencia ni
          hora extra. Aprobar una planilla vacía no tiene sentido operativo
          ni de nómina. */}
      <AlertDialog open={alertaPlanillaVacia} onOpenChange={setAlertaPlanillaVacia}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              La planilla está vacía
            </AlertDialogTitle>
            <AlertDialogDescription>
              No has registrado ninguna labor de palma, labor de finca,
              ausencia ni hora extra en esta planilla. Puedes agregar
              registros antes o continuar de todas formas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAlertaPlanillaVacia(false);
                setAccionPendiente(null);
              }}
            >
              Volver a editar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setAlertaPlanillaVacia(false);
                if (accionPendiente === 'aprobar') {
                  await ejecutarAprobar();
                } else if (accionPendiente === 'guardar') {
                  setAccionPendiente(null);
                  await guardarTodo({ bypassAlertas: true });
                } else {
                  setAccionPendiente(null);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Continuar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alerta: cobertura de personal — colaboradores/operarios sin registrar
          actividad hoy. Se muestra antes de aprobar (§7.1) y también al
          guardar borrador. En modo 'aprobar' bloquea (no deja aprobar hasta
          cubrir a todos); en modo 'guardar' permite continuar. */}
      <AlertDialog
        open={!!coberturaFaltantes}
        onOpenChange={(o) => !o && setCoberturaFaltantes(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              {coberturaModo === 'aprobar'
                ? 'Faltan colaboradores por registrar'
                : 'Personal sin actividad registrada'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {(coberturaFaltantes?.colaboradores_faltantes.length ?? 0)}
                  {' '}colaborador(es) y{' '}
                  {(coberturaFaltantes?.operarios_faltantes.length ?? 0)}
                  {' '}operario(s) no registraron labor de palma, labor de
                  finca ni novedad para este día.
                  {coberturaModo === 'aprobar'
                    ? ' Puedes registrar su actividad antes o aprobar de todas formas.'
                    : ' Puedes guardar el borrador igual o volver a editar para agregarlos.'}
                </p>
                {(coberturaFaltantes?.colaboradores_faltantes.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Colaboradores ({coberturaFaltantes!.colaboradores_faltantes.length})
                    </p>
                    <ul className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {coberturaFaltantes!.colaboradores_faltantes.map((c) => (
                        <li key={`col-${c.id}`}>
                          {c.nombre_completo}
                          <span className="text-xs text-muted-foreground ml-1">
                            · CC {c.documento}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(coberturaFaltantes?.operarios_faltantes.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Operarios ({coberturaFaltantes!.operarios_faltantes.length})
                    </p>
                    <ul className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {coberturaFaltantes!.operarios_faltantes.map((o) => (
                        <li key={`op-${o.id}`}>
                          {o.nombre_completo}
                          <span className="text-xs text-muted-foreground ml-1">
                            · CC {o.cedula}
                            {o.tercero_nombre ? ` · ${o.tercero_nombre}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {coberturaModo === 'aprobar' ? (
              // Aviso informativo: puede aprobar de todas formas o volver
              // a editar para agregar los colaboradores faltantes.
              <>
                <AlertDialogCancel
                  onClick={() => {
                    setCoberturaFaltantes(null);
                    setAccionPendiente(null);
                  }}
                >
                  Volver a editar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setCoberturaFaltantes(null);
                    await ejecutarAprobar();
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Aprobar de todas formas
                </AlertDialogAction>
              </>
            ) : (
              // Guardado de borrador: la planilla YA está persistida cuando
              // llega este modal (el aviso es post-guardado). El botón cierra
              // el modal y navega al listado; el copy usa "Guardar" porque
              // es la acción que el usuario originalmente pidió.
              <>
                <AlertDialogCancel>Volver a editar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setCoberturaFaltantes(null);
                    navigate('/operaciones');
                  }}
                  className="bg-success hover:bg-success/90"
                >
                  Guardar
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}