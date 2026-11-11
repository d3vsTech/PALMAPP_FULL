import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus, MapPin, Eye, FileUp, Search, Calculator, Edit, Trash2,
  AlertTriangle, Info, Download, RotateCcw,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import TableSkeleton from '../../components/common/TableSkeleton';
import { num } from '../../lib/formato';
import { useEstadoPersistido } from '../../hooks/useEstadoPersistido';
import { useAlCambiar } from '../../hooks/useAlCambiar';
import { useAuth } from '../../contexts/AuthContext';
import { RevertirEstadoDialog } from '../../components/common/RevertirEstadoDialog';
import { reversionApi } from '../../../api/reversionEstados';
import {
  viajesApi, extractorasApi, strField,
  type Viaje, type EstadoViajeApi, type IndicadoresViajes,
  type IndicadoresParams, type QuincenaViajes,
  type ExtractoraSelect, type ListarViajesParams,
} from '../../../api/viajes';
import {
  SelectorAnio, SelectorMes, finDeMes, mesDeHoy,
} from '../../components/common/SelectorMes';

// ─── tipos UI ─────────────────────────────────────────────────────────────────
export type EstadoViaje = 'Creado' | 'En Validación' | 'Finalizado';

/** Backend usa CREADO/EN_VALIDACION/FINALIZADO (modelo nuevo de 3 estados). */
const ESTADO_API_TO_UI: Record<EstadoViajeApi, EstadoViaje> = {
  CREADO:        'Creado',
  EN_VALIDACION: 'En Validación',
  FINALIZADO:    'Finalizado',
};

/** El filtro manda el código que entiende el backend, no la etiqueta de la UI. */
const ESTADO_UI_TO_API: Record<EstadoViaje, EstadoViajeApi> = {
  'Creado':        'CREADO',
  'En Validación': 'EN_VALIDACION',
  'Finalizado':    'FINALIZADO',
};

const PER_PAGE = 25;

/** Los filtros de la tabla en limpio. Sirve de valor inicial y de "borrar todo". */
const FILTROS_VACIOS = {
  remision: '', estado: '',
  vehiculo: '', conductor: '', extractora: '',
};

/** 'YYYY-MM-DD' en hora local; `toISOString()` corre la fecha por la UTC. */
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Con lo que abre la pantalla cuando no hay nada guardado en la sesión. */
function periodoPorDefecto() {
  const hoy = new Date();
  return {
    periodo: 'mensual' as const,
    mes: mesDeHoy(),
    anio: hoy.getFullYear(),
    quincena: (hoy.getDate() <= 15 ? 1 : 2) as QuincenaViajes,
  };
}

interface ViajeUI {
  id: string;
  remisionId: string;
  fecha: string;
  placaVehiculo: string;
  conductor: string;
  transportador: string;
  extractora: string;
  horaSalida: string;
  estado: EstadoViaje;
  estadoApi: EstadoViajeApi;
  gajosEstimados: number;
  peso?: number;
  /** Para la remisión impresa: dirección de la planta y notas del despacho. */
  extractoraUbicacion: string;
  observaciones: string;
  /**
   * §15 — un viaje que entró por archivo. Su `finalizado_at` es el momento del
   * cargue y no el del cierre real, así que conviene que se note en la fila.
   */
  importado: boolean;
}

function mapViaje(v: Viaje): ViajeUI {
  const r = v as any;
  const estadoApi = (r.estado as EstadoViajeApi) ?? 'CREADO';
  return {
    id:             String(r.id ?? ''),
    remisionId:     String(r.remision ?? r.id ?? ''),
    fecha:          String(r.fecha_viaje ?? ''),
    placaVehiculo:  String(r.placa_vehiculo ?? ''),
    conductor:      String(r.nombre_conductor ?? ''),
    transportador:  strField(r.empresa ?? r.empresa_transportadora),
    extractora:     strField(r.extractora),
    horaSalida:     String(r.hora_salida ?? '').slice(0, 5),
    estado:         ESTADO_API_TO_UI[estadoApi] ?? 'Creado',
    estadoApi,
    gajosEstimados: Number(r.cantidad_gajos_total ?? 0),
    peso:           r.peso_viaje ? parseFloat(String(r.peso_viaje)) : undefined,
    extractoraUbicacion: String(r.extractora?.ubicacion ?? ''),
    observaciones:  String(r.observaciones ?? ''),
    importado:      r.origen === 'IMPORTACION',
  };
}

