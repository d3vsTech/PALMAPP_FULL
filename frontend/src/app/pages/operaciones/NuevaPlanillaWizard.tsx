import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
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
  ArrowLeft, ArrowRight, CheckCircle, Cloud, CloudRain, Droplet,
  Loader2, Plus, Save, Sun, Trash2, Users, Wheat, Scissors, Sprout, Shield, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  operacionesApi, cosechasApi, jornalesApi, selectsApi,
  Planilla, Cosecha, Jornal, Resumen, TipoJornalPalma,
} from '../../../api/operaciones';

// ─────────────────────────────────────────────────────────────
// Tipos locales del wizard
// ─────────────────────────────────────────────────────────────

type Paso = 1 | 2;
type TabPalma = 'cosecha' | 'plateo' | 'poda' | 'fertilizacion' | 'sanidad' | 'otros';

interface OptionColaborador { id: number; primer_nombre?: string; primer_apellido?: string; nombre_completo?: string; }
interface OptionLote { id: number; nombre: string; }
interface OptionSublote { id: number; nombre: string; lote_id?: number; }
interface OptionInsumo { id: number; nombre: string; }

const TABS_PALMA: { value: TabPalma; label: string; icon: any }[] = [
  { value: 'cosecha',       label: 'Cosecha',        icon: Wheat },
  { value: 'plateo',        label: 'Plateo',         icon: Sprout },
  { value: 'poda',          label: 'Poda',           icon: Scissors },
  { value: 'fertilizacion', label: 'Fertilización',  icon: Droplet },
  { value: 'sanidad',       label: 'Sanidad',        icon: Shield },
  { value: 'otros',         label: 'Otros',          icon: Wrench },
];

