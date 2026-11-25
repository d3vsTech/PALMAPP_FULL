/**
 * Listado de períodos de liquidación, compartido por las pestañas
 * Cesantías, Intereses y Prima (API_LIQUIDACIONES §2, mismos endpoints con
 * distinto `tipo`). Cards desde /resumen, tabla desde /periodos. La prima
 * añade el filtro por semestre y la columna de días promedio (§2.8).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Plus, Search, Trash2, AlertTriangle, PiggyBank, Percent, Gift,
  CheckCircle2, CalendarClock, CircleDollarSign, Loader2,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import StatStrip from '../common/StatStrip';
import SeccionEncabezado from './SeccionEncabezado';
import FiltrosFila from './FiltrosFila';
import VacioCard from './VacioCard';
import PeriodoAccion from './PeriodoAccion';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type LiquidacionPeriodoItem,
  type ResumenLiquidaciones,
} from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

/** Las liquidaciones se pagan con centavos (2.168.589,72). */
const fmtCOP = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;

const fmtMillones = (n: number) => `$${(Number(n ?? 0) / 1_000_000).toFixed(2)}M`;

type TipoTab = 'CESANTIAS' | 'INTERESES_CESANTIAS' | 'PRIMA';

const TEXTOS: Record<TipoTab, {
  titulo: string;
  subtitulo: string;
  botonNuevo: string;
  ruta: string;
  cardTotal: string;
  cardTotalSub: string;
  cardPagado: string;
  cardPagadoSub: string;
  cardPendienteSub: string;
  colTotal: string;
  colPagado: string;
  emptyTitulo: string;
  tooltipLegal: string;
}> = {
  CESANTIAS: {
    titulo: 'Cesantías',
    subtitulo: 'Un mes de salario por año trabajado, consignado al fondo antes del 14 de febrero.',
    botonNuevo: 'Nuevo período de cesantías',
    ruta: '/liquidaciones/cesantias',
    cardTotal: 'Total cesantías',
    cardTotalSub: 'Períodos cerrados',
    cardPagado: 'Consignadas',
    cardPagadoSub: 'Giradas al fondo',
    cardPendienteSub: 'Sin consignar',
    colTotal: 'Total cesantías',
    colPagado: 'Consignado',
    emptyTitulo: 'No hay períodos de cesantías',
    tooltipLegal: 'Ley 50/1990',
  },
  INTERESES_CESANTIAS: {
    titulo: 'Intereses de cesantías',
    subtitulo: 'Liquidación anual de intereses sobre cesantías (12 %, Ley 52 de 1975).',
    botonNuevo: 'Nuevo período de intereses',
    ruta: '/liquidaciones/intereses',
    cardTotal: 'Total intereses',
    cardTotalSub: 'Tasa: 12 % anual',
    cardPagado: 'Pagados',
    cardPagadoSub: 'Pagados al trabajador',
    cardPendienteSub: 'Sin pagar',
    colTotal: 'Intereses 12 %',
    colPagado: 'Pagado',
    emptyTitulo: 'No hay períodos de intereses',
    tooltipLegal: 'Ley 52/1975',
  },
  PRIMA: {
    titulo: 'Prima de servicios',
    // La Ley 1/1963 solo incorpora el auxilio de transporte a la base; la
    // prima es el art. 306 del CST (Anexo B del contrato).
    subtitulo: 'Liquidación semestral de prima de servicios (CST art. 306, Ley 1788 de 2016).',
    botonNuevo: 'Nuevo período de prima',
    ruta: '/liquidaciones/prima',
    cardTotal: 'Total prima',
    cardTotalSub: 'Períodos cerrados',
    cardPagado: 'Pagadas',
    cardPagadoSub: 'Pagadas al trabajador',
    cardPendienteSub: 'Sin pagar',
    colTotal: 'Total prima',
    colPagado: 'Pagado',
    emptyTitulo: 'No hay períodos de prima',
    tooltipLegal: 'CST art. 306',
  },
};