/** Parsea una fecha 'YYYY-MM-DD' devolviendo null si no es parseable. */
function parseFecha(s?: string): Date | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return null;
  const d = new Date(m + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

/** El estado con el color del sistema; el punto del badge hace de semáforo. */
const VARIANTE_ESTADO: Record<EstadoViaje, 'secondary' | 'info' | 'success'> = {
  'Creado': 'secondary',
  'En Validación': 'info',
  'Finalizado': 'success',
};

function getEstadoBadge(estado: EstadoViaje) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{estado}</Badge>;
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Viajes() {
  const { hasPermiso } = useAuth();
  /**
   * §5.10 — El viaje que se está reabriendo. El contrato pide el botón en
   * los dos sitios donde se ve un viaje finalizado: aquí y en el resumen.
   */
  const [viajeAReabrir, setViajeAReabrir] = useState<{ id: string; remision: string } | null>(null);
  const navigate = useNavigate();

  // Filtros de la tabla. Persisten mientras dure la sesión: entrar al detalle
  // de un viaje y volver ya no borra lo que el usuario venía mirando.
  const [filtros, setFiltros] = useEstadoPersistido('viajes.filtros', FILTROS_VACIOS);

  // Periodo KPI
  const porDefecto = periodoPorDefecto();
  const [periodoKPI,    setPeriodoKPI]    = useEstadoPersistido<'semanal' | 'quincenal' | 'mensual' | 'anual' | 'personalizado'>('viajes.periodo', porDefecto.periodo);
  const [fechaInicioKPI, setFechaInicioKPI] = useEstadoPersistido('viajes.desde', '');
  const [fechaFinKPI,    setFechaFinKPI]    = useEstadoPersistido('viajes.hasta', '');
  const [mesKPI,        setMesKPI]        = useEstadoPersistido('viajes.mes', porDefecto.mes);
  const [quincenaKPI,   setQuincenaKPI]   = useEstadoPersistido<QuincenaViajes>('viajes.quincena', porDefecto.quincena);
  const [anioKPI,       setAnioKPI]       = useEstadoPersistido('viajes.anio', porDefecto.anio);

  // Datos
  const [viajes, setViajes] = useState<ViajeUI[]>([]);
  const [totalLista, setTotalLista] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [pagina, setPagina] = useEstadoPersistido('viajes.pagina', 1);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);
  const [indicadoresApi, setIndicadoresApi] = useState<IndicadoresViajes | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Diálogos de confirmación
  /**
   * Remisión de salida (§14.6): el papel que lleva el conductor. Lo arma el
   * backend con el membrete de la finca desde el 2026-10-28.
   */
  const [descargando, setDescargando] = useState<string | null>(null);

  const descargarRemisionViaje = async (viaje: ViajeUI) => {
    setDescargando(viaje.id);
    try {
      const blob = await viajesApi.remisionSalidaPdf(Number(viaje.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remision_salida_${viaje.remisionId}_${viaje.fecha}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo generar la remisión');
    } finally {
      setDescargando(null);
    }
  };

  const [viajeAEliminar, setViajeAEliminar] = useState<{ id: string; remision: string } | null>(null);
  const [viajeAValidar, setViajeAValidar]   = useState<{ id: string; remision: string } | null>(null);
  const [loadingKPI,  setLoadingKPI]  = useState(true);

  const handleFiltroChange = (key: keyof typeof filtros, value: string) =>
    setFiltros(prev => ({ ...prev, [key]: value }));

  const limpiarFiltros = () => setFiltros(FILTROS_VACIOS);

  /**
   * El período y los filtros quedan guardados por sesión, así que hace falta
   * una salida explícita: sin esto, volver al mes de hoy obliga a deshacer
   * campo por campo lo que se dejó puesto.
   */
  const reiniciarVista = () => {
    const d = periodoPorDefecto();
    setPeriodoKPI(d.periodo);
    setMesKPI(d.mes);
    setAnioKPI(d.anio);
    setQuincenaKPI(d.quincena);
    setFechaInicioKPI('');
    setFechaFinKPI('');
    setFiltros(FILTROS_VACIOS);
    setPagina(1);
  };

  /**
   * El período del encabezado manda sobre toda la pantalla, no solo sobre los
   * KPIs: antes la tabla ignoraba el selector y mostraba viajes de meses que
   * los indicadores contaban en cero. El rango va como 'YYYY-MM-DD', que es lo
   * que esperan `fecha_desde` / `fecha_hasta` en `GET /viajes`
   * (API_VIAJES.md 5.8).
   */
  const rangoPeriodo = useMemo(() => {
    if (periodoKPI === 'anual') {
      return { desde: `${anioKPI}-01-01`, hasta: `${anioKPI}-12-31` };
    }
    if (periodoKPI === 'personalizado') {
      return { desde: fechaInicioKPI, hasta: fechaFinKPI };
    }
    if (periodoKPI === 'semanal') {
      // El backend resuelve SEMANAL como los últimos 7 días calendario,
      // hoy - 6 hasta hoy (API_VIAJES.md 5.9). La tabla usa el mismo corte
      // para no contradecir a los indicadores.
      const hoy = new Date();
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 6);
      return { desde: isoLocal(inicio), hasta: isoLocal(hoy) };
    }
    const primeraQuincena = periodoKPI === 'quincenal' && quincenaKPI === 1;
    const segundaQuincena = periodoKPI === 'quincenal' && quincenaKPI === 2;
    return {
      desde: segundaQuincena ? `${mesKPI}-16` : `${mesKPI}-01`,
      hasta: primeraQuincena ? `${mesKPI}-15` : finDeMes(mesKPI),
    };
  }, [periodoKPI, anioKPI, fechaInicioKPI, fechaFinKPI, mesKPI, quincenaKPI]);

  // ── carga listado ──────────────────────────────────────────────────────────
  // Los campos de texto se escriben letra por letra: sin esta espera, cada
  // tecla saldría al backend.
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);
  useEffect(() => {
    const t = setTimeout(() => setFiltrosAplicados(filtros), 500);
    return () => clearTimeout(t);
  }, [filtros]);

  // Al cambiar un filtro o el período, la página 3 del resultado anterior no
  // significa nada. En el montaje no aplica: ahí la página viene de la sesión
  // y es justo la que hay que respetar.
  useAlCambiar(
    `${JSON.stringify(filtrosAplicados)}|${rangoPeriodo.desde}|${rangoPeriodo.hasta}`,
    () => setPagina(1),
  );

  const cargarViajes = useCallback(async () => {
    setLoadingList(true);
    try {
      const f = filtrosAplicados;
      const params: ListarViajesParams = { per_page: PER_PAGE, page: pagina };
      if (f.remision)   params.remision = f.remision;
      if (f.estado)     params.estado = ESTADO_UI_TO_API[f.estado as EstadoViaje];
      if (f.vehiculo)   params.vehiculo = f.vehiculo;
      if (f.conductor)  params.conductor = f.conductor;
      if (f.extractora) params.extractora_id = Number(f.extractora);
      // La fecha la manda el selector del encabezado, no la tabla.
      if (rangoPeriodo.desde) params.fecha_desde = rangoPeriodo.desde;
      if (rangoPeriodo.hasta) params.fecha_hasta = rangoPeriodo.hasta;
      const res = await viajesApi.listar(params);
      setViajes((res.data ?? []).map(mapViaje));
      setTotalLista(res.meta?.total ?? (res.data ?? []).length);
      setUltimaPagina(res.meta?.last_page ?? 1);
    } catch (e) { console.warn('listar viajes error', e); }
    finally { setLoadingList(false); }
  }, [filtrosAplicados, pagina, rangoPeriodo]);

  useEffect(() => { cargarViajes(); }, [cargarViajes]);

  // El backend filtra la extractora por id, así que el campo de texto no servía.
  useEffect(() => {
    extractorasApi.select()
      .then((r) => setExtractoras(r.data ?? []))
      .catch((e) => console.warn('extractoras select error', e));
  }, []);

  // ── carga indicadores ──────────────────────────────────────────────────────
  const cargarIndicadores = useCallback(async () => {
    setLoadingKPI(true);
    try {
      // Cada ancla aplica a un solo período, así que se manda la suya y nada
      // más (API_VIAJES.md 5.9). El rango a la medida va en desde / hasta.
      const params: IndicadoresParams =
        periodoKPI === 'semanal'   ? { periodo: 'SEMANAL' }
        : periodoKPI === 'quincenal' ? { periodo: 'QUINCENAL', mes: mesKPI, quincena: quincenaKPI }
        : periodoKPI === 'mensual' ? { periodo: 'MENSUAL', mes: mesKPI }
        : periodoKPI === 'anual'   ? { periodo: 'ANUAL', anio: anioKPI }
        : { periodo: 'CUSTOM', desde: fechaInicioKPI || undefined, hasta: fechaFinKPI || undefined };
      const res = await viajesApi.indicadores(params);
      setIndicadoresApi(res.data);
    } catch (e) { console.warn('indicadores error', e); }
    finally { setLoadingKPI(false); }
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI, mesKPI, quincenaKPI, anioKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // ── eliminar viaje ─────────────────────────────────────────────────────────
  const abrirDialogoEliminar = (viaje: ViajeUI, event: React.MouseEvent) => {
    event.stopPropagation();
    setViajeAEliminar({ id: viaje.id, remision: viaje.remisionId });
  };

  const confirmarEliminar = async () => {
    if (!viajeAEliminar) return;
    try {
      await viajesApi.eliminar(Number(viajeAEliminar.id));
      setViajes(prev => prev.filter(v => v.id !== viajeAEliminar.id));
      toast.success('Viaje eliminado correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar el viaje');
    } finally {
      setViajeAEliminar(null);
    }
  };

  // ── Pasar a "En Validación" — el conteo es OPCIONAL.
  //     Usa POST /viajes/{id}/saltar-validacion (modelo nuevo de 3 estados).
  //     Aplica para fincas que pagan por jornal y no llevan control de cosechas.
  const abrirDialogoValidar = (viaje: ViajeUI, event: React.MouseEvent) => {
    event.stopPropagation();
    setViajeAValidar({ id: viaje.id, remision: viaje.remisionId });
  };

  const confirmarValidar = async () => {
    if (!viajeAValidar) return;
    const id = viajeAValidar.id;
    setViajeAValidar(null);
    try {
      await viajesApi.saltarValidacion(Number(id));
      toast.success('Viaje actualizado a "En Validación" exitosamente');
      cargarViajes();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cambiar el estado del viaje');
    }
  };

  // ── filtros ────────────────────────────────────────────────────────────────
  // Los filtros los resuelve `GET /viajes`: la tabla pinta la página que
  // llegó, sin volver a filtrar sobre un recorte.
  const viajesFiltrados = viajes;
  const hayFiltros = Object.values(filtrosAplicados).some(Boolean);

  /** Para contarle al usuario qué rango está mirando cuando la tabla sale vacía. */
  const fechaCorta = (s: string) => {
    const d = parseFecha(s);
    return d
      ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
      : s;
  };
  const etiquetaPeriodo = rangoPeriodo.desde && rangoPeriodo.hasta
    ? `del ${fechaCorta(rangoPeriodo.desde)} al ${fechaCorta(rangoPeriodo.hasta)}`
    : 'del período elegido';

  // ── KPIs por período (cliente) — fallback si la API no responde ────────────
  // Las fechas vienen como 'YYYY-MM-DD', así que comparar los textos basta y
  // evita construir Date por fila.
  const viajesPorPeriodo = viajes.filter(v => {
    const f = (v.fecha ?? '').slice(0, 10);
    if (!f) return false;
    if (rangoPeriodo.desde && f < rangoPeriodo.desde) return false;
    if (rangoPeriodo.hasta && f > rangoPeriodo.hasta) return false;
    return true;
  });

  const totalViajes        = indicadoresApi?.total_viajes ?? viajesPorPeriodo.length;
  // El backend reporta `en_validacion` directamente (modelo nuevo de 3 estados).
  // Si por alguna razón no llega del API, calculamos en cliente.
  const viajesEnValidacion = indicadoresApi?.en_validacion ?? viajesPorPeriodo.filter(v => v.estado === 'En Validación').length;
  const viajesFinalizados  = indicadoresApi?.finalizados ?? viajesPorPeriodo.filter(v => v.estado === 'Finalizado').length;
  const pesoTotal          = indicadoresApi ? parseFloat(indicadoresApi.kilogramos_totales || '0') : viajesPorPeriodo.reduce((s, v) => s + (v.peso ?? 0), 0);
  const gajosTotal         = indicadoresApi?.gajos_totales ?? viajesPorPeriodo.reduce((s, v) => s + v.gajosEstimados, 0);

  return (
    <div className="space-y-8">
      {/* ─── Diálogo Eliminar viaje ─────────────────────────────────────── */}
      <AlertDialog open={!!viajeAEliminar} onOpenChange={open => !open && setViajeAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>Esto eliminará permanentemente el viaje <strong>{viajeAEliminar?.remision}</strong>. Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Diálogo Pasar a En Validación ──────────────────────────────── */}
      <AlertDialog open={!!viajeAValidar} onOpenChange={open => !open && setViajeAValidar(null)}>
        <AlertDialogContent className="max-w-xl">
          {/* `text-left` override del `text-center` que trae por default
              AlertDialogHeader (shadcn). Aquí necesitamos alinear a la izquierda
              porque el callout tiene contenido en formato bloque + icono. */}
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pasar a En Validación
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-left">
                  ¿Confirmas que deseas cambiar el estado del viaje{' '}
                  <strong>{viajeAValidar?.remision}</strong> a{' '}
                  <span className="font-semibold text-foreground">En Validación</span>?
                </p>
                {/* Advertencia: cuando se salta el reconteo, el sistema toma los
                    gajos/peso reportados por el colaborador como definitivos. Eso
                    impacta el cálculo de nómina, así que el usuario debe verlo
                    claramente antes de confirmar. */}
                <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex gap-3 text-left">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                      Importante: datos que tomará el sistema
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                      Si no ingresas la información de la extractora durante la validación, el sistema tomará como definitivos los <span className="font-semibold">gajos y kilogramos reportados por el colaborador</span>. Estos valores serán los usados para calcular la nómina.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarValidar} className="bg-primary hover:bg-primary/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Viajes"
        description="Despachos de fruto hacia la extractora."
        actions={
          <>
            {/* El cargue del histórico: los despachos de antes del sistema. Va
                visible siempre, como el resto del módulo, y el backend es el
                que decide con el permiso `viajes.importar`. */}
            <Button variant="outline" onClick={() => navigate('/viajes/importar')}>
              <FileUp className="h-4 w-4" strokeWidth={2} />
              Importar histórico
            </Button>
            <Button onClick={() => navigate('/viajes/nuevo')}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo viaje
            </Button>
          </>
        }
      />


      {/* El período manda sobre los indicadores y sobre la lista de abajo:
          las dos leen el mismo rango de fechas. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2>Indicadores del período</h2>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Label className="text-sm font-medium">Período:</Label>
          <Select value={periodoKPI}
            onValueChange={(v) => setPeriodoKPI(v as typeof periodoKPI)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {(periodoKPI === 'mensual' || periodoKPI === 'quincenal') && (
            <SelectorMes valor={mesKPI} onChange={setMesKPI} />
          )}
          {periodoKPI === 'anual' && (
            <SelectorAnio valor={anioKPI} onChange={setAnioKPI} />
          )}
          {periodoKPI === 'quincenal' && (
            <Select value={String(quincenaKPI)}
              onValueChange={(v) => setQuincenaKPI(Number(v) as QuincenaViajes)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Del 1 al 15</SelectItem>
                <SelectItem value="2">Del 16 al fin de mes</SelectItem>
              </SelectContent>
            </Select>
          )}
          {periodoKPI === 'personalizado' && (
            <>
              <Input type="date" aria-label="Fecha de inicio" className="w-40"
                value={fechaInicioKPI} onChange={e => setFechaInicioKPI(e.target.value)} />
              <Input type="date" aria-label="Fecha de fin" className="w-40"
                value={fechaFinKPI} onChange={e => setFechaFinKPI(e.target.value)} />
            </>
          )}
          <Button variant="ghost" size="sm" onClick={reiniciarVista}
            title="Vuelve al mes en curso y borra los filtros de la tabla">
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Reiniciar
          </Button>
        </div>
      </div>

      <StatStrip
        loading={loadingKPI && !indicadoresApi}
        items={[
          { label: 'Total de viajes', value: num(totalViajes), note: 'despachos en el período' },
          { label: 'En validación', value: num(viajesEnValidacion), note: 'esperan la remisión de la planta' },
          { label: 'Finalizados', value: num(viajesFinalizados), note: 'ya cerrados' },
          { label: 'Kilogramos', value: num(pesoTotal), unit: 'kg', note: 'peso de báscula' },
        ]}
      />

      <div className="space-y-4">
        <div className="space-y-1">
          <h2>Viajes registrados</h2>
          <p className="text-[15px] text-muted-foreground">Despachos de fruto hacia las extractoras.</p>
        </div>

        {/* Filtros. Van siempre: si se escondieran al quedar la tabla
            vacía, el filtro que dejó cero resultados no se podría
            borrar y la pantalla quedaría trancada. */}
        <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground" htmlFor="viajes-remision">Remisión</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input id="viajes-remision" placeholder="REM-2026-001" value={filtros.remision}
                onChange={e => handleFiltroChange('remision', e.target.value)} className="h-9 pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">Estado</label>
            <Select
              value={filtros.estado || '__todos__'}
              onValueChange={(v) => handleFiltroChange('estado', v === '__todos__' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                <SelectItem value="Creado">Creado</SelectItem>
                <SelectItem value="En Validación">En Validación</SelectItem>
                <SelectItem value="Finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground" htmlFor="viajes-vehiculo">Vehículo</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input id="viajes-vehiculo" placeholder="ABC-123" value={filtros.vehiculo}
                onChange={e => handleFiltroChange('vehiculo', e.target.value)} className="h-9 pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground" htmlFor="viajes-conductor">Conductor</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input id="viajes-conductor" placeholder="Nombre" value={filtros.conductor}
                onChange={e => handleFiltroChange('conductor', e.target.value)} className="h-9 pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground" htmlFor="viajes-extractora">Extractora</label>
            <Select
              value={filtros.extractora || '__todas__'}
              onValueChange={(v) => handleFiltroChange('extractora', v === '__todas__' ? '' : v)}
            >
              <SelectTrigger id="viajes-extractora" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas</SelectItem>
                {extractoras.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.razon_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hayFiltros && (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Dentro del período {etiquetaPeriodo}.</span>
            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
              <RotateCcw className="h-4 w-4" strokeWidth={2} />
              Limpiar filtros
            </Button>
          </div>
        )}

        {loadingList ? (
          <Card className="gap-0">
            <TableSkeleton rows={6} columns={6} />
          </Card>
        ) : viajesFiltrados.length === 0 ? (
          <Card className="gap-0">
            <EmptyState
              title={hayFiltros
                ? 'Ningún viaje coincide con los filtros'
                : `No hay viajes ${etiquetaPeriodo}`}
              description={hayFiltros
                ? 'Borre los filtros o cambie el período de arriba.'
                : 'Cambie el período de arriba o registre un despacho.'}
              action={hayFiltros
                ? { label: 'Limpiar filtros', onClick: limpiarFiltros }
                : { label: 'Nuevo viaje', onClick: () => navigate('/viajes/nuevo') }}
            />
          </Card>
        ) : (
          <Card className="gap-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Remisión</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Vehículo y conductor</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Extractora</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Gajos</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Peso (kg)</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viajesFiltrados.map((viaje) => {
                    const d = parseFecha(viaje.fecha);
                    return (
                      <tr key={viaje.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <span className="font-semibold text-foreground">{viaje.remisionId}</span>
                          {viaje.importado && (
                            <span
                              className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              title="Entró por el cargue de histórico"
                            >
                              Importado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-foreground">
                            {d ? d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '—'}
                          </span>
                          <span className="text-xs text-muted-foreground">{d ? d.getFullYear() : ''}</span>
                        </td>
                        <td className="px-4 py-3">{getEstadoBadge(viaje.estado)}</td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-foreground">{viaje.placaVehiculo}</span>
                          <span className="text-xs text-muted-foreground">{viaje.conductor}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                            <span className="text-foreground">{viaje.extractora}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {num(viaje.gajosEstimados)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {viaje.peso ? (
                            <span className="font-semibold tabular-nums text-foreground">{num(viaje.peso)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {viaje.estado === 'Creado' ? (
                              <>
                                {/* La remisión se imprime ANTES de salir: es el
                                    papel que lleva el conductor y que firma la
                                    planta al recibir. El desprendible del
                                    backend es otra cosa y solo existe en
                                    FINALIZADO. */}
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-muted-foreground"
                                  disabled={descargando === viaje.id}
                                  onClick={() => void descargarRemisionViaje(viaje)}
                                  aria-label="Descargar remisión de entrega"
                                  title="Descargar remisión de entrega"
                                >
                                  <Download className="h-4 w-4" strokeWidth={2} />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-muted-foreground hover:text-success"
                                  aria-label="Conteo de cosecha"
                                  title="Conteo de cosecha (opcional)"
                                  onClick={() => navigate(`/viajes/${viaje.id}/conteo`, {
                                    state: {
                                      viaje: {
                                        id: viaje.id, fecha: viaje.fecha,
                                        placaVehiculo: viaje.placaVehiculo, conductor: viaje.conductor,
                                        transportador: viaje.transportador, extractora: viaje.extractora,
                                        horaSalida: viaje.horaSalida,
                                      }
                                    }
                                  })}
                                >
                                  <Calculator className="h-4 w-4" strokeWidth={2} />
                                </Button>
                                {/* Abre el detalle directamente en el
                                    formulario de edición. */}
                                <Button
                                  variant="ghost" size="icon" asChild
                                  className="text-muted-foreground"
                                  aria-label="Editar viaje" title="Editar"
                                >
                                  <Link to={`/viajes/${viaje.id}?vista=editar`}>
                                    <Edit className="h-4 w-4" strokeWidth={2} />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={(e) => abrirDialogoEliminar(viaje, e)}
                                  aria-label="Eliminar viaje" title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                                </Button>
                              </>
                            ) : viaje.estado === 'En Validación' ? (
                              /* En Validación: el único paso útil es cargar la
                                 remisión de la extractora. Al abrir el detalle
                                 se sube el PDF. */
                              <Button
                                variant="ghost" size="icon" asChild
                                className="text-muted-foreground"
                                aria-label="Cargar remisión de la extractora"
                                title="Cargar remisión extractora"
                              >
                                <Link to={`/viajes/${viaje.id}?vista=gestion`}>
                                  <FileUp className="h-4 w-4" strokeWidth={2} />
                                </Link>
                              </Button>
                            ) : (
                              /* Finalizado: solo lectura. No hay eliminar
                                 porque ya está cerrado y liquidado en nómina.
                                 La única vuelta atrás es reabrirlo (§5.10),
                                 con su permiso aparte. */
                              <>
                                {hasPermiso('viajes.reabrir') && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="text-muted-foreground hover:text-warning"
                                    aria-label="Reabrir viaje" title="Reabrir viaje"
                                    onClick={() => setViajeAReabrir({ id: viaje.id, remision: viaje.remisionId })}
                                  >
                                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="icon" asChild
                                  className="text-muted-foreground"
                                  aria-label="Ver viaje" title="Ver viaje"
                                >
                                  <Link to={`/viajes/${viaje.id}`}>
                                    <Eye className="h-4 w-4" strokeWidth={2} />
                                  </Link>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground">
              <p>
                Mostrando <span className="font-semibold text-foreground">{num(viajesFiltrados.length)}</span> de{' '}
                <span className="font-semibold text-foreground">{num(totalLista)}</span> viajes
              </p>
              {ultimaPagina > 1 && (
                <div className="flex items-center gap-2">
                  <span>Página {pagina} de {ultimaPagina}</span>
                  <Button
                    size="sm" variant="outline"
                    disabled={loadingList || pagina <= 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    Anteriores
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    disabled={loadingList || pagina >= ultimaPagina}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Siguientes
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <RevertirEstadoDialog
        abierto={viajeAReabrir !== null}
        onCerrar={() => setViajeAReabrir(null)}
        titulo={`Reabrir el viaje ${viajeAReabrir?.remision ?? ''}`}
        descripcion="Vuelve a CREADO con sus cosechas enlazadas y los reconteos pendientes, para corregir el peso, un reconteo o una cosecha que no iba."
        etiquetaAccion="Reabrir viaje"
        efectos={[
          'Los reconteos vuelven a pendiente; los gajos en viaje se conservan.',
          'Se borra el promedio kg/gajo que este camión aportó al lote.',
          'Los datos de la extractora y los documentos se conservan.',
          'El desprendible deja de servirse hasta que vuelva a finalizar.',
        ]}
        verificar={async () => (await reversionApi.viaje.verificar(Number(viajeAReabrir!.id))).data}
        confirmar={async (motivo) => {
          const res = await reversionApi.viaje.reabrir(Number(viajeAReabrir!.id), motivo);
          toast.success(res.message ?? 'Viaje reabierto');
        }}
        onHecho={() => { void cargarViajes(); void cargarIndicadores(); }}
      />
    </div>
  );
}