export default function NuevaPlanillaWizard() {
  const navigate = useNavigate();
  const { id: idParam } = useParams();
  const isEditing = !!idParam;

  // ─────────────── State global ───────────────
  const [paso, setPaso] = useState<Paso>(1);
  const [planillaId, setPlanillaId] = useState<number | null>(
    idParam ? Number(idParam) : null,
  );
  const [guardando, setGuardando] = useState(false);

  // Paso 1 — Info general
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState<string>(hoy);
  const [horaInicio, setHoraInicio] = useState<string>('06:00');
  const [hubrioLluvia, setHubrioLluvia] = useState<boolean>(false);
  const [cantidadLluvia, setCantidadLluvia] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // Paso 2 — Tabs
  const [tabActiva, setTabActiva] = useState<TabPalma>('cosecha');
  const [cosechas, setCosechas] = useState<Cosecha[]>([]);
  const [jornales, setJornales] = useState<Jornal[]>([]);

  // Resumen del panel derecho
  const [resumen, setResumen] = useState<Resumen | null>(null);

  // Dropdowns cacheados
  const [colabs, setColabs] = useState<OptionColaborador[]>([]);
  const [lotes, setLotes] = useState<OptionLote[]>([]);
  const [insumos, setInsumos] = useState<OptionInsumo[]>([]);
  const [sublotesPorLote, setSublotesPorLote] = useState<Record<number, OptionSublote[]>>({});

  // ─────────────── Carga inicial de selects ───────────────
  useEffect(() => {
    (async () => {
      try {
        const [c, l, i] = await Promise.all([
          selectsApi.colaboradores(),
          selectsApi.lotes(),
          selectsApi.insumos(),
        ]);
        setColabs(c.data ?? []);
        setLotes(l.data ?? []);
        setInsumos(i.data ?? []);
      } catch {
        toast.error('Error al cargar catálogos');
      }
    })();
  }, []);

  // ─────────────── Carga inicial si es edición ───────────────
  useEffect(() => {
    if (!isEditing || !planillaId) return;
    (async () => {
      try {
        const r = await operacionesApi.ver(planillaId);
        const p = r.data;
        setFecha(p.fecha);
        setHoraInicio(p.hora_inicio?.slice(0, 5) ?? '06:00');
        setHubrioLluvia(!!p.hubo_lluvia);
        setCantidadLluvia(p.cantidad_lluvia ?? '');
        setObservaciones(p.observaciones ?? '');
        setCosechas(p.cosechas ?? []);
        setJornales(p.jornales ?? []);
        setPaso(2);
        await refrescarResumen(planillaId);
      } catch (e: any) {
        toast.error(e?.message ?? 'No se pudo cargar la planilla');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planillaId, isEditing]);

  // ─────────────── Helpers ───────────────
  const cargarSublotes = async (loteId: number) => {
    if (sublotesPorLote[loteId]) return;
    try {
      const r = await selectsApi.sublotes({ lote_id: loteId });
      setSublotesPorLote((prev) => ({ ...prev, [loteId]: r.data ?? [] }));
    } catch {
      toast.error('Error al cargar sublotes');
    }
  };

  const refrescarResumen = async (id: number) => {
    try {
      const r = await operacionesApi.resumen(id);
      setResumen(r.data);
    } catch {/* silencioso */}
  };

  const nombreColab = (emp: OptionColaborador | undefined): string => {
    if (!emp) return '';
    if (emp.nombre_completo) return emp.nombre_completo;
    return [emp.primer_nombre, emp.primer_apellido].filter(Boolean).join(' ');
  };

  const formatearMoneda = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (Number.isNaN(n)) return '—';
    return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  // ─────────────── Paso 1 — Crear/Actualizar ───────────────
  const validarPaso1 = (): boolean => {
    if (!fecha) return toast.error('La fecha es obligatoria') as any as boolean || false;
    if (hubrioLluvia && (!cantidadLluvia || parseFloat(cantidadLluvia) < 0)) {
      toast.error('Indica la cantidad de lluvia en mm');
      return false;
    }
    return true;
  };

  const guardarPaso1Continuar = async () => {
    if (!validarPaso1()) return;
    setGuardando(true);
    try {
      const payload = {
        fecha,
        hora_inicio: horaInicio || undefined,
        hubo_lluvia: hubrioLluvia,
        cantidad_lluvia: hubrioLluvia ? parseFloat(cantidadLluvia || '0') : null,
        observaciones: observaciones || null,
      };
      if (planillaId) {
        await operacionesApi.editar(planillaId, payload);
        toast.success('Información actualizada');
      } else {
        const r = await operacionesApi.crear(payload);
        setPlanillaId(r.data.id);
        toast.success('Planilla creada');
      }
      const id = planillaId ?? (await operacionesApi.listar({ per_page: 1 })).data[0]?.id;
      if (id) await refrescarResumen(id);
      setPaso(2);
    } catch (e: any) {
      const msg = e?.message ?? 'Error al guardar';
      if (msg.toLowerCase().includes('fecha')) {
        toast.error('Ya existe una planilla para esta fecha');
      } else {
        toast.error(msg);
      }
    } finally {
      setGuardando(false);
    }
  };

  // ─────────────── Aprobar ───────────────
  const [showAprobar, setShowAprobar] = useState(false);
  const aprobar = async () => {
    if (!planillaId) return;
    setGuardando(true);
    try {
      await operacionesApi.aprobar(planillaId);
      toast.success('Planilla aprobada');
      navigate(`/operaciones/planilla/${planillaId}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo aprobar');
    } finally {
      setGuardando(false);
      setShowAprobar(false);
    }
  };

  // ─────────────── Renderers de tabs ───────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/operaciones')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Operaciones
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Planilla del Día' : 'Nueva Planilla del Día'}
          </h1>
          <p className="text-muted-foreground">Registro diario de cosecha y labores de palma</p>
        </div>
        {paso === 2 && planillaId && (
          <Button
            onClick={() => setShowAprobar(true)}
            disabled={guardando}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <CheckCircle className="h-5 w-5" /> Aprobar Planilla
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4">
        <StepChip active={paso === 1} done={paso > 1} number={1} label="Información General" />
        <div className="h-px flex-1 bg-border" />
        <StepChip active={paso === 2} done={false} number={2} label="Labores de Palma" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Columna principal */}
        <div>
          {paso === 1 ? (
            <Paso1
              fecha={fecha} setFecha={setFecha}
              horaInicio={horaInicio} setHoraInicio={setHoraInicio}
              hubrioLluvia={hubrioLluvia} setHubrioLluvia={setHubrioLluvia}
              cantidadLluvia={cantidadLluvia} setCantidadLluvia={setCantidadLluvia}
              observaciones={observaciones} setObservaciones={setObservaciones}
              onContinuar={guardarPaso1Continuar}
              guardando={guardando}
            />
          ) : (
            <Paso2
              planillaId={planillaId!}
              tabActiva={tabActiva}
              setTabActiva={setTabActiva}
              cosechas={cosechas}
              setCosechas={setCosechas}
              jornales={jornales}
              setJornales={setJornales}
              colabs={colabs}
              lotes={lotes}
              insumos={insumos}
              sublotesPorLote={sublotesPorLote}
              cargarSublotes={cargarSublotes}
              nombreColab={nombreColab}
              formatearMoneda={formatearMoneda}
              refrescarResumen={() => refrescarResumen(planillaId!)}
              onVolverPaso1={() => setPaso(1)}
            />
          )}
        </div>

        {/* Panel derecho — Resumen */}
        <ResumenPanel
          fecha={fecha}
          horaInicio={horaInicio}
          hubrioLluvia={hubrioLluvia}
          cantidadLluvia={cantidadLluvia}
          resumen={resumen}
        />
      </div>

      {/* Dialog aprobar */}
      <AlertDialog open={showAprobar} onOpenChange={setShowAprobar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez aprobada la planilla queda inmutable: no podrás editar ni eliminar
              sus jornales, cosechas o ausencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={guardando} onClick={aprobar}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────

function StepChip({ active, done, number, label }: { active: boolean; done: boolean; number: number; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
      active ? 'border-primary bg-primary/10 text-primary' :
      done   ? 'border-success bg-success/10 text-success' :
               'border-border text-muted-foreground'
    }`}>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-primary text-primary-foreground' :
        done   ? 'bg-success text-white' :
                 'bg-muted'
      }`}>
        {done ? <CheckCircle className="h-4 w-4" /> : number}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Paso 1 — Información general
// ─────────────────────────────────────────────────────────────

interface P1Props {
  fecha: string; setFecha: (v: string) => void;
  horaInicio: string; setHoraInicio: (v: string) => void;
  hubrioLluvia: boolean; setHubrioLluvia: (v: boolean) => void;
  cantidadLluvia: string; setCantidadLluvia: (v: string) => void;
  observaciones: string; setObservaciones: (v: string) => void;
  onContinuar: () => void;
  guardando: boolean;
}

function Paso1(p: P1Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Fecha *</Label>
            <Input type="date" value={p.fecha} onChange={(e) => p.setFecha(e.target.value)} />
          </div>
          <div>
            <Label>Hora de inicio</Label>
            <Input type="time" value={p.horaInicio} onChange={(e) => p.setHoraInicio(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">¿Hubo lluvia?</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={!p.hubrioLluvia ? 'default' : 'outline'}
              onClick={() => { p.setHubrioLluvia(false); p.setCantidadLluvia(''); }}
            >
              <Sun className="h-4 w-4 mr-2" /> No
            </Button>
            <Button
              type="button"
              variant={p.hubrioLluvia ? 'default' : 'outline'}
              onClick={() => p.setHubrioLluvia(true)}
            >
              <CloudRain className="h-4 w-4 mr-2" /> Sí
            </Button>
          </div>
        </div>

        {p.hubrioLluvia && (
          <div>
            <Label>Cantidad de lluvia (mm) *</Label>
            <Input type="number" step="0.01" min="0" value={p.cantidadLluvia}
              onChange={(e) => p.setCantidadLluvia(e.target.value)} placeholder="Ej: 12.5" />
          </div>
        )}

        <div>
          <Label>Observaciones</Label>
          <Textarea value={p.observaciones} onChange={(e) => p.setObservaciones(e.target.value)}
            placeholder="Notas adicionales del día..." rows={3} />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={p.onContinuar} disabled={p.guardando} className="gap-2">
            {p.guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Guardar y continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Paso 2 — Labores de Palma (tabs)
// ─────────────────────────────────────────────────────────────

interface P2Props {
  planillaId: number;
  tabActiva: TabPalma;
  setTabActiva: (t: TabPalma) => void;
  cosechas: Cosecha[];
  setCosechas: (c: Cosecha[] | ((prev: Cosecha[]) => Cosecha[])) => void;
  jornales: Jornal[];
  setJornales: (c: Jornal[] | ((prev: Jornal[]) => Jornal[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  insumos: OptionInsumo[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  formatearMoneda: (v: string | number | null | undefined) => string;
  refrescarResumen: () => Promise<void>;
  onVolverPaso1: () => void;
}

function Paso2(p: P2Props) {
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS_PALMA.map((t) => {
          const Icon = t.icon;
          const activa = p.tabActiva === t.value;
          return (
            <Button key={t.value} variant={activa ? 'default' : 'outline'} size="sm"
              onClick={() => p.setTabActiva(t.value)} className="gap-2">
              <Icon className="h-4 w-4" /> {t.label}
            </Button>
          );
        })}
      </div>

      {p.tabActiva === 'cosecha' && (
        <CosechaTab
          planillaId={p.planillaId}
          cosechas={p.cosechas}
          setCosechas={p.setCosechas}
          colabs={p.colabs}
          lotes={p.lotes}
          sublotesPorLote={p.sublotesPorLote}
          cargarSublotes={p.cargarSublotes}
          nombreColab={p.nombreColab}
          formatearMoneda={p.formatearMoneda}
          refrescarResumen={p.refrescarResumen}
        />
      )}

      {(p.tabActiva === 'plateo' || p.tabActiva === 'poda') && (
        <PlateoPodaTab
          planillaId={p.planillaId}
          tipo={p.tabActiva.toUpperCase() as 'PLATEO' | 'PODA'}
          jornales={p.jornales}
          setJornales={p.setJornales}
          colabs={p.colabs}
          lotes={p.lotes}
          sublotesPorLote={p.sublotesPorLote}
          cargarSublotes={p.cargarSublotes}
          nombreColab={p.nombreColab}
          formatearMoneda={p.formatearMoneda}
          refrescarResumen={p.refrescarResumen}
        />
      )}

      {p.tabActiva === 'fertilizacion' && (
        <FertilizacionTab
          planillaId={p.planillaId}
          jornales={p.jornales}
          setJornales={p.setJornales}
          colabs={p.colabs}
          lotes={p.lotes}
          insumos={p.insumos}
          sublotesPorLote={p.sublotesPorLote}
          cargarSublotes={p.cargarSublotes}
          nombreColab={p.nombreColab}
          formatearMoneda={p.formatearMoneda}
          refrescarResumen={p.refrescarResumen}
        />
      )}

      {p.tabActiva === 'sanidad' && (
        <SanidadTab
          planillaId={p.planillaId}
          jornales={p.jornales}
          setJornales={p.setJornales}
          colabs={p.colabs}
          lotes={p.lotes}
          sublotesPorLote={p.sublotesPorLote}
          cargarSublotes={p.cargarSublotes}
          nombreColab={p.nombreColab}
          refrescarResumen={p.refrescarResumen}
        />
      )}

      {p.tabActiva === 'otros' && (
        <OtrosTab
          planillaId={p.planillaId}
          jornales={p.jornales}
          setJornales={p.setJornales}
          colabs={p.colabs}
          lotes={p.lotes}
          sublotesPorLote={p.sublotesPorLote}
          cargarSublotes={p.cargarSublotes}
          nombreColab={p.nombreColab}
          refrescarResumen={p.refrescarResumen}
        />
      )}

      <div className="flex justify-start pt-4 border-t">
        <Button variant="outline" onClick={p.onVolverPaso1} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a información general
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Cosecha
// ─────────────────────────────────────────────────────────────

function CosechaTab(p: {
  planillaId: number;
  cosechas: Cosecha[];
  setCosechas: (c: Cosecha[] | ((prev: Cosecha[]) => Cosecha[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  formatearMoneda: (v: string | number | null | undefined) => string;
  refrescarResumen: () => Promise<void>;
}) {
  const [loteId, setLoteId] = useState<string>('');
  const [subloteId, setSubloteId] = useState<string>('');
  const [gajos, setGajos] = useState<string>('');
  const [pesoConfirmado, setPesoConfirmado] = useState<string>('');
  const [cuadrilla, setCuadrilla] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);

  const sublotes = loteId ? (p.sublotesPorLote[Number(loteId)] ?? []) : [];

  const reset = () => {
    setLoteId(''); setSubloteId(''); setGajos(''); setPesoConfirmado(''); setCuadrilla([]);
  };

  const agregar = async () => {
    if (!loteId || !subloteId || !gajos || cuadrilla.length === 0) {
      toast.error('Lote, sublote, gajos y al menos 1 colaborador son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await cosechasApi.crear(p.planillaId, {
        lote_id: Number(loteId),
        sublote_id: Number(subloteId),
        gajos_reportados: Number(gajos),
        peso_confirmado: pesoConfirmado ? parseFloat(pesoConfirmado) : null,
        cuadrilla: cuadrilla.map((id) => ({ empleado_id: id })),
      });
      p.setCosechas((prev) => [...prev, res.data]);
      toast.success('Cosecha registrada');
      reset();
      await p.refrescarResumen();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar cosecha');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta cosecha?')) return;
    try {
      await cosechasApi.eliminar(id);
      p.setCosechas((prev) => prev.filter((c) => c.id !== id));
      toast.success('Cosecha eliminada');
      await p.refrescarResumen();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar');
    }
  };

  const toggleColab = (id: number) => {
    setCuadrilla((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wheat className="h-5 w-5" /> Agregar Cosecha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={async (v) => { setLoteId(v); setSubloteId(''); await p.cargarSublotes(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona un lote" /></SelectTrigger>
              <SelectContent>
                {p.lotes.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sublote *</Label>
            <Select value={subloteId} onValueChange={setSubloteId} disabled={!loteId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un sublote" /></SelectTrigger>
              <SelectContent>
                {sublotes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gajos reportados *</Label>
            <Input type="number" min="0" value={gajos} onChange={(e) => setGajos(e.target.value)} placeholder="Ej: 120" />
          </div>
          <div>
            <Label>Kilos (opcional)</Label>
            <Input type="number" step="0.01" min="0" value={pesoConfirmado}
              onChange={(e) => setPesoConfirmado(e.target.value)} placeholder="Se llena al pesar en báscula" />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Cuadrilla * <span className="text-xs text-muted-foreground">({cuadrilla.length} seleccionados)</span></Label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
            {p.colabs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">Cargando colaboradores…</p>
            ) : (
              p.colabs.map((c) => (
                <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                  <input type="checkbox" checked={cuadrilla.includes(c.id)} onChange={() => toggleColab(c.id)} />
                  <span className="text-sm">{p.nombreColab(c)}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <Button onClick={agregar} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar Cosecha
        </Button>

        {/* Tarjetas de cosechas */}
        {p.cosechas.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Cosechas registradas</h3>
            {p.cosechas.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 bg-muted/20 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.lote?.nombre} · {c.sublote?.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.gajos_reportados} gajos · {c.peso_confirmado ? `${c.peso_confirmado} kg` : 'sin pesar'}
                    </p>
                    <p className="text-sm">
                      Cuadrilla ({c.cuadrilla.length}): {c.cuadrilla.map((q) => p.nombreColab(q.empleado)).filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-success">{p.formatearMoneda(c.valor_total)}</span>
                    <Button size="sm" variant="ghost" onClick={() => eliminar(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Plateo / Poda (misma estructura)
// ─────────────────────────────────────────────────────────────

function PlateoPodaTab(p: {
  planillaId: number;
  tipo: 'PLATEO' | 'PODA';
  jornales: Jornal[];
  setJornales: (c: Jornal[] | ((prev: Jornal[]) => Jornal[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  formatearMoneda: (v: string | number | null | undefined) => string;
  refrescarResumen: () => Promise<void>;
}) {
  const [empleadoId, setEmpleadoId] = useState<string>('');
  const [loteId, setLoteId] = useState<string>('');
  const [subloteId, setSubloteId] = useState<string>('');
  const [cantidadPalmas, setCantidadPalmas] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  const sublotes = loteId ? (p.sublotesPorLote[Number(loteId)] ?? []) : [];
  const lista = p.jornales.filter((j) => j.tipo === p.tipo);

  const reset = () => { setEmpleadoId(''); setLoteId(''); setSubloteId(''); setCantidadPalmas(''); };

  const agregar = async () => {
    if (!empleadoId || !loteId || !cantidadPalmas) {
      toast.error('Empleado, lote y cantidad de palmas son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await jornalesApi.crear(p.planillaId, {
        categoria: 'PALMA',
        tipo: p.tipo,
        empleado_id: Number(empleadoId),
        lote_id: Number(loteId),
        sublote_id: subloteId ? Number(subloteId) : null,
        cantidad_palmas: Number(cantidadPalmas),
      } as any);
      p.setJornales((prev) => [...prev, res.data]);
      toast.success(`${p.tipo} registrado`);
      reset();
      await p.refrescarResumen();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar jornal');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este jornal?')) return;
    try {
      await jornalesApi.eliminar(id);
      p.setJornales((prev) => prev.filter((j) => j.id !== id));
      toast.success('Jornal eliminado');
      await p.refrescarResumen();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar {p.tipo === 'PLATEO' ? 'Plateo' : 'Poda'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.colabs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{p.nombreColab(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad de palmas *</Label>
            <Input type="number" min="0" value={cantidadPalmas} onChange={(e) => setCantidadPalmas(e.target.value)} />
          </div>
          <div>
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={async (v) => { setLoteId(v); setSubloteId(''); await p.cargarSublotes(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.lotes.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sublote</Label>
            <Select value={subloteId} onValueChange={setSubloteId} disabled={!loteId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {sublotes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={agregar} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar {p.tipo === 'PLATEO' ? 'Plateo' : 'Poda'}
        </Button>

        {lista.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Registros del día</h3>
            {lista.map((j) => (
              <div key={j.id} className="border rounded-lg p-4 bg-muted/20 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.nombreColab(j.empleado)}</p>
                  <p className="text-sm text-muted-foreground">
                    {j.lote?.nombre}{j.sublote ? ` · ${j.sublote.nombre}` : ''} · {j.cantidad_palmas} palmas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-success">{p.formatearMoneda(j.valor_total)}</span>
                  <Button size="sm" variant="ghost" onClick={() => eliminar(j.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Fertilización
// ─────────────────────────────────────────────────────────────

function FertilizacionTab(p: {
  planillaId: number;
  jornales: Jornal[];
  setJornales: (c: Jornal[] | ((prev: Jornal[]) => Jornal[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  insumos: OptionInsumo[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  formatearMoneda: (v: string | number | null | undefined) => string;
  refrescarResumen: () => Promise<void>;
}) {
  const [empleadoId, setEmpleadoId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [subloteId, setSubloteId] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const [cantidadPalmas, setCantidadPalmas] = useState('');
  const [gramos, setGramos] = useState('');
  const [guardando, setGuardando] = useState(false);

  const sublotes = loteId ? (p.sublotesPorLote[Number(loteId)] ?? []) : [];
  const lista = p.jornales.filter((j) => j.tipo === 'FERTILIZACION');

  const reset = () => { setEmpleadoId(''); setLoteId(''); setSubloteId(''); setInsumoId(''); setCantidadPalmas(''); setGramos(''); };

  const agregar = async () => {
    if (!empleadoId || !loteId || !insumoId || !cantidadPalmas || !gramos) {
      toast.error('Todos los campos marcados son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await jornalesApi.crear(p.planillaId, {
        categoria: 'PALMA',
        tipo: 'FERTILIZACION',
        empleado_id: Number(empleadoId),
        lote_id: Number(loteId),
        sublote_id: subloteId ? Number(subloteId) : null,
        cantidad_palmas: Number(cantidadPalmas),
        insumo_id: Number(insumoId),
        gramos_por_palma: Number(gramos),
      });
      p.setJornales((prev) => [...prev, res.data]);
      toast.success('Fertilización registrada');
      reset();
      await p.refrescarResumen();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await jornalesApi.eliminar(id);
      p.setJornales((prev) => prev.filter((j) => j.id !== id));
      toast.success('Eliminado');
      await p.refrescarResumen();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Agregar Fertilización</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.colabs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{p.nombreColab(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de fertilizante *</Label>
            <Select value={insumoId} onValueChange={setInsumoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona insumo" /></SelectTrigger>
              <SelectContent>
                {p.insumos.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={async (v) => { setLoteId(v); setSubloteId(''); await p.cargarSublotes(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.lotes.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sublote</Label>
            <Select value={subloteId} onValueChange={setSubloteId} disabled={!loteId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {sublotes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad de palmas *</Label>
            <Input type="number" min="0" value={cantidadPalmas} onChange={(e) => setCantidadPalmas(e.target.value)} />
          </div>
          <div>
            <Label>Cantidad (gramos por palma) *</Label>
            <Input type="number" min="0" value={gramos} onChange={(e) => setGramos(e.target.value)} />
          </div>
        </div>

        <Button onClick={agregar} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar Fertilización
        </Button>

        {lista.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Registros del día</h3>
            {lista.map((j) => (
              <div key={j.id} className="border rounded-lg p-4 bg-muted/20 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.nombreColab(j.empleado)}</p>
                  <p className="text-sm text-muted-foreground">
                    {j.lote?.nombre}{j.sublote ? ` · ${j.sublote.nombre}` : ''} · {j.insumo?.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {j.cantidad_palmas} palmas · {j.gramos_por_palma} g/palma
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-success">{p.formatearMoneda(j.valor_total)}</span>
                  <Button size="sm" variant="ghost" onClick={() => eliminar(j.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Sanidad
// ─────────────────────────────────────────────────────────────

function SanidadTab(p: {
  planillaId: number;
  jornales: Jornal[];
  setJornales: (c: Jornal[] | ((prev: Jornal[]) => Jornal[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  refrescarResumen: () => Promise<void>;
}) {
  const [empleadoId, setEmpleadoId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [subloteId, setSubloteId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const sublotes = loteId ? (p.sublotesPorLote[Number(loteId)] ?? []) : [];
  const lista = p.jornales.filter((j) => j.tipo === 'SANIDAD');

  const reset = () => { setEmpleadoId(''); setLoteId(''); setSubloteId(''); setDescripcion(''); };

  const agregar = async () => {
    if (!empleadoId || !loteId || !descripcion) {
      toast.error('Empleado, lote y trabajo realizado son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await jornalesApi.crear(p.planillaId, {
        categoria: 'PALMA',
        tipo: 'SANIDAD',
        empleado_id: Number(empleadoId),
        lote_id: Number(loteId),
        sublote_id: subloteId ? Number(subloteId) : null,
        descripcion,
      });
      p.setJornales((prev) => [...prev, res.data]);
      toast.success('Sanidad registrada');
      reset();
      await p.refrescarResumen();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await jornalesApi.eliminar(id);
      p.setJornales((prev) => prev.filter((j) => j.id !== id));
      await p.refrescarResumen();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Agregar Sanidad</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.colabs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{p.nombreColab(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={async (v) => { setLoteId(v); setSubloteId(''); await p.cargarSublotes(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.lotes.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sublote</Label>
            <Select value={subloteId} onValueChange={setSubloteId} disabled={!loteId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {sublotes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Trabajo realizado *</Label>
          <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Aplicación preventiva de fungicida foliar" />
        </div>

        <Button onClick={agregar} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar Sanidad
        </Button>

        {lista.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Registros del día</h3>
            {lista.map((j) => (
              <div key={j.id} className="border rounded-lg p-4 bg-muted/20 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{p.nombreColab(j.empleado)}</p>
                  <p className="text-sm text-muted-foreground">
                    {j.lote?.nombre}{j.sublote ? ` · ${j.sublote.nombre}` : ''}
                  </p>
                  <p className="text-sm mt-1">{j.descripcion}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => eliminar(j.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Otros
// ─────────────────────────────────────────────────────────────

function OtrosTab(p: {
  planillaId: number;
  jornales: Jornal[];
  setJornales: (c: Jornal[] | ((prev: Jornal[]) => Jornal[])) => void;
  colabs: OptionColaborador[];
  lotes: OptionLote[];
  sublotesPorLote: Record<number, OptionSublote[]>;
  cargarSublotes: (id: number) => Promise<void>;
  nombreColab: (e: OptionColaborador | undefined) => string;
  refrescarResumen: () => Promise<void>;
}) {
  const [empleadoId, setEmpleadoId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [subloteId, setSubloteId] = useState('');
  const [nombreTrabajo, setNombreTrabajo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const sublotes = loteId ? (p.sublotesPorLote[Number(loteId)] ?? []) : [];
  const lista = p.jornales.filter((j) => j.tipo === 'OTROS');

  const reset = () => { setEmpleadoId(''); setLoteId(''); setSubloteId(''); setNombreTrabajo(''); setDescripcion(''); };

  const agregar = async () => {
    if (!empleadoId || !loteId || !nombreTrabajo || !descripcion) {
      toast.error('Empleado, lote, nombre y labor son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await jornalesApi.crear(p.planillaId, {
        categoria: 'PALMA',
        tipo: 'OTROS',
        empleado_id: Number(empleadoId),
        lote_id: Number(loteId),
        sublote_id: subloteId ? Number(subloteId) : null,
        nombre_trabajo: nombreTrabajo,
        descripcion,
      });
      p.setJornales((prev) => [...prev, res.data]);
      toast.success('Registrado');
      reset();
      await p.refrescarResumen();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await jornalesApi.eliminar(id);
      p.setJornales((prev) => prev.filter((j) => j.id !== id));
      await p.refrescarResumen();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Agregar Otros</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.colabs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{p.nombreColab(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input value={nombreTrabajo} onChange={(e) => setNombreTrabajo(e.target.value)} placeholder="Ej: Pintura de postes" />
          </div>
          <div>
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={async (v) => { setLoteId(v); setSubloteId(''); await p.cargarSublotes(Number(v)); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {p.lotes.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sublote</Label>
            <Select value={subloteId} onValueChange={setSubloteId} disabled={!loteId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {sublotes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Labor realizada *</Label>
          <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el trabajo realizado" />
        </div>

        <Button onClick={agregar} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar Otros
        </Button>

        {lista.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Registros del día</h3>
            {lista.map((j) => (
              <div key={j.id} className="border rounded-lg p-4 bg-muted/20 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{p.nombreColab(j.empleado)}</p>
                  <p className="text-sm font-medium">{j.nombre_trabajo}</p>
                  <p className="text-sm text-muted-foreground">
                    {j.lote?.nombre}{j.sublote ? ` · ${j.sublote.nombre}` : ''}
                  </p>
                  <p className="text-sm mt-1">{j.descripcion}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => eliminar(j.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel derecho — Resumen
// ─────────────────────────────────────────────────────────────

function ResumenPanel({
  fecha, horaInicio, hubrioLluvia, cantidadLluvia, resumen,
}: {
  fecha: string; horaInicio: string; hubrioLluvia: boolean; cantidadLluvia: string; resumen: Resumen | null;
}) {
  const labores = resumen?.labores;
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fecha</p>
          <p className="font-medium">{fecha || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Inicio de labores</p>
          <p className="font-medium">{horaInicio || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Clima</p>
          <p className="font-medium flex items-center gap-1">
            {hubrioLluvia ? <><CloudRain className="h-4 w-4" /> {cantidadLluvia || '0'} mm</> : <><Sun className="h-4 w-4" /> Sin lluvia</>}
          </p>
        </div>
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Labores</p>
          <div className="space-y-1">
            <LaborRow label="Cosecha"        n={labores?.cosecha} />
            <LaborRow label="Plateo"         n={labores?.plateo} />
            <LaborRow label="Poda"           n={labores?.poda} />
            <LaborRow label="Fertilización"  n={labores?.fertilizacion} />
            <LaborRow label="Sanidad"        n={labores?.sanidad} />
            <LaborRow label="Otros"          n={labores?.otros} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LaborRow({ label, n }: { label: string; n: number | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-medium">{n ?? 0}</span>
    </div>
  );
}