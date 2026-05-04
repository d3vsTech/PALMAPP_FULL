import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
} from 'lucide-react';
import { operacionesApi, cosechasApi, jornalesApi, horasExtraApi, ausenciasApi, selectsApi } from '../../../api/operaciones';

// Tipos de fertilizantes
const fertilizantes = [
  'NPK 15-15-15',
  'Urea',
  'KCl (Cloruro de Potasio)',
  'Sulfato de Magnesio',
  'Boro',
  'Otro'
];

// Tipos de labor para auxiliares
const laboresAuxiliares = [
  'Mantenimiento de vías',
  'Limpieza de instalaciones',
  'Reparación de cercas',
  'Mantenimiento de equipos',
  'Transporte',
  'Otro'
];

// Tipos de ausentismo
const motivosAusentismo = [
  'Enfermedad',
  'Calamidad Doméstica',
  'Permiso Personal',
  'Licencia',
  'Incapacidad',
  'Otro'
];

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

interface TrabajoPlateo {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoPoda {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoFertilizacion {
  id: string;
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
  colaboradores: string[];
  lote: string;
  sublote: string;
  trabajoRealizado: string;
}

interface TrabajoOtros {
  id: string;
  colaboradores: string[];
  nombre: string;
  laborRealizada: string;
  lote: string;
  sublote: string;
}

interface TrabajoAuxiliar {
  id: string;
  nombre: string;
  labor: string;
  otraLabor?: string;
  lugar: string;
  total: number;
  horasExtra: number;
}

interface AusenteRegistro {
  id: string;
  colaboradorId: string;
  motivo: string;
  otroMotivo?: string;
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


/** Extrae el nombre completo de un colaborador del API, probando todos los campos posibles */
function getNombreColab(col: {nombres: string; apellidos: string; nombre_completo: string; _raw?: any}): string {
  // 1. nombre_completo directo
  if (col.nombre_completo) return col.nombre_completo;
  // 2. Campos individuales mapeados
  const partes = [col.nombres, col.apellidos].filter(Boolean);
  if (partes.length > 0) return partes.join(' ');
  // 3. Intentar del objeto crudo directamente
  if (col._raw) {
    const r = col._raw;
    const campos = [r.nombre_completo, r.full_name, r.name,
      r.primer_nombre, r.nombres, r.nombre,
      r.primer_apellido, r.apellidos, r.apellido].filter(Boolean);
    if (campos.length > 0) return campos.slice(0, 2).join(' ');
  }
  return '';
}

export default function NuevaPlanillaWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: idParam } = useParams<{ id?: string }>();
  const isEditMode = Boolean(idParam);
  const [etapaActual, setEtapaActual] = useState(1);

  // ── Estado para planilla ID y loading ─────────────────────────────────────
  // En modo edición, planillaId arranca con el id de la URL para que los POSTs
  // de tarjetas vayan directo a /operaciones/{id}/jornales sin re-crear la planilla.
  const [planillaId, setPlanillaId] = useState<number | null>(
    idParam ? Number(idParam) : null
  );
  const [guardando, setGuardando] = useState(false);
  const [cargandoPlanilla, setCargandoPlanilla] = useState(isEditMode);
  const [resumen, setResumen] = useState<import('../../../api/operaciones').Resumen | null>(null);

  const cargarResumen = async (pid: number) => {
    try {
      const r = await operacionesApi.resumen(pid);
      setResumen(r.data);
    } catch {}
  };

  // ── Datos API (mismo shape que mockData para compatibilidad con JSX) ───────
  const [colaboradores, setColaboradores] = useState<Array<{id: string; nombres: string; apellidos: string; nombre_completo: string; _raw?: any}>>([]);
  const [lotesData, setLotesData] = useState<Array<{id: string; nombre: string}>>([]);
  const [sublotes, setSublotes] = useState<Array<{id: string; nombre: string; loteId: string; cantidadPalmas: number}>>([]);

  // Mapas ID por nombre para save
  const [insumosMap, setInsumosMap] = useState<Map<string, number>>(new Map());
  const [laboresMap, setLaboresMap] = useState<Map<string, number>>(new Map());
  const [motivosMap, setMotivosMap] = useState<Map<string, number>>(new Map());
  const [tiposHoraExtraMap, setTiposHoraExtraMap] = useState<Map<string, number>>(new Map());
  // Arrays para los selects del JSX (reemplazan los hardcodeados)
  const [insumosLista,        setInsumosLista]        = useState<string[]>([]);
  const [laboresLista,        setLaboresLista]        = useState<string[]>([]);
  const [motivosLista,        setMotivosLista]        = useState<string[]>([]);
  const [tiposHoraExtraLista, setTiposHoraExtraLista] = useState<string[]>([]);