export default function TabPeriodosLiquidacion({ tipo }: { tipo: TipoTab }) {
  const navigate = useNavigate();
  const txt = TEXTOS[tipo];
  const esPrima = tipo === 'PRIMA';
  const IconoTab = tipo === 'CESANTIAS' ? PiggyBank : esPrima ? Gift : Percent;

  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  /** Solo prima: 'todos' | '1' | '2' (§2.3). */
  const [filtroSemestre, setFiltroSemestre] = useState('todos');

  const [periodos, setPeriodos] = useState<LiquidacionPeriodoItem[]>([]);
  const [resumen, setResumen] = useState<ResumenLiquidaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aEliminar, setAEliminar] = useState<LiquidacionPeriodoItem | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    Promise.all([
      liquidacionesApi.listar({
        tipo,
        semestre: esPrima && filtroSemestre !== 'todos' ? (Number(filtroSemestre) as 1 | 2) : undefined,
        estado: filtroEstado !== 'todos' ? (filtroEstado as 'BORRADOR' | 'CERRADA') : undefined,
        per_page: 50,
      }),
      liquidacionesApi.resumen({
        tipo,
        semestre: esPrima && filtroSemestre !== 'todos' ? (Number(filtroSemestre) as 1 | 2) : undefined,
      }),
    ])
      .then(([listRes, resRes]) => {
        if (reqId !== reqIdRef.current) return;
        setPeriodos(listRes.data);
        setResumen(resRes.data);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'Error al cargar los períodos');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, filtroEstado, filtroSemestre]);

  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setFiltroBusqueda('');
    setFiltroSemestre('todos');
  };

  const periodosFiltrados = useMemo(() => {
    if (!filtroBusqueda) return periodos;
    const q = filtroBusqueda.toLowerCase();
    return periodos.filter(
      (p) => p.descripcion.toLowerCase().includes(q) || String(p.anio).includes(q),
    );
  }, [periodos, filtroBusqueda]);

  // Alerta de vencimiento: el período con giro pendiente más próximo a su
  // fecha límite operativa (o ya vencido).
  const alertaLimite = useMemo(() => {
    const pendientes = periodos.filter(
      (p) => p.estado === 'BORRADOR' || p.monto_pendiente > 0,
    );
    if (pendientes.length === 0) return null;
    const proximo = [...pendientes].sort((a, b) => a.dias_para_limite - b.dias_para_limite)[0];
    if (proximo.vencida) return { vencida: true, periodo: proximo };
    if (proximo.dias_para_limite <= 30) return { vencida: false, periodo: proximo };
    return null;
  }, [periodos]);

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await liquidacionesApi.eliminar(aEliminar.id);
      toast.success('Borrador eliminado');
      setAEliminar(null);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_CERRADO) {
        toast.error('No se puede eliminar un período cerrado');
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_REFERENCIADO) {
        toast.error('Un período de intereses usa este período como base');
      } else {
        toast.error(e.message ?? 'No se pudo eliminar el período');
      }
    } finally {
      setEliminando(false);
    }
  };

  const pendiente = resumen?.monto_pendiente ?? 0;
  const filtrosActivos = filtroEstado !== 'todos' || filtroBusqueda !== '' || filtroSemestre !== 'todos';
  const th = 'px-4 py-2.5 font-semibold';
  /* El cargue del histórico vive en el botón "Importar" del encabezado de Liquidaciones. */
  const nuevo = (
    <Button onClick={() => navigate(`${txt.ruta}/nueva`)}>
      <Plus strokeWidth={2} />
      {txt.botonNuevo}
    </Button>
  );

  return (
    <div className="space-y-6">
      <SeccionEncabezado title={txt.titulo} description={txt.subtitulo} actions={nuevo} />

      {/* Alerta vencimiento */}
      {alertaLimite && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
          <span>
            {alertaLimite.vencida ? (
              <>La fecha límite de <strong>{alertaLimite.periodo.descripcion}</strong> ya venció ({formatFecha(alertaLimite.periodo.fecha_limite_legal)}). Riesgo de sanción moratoria.</>
            ) : (
              <>Faltan <strong>{alertaLimite.periodo.dias_para_limite} días</strong> para la fecha límite de <strong>{alertaLimite.periodo.descripcion}</strong> ({formatFecha(alertaLimite.periodo.fecha_limite_operativa)}). Riesgo de sanción moratoria.</>
            )}
          </span>
        </div>
      )}

      <StatStrip
        items={[
          { label: txt.cardTotal, value: fmtMillones(resumen?.total_liquidado ?? 0), note: txt.cardTotalSub, icon: IconoTab, tone: 'green' },
          { label: txt.cardPagado, value: fmtMillones(resumen?.total_consignado ?? 0), note: txt.cardPagadoSub, icon: CheckCircle2, tone: 'green' },
          { label: 'Períodos pendientes', value: resumen?.periodos_pendientes ?? 0, note: 'Por liquidar o girar', icon: CalendarClock, tone: 'amber' },
          {
            label: 'Monto pendiente',
            value: pendiente > 0 ? <span className="text-destructive">{fmtMillones(pendiente)}</span> : fmtMillones(pendiente),
            note: txt.cardPendienteSub,
            icon: CircleDollarSign,
            tone: 'amber',
          },
        ]}
      />

      <div className="space-y-3">
        <FiltrosFila
          busqueda={filtroBusqueda}
          onBusqueda={setFiltroBusqueda}
          placeholder="Buscar por año o descripción"
          activos={filtrosActivos}
          resultados={periodosFiltrados.length}
          onLimpiar={limpiarFiltros}
        >
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="BORRADOR">Borrador</SelectItem>
              <SelectItem value="CERRADA">Cerrada</SelectItem>
            </SelectContent>
          </Select>
          {esPrima && (
            <Select value={filtroSemestre} onValueChange={setFiltroSemestre}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Semestre"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los semestres</SelectItem>
                <SelectItem value="1">1.er semestre (ene a jun)</SelectItem>
                <SelectItem value="2">2.º semestre (jul a dic)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FiltrosFila>

        {cargando ? (
          <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando períodos...
          </Card>
        ) : periodosFiltrados.length > 0 ? (
          <Card className="gap-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-[13px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Período</th>
                    <th className={`${th} text-left`}>Estado</th>
                    {esPrima && <th className={`hidden ${th} text-left sm:table-cell`}>Semestre</th>}
                    <th className={`hidden ${th} text-right md:table-cell`}>Colaboradores</th>
                    {esPrima && <th className={`hidden ${th} text-right lg:table-cell`}>Días prom.</th>}
                    <th className={`${th} text-right`}>{txt.colTotal}</th>
                    <th className={`hidden ${th} text-right lg:table-cell`}>{txt.colPagado}</th>
                    <th className={`hidden ${th} text-right sm:table-cell`}>Fecha límite</th>
                    <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {periodosFiltrados.map((periodo) => {
                    const borrador = periodo.estado === 'BORRADOR';
                    const historico = periodo.origen === 'HISTORICO';
                    const to = `${txt.ruta}/${periodo.id}`;
                    return (
                      <tr key={periodo.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <Link to={to} className="font-semibold text-foreground hover:text-primary">
                            {periodo.descripcion}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {formatFecha(periodo.fecha_inicio)} a {formatFecha(periodo.fecha_fin)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={periodo.estado} />
                            {historico && (
                              <Badge variant="secondary" title="Cargado desde un archivo de Excel: no se liquida ni se reabre">
                                Histórico
                              </Badge>
                            )}
                            {periodo.vencida && <Badge variant="destructive">Vencida</Badge>}
                          </div>
                        </td>
                        {esPrima && (
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {periodo.semestre === 1 ? '1.er semestre' : periodo.semestre === 2 ? '2.º semestre' : '—'}
                          </td>
                        )}
                        <td className="hidden px-4 py-3 text-right tabular-nums text-foreground md:table-cell">
                          {periodo.total_colaboradores > 0
                            ? periodo.total_colaboradores
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        {esPrima && (
                          <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                            {periodo.dias_promedio != null
                              ? periodo.dias_promedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })
                              : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                          {borrador ? <span className="font-normal text-muted-foreground">—</span> : fmtCOP(periodo.total_liquidado)}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-foreground lg:table-cell">
                          {periodo.total_consignado > 0
                            ? fmtCOP(periodo.total_consignado)
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                          {/* Operativa (último día hábil); la legal va en el tooltip. */}
                          <span
                            className={periodo.vencida && periodo.monto_pendiente > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}
                            title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)} (${txt.tooltipLegal}). Operativa: último día hábil.`}
                          >
                            {formatFecha(periodo.fecha_limite_operativa)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Un histórico solo se ve y se elimina; liquidar,
                                reabrir o pagar responden 409 PERIODO_HISTORICO. */}
                            <PeriodoAccion to={to} borrador={borrador && !historico} nombre={periodo.descripcion} />
                            {(borrador || historico) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setAEliminar(periodo)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                aria-label={historico ? 'Eliminar el histórico de este año' : 'Eliminar borrador'}
                                title={historico ? 'Eliminar el histórico de este año' : 'Eliminar borrador'}
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
        ) : periodos.length === 0 ? (
          <VacioCard
            icon={IconoTab}
            title={txt.emptyTitulo}
            description="Crea el primer período para empezar."
            action={nuevo}
          />
        ) : (
          <VacioCard
            icon={Search}
            title="Sin resultados"
            description="Ningún período coincide con los filtros."
            action={<Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>}
          />
        )}
      </div>

      {/* Confirmar eliminación de borrador */}
      <AlertDialog open={aEliminar != null} onOpenChange={(open) => !open && !eliminando && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el período "{aEliminar?.descripcion}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {aEliminar?.origen === 'HISTORICO'
                ? 'Se borra todo lo que se cargó de ese año, incluidos los intereses del mismo archivo. Para corregirlo hay que volver a subir el Excel. Esta acción no se puede deshacer.'
                : 'Se borra el borrador con sus colaboradores agregados. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
