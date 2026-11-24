import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, AlertTriangle,
  Pencil, RotateCcw, X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '../../../api/client';
import {
  viajesApi, strField, ViajesErrorCodes as ErrorCodes,
  type Viaje, type ViajeDetalle, type OperacionDisponible, type CosechaLibre,
  type CuadrillaMiembroCosecha,
} from '../../../api/viajes';
import { selectsApi } from '../../../api/operaciones';
import { tercerosApi } from '../../../api/terceros';
import { ajustesCosechaApi } from '../../../api/ajustesCosecha';

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
];

/** Cosecha guardada en el viaje (mapea a viaje_detalle del backend) */
interface CosechaConteo {
  id: string;            // viaje_detalle.id (o tmp para nuevas)
  detalleId?: number;    // backend
  cosechaId: number;     // registro_cosecha.id
  planillaId: string;    // operacion.id
  planillaNombre: string;
  loteName: string;
  subloteName: string;
  gajos: number;         // gajos_reportados de la cosecha original
  /** Gajos que efectivamente salen en este viaje. Se persiste como
   *  `viaje_detalle.gajos_en_viaje` (§5.5 API_VIAJES.md). Reemplaza al
   *  antiguo `reconteoGajos` a nivel de registro_cosecha. */
  gajosEnViaje: number;
  pesoKg: number;
  cuadrillaCount: number;
  aprobado: boolean;
  /** §5.5.1 — Admite lápiz y papelera. Sin el campo, se deduce del aprobado. */
  editable: boolean;
  /** Gajos de esa cosecha que ya van en otros camiones. */
  gajosEnOtrosViajes: number;
  /** Techo del input. `null` = sin techo: la cosecha va completa aquí. */
  maximoGajos: number | null;
  /** §5.6.1 — Aprobado y todavía se puede devolver a pendiente. */
  desaprobable: boolean;
}

/** Cosecha en edición */
interface CosechaEnEdicion {
  cosechaId: number | null;
  planillaId: string;
  cuadrillaReconteo: string; // = cosechaId del select de "cuadrilla" (cosecha)
  loteName: string;
  subloteName: string;
  /** `gajos_reportados` — total original de la cosecha (informativo). */
  gajos: number;
  /**
   * `gajos_pendientes_enviar` del backend al momento de elegir la cuadrilla:
   * base INMUTABLE contra la que calculamos los pendientes en pantalla.
   * Si la cosecha ya tenia splits en otros viajes, este numero refleja lo
   * que realmente se puede asignar a ESTE viaje, no el total reportado.
   */
  gajosDisponibles: number;
  /** Gajos que efectivamente salen en este viaje — se persiste como
   *  `viaje_detalle.gajos_en_viaje`. */
  gajosEnViaje: number;
  /** Calculado readonly: gajosDisponibles - gajosEnViaje.
   *  Se muestra como "Gajos Pendientes por Enviar". */
  gajosPendientesPorEnviar: number;
  pesoKg: number;
  cuadrillaCount: number;
  // Edición de un detalle ya existente
  editandoDetalleId?: number;
}