  // ── Carga inicial de selects desde API ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [colRes, lotRes, inRes, labRes, motRes, tipoRes] = await Promise.all([
          selectsApi.colaboradores(),
          selectsApi.lotes(),
          selectsApi.insumos(),
          selectsApi.labores(),
          selectsApi.motivosAusencia(),
          selectsApi.tiposHoraExtra(),
        ]);
        setColaboradores(
          (colRes.data || []).map((c: any) => {
            // Intentar todos los campos conocidos
            const nombres   = c.primer_nombre   ?? c.nombres   ?? c.nombre   ?? c.first_name  ?? '';
            const apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? c.last_name   ?? '';
            // nombre_completo: puede venir directo del API o se construye
            const nombreCompleto = c.nombre_completo ?? c.full_name ?? c.name ??
              (nombres || apellidos ? `${nombres} ${apellidos}`.trim() : '');
            return {
              id: String(c.id),
              nombres,
              apellidos,
              nombre_completo: nombreCompleto,
              _raw: c,   // objeto crudo para debug
            };
          })
        );
        const lotes = (lotRes.data || []).map((l: any) => ({ id: String(l.id), nombre: l.nombre }));
        setLotesData(lotes);
        // Cargar sublotes en paralelo por cada lote
        const subPromises = lotes.map(async (l) => {
          try {
            const sr = await selectsApi.sublotes({ lote_id: Number(l.id) });
            return (sr.data || []).map((s: any) => {
              // Aceptamos varias variantes del campo de palmas para máxima compatibilidad:
              // - cantidad_palmas (oficial según API_OPERACIONES.md §8)
              // - palmas, total_palmas, numero_palmas (variantes legacy)
              // - sublote.lote.predio.cantidad_palmas (fallback al predio si el sublote no lo trae)
              const palmasRaw =
                s.cantidad_palmas ??
                s.palmas ??
                s.total_palmas ??
                s.numero_palmas ??
                s.cantidadPalmas ??
                s.lote?.predio?.cantidad_palmas ??
                s.predio?.cantidad_palmas ??
                0;
              return {
                id: String(s.id),
                nombre: s.nombre,
                loteId: l.id,
                cantidadPalmas: Number(palmasRaw) || 0,
              };
            });
          } catch (err) {
            console.warn(`[Operaciones] Error cargando sublotes del lote ${l.id}`, err);
            return [];
          }
        });
        const allSubs = (await Promise.all(subPromises)).flat();
        // Diagnóstico: si TODOS los sublotes traen cantidadPalmas=0, probablemente
        // el backend no está devolviendo el campo. Lo logueamos una sola vez para debug.
        if (allSubs.length > 0 && allSubs.every(s => s.cantidadPalmas === 0)) {
          console.warn('[Operaciones] Ningún sublote trae cantidad_palmas. Revisa la respuesta del API:',
            'Esperado: { id, nombre, lote_id, cantidad_palmas }');
        }
        setSublotes(allSubs);
        const insumos = (inRes.data || []).map((i: any) => ({ nombre: i.nombre as string, id: i.id as number }));
        const labores = (labRes.data || []).map((l: any) => ({ nombre: l.nombre as string, id: l.id as number }));
        const motivos = (motRes.data || []).map((m: any) => ({ nombre: m.nombre as string, id: m.id as number }));
        const tipos   = (tipoRes.data || []).map((t: any) => ({ nombre: t.nombre as string, id: t.id as number }));

        setInsumosMap(new Map(insumos.map(x => [x.nombre, x.id] as [string, number])));
        setLaboresMap(new Map(labores.map(x => [x.nombre, x.id] as [string, number])));
        setMotivosMap(new Map(motivos.map(x => [x.nombre, x.id] as [string, number])));
        setTiposHoraExtraMap(new Map(tipos.map(x => [x.nombre, x.id] as [string, number])));

        setInsumosLista(insumos.map(x => x.nombre));
        setLaboresLista(labores.map(x => x.nombre));
        setMotivosLista(motivos.map(x => x.nombre));
        setTiposHoraExtraLista(tipos.map(x => x.nombre));
      } catch (e) {
        console.warn('Error cargando selects:', e);
      }
    })();
  }, []);

  // Información General
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  // Elaborado por: se llena automáticamente con el nombre del usuario logueado y queda bloqueado
  const [elaboradoPor, setElaboradoPor] = useState(user?.nombre ?? '');
  const [huboLluvia, setHuboLluvia] = useState<'si' | 'no' | ''>('');
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('06:00');

  // Si el user llega tarde (carga async del AuthContext) sincronizamos
  useEffect(() => {
    if (user?.nombre && !elaboradoPor) {
      setElaboradoPor(user.nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.nombre]);
  
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
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);
  const [horaExtraEnEdicion, setHoraExtraEnEdicion] = useState<HoraExtra | null>(null);

  // ── Prefill desde API en modo edición ─────────────────────────────────────
  // Carga todos los datos existentes de la planilla y los inyecta en los mismos
  // estados que usa el flujo de creación. El JSX queda igual al de "Nueva Planilla"
  // y muestra cards/tarjetas con los datos pre-cargados, listos para editar.
  useEffect(() => {
    if (!isEditMode || !idParam) return;
    let cancelled = false;
    (async () => {
      setCargandoPlanilla(true);
      try {
        const res = await operacionesApi.ver(Number(idParam));
        if (cancelled) return;
        const p: any = res.data ?? {};

        // ── Información General ──
        const fechaRaw = p.fecha ?? '';
        const fechaNorm = typeof fechaRaw === 'string'
          ? (fechaRaw.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '')
          : '';
        if (fechaNorm) setFecha(fechaNorm);
        if (p.hora_inicio) setInicioLabores(String(p.hora_inicio).slice(0, 5));

        // hubo_lluvia: el API puede devolver true/false, 0/1, "0"/"1", "true"/"false".
        // Convertimos a booleano de forma robusta antes de mapear a 'si' / 'no'.
        const lluviaRaw = p.hubo_lluvia;
        const lluviaBool =
          lluviaRaw === true || lluviaRaw === 1 || lluviaRaw === '1' ||
          (typeof lluviaRaw === 'string' && lluviaRaw.toLowerCase() === 'true');
        setHuboLluvia(lluviaBool ? 'si' : 'no');

        // Cantidad de lluvia (mm)
        if (p.cantidad_lluvia != null) {
          const n = parseFloat(String(p.cantidad_lluvia));
          setLluvia(Number.isFinite(n) && n > 0 ? String(n) : '');
        } else {
          setLluvia('');
        }
        setObservaciones(p.observaciones ?? '');
        // Elaborado por: el API devuelve el campo con varios nombres distintos según el endpoint
        const elaboradoApi =
          p.creado_por_rel?.name ??
          p.creado_por_rel?.nombre ??
          p.creado_por_rel?.full_name ??
          p.creado_por_rel?.nombre_completo ??
          p.creadoPor?.name ??
          p.creado_por?.name ??
          p.creado_por?.nombre ??
          p.elaborado_por ??
          p.user?.name ??
          '';
        if (elaboradoApi) setElaboradoPor(elaboradoApi);

        // ── Cosechas → trabajosCosecha ──
        setTrabajosCosecha(
          (p.cosechas ?? []).map((c: any) => ({
            id: String(c.id),
            colaboradores: (c.cuadrilla ?? []).map((q: any) => String(q.empleado_id)),
            lote: c.lote_id != null ? String(c.lote_id) : '',
            sublote: c.sublote_id != null ? String(c.sublote_id) : '',
            gajosRecogidos: Number(c.gajos_reportados ?? 0),
            kilos: c.peso_confirmado != null ? Number(c.peso_confirmado) : 0,
          }))
        );

        // ── Jornales: agrupar por categoría/tipo ──
        const jornales = (p.jornales ?? []) as any[];

        // PALMA → uno por colaborador (se persisten así, pero al editar agrupar
        // sigue siendo opcional. Por simplicidad, una tarjeta por jornal).
        const porTipo = (tipo: string) => jornales.filter(j => j.categoria === 'PALMA' && j.tipo === tipo);

        setTrabajosPlateo(
          porTipo('PLATEO').map(j => ({
            id: String(j.id),
            colaboradores: [String(j.empleado_id)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            numeroPalmas: Number(j.cantidad_palmas ?? 0),
          }))
        );
        setTrabajosPoda(
          porTipo('PODA').map(j => ({
            id: String(j.id),
            colaboradores: [String(j.empleado_id)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            numeroPalmas: Number(j.cantidad_palmas ?? 0),
          }))
        );
        setTrabajosFertilizacion(
          porTipo('FERTILIZACION').map(j => ({
            id: String(j.id),
            colaboradores: [String(j.empleado_id)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            palmas: Number(j.cantidad_palmas ?? 0),
            tipoFertilizante: j.insumo?.nombre ?? '',
            otroFertilizante: '',
            cantidadGramos: Number(j.gramos_por_palma ?? 0),
          }))
        );
        setTrabajosSanidad(
          porTipo('SANIDAD').map(j => ({
            id: String(j.id),
            colaboradores: [String(j.empleado_id)],
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
            trabajoRealizado: j.descripcion ?? '',
          }))
        );
        setTrabajosOtros(
          porTipo('OTROS').map(j => ({
            id: String(j.id),
            colaboradores: [String(j.empleado_id)],
            nombre: j.nombre_trabajo ?? '',
            laborRealizada: j.descripcion ?? '',
            lote: j.lote_id != null ? String(j.lote_id) : '',
            sublote: j.sublote_id != null ? String(j.sublote_id) : '',
          }))
        );

        // FINCA (Labores de Finca / Auxiliares)
        const fincas = jornales.filter(j => j.categoria === 'FINCA');
        setTrabajosAuxiliares(
          fincas.map(j => {
            const nombre = j.empleado
              ? `${j.empleado.primer_nombre ?? ''} ${j.empleado.primer_apellido ?? ''}`.trim()
              : '';
            return {
              id: String(j.id),
              nombre,
              labor: j.labor?.nombre ?? '',
              otraLabor: '',
              lugar: j.ubicacion ?? '',
              total: Number(j.valor_total ?? 0),
              horasExtra: 0,
            };
          })
        );

        // ── Horas Extras ──
        setHorasExtras(
          (p.horas_extra ?? p.horasExtra ?? []).map((h: any) => ({
            id: String(h.id),
            colaboradorId: String(h.empleado_id),
            tipoHora: h.tipoHoraExtra?.nombre ?? h.tipo_hora_extra?.nombre ?? '',
            numeroHoras: Number(h.cantidad_horas ?? 0),
            observacion: h.observacion ?? '',
          }))
        );

        // ── Ausencias ──
        setAusentes(
          (p.ausencias ?? []).map((a: any) => ({
            id: String(a.id),
            colaboradorId: String(a.empleado_id),
            motivo: a.motivo_ausencia?.nombre ?? '',
            otroMotivo: a.motivo ?? '',
          }))
        );

        // Resumen lateral
        try {
          const r = await operacionesApi.resumen(Number(idParam));
          if (!cancelled) setResumen(r.data);
        } catch {}
      } catch (err: any) {
        if (!cancelled) {
          alert(err?.message ?? 'Error al cargar la planilla');
        }
      } finally {
        if (!cancelled) setCargandoPlanilla(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam, isEditMode]);

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

  const siguienteEtapa = async () => {
    // Paso 1 → 2: crear planilla en API antes de avanzar
    if (etapaActual === 1) {
      if (!planillaId) {
        setGuardando(true);
        try {
          const res = await operacionesApi.crear({
            fecha,
            elaborado_por: elaboradoPor || undefined,
            hora_inicio: inicioLabores || undefined,
            hubo_lluvia: huboLluvia === 'si',
            cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
            observaciones: observaciones || null,
          });
          setPlanillaId(res.data.id);
          await cargarResumen(res.data.id);
        } catch (err: any) {
          alert(err?.message ?? 'Error al crear la planilla');
          return;
        } finally {
          setGuardando(false);
        }
      } else {
        // Re-editar info general si ya existe
        try {
          await operacionesApi.editar(planillaId, {
            fecha: fecha || undefined,
            elaborado_por: elaboradoPor || undefined,
            hora_inicio: inicioLabores || undefined,
            hubo_lluvia: huboLluvia === 'si',
            cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
            observaciones: observaciones || null,
          });
          await cargarResumen(planillaId);
        } catch {}
      }
    }
    if (etapaActual < ETAPAS.length) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const guardarTodo = async () => {
    setGuardando(true);
    try {
      if (!planillaId) {
        // Fallback: crear la planilla si no se creó al avanzar paso 1
        const planRes = await operacionesApi.crear({
          fecha,
          elaborado_por: elaboradoPor || undefined,
          hora_inicio: inicioLabores || undefined,
          hubo_lluvia: huboLluvia === 'si',
          cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
          observaciones: observaciones || null,
        });
        setPlanillaId(planRes.data.id);

        // Enviar todos los datos acumulados en el estado local
        const pid = planRes.data.id;

        for (const t of trabajosCosecha) {
          if (!t.lote || t.colaboradores.length === 0) continue;
          try { await cosechasApi.crear(pid, { lote_id: parseInt(t.lote), sublote_id: t.sublote ? parseInt(t.sublote) : undefined, gajos_reportados: t.gajosRecogidos || 0, peso_confirmado: t.kilos || null, cuadrilla: t.colaboradores.map(c => ({ empleado_id: parseInt(c) })) }); } catch {}
        }
        for (const t of trabajosPlateo) {
          for (const cid of t.colaboradores) {
            try { await jornalesApi.crear(pid, { categoria: 'PALMA', tipo: 'PLATEO', empleado_id: parseInt(cid), lote_id: t.lote ? parseInt(t.lote) : null, sublote_id: t.sublote ? parseInt(t.sublote) : null, cantidad_palmas: t.numeroPalmas || 0 }); } catch {}
          }
        }
        for (const t of trabajosPoda) {
          for (const cid of t.colaboradores) {
            try { await jornalesApi.crear(pid, { categoria: 'PALMA', tipo: 'PODA', empleado_id: parseInt(cid), lote_id: t.lote ? parseInt(t.lote) : null, sublote_id: t.sublote ? parseInt(t.sublote) : null, cantidad_palmas: t.numeroPalmas || 0 }); } catch {}
          }
        }
        for (const t of trabajosFertilizacion) {
          // Resolver insumo_id. Si el usuario marcó "Otro", crearlo on-the-fly.
          let insumoId: number | undefined;
          if (t.tipoFertilizante === 'Otro') {
            const nombreNuevo = (t.otroFertilizante || '').trim();
            if (!nombreNuevo) continue;
            const matchLocal = Array.from(insumosMap.entries())
              .find(([n]) => n.toLowerCase() === nombreNuevo.toLowerCase());
            if (matchLocal) {
              insumoId = matchLocal[1];
            } else {
              try {
                const res = await selectsApi.crearInsumo(nombreNuevo);
                insumoId = res.data.id;
                setInsumosMap(prev => new Map(prev).set(res.data.nombre, res.data.id));
              } catch (err: any) {
                // 409 INSUMO_DUPLICADO o cualquier otro error: saltar la tarjeta
                continue;
              }
            }
          } else {
            insumoId = insumosMap.get(t.tipoFertilizante);
          }
          if (!insumoId) continue;
          for (const cid of t.colaboradores) {
            try { await jornalesApi.crear(pid, { categoria: 'PALMA', tipo: 'FERTILIZACION', empleado_id: parseInt(cid), lote_id: t.lote ? parseInt(t.lote) : null, sublote_id: t.sublote ? parseInt(t.sublote) : null, cantidad_palmas: t.palmas || 0, insumo_id: insumoId, gramos_por_palma: t.cantidadGramos || 0 }); } catch {}
          }
        }
        for (const t of trabajosSanidad) {
          for (const cid of t.colaboradores) {
            try { await jornalesApi.crear(pid, { categoria: 'PALMA', tipo: 'SANIDAD', empleado_id: parseInt(cid), lote_id: t.lote ? parseInt(t.lote) : null, sublote_id: t.sublote ? parseInt(t.sublote) : null, descripcion: t.trabajoRealizado || 'Sanidad' }); } catch {}
          }
        }
        for (const t of trabajosOtros) {
          for (const cid of t.colaboradores) {
            try { await jornalesApi.crear(pid, { categoria: 'PALMA', tipo: 'OTROS', empleado_id: parseInt(cid), lote_id: t.lote ? parseInt(t.lote) : null, sublote_id: t.sublote ? parseInt(t.sublote) : null, nombre_trabajo: t.nombre || 'Otros', descripcion: t.laborRealizada || 'Realizado' }); } catch {}
          }
        }
        for (const t of trabajosAuxiliares) {
          if (!t.labor) continue;
          const laborKey = t.labor === 'Otro' ? (t.otraLabor||'') : t.labor;
          const laborId = laboresMap.get(laborKey) ?? laboresMap.get(t.labor);
          if (!laborId) continue;
          const nombreNorm = (t.nombre||'').toLowerCase().trim();
          const colab = nombreNorm ? colaboradores.find(c => `${c.nombres} ${c.apellidos}`.toLowerCase().includes(nombreNorm)) : null;
          if (!colab) continue;
          try { await jornalesApi.crear(pid, { categoria: 'FINCA', labor_id: laborId, empleado_id: parseInt(colab.id), ubicacion: t.lugar || undefined }); } catch {}
        }
        for (const h of horasExtras) {
          if (!h.colaboradorId || !h.tipoHora || !h.numeroHoras) continue;
          let tipoId = tiposHoraExtraMap.get(h.tipoHora);
          if (!tipoId) { for (const [n,i] of tiposHoraExtraMap.entries()) { if (n.toLowerCase().includes(h.tipoHora.toLowerCase())) { tipoId=i; break; } } }
          if (!tipoId) continue;
          try { await horasExtraApi.crear(pid, { empleado_id: parseInt(h.colaboradorId), tipo_hora_extra_id: tipoId, cantidad_horas: h.numeroHoras, observacion: h.observacion||undefined }); } catch {}
        }
        for (const a of ausentes) {
          if (!a.colaboradorId) continue;
          let motivoId = motivosMap.get(a.motivo);
          if (!motivoId) { for (const [n,i] of motivosMap.entries()) { if (n.toLowerCase().includes(a.motivo.toLowerCase())) { motivoId=i; break; } } }
          if (!motivoId) continue;
          try { await ausenciasApi.crear(pid, { empleado_id: parseInt(a.colaboradorId), motivo_ausencia_id: motivoId, motivo: a.otroMotivo || a.motivo || '' }); } catch {}
        }
      } else if (isEditMode) {
        // En modo edición: persistir cambios pendientes de Info General
        // (las tarjetas de cosecha/jornales/horas-extra/ausencias ya se persisten
        //  individualmente al pulsar "Guardar" en cada tarjeta).
        try {
          await operacionesApi.editar(planillaId, {
            fecha: fecha || undefined,
            elaborado_por: elaboradoPor || undefined,
            hora_inicio: inicioLabores || undefined,
            hubo_lluvia: huboLluvia === 'si',
            cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
            observaciones: observaciones || null,
          });
        } catch (err: any) {
          // No bloqueamos la navegación si falla — el usuario tiene la opción
          // de re-editar info general explícitamente desde el paso 1.
          console.warn('No se pudo actualizar info general:', err?.message);
        }
      }

      // Todos los datos ya están guardados, solo navegar
      navigate('/operaciones');
    } catch (err: any) {
      alert(err?.message ?? 'Error al guardar la planilla. Intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

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

  const guardarCosecha = async () => {
    if (!cosechaEnEdicion || !planillaId) {
      // Sin planilla creada: solo estado local (se enviará en guardarTodo)
      if (cosechaEnEdicion) {
        setTrabajosCosecha([cosechaEnEdicion, ...trabajosCosecha]);
        setCosechaEnEdicion(null);
      }
      return;
    }
    if (!cosechaEnEdicion.lote || cosechaEnEdicion.colaboradores.length === 0) {
      alert('Selecciona al menos un colaborador y un lote');
      return;
    }
    // Detectar si es una tarjeta existente (id numérico) o nueva (con prefijo "cosecha-")
    const esExistente = !cosechaEnEdicion.id.includes('-');
    try {
      const payload = {
        lote_id: parseInt(cosechaEnEdicion.lote),
        sublote_id: cosechaEnEdicion.sublote ? parseInt(cosechaEnEdicion.sublote) : undefined,
        gajos_reportados: cosechaEnEdicion.gajosRecogidos || 0,
        peso_confirmado: cosechaEnEdicion.kilos || null,
        cuadrilla: cosechaEnEdicion.colaboradores.map(cid => ({ empleado_id: parseInt(cid) })),
      };
      if (esExistente) {
        await cosechasApi.editar(parseInt(cosechaEnEdicion.id), payload);
        setTrabajosCosecha(prev => prev.map(t => t.id === cosechaEnEdicion.id ? cosechaEnEdicion : t));
      } else {
        const res = await cosechasApi.crear(planillaId, payload);
        setTrabajosCosecha([{ ...cosechaEnEdicion, id: String(res.data.id) }, ...trabajosCosecha]);
      }
      setCosechaEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) {
      alert(err?.message ?? 'Error al guardar cosecha');
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

  const guardarPlateo = async () => {
    if (!plateoEnEdicion || !planillaId) {
      if (plateoEnEdicion) { setTrabajosPlateo([plateoEnEdicion, ...trabajosPlateo]); setPlateoEnEdicion(null); }
      return;
    }
    if (!plateoEnEdicion.colaboradores.length) { alert('Selecciona al menos un colaborador'); return; }
    const esExistente = !plateoEnEdicion.id.includes('-');
    try {
      if (esExistente) {
        // Tarjeta existente: PUT al primer colaborador, POST para los adicionales
        const [primero, ...adicionales] = plateoEnEdicion.colaboradores;
        await jornalesApi.editar(parseInt(plateoEnEdicion.id), {
          categoria: 'PALMA', tipo: 'PLATEO', empleado_id: parseInt(primero),
          lote_id: plateoEnEdicion.lote ? parseInt(plateoEnEdicion.lote) : null,
          sublote_id: plateoEnEdicion.sublote ? parseInt(plateoEnEdicion.sublote) : null,
          cantidad_palmas: plateoEnEdicion.numeroPalmas || 0,
        });
        const nuevasTarjetas: TrabajoPlateo[] = [];
        for (const cid of adicionales) {
          const res = await jornalesApi.crear(planillaId, {
            categoria: 'PALMA', tipo: 'PLATEO', empleado_id: parseInt(cid),
            lote_id: plateoEnEdicion.lote ? parseInt(plateoEnEdicion.lote) : null,
            sublote_id: plateoEnEdicion.sublote ? parseInt(plateoEnEdicion.sublote) : null,
            cantidad_palmas: plateoEnEdicion.numeroPalmas || 0,
          });
          nuevasTarjetas.push({
            id: String(res.data.id),
            colaboradores: [cid],
            lote: plateoEnEdicion.lote, sublote: plateoEnEdicion.sublote,
            numeroPalmas: plateoEnEdicion.numeroPalmas,
          });
        }
        setTrabajosPlateo(prev => [
          // Reemplazar la tarjeta editada con sólo el primer colaborador
          ...prev.map(t => t.id === plateoEnEdicion.id ? { ...plateoEnEdicion, colaboradores: [primero] } : t),
          ...nuevasTarjetas,
        ]);
      } else {
        for (const cid of plateoEnEdicion.colaboradores) {
          await jornalesApi.crear(planillaId, {
            categoria: 'PALMA', tipo: 'PLATEO', empleado_id: parseInt(cid),
            lote_id: plateoEnEdicion.lote ? parseInt(plateoEnEdicion.lote) : null,
            sublote_id: plateoEnEdicion.sublote ? parseInt(plateoEnEdicion.sublote) : null,
            cantidad_palmas: plateoEnEdicion.numeroPalmas || 0,
          });
        }
        setTrabajosPlateo([plateoEnEdicion, ...trabajosPlateo]);
      }
      setPlateoEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar plateo'); }
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

  const guardarPoda = async () => {
    if (!podaEnEdicion || !planillaId) {
      if (podaEnEdicion) { setTrabajosPoda([podaEnEdicion, ...trabajosPoda]); setPodaEnEdicion(null); }
      return;
    }
    if (!podaEnEdicion.colaboradores.length) { alert('Selecciona al menos un colaborador'); return; }
    const esExistente = !podaEnEdicion.id.includes('-');
    try {
      if (esExistente) {
        const [primero, ...adicionales] = podaEnEdicion.colaboradores;
        await jornalesApi.editar(parseInt(podaEnEdicion.id), {
          categoria: 'PALMA', tipo: 'PODA', empleado_id: parseInt(primero),
          lote_id: podaEnEdicion.lote ? parseInt(podaEnEdicion.lote) : null,
          sublote_id: podaEnEdicion.sublote ? parseInt(podaEnEdicion.sublote) : null,
          cantidad_palmas: podaEnEdicion.numeroPalmas || 0,
        });
        const nuevasTarjetas: TrabajoPoda[] = [];
        for (const cid of adicionales) {
          const res = await jornalesApi.crear(planillaId, {
            categoria: 'PALMA', tipo: 'PODA', empleado_id: parseInt(cid),
            lote_id: podaEnEdicion.lote ? parseInt(podaEnEdicion.lote) : null,
            sublote_id: podaEnEdicion.sublote ? parseInt(podaEnEdicion.sublote) : null,
            cantidad_palmas: podaEnEdicion.numeroPalmas || 0,
          });
          nuevasTarjetas.push({
            id: String(res.data.id), colaboradores: [cid],
            lote: podaEnEdicion.lote, sublote: podaEnEdicion.sublote,
            numeroPalmas: podaEnEdicion.numeroPalmas,
          });
        }
        setTrabajosPoda(prev => [
          ...prev.map(t => t.id === podaEnEdicion.id ? { ...podaEnEdicion, colaboradores: [primero] } : t),
          ...nuevasTarjetas,
        ]);
      } else {
        for (const cid of podaEnEdicion.colaboradores) {
          await jornalesApi.crear(planillaId, {
            categoria: 'PALMA', tipo: 'PODA', empleado_id: parseInt(cid),
            lote_id: podaEnEdicion.lote ? parseInt(podaEnEdicion.lote) : null,
            sublote_id: podaEnEdicion.sublote ? parseInt(podaEnEdicion.sublote) : null,
            cantidad_palmas: podaEnEdicion.numeroPalmas || 0,
          });
        }
        setTrabajosPoda([podaEnEdicion, ...trabajosPoda]);
      }
      setPodaEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar poda'); }
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

  const guardarFertilizacion = async () => {
    if (!fertilizacionEnEdicion || !planillaId) {
      if (fertilizacionEnEdicion) { setTrabajosFertilizacion([fertilizacionEnEdicion, ...trabajosFertilizacion]); setFertilizacionEnEdicion(null); }
      return;
    }
    if (!fertilizacionEnEdicion.colaboradores.length) { alert('Selecciona al menos un colaborador'); return; }

    // 1) Resolver insumo_id. Si el usuario eligió "Otro", crear el insumo on-the-fly
    //    con POST /operaciones/insumos. Si el nombre ya existe (409 INSUMO_DUPLICADO),
    //    pedir al usuario que lo seleccione del dropdown en lugar de crearlo.
    let insumoId: number | undefined;

    if (fertilizacionEnEdicion.tipoFertilizante === 'Otro') {
      const nombreNuevo = (fertilizacionEnEdicion.otroFertilizante || '').trim();
      if (!nombreNuevo) {
        alert('Ingresa el nombre del fertilizante.');
        return;
      }
      // Si ya existe en el mapa local (case-insensitive), reutilizarlo
      const matchLocal = Array.from(insumosMap.entries())
        .find(([n]) => n.toLowerCase() === nombreNuevo.toLowerCase());
      if (matchLocal) {
        insumoId = matchLocal[1];
        // Sincronizar el campo para que la card guardada muestre el nombre canónico
        fertilizacionEnEdicion.otroFertilizante = matchLocal[0];
      } else {
        try {
          const res = await selectsApi.crearInsumo(nombreNuevo);
          insumoId = res.data.id;
          // Refrescar mapa y lista para que aparezca en el dropdown sin recargar
          setInsumosMap(prev => new Map(prev).set(res.data.nombre, res.data.id));
          setInsumosLista(prev => prev.includes(res.data.nombre) ? prev : [...prev.filter(x => x !== 'Otro'), res.data.nombre, 'Otro']);
        } catch (err: any) {
          if (err?.code === 'INSUMO_DUPLICADO') {
            alert(`Ya existe un fertilizante con el nombre "${nombreNuevo}". Selecciónalo del dropdown en lugar de crearlo nuevamente.`);
          } else {
            alert(err?.message ?? 'No se pudo crear el fertilizante');
          }
          return;
        }
      }
    } else {
      insumoId = insumosMap.get(fertilizacionEnEdicion.tipoFertilizante || '');
    }

    if (!insumoId) { alert('Insumo no encontrado. Verifica el tipo de fertilizante.'); return; }

    const esExistente = !fertilizacionEnEdicion.id.includes('-');
    const baseFert = {
      categoria: 'PALMA' as const, tipo: 'FERTILIZACION' as const,
      lote_id: fertilizacionEnEdicion.lote ? parseInt(fertilizacionEnEdicion.lote) : null,
      sublote_id: fertilizacionEnEdicion.sublote ? parseInt(fertilizacionEnEdicion.sublote) : null,
      cantidad_palmas: fertilizacionEnEdicion.palmas || 0,
      insumo_id: insumoId,
      gramos_por_palma: fertilizacionEnEdicion.cantidadGramos || 0,
    };
    try {
      if (esExistente) {
        const [primero, ...adicionales] = fertilizacionEnEdicion.colaboradores;
        await jornalesApi.editar(parseInt(fertilizacionEnEdicion.id), {
          ...baseFert, empleado_id: parseInt(primero),
        });
        const nuevasTarjetas: TrabajoFertilizacion[] = [];
        for (const cid of adicionales) {
          const res = await jornalesApi.crear(planillaId, { ...baseFert, empleado_id: parseInt(cid) });
          nuevasTarjetas.push({
            ...fertilizacionEnEdicion,
            id: String(res.data.id),
            colaboradores: [cid],
          });
        }
        setTrabajosFertilizacion(prev => [
          ...prev.map(t => t.id === fertilizacionEnEdicion.id ? { ...fertilizacionEnEdicion, colaboradores: [primero] } : t),
          ...nuevasTarjetas,
        ]);
      } else {
        for (const cid of fertilizacionEnEdicion.colaboradores) {
          await jornalesApi.crear(planillaId, { ...baseFert, empleado_id: parseInt(cid) });
        }
        setTrabajosFertilizacion([fertilizacionEnEdicion, ...trabajosFertilizacion]);
      }
      setFertilizacionEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar fertilización'); }
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
      trabajoRealizado: ''
    });
  };

  const guardarSanidad = async () => {
    if (!sanidadEnEdicion || !planillaId) {
      if (sanidadEnEdicion) { setTrabajosSanidad([sanidadEnEdicion, ...trabajosSanidad]); setSanidadEnEdicion(null); }
      return;
    }
    if (!sanidadEnEdicion.colaboradores.length) { alert('Selecciona al menos un colaborador'); return; }
    const esExistente = !sanidadEnEdicion.id.includes('-');
    const baseSan = {
      categoria: 'PALMA' as const, tipo: 'SANIDAD' as const,
      lote_id: sanidadEnEdicion.lote ? parseInt(sanidadEnEdicion.lote) : null,
      sublote_id: sanidadEnEdicion.sublote ? parseInt(sanidadEnEdicion.sublote) : null,
      descripcion: sanidadEnEdicion.trabajoRealizado || 'Trabajo de sanidad',
    };
    try {
      if (esExistente) {
        const [primero, ...adicionales] = sanidadEnEdicion.colaboradores;
        await jornalesApi.editar(parseInt(sanidadEnEdicion.id), { ...baseSan, empleado_id: parseInt(primero) });
        const nuevasTarjetas: TrabajoSanidad[] = [];
        for (const cid of adicionales) {
          const res = await jornalesApi.crear(planillaId, { ...baseSan, empleado_id: parseInt(cid) });
          nuevasTarjetas.push({ ...sanidadEnEdicion, id: String(res.data.id), colaboradores: [cid] });
        }
        setTrabajosSanidad(prev => [
          ...prev.map(t => t.id === sanidadEnEdicion.id ? { ...sanidadEnEdicion, colaboradores: [primero] } : t),
          ...nuevasTarjetas,
        ]);
      } else {
        for (const cid of sanidadEnEdicion.colaboradores) {
          await jornalesApi.crear(planillaId, { ...baseSan, empleado_id: parseInt(cid) });
        }
        setTrabajosSanidad([sanidadEnEdicion, ...trabajosSanidad]);
      }
      setSanidadEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar sanidad'); }
  };

  const cancelarSanidad = () => {
    setSanidadEnEdicion(null);
  };

  const agregarOtros = () => {
    setOtrosEnEdicion({
      id: `otros-${Date.now()}`,
      colaboradores: [],
      nombre: '',
      laborRealizada: '',
      lote: '',
      sublote: ''
    });
  };

  const guardarOtros = async () => {
    if (!otrosEnEdicion || !planillaId) {
      if (otrosEnEdicion) { setTrabajosOtros([otrosEnEdicion, ...trabajosOtros]); setOtrosEnEdicion(null); }
      return;
    }
    if (!otrosEnEdicion.colaboradores.length) { alert('Selecciona al menos un colaborador'); return; }
    const esExistente = !otrosEnEdicion.id.includes('-');
    const baseOtros = {
      categoria: 'PALMA' as const, tipo: 'OTROS' as const,
      lote_id: otrosEnEdicion.lote ? parseInt(otrosEnEdicion.lote) : null,
      sublote_id: otrosEnEdicion.sublote ? parseInt(otrosEnEdicion.sublote) : null,
      nombre_trabajo: otrosEnEdicion.nombre || 'Otros',
      descripcion: otrosEnEdicion.laborRealizada || 'Trabajo realizado',
    };
    try {
      if (esExistente) {
        const [primero, ...adicionales] = otrosEnEdicion.colaboradores;
        await jornalesApi.editar(parseInt(otrosEnEdicion.id), { ...baseOtros, empleado_id: parseInt(primero) });
        const nuevasTarjetas: TrabajoOtros[] = [];
        for (const cid of adicionales) {
          const res = await jornalesApi.crear(planillaId, { ...baseOtros, empleado_id: parseInt(cid) });
          nuevasTarjetas.push({ ...otrosEnEdicion, id: String(res.data.id), colaboradores: [cid] });
        }
        setTrabajosOtros(prev => [
          ...prev.map(t => t.id === otrosEnEdicion.id ? { ...otrosEnEdicion, colaboradores: [primero] } : t),
          ...nuevasTarjetas,
        ]);
      } else {
        for (const cid of otrosEnEdicion.colaboradores) {
          await jornalesApi.crear(planillaId, { ...baseOtros, empleado_id: parseInt(cid) });
        }
        setTrabajosOtros([otrosEnEdicion, ...trabajosOtros]);
      }
      setOtrosEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar otros'); }
  };

  const cancelarOtros = () => {
    setOtrosEnEdicion(null);
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

  const guardarHoraExtra = async () => {
    if (!horaExtraEnEdicion || !planillaId) {
      if (horaExtraEnEdicion) { setHorasExtras([horaExtraEnEdicion, ...horasExtras]); setHoraExtraEnEdicion(null); }
      return;
    }
    if (!horaExtraEnEdicion.colaboradorId || !horaExtraEnEdicion.tipoHora || !horaExtraEnEdicion.numeroHoras) {
      alert('Completa todos los campos requeridos'); return;
    }
    let tipoId = tiposHoraExtraMap.get(horaExtraEnEdicion.tipoHora);
    if (!tipoId) {
      for (const [nombre, id] of tiposHoraExtraMap.entries()) {
        if (nombre.toLowerCase().includes(horaExtraEnEdicion.tipoHora.toLowerCase())) { tipoId = id; break; }
      }
    }
    if (!tipoId) { alert('Tipo de hora extra no encontrado'); return; }
    const esExistente = !horaExtraEnEdicion.id.includes('-');
    const payload = {
      empleado_id: parseInt(horaExtraEnEdicion.colaboradorId),
      tipo_hora_extra_id: tipoId,
      cantidad_horas: horaExtraEnEdicion.numeroHoras,
      observacion: horaExtraEnEdicion.observacion || undefined,
    };
    try {
      if (esExistente) {
        await horasExtraApi.editar(parseInt(horaExtraEnEdicion.id), payload);
        setHorasExtras(prev => prev.map(h => h.id === horaExtraEnEdicion.id ? horaExtraEnEdicion : h));
      } else {
        const res = await horasExtraApi.crear(planillaId, payload);
        setHorasExtras([{ ...horaExtraEnEdicion, id: String(res.data.id) }, ...horasExtras]);
      }
      setHoraExtraEnEdicion(null);
      await cargarResumen(planillaId);
    } catch (err: any) { alert(err?.message ?? 'Error al guardar hora extra'); }
  };

  const cancelarHoraExtra = () => {
    setHoraExtraEnEdicion(null);
  };

  const eliminarHoraExtra = async (id: string) => {
    if (planillaId && !id.startsWith('horaextra-')) { try { await horasExtraApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setHorasExtras(horasExtras.filter(h => h.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const agregarAuxiliar = () => {
    setTrabajosAuxiliares([...trabajosAuxiliares, {
      id: `auxiliar-${Date.now()}`,
      nombre: '',
      labor: '',
      otraLabor: '',
      lugar: '',
      total: 0,
      horasExtra: 0
    }]);
  };

  // Funciones para eliminar trabajos
  const eliminarCosecha = async (id: string) => {
    if (planillaId && !id.startsWith('cosecha-')) {
      try { await cosechasApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error al eliminar'); return; }
    }
    setTrabajosCosecha(trabajosCosecha.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarPlateo = async (id: string) => {
    if (planillaId && !id.startsWith('plateo-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosPlateo(trabajosPlateo.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarPoda = async (id: string) => {
    if (planillaId && !id.startsWith('poda-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosPoda(trabajosPoda.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarFertilizacion = async (id: string) => {
    if (planillaId && !id.startsWith('fertilizacion-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosFertilizacion(trabajosFertilizacion.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarSanidad = async (id: string) => {
    if (planillaId && !id.startsWith('sanidad-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosSanidad(trabajosSanidad.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarOtros = async (id: string) => {
    if (planillaId && !id.startsWith('otros-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosOtros(trabajosOtros.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const eliminarAuxiliar = async (id: string) => {
    if (planillaId && !id.startsWith('auxiliar-')) { try { await jornalesApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setTrabajosAuxiliares(trabajosAuxiliares.filter(t => t.id !== id));
    if (planillaId) await cargarResumen(planillaId);
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
  const agregarAusente = async () => {
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

      if (planillaId) {
        let motivoId = motivosMap.get(motivoAusenteSeleccionado);
        if (!motivoId) {
          for (const [nombre, id] of motivosMap.entries()) {
            if (nombre.toLowerCase().includes(motivoAusenteSeleccionado.toLowerCase())) { motivoId = id; break; }
          }
        }
        if (!motivoId) { alert('Motivo de ausencia no encontrado'); return; }
        try {
          const res = await ausenciasApi.crear(planillaId, {
            empleado_id: parseInt(colaboradorAusenteSeleccionado),
            motivo_ausencia_id: motivoId,
            motivo: motivoAusenteSeleccionado === 'Otro' ? otroMotivoAusente : motivoAusenteSeleccionado,
          });
          nuevoAusente.id = String(res.data.id);
          await cargarResumen(planillaId);
        } catch (err: any) { alert(err?.message ?? 'Error al guardar ausencia'); return; }
      }

      setAusentes([...ausentes, nuevoAusente]);
      setColaboradorAusenteSeleccionado('');
      setMotivoAusenteSeleccionado('');
      setOtroMotivoAusente('');
    }
  };

  const eliminarAusente = async (id: string) => {
    if (planillaId && !id.startsWith('ausente-')) { try { await ausenciasApi.eliminar(parseInt(id)); } catch (err: any) { alert(err?.message ?? 'Error'); return; } }
    setAusentes(ausentes.filter(a => a.id !== id));
    if (planillaId) await cargarResumen(planillaId);
  };

  const puedeAvanzarEtapa1 = fecha && elaboradoPor;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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
        <h1>{isEditMode ? 'Editar Planilla del Día' : 'Crear Nueva Planilla'}</h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode
            ? 'Modifica los datos de la planilla. Los cambios se guardan al avanzar de etapa o pulsar "Guardar".'
            : 'Configura tu planilla paso a paso'}
        </p>
        {cargandoPlanilla && (
          <p className="text-sm text-primary mt-2">Cargando datos de la planilla…</p>
        )}
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
                    <div key={etapa.numero} className="flex items-center" style={{ flex: index < ETAPAS.length - 1 ? 1 : 'none' }}>
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${
                          estaActiva || estaCompleta ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!estaActiva && !estaCompleta}
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
          <div className="space-y-6">
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
                        placeholder="Nombre del usuario"
                        value={elaboradoPor}
                        readOnly
                        disabled
                        className="opacity-80 cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Se llena automáticamente con tu nombre de usuario
                      </p>
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
                          type="number"
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
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-cosecha-${cosechaEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorEnEdicion(value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !cosechaEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {cosechaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {cosechaEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      const nombre = col
                                        ? (getNombreColab(col) || `Colaborador ${colId}`)
                                        : `Colaborador ${colId}`;
                                      return (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          {nombre}
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorEnEdicion(colId)}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      );
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
                                  type="number"
                                  placeholder="0"
                                  value={cosechaEnEdicion.gajosRecogidos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, gajosRecogidos: parseInt(e.target.value) || 0 });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Kilos (opcional)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={cosechaEnEdicion.kilos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, kilos: parseInt(e.target.value) || 0 });
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
                      )}

                      {/* Cards de cosechas guardadas */}
                      {trabajosCosecha.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {sublote?.nombre || 'Sublote no especificado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {getNombreColab(col) || `Colaborador ${colId}`}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
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

                                {/* Botón editar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCosechaEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarCosecha(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-plateo-${plateoEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value && !plateoEnEdicion.colaboradores.includes(value)) {
                                      setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: [...plateoEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !plateoEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {plateoEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {plateoEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          <span>{getNombreColab(col) || `Colaborador ${colId}`}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: plateoEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={plateoEnEdicion.lote}
                                  onValueChange={(value) => setPlateoEnEdicion({ ...plateoEnEdicion, lote: value, sublote: '', numeroPalmas: 0 })}
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
                                    // Autofill "Número de Palmas" con cantidad_palmas del sublote (editable)
                                    const sub = sublotes.find(s => s.id === value);
                                    setPlateoEnEdicion({
                                      ...plateoEnEdicion,
                                      sublote: value,
                                      numeroPalmas: sub?.cantidadPalmas ?? 0,
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
                                  type="number"
                                  placeholder="0"
                                  value={plateoEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPlateoEnEdicion({ ...plateoEnEdicion, numeroPalmas: parseInt(e.target.value) || 0 })}
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
                      )}

                      {/* Cards de plateos guardados */}
                      {trabajosPlateo.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {getNombreColab(col) || `Colaborador ${colId}`}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPlateoEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarPlateo(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-poda-${podaEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value && !podaEnEdicion.colaboradores.includes(value)) {
                                      setPodaEnEdicion({ ...podaEnEdicion, colaboradores: [...podaEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !podaEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {podaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {podaEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          <span>{getNombreColab(col) || `Colaborador ${colId}`}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPodaEnEdicion({ ...podaEnEdicion, colaboradores: podaEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={podaEnEdicion.lote}
                                  onValueChange={(value) => setPodaEnEdicion({ ...podaEnEdicion, lote: value, sublote: '', numeroPalmas: 0 })}
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
                                    // Autofill "Número de Palmas" con cantidad_palmas del sublote (editable)
                                    const sub = sublotes.find(s => s.id === value);
                                    setPodaEnEdicion({
                                      ...podaEnEdicion,
                                      sublote: value,
                                      numeroPalmas: sub?.cantidadPalmas ?? 0,
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
                                  type="number"
                                  placeholder="0"
                                  value={podaEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPodaEnEdicion({ ...podaEnEdicion, numeroPalmas: parseInt(e.target.value) || 0 })}
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
                      )}

                      {/* Cards de podas guardadas */}
                      {trabajosPoda.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {getNombreColab(col) || `Colaborador ${colId}`}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPodaEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarPoda(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-fert-${fertilizacionEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value && !fertilizacionEnEdicion.colaboradores.includes(value)) {
                                      setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: [...fertilizacionEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !fertilizacionEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {fertilizacionEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fertilizacionEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          <span>{getNombreColab(col) || `Colaborador ${colId}`}</span>
                                          <button
                                            type="button"
                                            onClick={() => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: fertilizacionEnEdicion.colaboradores.filter(id => id !== colId) })}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={fertilizacionEnEdicion.lote}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, lote: value, sublote: '', palmas: 0 })}
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
                                    // Autofill "Número de Palmas" con cantidad_palmas del sublote (editable)
                                    const sub = sublotes.find(s => s.id === value);
                                    setFertilizacionEnEdicion({
                                      ...fertilizacionEnEdicion,
                                      sublote: value,
                                      palmas: sub?.cantidadPalmas ?? 0,
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
                                  type="number"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.palmas || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, palmas: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo de Fertilizante</Label>
                                <Select
                                  value={fertilizacionEnEdicion.tipoFertilizante}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, tipoFertilizante: value, otroFertilizante: value !== 'Otro' ? '' : fertilizacionEnEdicion.otroFertilizante })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {insumosLista.map((fert) => (
                                      <SelectItem key={fert} value={fert}>
                                        {fert}
                                      </SelectItem>
                                    ))}
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
                                  type="number"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.cantidadGramos || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, cantidadGramos: parseInt(e.target.value) || 0 })}
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
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {getNombreColab(col) || `Colaborador ${colId}`}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFertilizacionEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarFertilizacion(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-sanidad-${sanidadEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value && !sanidadEnEdicion.colaboradores.includes(value)) {
                                      setSanidadEnEdicion({
                                        ...sanidadEnEdicion,
                                        colaboradores: [...sanidadEnEdicion.colaboradores, value]
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !sanidadEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {sanidadEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {sanidadEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          {getNombreColab(col) || `Colaborador ${colId}`}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSanidadEnEdicion({
                                                ...sanidadEnEdicion,
                                                colaboradores: sanidadEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
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
                                <Input
                                  placeholder="Descripción del trabajo"
                                  value={sanidadEnEdicion.trabajoRealizado}
                                  onChange={(e) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, trabajoRealizado: e.target.value });
                                  }}
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
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosSanidad.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Sin lote'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  <div className="flex flex-wrap gap-1">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="outline" className="text-xs">
                                          {getNombreColab(col) || `Colaborador ${colId}`}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                {/* Trabajo realizado */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Trabajo</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.trabajoRealizado || 'Sin descripción'}</p>
                                </div>

                                {/* Botón editar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSanidadEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarSanidad(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  key={`colab-otros-${otrosEnEdicion.colaboradores.join(',')}`}
                                  onValueChange={(value) => {
                                    if (value && !otrosEnEdicion.colaboradores.includes(value)) {
                                      setOtrosEnEdicion({
                                        ...otrosEnEdicion,
                                        colaboradores: [...otrosEnEdicion.colaboradores, value]
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !otrosEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {getNombreColab(col)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {otrosEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {otrosEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <span
                                          key={colId}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit shrink-0"
                                        >
                                          {getNombreColab(col) || `Colaborador ${colId}`}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOtrosEnEdicion({
                                                ...otrosEnEdicion,
                                                colaboradores: otrosEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
                                            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Nombre</Label>
                                <Input
                                  placeholder="Nombre del trabajo"
                                  value={otrosEnEdicion.nombre}
                                  onChange={(e) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, nombre: e.target.value });
                                  }}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Labor Realizada</Label>
                                <Input
                                  placeholder="Descripción de la labor"
                                  value={otrosEnEdicion.laborRealizada}
                                  onChange={(e) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, laborRealizada: e.target.value });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={otrosEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, lote: value, sublote: '' });
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
                                    setOtrosEnEdicion({ ...otrosEnEdicion, sublote: value });
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
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosOtros.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{trabajo.nombre || 'Sin nombre'}</h4>
                                    <p className="text-xs text-muted-foreground">{lote?.nombre || 'Sin lote'} - {sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  <div className="flex flex-wrap gap-1">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="outline" className="text-xs">
                                          {getNombreColab(col) || `Colaborador ${colId}`}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                {/* Labor realizada */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Labor</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.laborRealizada || 'Sin descripción'}</p>
                                </div>

                                {/* Botón editar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setOtrosEnEdicion({ ...trabajo })}
                                  className="text-primary hover:text-primary shrink-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarOtros(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        Auxiliares y trabajos complementarios
                      </p>
                    </div>
                    <Button
                      onClick={agregarAuxiliar}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trabajosAuxiliares.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarAuxiliar(trabajo.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                              placeholder="Nombre del colaborador"
                              value={trabajo.nombre}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, nombre: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Labor</Label>
                            <Select
                              value={trabajo.labor}
                              onValueChange={(value) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? {
                                    ...t,
                                    labor: value,
                                    otraLabor: value !== 'Otro' ? '' : t.otraLabor
                                  } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar labor" />
                              </SelectTrigger>
                              <SelectContent>
                                {laboresLista.map((labor) => (
                                  <SelectItem key={labor} value={labor}>
                                    {labor}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {trabajo.labor === 'Otro' && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Especificar otra labor</Label>
                              <Input
                                placeholder="Ingrese el tipo de labor"
                                value={trabajo.otraLabor || ''}
                                onChange={(e) => {
                                  const updated = trabajosAuxiliares.map(t =>
                                    t.id === trabajo.id ? { ...t, otraLabor: e.target.value } : t
                                  );
                                  setTrabajosAuxiliares(updated);
                                }}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Lugar</Label>
                            <Input
                              placeholder="Ubicación"
                              value={trabajo.lugar}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, lugar: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={trabajo.total || ''}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, total: parseInt(e.target.value) || 0 } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horas Extra</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={trabajo.horasExtra || ''}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, horasExtra: parseInt(e.target.value) || 0 } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosAuxiliares.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No hay registros de trabajos auxiliares</p>
                      <p className="text-sm">Haz clic en "Agregar" para crear uno</p>
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
                        <div className="space-y-2">
                          <Label>Tipo de Hora</Label>
                          <Select
                            value={horaExtraEnEdicion.tipoHora}
                            onValueChange={(value) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, tipoHora: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo de hora" />
                            </SelectTrigger>
                            <SelectContent>
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
                            type="number"
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

                        <div className="space-y-2">
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
                              {colaboradores.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {getNombreColab(col)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                          {/* Botón editar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHoraExtraEnEdicion({ ...hora })}
                            className="text-primary hover:text-primary shrink-0"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {/* Botón eliminar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarHoraExtra(hora.id)}
                            className="text-destructive hover:text-destructive shrink-0"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                    <Label>Ausentes</Label>
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
                            {colaboradores
                              .filter(col => !ausentes.some(a => a.colaboradorId === col.id))
                              .map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {getNombreColab(col)}
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
                          disabled={!colaboradorAusenteSeleccionado || !motivoAusenteSeleccionado || (motivoAusenteSeleccionado === 'Otro' && !otroMotivoAusente)}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {motivoAusenteSeleccionado === 'Otro' && (
                      <div className="space-y-2">
                        <Label htmlFor="otroMotivoAusente">Especificar otro motivo</Label>
                        <Input
                          id="otroMotivoAusente"
                          placeholder="Ingrese el motivo"
                          value={otroMotivoAusente}
                          onChange={(e) => setOtroMotivoAusente(e.target.value)}
                        />
                      </div>
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
                              const motivoMostrar = ausente.motivo === 'Otro' && ausente.otroMotivo
                                ? `Otro: ${ausente.otroMotivo}`
                                : ausente.motivo;
                              return (
                                <tr key={ausente.id} className="border-t border-border">
                                  <td className="p-3 text-sm">
                                    {col ? (getNombreColab(col) || '-') : '-'}
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
          </div>

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
              {etapaActual < ETAPAS.length ? (
                <Button
                  onClick={siguienteEtapa}
                  disabled={etapaActual === 1 && !puedeAvanzarEtapa1}
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={guardarTodo}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  <Save className="h-4 w-4" />
                  Guardar Planilla
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

                  {!fecha ? (
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
                            {new Date(fecha).toLocaleDateString('es-CO')}
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
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Labores
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cosecha</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.cosecha ?? trabajosCosecha.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plateo</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.plateo ?? trabajosPlateo.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Poda</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.poda ?? trabajosPoda.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fertilización</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.fertilizacion ?? trabajosFertilizacion.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sanidad</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.sanidad ?? trabajosSanidad.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Otros</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.otros ?? trabajosOtros.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auxiliares</span>
                      <span className="font-semibold text-sm">{resumen?.labores?.auxiliares ?? trabajosAuxiliares.length}</span>
                    </div>
                    {resumen?.horas_extra && resumen.horas_extra.total > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Horas Extra</span>
                        <span className="font-semibold text-sm">{resumen.horas_extra.total} ({resumen.horas_extra.horas_totales}h)</span>
                      </div>
                    )}
                    {resumen?.ausencias && resumen.ausencias.total > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ausencias</span>
                        <span className="font-semibold text-sm">{resumen.ausencias.total}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}