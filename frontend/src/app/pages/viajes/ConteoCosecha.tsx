import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  ArrowLeft, ArrowRight, Check, Truck, Leaf, Plus, Trash2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  viajesApi, strField, ViajesErrorCodes as ErrorCodes,
  type Viaje, type ViajeDetalle, type OperacionDisponible, type CosechaLibre,
} from '../../../api/viajes';
import { selectsApi, operacionesApi } from '../../../api/operaciones';
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
}

/** Cosecha en edición */
interface CosechaEnEdicion {
  cosechaId: number | null;
  planillaId: string;
  cuadrillaReconteo: string; // = cosechaId del select de "cuadrilla" (cosecha)
  loteName: string;
  subloteName: string;
  gajos: number;
  /** Gajos que efectivamente salen en este viaje — se persiste como
   *  `viaje_detalle.gajos_en_viaje`. */
  gajosEnViaje: number;
  /** Calculado readonly: gajos_pendientes_enviar del backend menos
   *  gajosEnViaje. Se muestra como "Gajos Pendientes por Enviar". */
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
   * Detalle de la cuadrilla por cosecha enriquecido — usado para mostrar
   * nombres y empresa contratista en el dropdown de "Cuadrilla Reconteo".
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

  // ── mapeo API → local
  const mapDetalle = (d: ViajeDetalle, planillaNombreById: Map<number, string>): CosechaConteo => ({
    id: String(d.id),
    detalleId: d.id,
    cosechaId: d.cosecha_id,
    planillaId: '',
    planillaNombre: '',
    loteName: d.cosecha?.lote?.nombre ?? '—',
    subloteName: d.cosecha?.sublote?.nombre ?? '',
    gajos: d.cosecha?.gajos_reportados ?? 0,
    // `gajos_en_viaje` viene del pivot viaje_detalle (§5.5); fallback al
    // `gajos_reconteo` histórico para viajes creados antes de la migración.
    gajosEnViaje: d.gajos_en_viaje ?? d.cosecha?.gajos_reconteo ?? 0,
    pesoKg: d.cosecha?.peso_confirmado ? parseFloat(String(d.cosecha.peso_confirmado)) : 0,
    cuadrillaCount: d.cosecha?.cuadrilla_count ?? 0,
    aprobado: d.reconteo_aprobado,
  });

  // ── carga del viaje
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
      const planillaMap = new Map<number, string>();
      setCosechas((res.data.detalles ?? []).map(d => mapDetalle(d, planillaMap)));
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── al iniciar agregar/editar, cargar operaciones disponibles
  const cargarOperaciones = async () => {
    setCargandoOps(true);
    try {
      const r = await viajesApi.operacionesDisponibles();
      // DEBUG: log de operaciones disponibles con conteo de cosechas.
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Operaciones disponibles:', r.data);
      setOperaciones(r.data ?? []);
    } catch { /* ignore */ }
    finally { setCargandoOps(false); }
  };