export default function ConteoCosecha() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Datos del viaje
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [cosechaToDelete, setCosechaToDelete] = useState<CosechaConteo | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  /** Cosechas con gajos pendientes hace 3+ viajes. Alimenta el banner
   *  de alerta arriba del wizard — misma info que ve el usuario en
   *  `/viajes`, disponible también aquí porque durante el conteo es
   *  donde se enfrenta a los pendientes que arrastran. */
  const [ajustesPendientes, setAjustesPendientes] = useState<number>(0);

  // Wizard
  const [etapaActual, setEtapaActual] = useState(1);

  // Cosechas guardadas
  const [cosechas, setCosechas] = useState<CosechaConteo[]>([]);

  // Cosecha en edición
  const [cosechaEnEdicion, setCosechaEnEdicion] = useState<CosechaEnEdicion | null>(null);

  /**
   * Corrección de los gajos de una cosecha ya enlazada, sobre la misma
   * tarjeta. No reusa el formulario de agregar: ahí se elige planilla y
   * cuadrilla, y acá eso ya está decidido. Lo único que cambia es el número.
   */
  const [editandoGajos, setEditandoGajos] = useState<{ detalleId: number; valor: string } | null>(null);

  /**
   * Gajos que el viaje declara sin tener cosechas enlazadas. Es el caso del
   * cargue de histórico "solo cabecera" (§15 de API_VIAJES): el camión llegó
   * con su total y las cosechas se le montan después, aquí.
   */
  const gajosDeclarados = viaje?.cantidad_gajos_total ?? 0;

  // Auto-scroll al form al abrirlo
  const formCosechaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cosechaEnEdicion) {
      requestAnimationFrame(() => {
        formCosechaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [cosechaEnEdicion]);

  // Conteo de cosechas con pendientes de resolver (banner de alerta).
  // Endpoint específico y liviano — solo devuelve el número, no la lista
  // completa (§13.6 de API_VIAJES).
  useEffect(() => {
    ajustesCosechaApi.indicador()
      .then((r) => setAjustesPendientes(r.data.count))
      .catch(() => setAjustesPendientes(0));
  }, []);

  // Catálogos del API
  const [operaciones, setOperaciones] = useState<OperacionDisponible[]>([]);
  const [cosechasLibres, setCosechasLibres] = useState<CosechaLibre[]>([]);
  const [cargandoOps, setCargandoOps] = useState(false);
  const [cargandoCosechas, setCargandoCosechas] = useState(false);

  // Catálogo de colaboradores y mapa cosecha→empleado_ids
  const [colaboradoresMap, setColaboradoresMap] = useState<Map<string, { nombres: string; apellidos: string; nombre_completo: string }>>(new Map());
  const [cuadrillaPorCosecha, setCuadrillaPorCosecha] = useState<Map<number, number[]>>(new Map());
  /**
   * Cache local del `cuadrilla_count` por `cosecha_id`. Sobrevive a
   * `cargar()` (a diferencia del state `cosechas`), porque el backend en
   * `GET /viajes/{id}` no siempre incluye el campo computado
   * `cosecha.cuadrilla_count` en el detalle — así evitamos mostrar
   * "Sin cuadrilla" en tarjetas ya guardadas.
   */
  const [cuadrillaCountPorCosecha, setCuadrillaCountPorCosecha] = useState<Map<number, number>>(new Map());
  /**
   * Fecha de la planilla a la que pertenece cada cosecha, por `cosecha_id`.
   *
   * La manda el backend en `cosecha.fecha` tanto en `GET /viajes/{id}` como
   * en `/viajes/operaciones/{id}/cosechas` (§5.3.1). Se acumula en un mapa
   * para que una cosecha recién agregada en el formulario ya salga fechada
   * sin esperar a que `cargar()` vuelva.
   */
  const [fechaPorCosecha, setFechaPorCosecha] = useState<Map<number, string>>(new Map());
  /**
   * Detalle de la cuadrilla por cosecha enriquecido — usado para mostrar
   * nombres y empresa contratista en el dropdown de "Cuadrilla Reconteo"
   * y también en las tarjetas de cosechas ya guardadas del viaje.
   * Se acumula (nunca se reemplaza completo) para que sobreviva a cambios
   * de planilla y a `cargar()`.
   * Incluye empleados internos y operarios de terceros.
   */
  const [miembrosPorCosecha, setMiembrosPorCosecha] = useState<
    Map<number, Array<{
      tipo: 'EMP' | 'OP';
      id: number;
      nombre: string;
      terceroNombre?: string;
    }>>
  >(new Map());
  // Ref siempre actualizado con el último valor de `miembrosPorCosecha` — lo
  // leemos dentro de `cargar()` sin depender del state en el deps array, así
  // no re-creamos el callback en cada mutación (evita loops de fetch).
  const miembrosPorCosechaRef = useRef(miembrosPorCosecha);
  useEffect(() => { miembrosPorCosechaRef.current = miembrosPorCosecha; }, [miembrosPorCosecha]);
  // Mismo truco para los counts: `cargar()` los lee sin tenerlos en su deps.
  const cuadrillaCountPorCosechaRef = useRef(cuadrillaCountPorCosecha);
  useEffect(() => { cuadrillaCountPorCosechaRef.current = cuadrillaCountPorCosecha; }, [cuadrillaCountPorCosecha]);
  /** Map terceroId → nombre_display (razón social), para resolver operarios. */
  const [terceroMap, setTerceroMap] = useState<Map<number, string>>(new Map());
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<string[]>([]);

  // Cargar terceros al montar (para resolver nombres de empresas contratistas
  // cuando la cuadrilla incluye operarios).
  useEffect(() => {
    (async () => {
      try {
        const r = await tercerosApi.select();
        const m = new Map<number, string>();
        for (const t of (r.data ?? [])) {
          m.set(t.id, t.nombre_display);
        }
        setTerceroMap(m);
      } catch {}
    })();
  }, []);

  // Cargar colaboradores al montar (para resolver nombres)
  useEffect(() => {
    (async () => {
      try {
        const r = await selectsApi.colaboradores();
        const m = new Map<string, { nombres: string; apellidos: string; nombre_completo: string }>();
        for (const c of (r.data ?? []) as any[]) {
          let nombres   = c.primer_nombre   ?? c.nombres   ?? c.nombre   ?? '';
          let apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? '';
          const nc = c.nombre_completo ?? c.full_name ?? c.name ?? '';
          if ((!nombres && !apellidos) && nc) {
            const partes = String(nc).trim().split(/\s+/);
            const mid = Math.ceil(partes.length / 2);
            nombres = partes.slice(0, mid).join(' ');
            apellidos = partes.slice(mid).join(' ');
          }
          if (!nombres && !apellidos) { nombres = 'Colaborador'; apellidos = String(c.id); }
          m.set(String(c.id), {
            nombres, apellidos,
            nombre_completo: nc || `${nombres} ${apellidos}`.trim(),
          });
        }
        setColaboradoresMap(m);
      } catch {}
    })();
  }, []);

  /**
   * Convierte la `cuadrilla[]` que mandan `GET /viajes/{id}` y
   * `GET /viajes/operaciones/{id}/cosechas` en lo que pinta la pantalla.
   *
   * Las dos respuestas traen las mismas llaves (§5.3.1), así que la lectura
   * es una sola. Manda `colaboradores[]`: son los nombres ya resueltos por el
   * backend con la regla del desprendible (§14.3), que para una cuadrilla de
   * contratista nombra al operario y no al empleado. Armarlo aquí desde el
   * objeto anidado daría otro nombre. El anidado queda de respaldo.
   */
  const leerCuadrilla = useCallback((c: {
    cuadrilla?: CuadrillaMiembroCosecha[];
    colaboradores?: string[];
  } | null | undefined) => {
    const empleadoIds: number[] = [];
    const miembros: Array<{
      tipo: 'EMP' | 'OP';
      id: number;
      nombre: string;
      terceroNombre?: string;
    }> = [];
    const nombresBackend = c?.colaboradores ?? [];

    (c?.cuadrilla ?? []).forEach((q, i) => {
      // `colaboradores[]` llega en el mismo orden que `cuadrilla[]`.
      const delBackend = (nombresBackend[i] ?? '').trim();
      if (q.empleado_id) {
        empleadoIds.push(Number(q.empleado_id));
        const nombre = delBackend
          || `${q.empleado?.primer_nombre ?? ''} ${q.empleado?.primer_apellido ?? ''}`.trim();
        // Vacío se resuelve con colaboradoresMap al pintar.
        miembros.push({ tipo: 'EMP', id: Number(q.empleado_id), nombre });
      } else if (q.operario_id) {
        const nombre = delBackend
          || `${q.operario?.nombres ?? ''} ${q.operario?.apellidos ?? ''}`.trim()
          || `Operario ${q.operario_id}`;
        const terceroDelPayload = q.tercero?.razon_social || q.tercero?.nombre_completo || '';
        const terceroNombre = terceroDelPayload
          || (q.tercero_id ? terceroMap.get(Number(q.tercero_id)) : undefined);
        miembros.push({ tipo: 'OP', id: Number(q.operario_id), nombre, terceroNombre: terceroNombre || undefined });
      }
    });

    return { empleadoIds, miembros };
  }, [terceroMap]);

  // ── mapeo API → local
  const mapDetalle = (
    d: ViajeDetalle,
    countMap?: Map<number, number>,
  ): CosechaConteo => {
    // Orden de resolución del cuadrillaCount:
    //  1) el count computado que devuelva el backend (si viene).
    //  2) `cosecha.cuadrilla.length` si el backend eager-loadeó el array.
    //  3) el mapa local `cuadrillaCountPorCosecha` que sobrevive a `cargar()`.
    //  4) 0 → renderiza "Sin cuadrilla".
    const countBackend = d.cosecha?.cuadrilla_count
      ?? (d.cosecha?.cuadrilla?.length ?? 0);
    const countLocal = countMap?.get(d.cosecha_id) ?? 0;
    const operacionId = d.cosecha?.operacion?.id ?? d.cosecha?.operacion_id;
    return {
      id: String(d.id),
      detalleId: d.id,
      cosechaId: d.cosecha_id,
      planillaId: operacionId != null ? String(operacionId) : '',
      planillaNombre: '',
      loteName: d.cosecha?.lote?.nombre ?? '—',
      subloteName: d.cosecha?.sublote?.nombre ?? '',
      gajos: d.cosecha?.gajos_reportados ?? 0,
      // `gajos_en_viaje` viene del pivot viaje_detalle (§5.5); fallback al
      // `gajos_reconteo` histórico para viajes creados antes de la migración.
      gajosEnViaje: d.gajos_en_viaje ?? d.cosecha?.gajos_reconteo ?? 0,
      pesoKg: d.cosecha?.peso_confirmado ? parseFloat(String(d.cosecha.peso_confirmado)) : 0,
      cuadrillaCount: Math.max(countBackend, countLocal),
      aprobado: d.reconteo_aprobado,
      // Un backend anterior a 2026-11-21 no manda estas cuatro llaves. Sin
      // ellas se cae a lo de siempre: editable mientras no esté aprobado.
      editable: d.reconteo_editable ?? !d.reconteo_aprobado,
      gajosEnOtrosViajes: d.gajos_en_otros_viajes ?? 0,
      maximoGajos: d.maximo_gajos_permitido ?? null,
      desaprobable: d.reconteo_desaprobable ?? false,
    };
  };

  // ── carga del viaje
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
      const detalles = res.data.detalles ?? [];

      /*
       * §5.3.1 — `detalles[].cosecha` ya trae fecha, lote, sublote,
       * `colaboradores[]` y `cuadrilla[]`. Hasta 2026-10-10 esta pantalla
       * listaba todas las planillas APROBADAS y pedía el detalle de cada una
       * solo para sacar los nombres de la cuadrilla: más de cien peticiones
       * al abrir el paso. Ahora el viaje llega completo y no hace falta
       * ninguna consulta extra.
       */
      const countUpdates: Array<[number, number]> = [];
      const miembrosUpdates: Array<[number, Array<{
        tipo: 'EMP' | 'OP';
        id: number;
        nombre: string;
        terceroNombre?: string;
      }>]> = [];
      const fechasUpdates: Array<[number, string]> = [];

      for (const d of detalles) {
        if (!d.cosecha) continue;
        const { miembros } = leerCuadrilla(d.cosecha);
        if (miembros.length > 0) {
          miembrosUpdates.push([d.cosecha_id, miembros]);
          countUpdates.push([d.cosecha_id, miembros.length]);
        }
        const fecha = d.cosecha.fecha ?? d.cosecha.operacion?.fecha;
        if (fecha) fechasUpdates.push([d.cosecha_id, fecha]);
      }

      // Se parte del cache local para no perder lo aprendido en cargas
      // previas, y se le encima lo que acaba de llegar.
      const counts = new Map(cuadrillaCountPorCosechaRef.current);
      for (const [cid, count] of countUpdates) counts.set(cid, count);

      setCosechas(detalles.map((d) => mapDetalle(d, counts)));
      if (countUpdates.length > 0) setCuadrillaCountPorCosecha(counts);
      if (miembrosUpdates.length > 0) {
        setMiembrosPorCosecha((prev) => {
          const next = new Map(prev);
          for (const [cid, ms] of miembrosUpdates) next.set(cid, ms);
          return next;
        });
      }
      if (fechasUpdates.length > 0) {
        setFechaPorCosecha((prev) => {
          const next = new Map(prev);
          for (const [cid, f] of fechasUpdates) next.set(cid, f);
          return next;
        });
      }
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate, leerCuadrilla]);

  useEffect(() => { cargar(); }, [cargar]);

  /**
   * Las planillas que se le pueden colgar a este viaje.
   *
   * El endpoint no tiene ventana de fechas por defecto: lista toda planilla
   * aprobada con gajos pendientes, de cualquier mes. Se acota con
   * `fecha_hasta = fecha_viaje` porque `POST /detalles` rechaza con 422
   * `FECHA_VIAJE_ANTERIOR_A_COSECHA` la planilla posterior al viaje, y no
   * tiene sentido ofrecer en el select lo que el guardado va a devolver. Pesa
   * sobre todo en los viajes importados, que son viejos y de otro modo
   * aparecen con la cosecha de todo el año encima.
   */
  const cargarOperaciones = async () => {
    setCargandoOps(true);
    try {
      const fechaTope = viaje?.fecha_viaje ? String(viaje.fecha_viaje).slice(0, 10) : undefined;
      const r = await viajesApi.operacionesDisponibles(
        fechaTope ? { fecha_hasta: fechaTope } : undefined,
      );
      setOperaciones(r.data ?? []);
    } catch (e) {
      setOperaciones([]);
      toast.error(e instanceof Error ? e.message : 'No se pudieron cargar las planillas');
    } finally {
      setCargandoOps(false);
    }
  };

  // ── al elegir planilla, cargar sus cosechas con gajos pendientes
  useEffect(() => {
    if (!cosechaEnEdicion?.planillaId) {
      setCosechasLibres([]);
      setCuadrillaPorCosecha(new Map());
      return;
    }
    setCargandoCosechas(true);
    viajesApi.cosechasLibresDeOperacion(Number(cosechaEnEdicion.planillaId))
      .then((r) => {
        const libres = r.data ?? [];
        setCosechasLibres(libres);

        /*
         * §5.3 — la respuesta ya trae fecha, `colaboradores[]` y
         * `cuadrilla[]` con las mismas llaves que la planilla. Antes había
         * que pedir `GET /operaciones/{id}` aparte solo para esto, lo que
         * además obligaba a tener permiso `operaciones.ver`.
         */
        const ids = new Map<number, number[]>();
        const mi = new Map<number, Array<{
          tipo: 'EMP' | 'OP';
          id: number;
          nombre: string;
          terceroNombre?: string;
        }>>();
        const countUpdates: Array<[number, number]> = [];
        const fechas: Array<[number, string]> = [];

        for (const c of libres) {
          const { empleadoIds, miembros } = leerCuadrilla(c);
          ids.set(c.id, empleadoIds);
          mi.set(c.id, miembros);
          if (miembros.length > 0) countUpdates.push([c.id, miembros.length]);
          const fecha = c.fecha ?? c.operacion?.fecha;
          if (fecha) fechas.push([c.id, fecha]);
        }

        setCuadrillaPorCosecha(ids);
        // Merge acumulativo: no perdemos los miembros de cosechas de otras
        // planillas cuando el usuario cambia el select de "Planilla".
        setMiembrosPorCosecha((prev) => {
          const next = new Map(prev);
          for (const [k, v] of mi) next.set(k, v);
          return next;
        });
        if (countUpdates.length > 0) {
          setCuadrillaCountPorCosecha((prev) => {
            let changed = false;
            const next = new Map(prev);
            for (const [cid, count] of countUpdates) {
              if (next.get(cid) !== count) { next.set(cid, count); changed = true; }
            }
            return changed ? next : prev;
          });
        }
        if (fechas.length > 0) {
          setFechaPorCosecha((prev) => {
            const next = new Map(prev);
            for (const [cid, f] of fechas) next.set(cid, f);
            return next;
          });
        }
      })
      .catch(() => {
        setCosechasLibres([]);
        setCuadrillaPorCosecha(new Map());
        // No borramos `miembrosPorCosecha` — mantiene lo acumulado de
        // consultas previas.
      })
      .finally(() => setCargandoCosechas(false));
  }, [cosechaEnEdicion?.planillaId, leerCuadrilla]);

  // ── handlers
  const siguienteEtapa = () => etapaActual < ETAPAS.length && setEtapaActual(etapaActual + 1);
  const etapaAnterior  = () => etapaActual > 1 && setEtapaActual(etapaActual - 1);
  const irAEtapa = (n: number) => setEtapaActual(n);

  const agregarCosecha = () => {
    setCosechaEnEdicion({
      cosechaId: null,
      planillaId: '',
      cuadrillaReconteo: '',
      loteName: '',
      subloteName: '',
      gajos: 0,
      gajosDisponibles: 0,
      gajosEnViaje: 0,
      gajosPendientesPorEnviar: 0,
      pesoKg: 0,
      cuadrillaCount: 0,
    });
    // Reset de la cuadrilla previa: si el usuario acababa de cancelar una
    // cosecha con cuadrilla, los IDs quedaban en el estado y aparecían como
    // "colaboradores predeterminados" al abrir la nueva.
    setCuadrillaSeleccionada([]);
    cargarOperaciones();
  };

  const cancelarCosecha = () => { setCosechaEnEdicion(null); setCuadrillaSeleccionada([]); };

  /** Al elegir una "cuadrilla" (que en este API es realmente una cosecha) */
  const handleCuadrillaChange = (cosechaId: string) => {
    if (!cosechaEnEdicion) return;
    const c = cosechasLibres.find(x => String(x.id) === cosechaId);
    if (!c) {
      setCosechaEnEdicion({ ...cosechaEnEdicion, cuadrillaReconteo: cosechaId });
      setCuadrillaSeleccionada([]);
      return;
    }
    const empIds = cuadrillaPorCosecha.get(Number(c.id)) ?? [];
    setCuadrillaSeleccionada(empIds.map(String));
    const finalCount = empIds.length || (c.cuadrilla_count ?? 0);
    // Persistimos el count en el map global para que sobreviva a `cargar()`
    // y las tarjetas ya guardadas puedan seguir mostrando "X colaboradores".
    if (finalCount > 0) {
      setCuadrillaCountPorCosecha((prev) => {
        if (prev.get(c.id) === finalCount) return prev;
        const next = new Map(prev);
        next.set(c.id, finalCount);
        return next;
      });
    }
    // Base disponible = lo que el backend dice que aun puede asignarse a
    // ESTE viaje. Si la cosecha ya tenia splits, `gajos_pendientes_enviar`
    // ya descuenta lo enviado en otros viajes. Fallback al total reportado
    // solo si el backend no lo trae (cosechas viejas sin splits).
    const disponibles = c.gajos_pendientes_enviar
      ?? c.gajos_reconteo
      ?? c.gajos_reportados
      ?? 0;
    setCosechaEnEdicion({
      ...cosechaEnEdicion,
      cosechaId: c.id,
      cuadrillaReconteo: cosechaId,
      loteName: c.lote?.nombre ?? '—',
      subloteName: c.sublote?.nombre ?? '',
      gajos: c.gajos_reportados ?? 0,
      gajosDisponibles: disponibles,
      // El input "Gajos en Viaje" arranca en 0. Pendientes se deriva como
      // `disponibles - gajos_en_viaje`.
      gajosPendientesPorEnviar: disponibles,
      gajosEnViaje: 0,
      cuadrillaCount: finalCount,
    });
  };

  const guardarCosecha = async () => {
    if (!viaje || !cosechaEnEdicion) return;
    // `gajos_en_viaje` obligatorio y > 0. Si la cosecha no lleva gajos
    // en este camión, no se agrega al viaje (sale por el módulo de ajustes).
    if (cosechaEnEdicion.gajosEnViaje == null || cosechaEnEdicion.gajosEnViaje <= 0) {
      toast.error('Ingresa la cantidad de gajos en viaje (mayor a 0)');
      return;
    }
    setProcesando(true);
    try {
      const esNuevo = !cosechaEnEdicion.editandoDetalleId;
      let detalleId = cosechaEnEdicion.editandoDetalleId;
      // Crear detalle si es nuevo. Pasamos `gajos_en_viaje` para que el
      // backend haga split parcial si aplica (§5.4). El POST establece
      // `viaje_detalle.gajos_en_viaje` pero NO toca `registro_cosecha.gajos_reconteo`,
      // lo que preserva `gajos_pendientes_enviar = gajos_reportados − SUM(splits)`.
      if (!detalleId) {
        if (!cosechaEnEdicion.cosechaId) {
          toast.error('Selecciona una cosecha');
          setProcesando(false);
          return;
        }
        const r = await viajesApi.agregarDetalle(
          viaje.id,
          cosechaEnEdicion.cosechaId,
          cosechaEnEdicion.gajosEnViaje > 0 ? cosechaEnEdicion.gajosEnViaje : null,
        );
        detalleId = (r.data as any)?.id;
        // §5.4.1 — sobreconteo dentro de tolerancia: 201 con `advertencia`.
        // Se informa como toast, nunca bloquea.
        if (r.advertencia) {
          toast.warning(r.advertencia, { duration: 6000 });
        }
      }
      if (!detalleId) {
        toast.error('No se pudo identificar el detalle');
        setProcesando(false);
        return;
      }
      // Siempre llamamos PUT /reconteo tras POST /detalles porque §5.4 solo
      // sincroniza `registro_cosecha.gajos_reconteo` — no refresca
      // `viajes.cantidad_gajos_total`. Ese refresh vive únicamente en §5.5
      // paso 6. Sin este PUT, el listado de viajes mostraba 0 gajos.
      //
      // Los "gajos pendientes" (base del módulo §13 de clavijas) se calculan
      // como `gajos_reportados − gajos_reconteo`, no dependen de omitir el PUT.
      const hayPeso = cosechaEnEdicion.pesoKg > 0;
      const res: any = await viajesApi.hidratarReconteo(viaje.id, detalleId, {
        gajos_en_viaje: cosechaEnEdicion.gajosEnViaje,
        peso_confirmado: hayPeso ? cosechaEnEdicion.pesoKg : undefined,
      });
      // §5.5: puede devolver `advertencia` cuando el reconteo supera
      // `gajos_reportados`. No bloquea, solo informa.
      const adv = res?.data?.advertencia ?? res?.advertencia;
      if (adv) {
        toast.warning(typeof adv === 'string' ? adv : 'El reconteo excede lo reportado', { duration: 6000 });
      }
      toast.success('Cosecha guardada');
      setCosechaEnEdicion(null);
      await cargar();
    } catch (e: any) {
      // Errores específicos del split parcial (§9 doc API_VIAJES).
      // Nota: `GAJOS_INSUFICIENTES` prácticamente ya no ocurre — el backend
      // v2 (§5.5) acepta valores > gajos_reportados y devuelve advertencia.
      // Solo saltaría si backend no está actualizado.
      if (e?.code === ErrorCodes.GAJOS_INSUFICIENTES) {
        toast.error('Los gajos en viaje superan los disponibles de esta cosecha');
      } else if (e?.code === ErrorCodes.COSECHA_YA_ASIGNADA) {
        toast.error('Esta cosecha ya fue asignada completamente a otro viaje');
      } else if (e?.code === ErrorCodes.FECHA_VIAJE_ANTERIOR_A_COSECHA) {
        // §6.5 — el camión no puede llevar fruta que aún no se cortó. El
        // message del backend trae las dos fechas y es reenviable tal cual.
        toast.error(e?.message ?? 'La fecha del viaje es anterior a la de la cosecha. Corrige la fecha del viaje.', { duration: 8000 });
      } else {
        toast.error(e?.message ?? 'Error al guardar la cosecha');
      }
    } finally {
      setProcesando(false);
    }
  };

  /** Guarda el número corregido. §5.5: el backend arbitra el techo. */
  const guardarGajosDetalle = async (c: CosechaConteo) => {
    if (!viaje || !c.detalleId || !editandoGajos) return;
    const valor = Number(editandoGajos.valor);
    if (!Number.isInteger(valor) || valor < 0) {
      toast.error('Escribe un número entero de gajos');
      return;
    }
    if (valor === c.gajosEnViaje) {
      setEditandoGajos(null);
      return;
    }
    setProcesando(true);
    try {
      const res = await viajesApi.hidratarReconteo(viaje.id, c.detalleId, {
        gajos_en_viaje: valor,
      });
      if (res.advertencia) {
        toast.warning(res.advertencia, { duration: 6000 });
      } else {
        toast.success('Gajos actualizados');
      }
      setEditandoGajos(null);
      await cargar();
    } catch (err) {
      // El 422 de gajos trae el máximo y los otros camiones en el mensaje:
      // se reenvía tal cual y la tarjeta se queda abierta para corregir.
      const e = err as ApiError;
      if (e?.code === ErrorCodes.GAJOS_INSUFICIENTES) {
        toast.error(e?.message ?? 'Los gajos superan lo que queda de esa cosecha', { duration: 8000 });
      } else if (e?.code === ErrorCodes.DETALLE_APROBADO || e?.code === ErrorCodes.VIAJE_NO_EDITABLE
        || e?.code === ErrorCodes.DETALLE_NOT_FOUND) {
        toast.error(e?.message ?? 'La cosecha ya no se puede editar');
        setEditandoGajos(null);
        await cargar();
      } else {
        toast.error(e?.message ?? 'Error al guardar los gajos');
      }
    } finally {
      setProcesando(false);
    }
  };

  /** §5.6.1 — Devuelve a pendiente un detalle aprobado por error. */
  const desaprobarDetalle = async (c: CosechaConteo) => {
    if (!viaje || !c.detalleId) return;
    setProcesando(true);
    try {
      await viajesApi.desaprobarReconteo(viaje.id, c.detalleId);
      toast.success('Reconteo devuelto a pendiente');
      await cargar();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e?.message ?? 'No se pudo devolver el reconteo a pendiente');
      if (e?.code === ErrorCodes.DETALLE_NO_APROBADO
        || e?.code === ErrorCodes.VIAJE_ESTADO_INVALIDO) {
        await cargar();
      }
    } finally {
      setProcesando(false);
    }
  };

  const eliminarCosecha = (c: CosechaConteo) => {
    if (!viaje || !c.detalleId) return;
    // No bloqueamos por `c.aprobado` aca: si el viaje se revirtio a CREADO
    // en DB pero el flag `reconteo_aprobado` del detalle sigue en true, el
    // backend arbitrara con DETALLE_APROBADO y el toast explicara.
    setCosechaToDelete(c);
  };

  const confirmarEliminarCosecha = async () => {
    if (!viaje || !cosechaToDelete?.detalleId) return;
    const c = cosechaToDelete;
    setCosechaToDelete(null);
    try {
      await viajesApi.eliminarDetalle(viaje.id, c.detalleId!);
      toast.success('Cosecha eliminada');
      await cargar();
    } catch (e: any) {
      // Errores 409 tipicos cuando el viaje o el detalle no admiten cambios.
      if (e?.code === ErrorCodes.DETALLE_APROBADO) {
        toast.error(
          'No se puede eliminar: el reconteo del detalle está marcado como aprobado. Reabrelo en la base de datos (reconteo_aprobado=false) e intenta de nuevo.',
        );
      } else if (e?.code === ErrorCodes.VIAJE_NO_EDITABLE) {
        toast.error('El viaje ya no está en estado CREADO. Solo se pueden eliminar cosechas cuando está en CREADO.');
      } else {
        toast.error(e?.message ?? 'Error al eliminar la cosecha');
      }
    }
  };

  const finalizarConteo = async () => {
    if (!viaje) { return; }
    if (cosechas.length === 0) { toast.error('Agrega al menos una cosecha'); return; }
    const pendientes = cosechas.filter(c => !c.aprobado);
    // `gajos_en_viaje` obligatorio y > 0 para todas las cosechas del viaje.
    if (pendientes.some(c => c.gajosEnViaje == null || c.gajosEnViaje <= 0)) {
      toast.error('Todas las cosechas deben tener gajos en viaje mayores a 0');
      return;
    }
    setProcesando(true);
    try {
      for (const c of pendientes) {
        if (c.detalleId) {
          const r = await viajesApi.aprobarReconteo(viaje.id, c.detalleId);
          if (r.data.auto_en_validacion) {
            toast.success('Conteo registrado exitosamente', {
              description: 'El viaje ahora está en camino hacia la extractora.',
            });
            navigate('/viajes');
            return;
          }
        }
      }

      // El salto a EN_VALIDACION lo dispara el backend al aprobar el ÚLTIMO
      // detalle pendiente. Si todas las cosechas ya estaban aprobadas de una
      // visita anterior, el bucle de arriba no llama a nada y el viaje se
      // quedaba en CREADO mientras la pantalla decía que todo salió bien.
      // Reaprobamos los detalles ya aprobados para que el backend vuelva a
      // evaluar la transición, y solo confirmamos si el estado realmente cambió.
      const yaAprobadas = cosechas.filter((c) => c.aprobado && c.detalleId);
      for (const c of yaAprobadas) {
        const r = await viajesApi
          .aprobarReconteo(viaje.id, c.detalleId!)
          .catch(() => null);
        if (r?.data.auto_en_validacion) break;
      }

      const verif = await viajesApi.ver(viaje.id);
      if (verif.data.estado === 'CREADO') {
        toast.error('El viaje sigue en estado Creado', {
          description: 'El backend no aprobó la transición a validación. Revisa que todas las cosechas tengan gajos en viaje.',
        });
        return;
      }

      toast.success('Conteo registrado exitosamente', {
        description: 'El viaje ahora está en camino hacia la extractora.',
      });
      navigate('/viajes');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al finalizar el conteo');
    } finally {
      setProcesando(false);
    }
  };

  // ── render
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  }
  if (!viaje) return null;

  const v = viaje as any;

  /** Formatea 'YYYY-MM-DD' (o ISO completo) sin caer en "Invalid Date". */
  const formatearFechaViaje = (raw?: string | null): string => {
    if (!raw || typeof raw !== 'string') return '—';
    // Tomar solo los primeros 10 chars (YYYY-MM-DD) y validar formato
    const ymd = raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
    const d = new Date(ymd + 'T12:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO');
  };
  const fechaFmt = formatearFechaViaje(v.fecha_viaje);
  const placa      = String(v.placa_vehiculo ?? '');
  const conductor  = String(v.nombre_conductor ?? '');
  const transporte = strField(v.empresa ?? v.empresa_transportadora) || '—';
  const extractora = strField(v.extractora) || '—';
  const horaSalida = String(v.hora_salida ?? '').slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/viajes"
        eyebrow={placa ? `Viaje · ${placa}` : 'Viajes'}
        title="Conteo de cosecha"
        description="Registra las cosechas que van en este viaje."
      />


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Stepper horizontal */}
          <Card className="gap-0 px-5 py-4">
            <ol className="flex items-center">
              {ETAPAS.map((etapa, index) => {
                const estaCompleta = etapaActual > etapa.numero;
                const estaActiva = etapaActual === etapa.numero;
                return (
                  <li
                    key={etapa.numero}
                    className={`flex items-center ${index < ETAPAS.length - 1 ? 'flex-1' : ''}`}
                  >
                    <button
                      type="button"
                      aria-label={`Ir al paso ${etapa.numero}: ${etapa.nombre}`}
                      aria-current={estaActiva ? 'step' : undefined}
                      onClick={() => irAEtapa(etapa.numero)}
                      className="flex items-center gap-2.5 disabled:cursor-not-allowed"
                      disabled={!estaActiva && !estaCompleta}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                        estaCompleta ? 'border-primary bg-primary text-primary-foreground'
                        : estaActiva ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                      }`}>
                        {estaCompleta ? <Check className="h-4 w-4" strokeWidth={2.5} /> : etapa.numero}
                      </span>
                      <span className={`whitespace-nowrap text-sm font-semibold ${
                        estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {etapa.nombre}
                      </span>
                    </button>
                    {index < ETAPAS.length - 1 && (
                      <div className="mx-4 h-px min-w-[20px] flex-1 bg-border">
                        <div className={`h-px bg-primary transition-all ${estaCompleta ? 'w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Contenido de las etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFORMACIÓN DEL VIAJE */}
            {etapaActual === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Información del viaje</CardTitle>
                  <CardDescription>Datos con los que se registró el viaje.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="conteocose-fecha-del-viaje">Fecha del viaje</Label>
                      <Input id="conteocose-fecha-del-viaje" value={fechaFmt} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conteocose-placa-del-vehiculo">Placa del vehículo</Label>
                      <Input id="conteocose-placa-del-vehiculo" value={placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conteocose-conductor">Conductor</Label>
                      <Input id="conteocose-conductor" value={conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conteocose-transportador">Transportador</Label>
                      <Input id="conteocose-transportador" value={transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conteocose-extractora-destino">Extractora de destino</Label>
                      <Input id="conteocose-extractora-destino" value={extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de salida</Label>
                      {/* Opcional desde el 2026-09-28: sin hora se muestra "—"
                          en vez de un campo vacío que parece un dato perdido. */}
                      <Input value={horaSalida || '—'} disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: COSECHA */}
            {etapaActual === 2 && (
              <div className="space-y-4">
                {/* Alerta compacta: solo aparece en el paso de cosecha, es
                    donde el usuario decide si arrastra pendientes viejos o
                    los resuelve como clavija. */}
                {ajustesPendientes > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      borderRadius: '8px',
                      border: '1px solid #fde68a',
                      backgroundColor: '#fffbeb',
                      padding: '10px 16px',
                      fontSize: '14px',
                      color: '#92400e',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#f59e0b' }} />
                      <span>
                        {ajustesPendientes}{' '}
                        {ajustesPendientes === 1
                          ? 'cosecha con gajos pendientes hace 3+ viajes.'
                          : 'cosechas con gajos pendientes hace 3+ viajes.'}
                        {' '}Podrían ser clavijas.
                      </span>
                    </div>
                    <button
                      onClick={() => navigate('/viajes/ajustes-cosecha')}
                      style={{
                        flexShrink: 0,
                        fontWeight: 500,
                        color: '#b45309',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Revisar →
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={agregarCosecha}  disabled={!!cosechaEnEdicion}>
                    <Plus className="h-4 w-4" />
                    Agregar Cosecha
                  </Button>
                </div>

                {/* Formulario de edición */}
                {cosechaEnEdicion && (
                  <div ref={formCosechaRef} className="scroll-mt-24">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cosecha</CardTitle>
                      <CardDescription>Elige la planilla y la cuadrilla; el resto se llena solo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Planilla / Cosecha */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Planilla / Cosecha</Label>
                          <Select
                            value={cosechaEnEdicion.planillaId}
                            onValueChange={(value) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion, planillaId: value, cuadrillaReconteo: '',
                                cosechaId: null, loteName: '', subloteName: '', gajos: 0,
                                gajosDisponibles: 0, gajosEnViaje: 0, gajosPendientesPorEnviar: 0, cuadrillaCount: 0,
                              });
                              setCuadrillaSeleccionada([]);
                            }}
                            disabled={cargandoOps}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={cargandoOps ? 'Cargando planillas...' : 'Seleccionar planilla...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {operaciones.map((op) => (
                                <SelectItem key={op.id} value={String(op.id)}>
                                  Planilla {formatearFechaViaje(op.fecha)} — {op.cosechas_disponibles_count} cosecha{op.cosechas_disponibles_count !== 1 ? 's' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Cuadrilla Reconteo (= cosecha del backend) */}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="conteocose-cuadrilla-reconteo">Cuadrilla de reconteo</Label>
                          <Select
                            value={cosechaEnEdicion.cuadrillaReconteo}
                            onValueChange={handleCuadrillaChange}
                            disabled={!cosechaEnEdicion.planillaId || cargandoCosechas}
                          >
                            <SelectTrigger id="conteocose-cuadrilla-reconteo">
                              <SelectValue placeholder={
                                !cosechaEnEdicion.planillaId
                                  ? 'Selecciona una planilla primero'
                                  : cargandoCosechas
                                  ? 'Cargando cuadrillas...'
                                  : cosechasLibres.length === 0
                                  ? 'No hay cuadrillas disponibles'
                                  : 'Seleccionar cuadrilla...'
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {cosechasLibres.map((c) => {
                                // Resolver nombre de cada miembro:
                                //   1) `m.nombre` que ya venga del backend.
                                //   2) fallback a `colaboradoresMap` (empleados internos).
                                //   3) fallback al empleado_id de `cuadrillaPorCosecha`.
                                const miembros = miembrosPorCosecha.get(c.id) ?? [];
                                const nombresBackend = miembros.map((m) => {
                                  if (m.nombre) return m.nombre;
                                  if (m.tipo === 'EMP') {
                                    const col = colaboradoresMap.get(String(m.id));
                                    return col
                                      ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim())
                                      : '';
                                  }
                                  return '';
                                }).filter(Boolean);
                                // Fallback adicional: si `miembrosPorCosecha`
                                // llegó vacío, usar los ids de `cuadrillaPorCosecha`
                                // y resolver los nombres desde `colaboradoresMap`.
                                const nombres = nombresBackend.length > 0
                                  ? nombresBackend
                                  : (cuadrillaPorCosecha.get(c.id) ?? []).map((empId) => {
                                      const col = colaboradoresMap.get(String(empId));
                                      return col
                                        ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim())
                                        : `Colaborador ${empId}`;
                                    }).filter(Boolean);
                                const etiquetaColabs = nombres.length > 0
                                  ? nombres.join(', ')
                                  : 'Sin colaboradores';
                                // Mostrar gajos PENDIENTES (los que quedan
                                // disponibles) en lugar del total reportado.
                                // Si la cosecha ya se usó parcialmente en otro
                                // viaje, `gajos_pendientes_enviar` refleja lo
                                // que aún se puede asignar.
                                const gajosDisponibles = c.gajos_pendientes_enviar
                                  ?? c.gajos_reconteo
                                  ?? c.gajos_reportados
                                  ?? 0;
                                return (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {etiquetaColabs} — {c.lote?.nombre ?? '—'}
                                    {c.sublote ? ` · ${c.sublote.nombre}` : ''}
                                    {' '}({gajosDisponibles} gajos disponibles)
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Colaboradores — muestra empleados internos y operarios
                            de terceros (con badge color amber + empresa). */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Colaboradores</Label>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const miembros = cosechaEnEdicion.cosechaId
                                ? miembrosPorCosecha.get(Number(cosechaEnEdicion.cosechaId)) ?? []
                                : [];
                              if (miembros.length === 0 && cuadrillaSeleccionada.length > 0) {
                                // Fallback al map original cuando solo hay empleados internos.
                                return cuadrillaSeleccionada.map((empId) => {
                                  const col = colaboradoresMap.get(empId);
                                  const label = col
                                    ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${empId}`)
                                    : `Colaborador ${empId}`;
                                  return (
                                    <Badge key={empId} variant="outline" className="text-xs">
                                      {label}
                                    </Badge>
                                  );
                                });
                              }
                              if (miembros.length > 0) {
                                return miembros.map((mm) => {
                                  if (mm.tipo === 'OP') {
                                    const sufijo = mm.terceroNombre ? ` · ${mm.terceroNombre}` : '';
                                    return (
                                      <Badge
                                        key={`OP-${mm.id}`}
                                        className="text-xs bg-warning-soft text-warning border-warning/20"
                                      >
                                        {mm.nombre}{sufijo}
                                      </Badge>
                                    );
                                  }
                                  const nombre = mm.nombre
                                    || (() => {
                                      const col = colaboradoresMap.get(String(mm.id));
                                      return col
                                        ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${mm.id}`)
                                        : `Colaborador ${mm.id}`;
                                    })();
                                  return (
                                    <Badge key={`EMP-${mm.id}`} variant="outline" className="text-xs">
                                      {nombre}
                                    </Badge>
                                  );
                                });
                              }
                              if (cosechaEnEdicion.cuadrillaCount > 0) {
                                return (
                                  <Badge variant="outline" className="text-xs">
                                    {cosechaEnEdicion.cuadrillaCount} colaborador{cosechaEnEdicion.cuadrillaCount !== 1 ? 'es' : ''}
                                  </Badge>
                                );
                              }
                              return (
                                <p className="text-sm text-muted-foreground">
                                  {!cosechaEnEdicion.planillaId
                                    ? 'Selecciona una planilla primero'
                                    : !cosechaEnEdicion.cuadrillaReconteo
                                      ? 'Selecciona una cuadrilla para ver los colaboradores'
                                      : 'No hay colaboradores'}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Lote */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-lote">Lote</Label>
                          <Input id="conteocose-lote" value={cosechaEnEdicion.loteName || 'Sin lote'} disabled />
                        </div>

                        {/* Sublote */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-sublote">Sublote</Label>
                          <Input id="conteocose-sublote" value={cosechaEnEdicion.subloteName || 'Sin sublote'} disabled />
                        </div>

                        {/* Gajos Reportados */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-gajos-reportados">Gajos reportados</Label>
                          <Input id="conteocose-gajos-reportados" type="number" step="0.001" value={cosechaEnEdicion.gajos || ''} disabled />
                        </div>

                        {/* Gajos en Viaje — se persiste como
                            `viaje_detalle.gajos_en_viaje` (§5.5).
                            El backend acepta cualquier valor >= 0 (§5.5 v2:
                            el reconteo puede superar `gajos_reportados`; si
                            eso pasa el response incluye una `advertencia` pero
                            no bloquea la operación). */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-gajos-en-viaje">Gajos en el viaje</Label>
                          <Input id="conteocose-gajos-en-viaje"
                            type="number" step="0.001"
                            placeholder="0"
                            min={0}
                            onFocus={(e) => e.currentTarget.select()}
                            value={cosechaEnEdicion.gajosEnViaje || ''}
                            onChange={(e) => {
                              const enViaje = Math.max(parseFloat(e.target.value) || 0, 0);
                              // Pendientes = max(gajosDisponibles − en viaje, 0).
                              // `gajosDisponibles` respeta lo que el backend
                              // ya envio en otros viajes (via
                              // `gajos_pendientes_enviar`), asi no ofrecemos
                              // gajos que ya se despacharon.
                              const pendientes = Math.max(cosechaEnEdicion.gajosDisponibles - enViaje, 0);
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                gajosEnViaje: enViaje,
                                gajosPendientesPorEnviar: pendientes,
                              });
                            }}
                          />
                        </div>

                        {/* Gajos Pendientes por Enviar — se calcula sobre
                            `gajosDisponibles` (backend `gajos_pendientes_enviar`),
                            no sobre `gajos_reportados`, para reflejar los
                            splits ya asignados a otros viajes. */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-gajos-pendientes-por-enviar">Gajos pendientes por enviar</Label>
                          <Input id="conteocose-gajos-pendientes-por-enviar"
                            type="number" step="0.001"
                            value={Math.max(cosechaEnEdicion.gajosDisponibles - cosechaEnEdicion.gajosEnViaje, 0)}
                            disabled
                            className="bg-muted font-semibold"
                          />
                        </div>

                        {/* Peso en kg */}
                        <div className="space-y-2">
                          <Label htmlFor="conteocose-peso-en-kg-opcional">Peso en kg (opcional)</Label>
                          <Input id="conteocose-peso-en-kg-opcional"
                            type="number" step="0.001"
                            placeholder="0"
                            value={cosechaEnEdicion.pesoKg || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                pesoKg: parseFloat(e.target.value) || 0,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelarCosecha} disabled={procesando}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={guardarCosecha}
                          disabled={procesando || !cosechaEnEdicion.gajosEnViaje || cosechaEnEdicion.gajosEnViaje <= 0}
                          
                        >
                          <Check className="h-4 w-4" />
                          {procesando ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                )}

                {/* Lista de cosechas guardadas. Tabla y no tarjetas:
                    cada cifra tiene su columna y los numeros quedan
                    alineados a la derecha, que es como se comparan. */}
                {cosechas.length > 0 && (
                <Card className="gap-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                        <tr>
                          <th className="px-5 py-2.5 text-left font-semibold">Cosecha</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Lote</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Reportados</th>
                          <th className="px-4 py-2.5 text-right font-semibold">En viaje</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Peso</th>
                          <th className="w-32 px-2 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                {cosechas.map((cosecha) => {
                  // Resolvemos el count leyendo del map global — asegura que
                  // cualquier update posterior a cargar() (por ejemplo tras
                  // elegir una cuadrilla en el form) se refleje en la tarjeta.
                  const countDinamico = Math.max(
                    cosecha.cuadrillaCount,
                    cuadrillaCountPorCosecha.get(cosecha.cosechaId) ?? 0,
                  );
                  // Nombres de la cuadrilla — resolvemos con miembrosPorCosecha
                  // y caemos a colaboradoresMap para EMPs con nombre vacío.
                  const miembros = miembrosPorCosecha.get(cosecha.cosechaId) ?? [];
                  const nombresCuadrilla = miembros.map((m) => {
                    if (m.nombre) return m.nombre;
                    if (m.tipo === 'EMP') {
                      const col = colaboradoresMap.get(String(m.id));
                      return col
                        ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim())
                        : `Colaborador ${m.id}`;
                    }
                    return `Operario ${m.id}`;
                  }).filter(Boolean);
                  /*
                   * Encima de los nombres va la fecha del corte. El lote ya
                   * tiene su propia columna en la misma tarjeta, repetirlo
                   * arriba no aportaba y se comía el ancho. Si todavía no se
                   * resolvió la fecha, se cae al lote para no dejar el
                   * encabezado vacío.
                   */
                  const fechaCosecha = fechaPorCosecha.get(cosecha.cosechaId);
                  const tituloCosecha = fechaCosecha
                    ? `Cosecha del ${formatearFechaViaje(fechaCosecha)}`
                    : cosecha.loteName;
                  const enEdicionGajos = editandoGajos?.detalleId === cosecha.detalleId;
                  return (
                  <tr key={cosecha.id} className="transition-colors hover:bg-muted/40">
                    {/* Fecha del corte y los nombres de la cuadrilla. Es la
                        unica celda que cede ancho; `max-w-0` con `w-full` es
                        lo que habilita el truncate dentro de una tabla. */}
                    <td className="w-full max-w-0 px-5 py-3">
                      <p className="truncate font-semibold text-foreground">{tituloCosecha}</p>
                      {nombresCuadrilla.length > 0 ? (
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={nombresCuadrilla.join(', ')}
                        >
                          {nombresCuadrilla.join(', ')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {countDinamico > 0
                            ? `${countDinamico} colaborador${countDinamico !== 1 ? 'es' : ''}`
                            : 'Sin cuadrilla'}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-foreground">{cosecha.loteName || 'Sin lote'}</p>
                      <p className="text-xs text-muted-foreground">{cosecha.subloteName || 'Sin sublote'}</p>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">{cosecha.gajos.toLocaleString('es-CO')}</td>

                        {/* Gajos en viaje. Con el lápiz se corrige aquí
                            mismo: antes tocaba borrar la cosecha y volverla
                            a agregar para cambiar un número. */}
                        <td className="px-4 py-3 text-right">
                          {enEdicionGajos ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number" min={0}
                                max={cosecha.maximoGajos ?? undefined}
                                autoFocus
                                className="h-8 w-24 text-center font-bold"
                                value={editandoGajos?.valor ?? ''}
                                onChange={(e) => setEditandoGajos({
                                  detalleId: cosecha.detalleId!, valor: e.target.value,
                                })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void guardarGajosDetalle(cosecha);
                                  if (e.key === 'Escape') setEditandoGajos(null);
                                }}
                              />
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-success"
                                disabled={procesando}
                                onClick={() => void guardarGajosDetalle(cosecha)}
                                title="Guardar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => setEditandoGajos(null)}
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="font-semibold tabular-nums text-foreground">
                              {cosecha.gajosEnViaje.toLocaleString('es-CO')}
                            </p>
                          )}
                          {cosecha.gajosEnOtrosViajes > 0 && !enEdicionGajos && (
                            <p className="text-xs text-muted-foreground">
                              {cosecha.gajosEnOtrosViajes} en otros camiones
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {cosecha.pesoKg > 0 ? `${cosecha.pesoKg.toLocaleString('es-CO')} kg` : 'Sin dato'}
                        </td>

                        {/* Editar los gajos, quitar la cosecha, o devolver
                            el reconteo a pendiente si se aprobó por error. */}
                        <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                        {cosecha.editable && !enEdicionGajos && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setEditandoGajos({
                              detalleId: cosecha.detalleId!,
                              valor: String(cosecha.gajosEnViaje),
                            })}
                            disabled={procesando}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Editar los gajos de esta cosecha"
                            title="Editar los gajos de esta cosecha"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        )}
                        {cosecha.desaprobable && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => void desaprobarDetalle(cosecha)}
                            disabled={procesando}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Devolver el reconteo a pendiente"
                            title="El reconteo está aprobado: devuélvelo a pendiente para corregirlo"
                          >
                            <RotateCcw className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        )}
                        {cosecha.editable && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => eliminarCosecha(cosecha)}
                            disabled={procesando}
                            className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            aria-label="Quitar la cosecha del viaje"
                            title="Quitar la cosecha del viaje"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        )}
                        </div>
                        </td>
                  </tr>
                  );
                })}
                      </tbody>
                    </table>
                  </div>
                </Card>
                )}

                {cosechas.length === 0 && !cosechaEnEdicion && (
                  <Card className="items-center py-12 text-center">
                    <div className="max-w-md space-y-1 px-6">
                      {gajosDeclarados > 0 ? (
                        <>
                          <h3 className="text-base font-semibold text-foreground">
                            Este viaje trae {gajosDeclarados.toLocaleString('es-CO')} gajos y ninguna cosecha
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Entró por el cargue de histórico solo con la cabecera: la fecha, el
                            camión y la planta. Agrégale las cosechas que llevó y el total se
                            recalcula con ellas.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Todavía no hay cosechas</h3>
                          <p className="text-sm text-muted-foreground">
                            Agrega las cosechas que se cargaron en este viaje.
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="barra-acciones flex items-center justify-between gap-2">
              <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1}>
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                Anterior
              </Button>
              {etapaActual < ETAPAS.length ? (
                <Button onClick={siguienteEtapa}>
                  Siguiente
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  onClick={finalizarConteo}
                  disabled={procesando || cosechas.length === 0}
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                  {procesando ? 'Procesando…' : 'Finalizar conteo'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel Resumen sticky (1/3) */}
        <div className="lg:col-span-1">
          <Card className="gap-0 lg:sticky lg:top-6">
              <CardHeader className="border-b border-border">
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* Progreso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold">Paso {etapaActual} de {ETAPAS.length}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(etapaActual / ETAPAS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Información del viaje */}
                <div className="space-y-2 border-t border-border pt-5">
                  <p className="text-[13px] font-medium text-muted-foreground">Viaje</p>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Placa</dt>
                      <dd className="font-semibold">{placa || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Conductor</dt>
                      <dd className="truncate font-semibold" title={conductor}>{conductor || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Extractora</dt>
                      <dd className="truncate font-semibold" title={extractora}>{extractora}</dd>
                    </div>
                  </dl>
                </div>

                {/* Resumen de Cosechas */}
                <div className="space-y-2 border-t border-border pt-5">
                  <p className="text-[13px] font-medium text-muted-foreground">Cosechas</p>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Registradas</dt>
                      <dd className="font-semibold tabular-nums">{cosechas.length}</dd>
                    </div>
                    {cosechas.length === 0 && gajosDeclarados > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Gajos declarados</dt>
                        <dd className="font-semibold tabular-nums">
                          {gajosDeclarados.toLocaleString('es-CO')}
                        </dd>
                      </div>
                    )}
                    {cosechas.length > 0 && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Total de gajos</dt>
                          <dd className="font-semibold tabular-nums">
                            {cosechas.reduce((sum, c) => sum + c.gajos, 0).toLocaleString('es-CO')}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Total en el viaje</dt>
                          <dd className="font-semibold tabular-nums">
                            {cosechas.reduce((sum, c) => sum + c.gajosEnViaje, 0).toLocaleString('es-CO')}
                          </dd>
                        </div>
                        {cosechas.some(c => c.pesoKg > 0) && (
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">Peso total</dt>
                            <dd className="font-semibold tabular-nums">
                              {cosechas.reduce((sum, c) => sum + c.pesoKg, 0).toLocaleString('es-CO')} kg
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar cosecha del viaje */}
      <AlertDialog open={!!cosechaToDelete} onOpenChange={open => !open && setCosechaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar la cosecha del viaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente esta cosecha del viaje. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarCosecha} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}