  // ── al elegir planilla, cargar cosechas libres + cuadrillas (empleados por cosecha)
  useEffect(() => {
    if (!cosechaEnEdicion?.planillaId) {
      setCosechasLibres([]);
      setCuadrillaPorCosecha(new Map());
      return;
    }
    setCargandoCosechas(true);
    viajesApi.cosechasLibresDeOperacion(Number(cosechaEnEdicion.planillaId))
      .then(r => {
        // DEBUG: log del backend para verificar `gajos_pendientes_enviar`.
        // Si el backend está colapsando el pending a 0, aparecerá aquí.
        // eslint-disable-next-line no-console
        console.log('[DEBUG] Cosechas de la planilla:', r.data?.map(c => ({
          id: c.id,
          lote: c.lote?.nombre,
          gajos_reportados: c.gajos_reportados,
          gajos_reconteo: c.gajos_reconteo,
          gajos_pendientes_enviar: c.gajos_pendientes_enviar,
        })));
        setCosechasLibres(r.data ?? []);
      })
      .catch(() => setCosechasLibres([]))
      .finally(() => setCargandoCosechas(false));

    // Traer la planilla completa para extraer la cuadrilla de cada cosecha.
    // La cuadrilla puede tener empleados internos (`empleado_id`) o operarios
    // de terceros (`operario_id` + `tercero_id`). XOR: solo uno de los dos.
    operacionesApi.ver(Number(cosechaEnEdicion.planillaId))
      .then((r: any) => {
        const m = new Map<number, number[]>();
        const mi = new Map<number, Array<{
          tipo: 'EMP' | 'OP';
          id: number;
          nombre: string;
          terceroNombre?: string;
        }>>();
        for (const c of (r?.data?.cosechas ?? []) as any[]) {
          const ids: number[] = [];
          const miembros: Array<{
            tipo: 'EMP' | 'OP';
            id: number;
            nombre: string;
            terceroNombre?: string;
          }> = [];
          for (const q of (c.cuadrilla ?? []) as any[]) {
            if (q.empleado_id) {
              ids.push(Number(q.empleado_id));
              const emp = q.empleado ?? {};
              const nombre = emp.nombre_completo
                || `${emp.primer_nombre ?? ''} ${emp.primer_apellido ?? ''}`.trim()
                || ''; // queda vacío y se resuelve después vía colaboradoresMap
              miembros.push({ tipo: 'EMP', id: Number(q.empleado_id), nombre });
            } else if (q.operario_id) {
              const op = q.operario ?? {};
              const nombre = op.nombre_completo
                || `${op.nombres ?? ''} ${op.apellidos ?? ''}`.trim()
                || `Operario ${q.operario_id}`;
              const terceroNombre = q.tercero_id ? terceroMap.get(Number(q.tercero_id)) : undefined;
              miembros.push({ tipo: 'OP', id: Number(q.operario_id), nombre, terceroNombre });
            }
          }
          m.set(Number(c.id), ids);
          mi.set(Number(c.id), miembros);
        }
        setCuadrillaPorCosecha(m);
        setMiembrosPorCosecha(mi);
      })
      .catch(() => {
        setCuadrillaPorCosecha(new Map());
        setMiembrosPorCosecha(new Map());
      });
  }, [cosechaEnEdicion?.planillaId, terceroMap]);

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
    setCosechaEnEdicion({
      ...cosechaEnEdicion,
      cosechaId: c.id,
      cuadrillaReconteo: cosechaId,
      loteName: c.lote?.nombre ?? '—',
      subloteName: c.sublote?.nombre ?? '',
      gajos: c.gajos_reportados ?? 0,
      // Al elegir la cosecha, TODOS los gajos reportados quedan como
      // pendientes por enviar. El input "Gajos en Viaje" arranca en 0 y el
      // user decide cuántos entran en este viaje. Pendientes se deriva luego
      // como `gajos_reportados − gajos_en_viaje`.
      gajosPendientesPorEnviar: c.gajos_reportados ?? 0,
      gajosEnViaje: 0,
      cuadrillaCount: empIds.length || (c.cuadrilla_count ?? 0),
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
      // Los "gajos pendientes" (base del módulo §13 de clavijos) se calculan
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
      } else {
        toast.error(e?.message ?? 'Error al guardar la cosecha');
      }
    } finally {
      setProcesando(false);
    }
  };

  const eliminarCosecha = (c: CosechaConteo) => {
    if (!viaje || !c.detalleId) return;
    if (c.aprobado) { toast.error('No se puede eliminar una cosecha aprobada'); return; }
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
      toast.error(e?.message ?? 'Error al eliminar la cosecha');
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1 className="text-3xl font-bold text-primary">Conteo de Cosecha</h1>
        <p className="text-muted-foreground mt-1">Registra las cosechas del viaje</p>
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
                  return (
                    <React.Fragment key={etapa.numero}>
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${estaActiva || estaCompleta ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        disabled={!estaActiva && !estaCompleta}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                          estaCompleta ? 'bg-primary border-primary text-white'
                          : estaActiva ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {estaCompleta ? <Check className="h-5 w-5" /> : <span className="font-bold">{etapa.numero}</span>}
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-semibold whitespace-nowrap ${
                            estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border relative mx-4">
                          <div className={`absolute inset-0 bg-primary transition-all ${estaCompleta ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contenido de las etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFORMACIÓN DEL VIAJE */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información del Viaje</CardTitle>
                      <p className="text-sm text-muted-foreground">Datos del viaje registrado</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha del Viaje</Label>
                      <Input value={fechaFmt} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input value={horaSalida} disabled />
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
                    los resuelve como clavijo. */}
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
                        {' '}Podrían ser clavijos.
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
                  <Button onClick={agregarCosecha} className="gap-2" disabled={!!cosechaEnEdicion}>
                    <Plus className="h-4 w-4" />
                    Agregar Cosecha
                  </Button>
                </div>

                {/* Formulario de edición */}
                {cosechaEnEdicion && (
                  <div ref={formCosechaRef} className="scroll-mt-24">
                  <Card className="border-primary/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Leaf className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Cosecha</CardTitle>
                          <p className="text-sm text-muted-foreground">Registra las cosechas del viaje</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                gajosEnViaje: 0, gajosPendientesPorEnviar: 0, cuadrillaCount: 0,
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
                          <Label>Cuadrilla Reconteo</Label>
                          <Select
                            value={cosechaEnEdicion.cuadrillaReconteo}
                            onValueChange={handleCuadrillaChange}
                            disabled={!cosechaEnEdicion.planillaId || cargandoCosechas}
                          >
                            <SelectTrigger>
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
                                        className="text-xs bg-amber-500/10 text-amber-700 border-amber-300"
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
                          <Label>Lote</Label>
                          <Input value={cosechaEnEdicion.loteName || 'Sin lote'} disabled />
                        </div>

                        {/* Sublote */}
                        <div className="space-y-2">
                          <Label>Sublote</Label>
                          <Input value={cosechaEnEdicion.subloteName || 'Sin sublote'} disabled />
                        </div>

                        {/* Gajos Reportados */}
                        <div className="space-y-2">
                          <Label>Gajos Reportados</Label>
                          <Input type="number" value={cosechaEnEdicion.gajos || ''} disabled />
                        </div>

                        {/* Gajos en Viaje — se persiste como
                            `viaje_detalle.gajos_en_viaje` (§5.5).
                            El backend acepta cualquier valor >= 0 (§5.5 v2:
                            el reconteo puede superar `gajos_reportados`; si
                            eso pasa el response incluye una `advertencia` pero
                            no bloquea la operación). */}
                        <div className="space-y-2">
                          <Label>Gajos en Viaje</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            min={0}
                            onFocus={(e) => e.currentTarget.select()}
                            value={cosechaEnEdicion.gajosEnViaje || ''}
                            onChange={(e) => {
                              const enViaje = Math.max(parseInt(e.target.value) || 0, 0);
                              // Pendientes = max(gajos reportados − en viaje, 0).
                              // Cálculo directo sobre lo que el user está
                              // viendo, sin arrastrar splits previos del backend
                              // que confunden la UI.
                              const pendientes = Math.max(cosechaEnEdicion.gajos - enViaje, 0);
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                gajosEnViaje: enViaje,
                                gajosPendientesPorEnviar: pendientes,
                              });
                            }}
                          />
                        </div>

                        {/* Gajos Pendientes por Enviar — derivado siempre de
                            `gajos reportados − gajos en viaje` para evitar
                            inconsistencias con el estado inicial del backend. */}
                        <div className="space-y-2">
                          <Label>Gajos Pendientes por Enviar</Label>
                          <Input
                            type="number"
                            value={Math.max(cosechaEnEdicion.gajos - cosechaEnEdicion.gajosEnViaje, 0)}
                            disabled
                            className="bg-muted font-semibold"
                          />
                        </div>

                        {/* Peso en kg */}
                        <div className="space-y-2">
                          <Label>Peso en kg (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cosechaEnEdicion.pesoKg || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                pesoKg: parseInt(e.target.value) || 0,
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
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          {procesando ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                )}

                {/* Lista de cosechas guardadas */}
                {cosechas.map((cosecha) => (
                  <Card key={cosecha.id} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Icon + Lote/Sublote header */}
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                            <Leaf className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{cosecha.loteName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {cosecha.cuadrillaCount > 0 ? `${cosecha.cuadrillaCount} colaboradores` : 'Sin cuadrilla'}
                            </p>
                          </div>
                        </div>

                        {/* Lote/Sublote */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">Lote</p>
                          <p className="font-semibold text-sm">{cosecha.loteName || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{cosecha.subloteName || 'N/A'}</p>
                        </div>

                        {/* Gajos */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">Gajos</p>
                          <p className="font-bold text-lg">{cosecha.gajos}</p>
                        </div>

                        {/* Gajos en Viaje */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">En Viaje</p>
                          <p className="font-bold text-lg text-primary">{cosecha.gajosEnViaje}</p>
                        </div>

                        {/* Peso */}
                        {cosecha.pesoKg > 0 && (
                          <div className="text-center shrink-0">
                            <p className="text-xs text-muted-foreground">Peso</p>
                            <p className="font-semibold text-sm">{cosecha.pesoKg} kg</p>
                          </div>
                        )}

                        {/* Botón eliminar */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => eliminarCosecha(cosecha)}
                          disabled={cosecha.aprobado || procesando}
                          className="text-destructive hover:text-destructive shrink-0"
                          title={cosecha.aprobado ? 'No se puede eliminar una cosecha aprobada' : 'Eliminar'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {cosechas.length === 0 && !cosechaEnEdicion && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay cosechas registradas</p>
                    <p className="text-sm">Haz clic en "Agregar Cosecha" para crear una</p>
                  </div>
                )}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex gap-2">
                {etapaActual < ETAPAS.length ? (
                  <Button onClick={siguienteEtapa} className="gap-2">
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={finalizarConteo}
                    disabled={procesando || cosechas.length === 0}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <Check className="h-4 w-4" />
                    {procesando ? 'Procesando...' : 'Finalizar Conteo'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel Resumen sticky (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progreso */}
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

                {/* Información del Viaje */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Información del Viaje
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Placa</span>
                      <span className="font-semibold text-sm">{placa || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conductor</span>
                      <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={conductor}>
                        {conductor || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Extractora</span>
                      <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={extractora}>
                        {extractora}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Resumen de Cosechas */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Cosechas
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Registradas</span>
                    <span className="font-semibold text-sm">{cosechas.length}</span>
                  </div>
                  {cosechas.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Gajos</span>
                        <span className="font-semibold text-sm text-primary">
                          {cosechas.reduce((sum, c) => sum + c.gajos, 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total en Viaje</span>
                        <span className="font-semibold text-sm text-primary">
                          {cosechas.reduce((sum, c) => sum + c.gajosEnViaje, 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {cosechas.some(c => c.pesoKg > 0) && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Peso (kg)</span>
                          <span className="font-semibold text-sm text-success">
                            {cosechas.reduce((sum, c) => sum + c.pesoKg, 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar cosecha del viaje */}
      <AlertDialog open={!!cosechaToDelete} onOpenChange={open => !open && setCosechaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
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