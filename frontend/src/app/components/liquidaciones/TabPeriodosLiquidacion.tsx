/**
 * Listado de períodos de liquidación, compartido por las pestañas
 * Cesantías, Intereses y Prima (API_LIQUIDACIONES §2, mismos endpoints con
 * distinto `tipo`). Cards desde /resumen, tabla desde /periodos. La prima
 * añade el filtro por semestre y la columna de días promedio (§2.8).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Plus, FileText, Calculator, Eye, Search, Filter, Trash2, FileSpreadsheet,
  Users, AlertTriangle, PiggyBank, Percent, Gift, CheckCircle, Clock, Loader2,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
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
  listaTitulo: string;
  listaSub: string;
  emptyTitulo: string;
  tooltipLegal: string;
}> = {
  CESANTIAS: {
    titulo: 'Cesantías',
    subtitulo: 'Gestión de períodos anuales de cesantías',
    botonNuevo: 'Nuevo Período de Cesantías',
    ruta: '/liquidaciones/cesantias',
    cardTotal: 'Total Cesantías',
    cardTotalSub: 'Períodos cerrados',
    cardPagado: 'Consignadas',
    cardPagadoSub: 'Giradas al fondo',
    cardPendienteSub: 'Sin consignar',
    colTotal: 'Total Cesantías',
    colPagado: 'Consignado',
    listaTitulo: 'Períodos de Cesantías',
    listaSub: 'Historial de liquidaciones anuales de cesantías',
    emptyTitulo: 'No hay períodos de cesantías',
    tooltipLegal: 'Ley 50/1990',
  },
  INTERESES_CESANTIAS: {
    titulo: 'Intereses de Cesantías',
    subtitulo: 'Liquidación anual de intereses sobre cesantías (12% — Ley 52 de 1975)',
    botonNuevo: 'Nuevo Período de Intereses',
    ruta: '/liquidaciones/intereses',
    cardTotal: 'Total Intereses',
    cardTotalSub: 'Tasa: 12% anual',
    cardPagado: 'Pagados',
    cardPagadoSub: 'Pagados al trabajador',
    cardPendienteSub: 'Sin pagar',
    colTotal: 'Intereses',
    colPagado: 'Pagado',
    listaTitulo: 'Períodos de Intereses',
    listaSub: 'Historial de liquidaciones anuales de intereses sobre cesantías',
    emptyTitulo: 'No hay períodos de intereses',
    tooltipLegal: 'Ley 52/1975',
  },
  PRIMA: {
    titulo: 'Prima de Servicios',
    // La Ley 1/1963 solo incorpora el auxilio de transporte a la base; la
    // prima es el art. 306 del CST (Anexo B del contrato).
    subtitulo: 'Liquidación semestral de prima de servicios (CST art. 306, Ley 1788 de 2016)',
    botonNuevo: 'Nuevo Período de Prima',
    ruta: '/liquidaciones/prima',
    cardTotal: 'Total Prima',
    cardTotalSub: 'Períodos cerrados',
    cardPagado: 'Pagadas',
    cardPagadoSub: 'Pagadas al trabajador',
    cardPendienteSub: 'Sin pagar',
    colTotal: 'Total Prima',
    colPagado: 'Pagado',
    listaTitulo: 'Períodos de Prima',
    listaSub: 'Historial de liquidaciones semestrales de prima de servicios',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>{txt.titulo}</h2>
          <p className="text-muted-foreground mt-1">{txt.subtitulo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* El cargue del histórico (§12) entra por cesantías: el mismo archivo
              crea el período de intereses del año. */}
          {tipo === 'CESANTIAS' && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/liquidaciones/cesantias/carga-historico')}
              className="gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Cargar años anteriores
            </Button>
          )}
          <Button onClick={() => navigate(`${txt.ruta}/nueva`)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            {txt.botonNuevo}
          </Button>
        </div>
      </div>

      {/* Alerta vencimiento */}
      {alertaLimite && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
          <span>
            {alertaLimite.vencida ? (
              <>La fecha límite de <strong>{alertaLimite.periodo.descripcion}</strong> ya venció ({formatFecha(alertaLimite.periodo.fecha_limite_legal)}). Riesgo de sanción moratoria.</>
            ) : (
              <>Faltan <strong>{alertaLimite.periodo.dias_para_limite} días</strong> para la fecha límite de <strong>{alertaLimite.periodo.descripcion}</strong> ({formatFecha(alertaLimite.periodo.fecha_limite_operativa)}). Riesgo de sanción moratoria.</>
            )}
          </span>
        </div>
      )}

      {/* KPIs */}
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Resumen</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{txt.cardTotal}</p>
                <p className="text-2xl font-bold text-primary">{fmtMillones(resumen?.total_liquidado ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{txt.cardTotalSub}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconoTab className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{txt.cardPagado}</p>
                <p className="text-2xl font-bold text-success">{fmtMillones(resumen?.total_consignado ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{txt.cardPagadoSub}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Períodos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{resumen?.periodos_pendientes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Por liquidar o girar</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border ${(resumen?.monto_pendiente ?? 0) > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border'}`}>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Monto Pendiente</p>
                <p className={`text-2xl font-bold ${(resumen?.monto_pendiente ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {fmtMillones(resumen?.monto_pendiente ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{txt.cardPendienteSub}</p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${(resumen?.monto_pendiente ?? 0) > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <Users className={`h-5 w-5 ${(resumen?.monto_pendiente ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-base">Filtros</h3>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${esPrima ? 'lg:grid-cols-3' : ''}`}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por año o descripción..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="CERRADA">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {esPrima && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Semestre</label>
                <Select value={filtroSemestre} onValueChange={setFiltroSemestre}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="1">1° Semestre (ene – jun)</SelectItem>
                    <SelectItem value="2">2° Semestre (jul – dic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(filtroEstado !== 'todos' || filtroBusqueda !== '' || filtroSemestre !== 'todos') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline">{periodosFiltrados.length} resultado{periodosFiltrados.length !== 1 ? 's' : ''}</Badge>
              <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      <div className="space-y-3">
        <div>
          <h2 className="mb-1">{txt.listaTitulo}</h2>
          <p className="text-muted-foreground">{txt.listaSub}</p>
        </div>

        {cargando ? (
          <Card className="border-border">
            <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando períodos...
            </CardContent>
          </Card>
        ) : periodosFiltrados.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                      {esPrima && (
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semestre</th>
                      )}
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaboradores</th>
                      {esPrima && (
                        <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días prom.</th>
                      )}
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{txt.colTotal}</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{txt.colPagado}</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha Límite</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodosFiltrados.map((periodo, index) => (
                      <tr
                        key={periodo.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{periodo.descripcion}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFecha(periodo.fecha_inicio)} — {formatFecha(periodo.fecha_fin)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={periodo.estado} />
                            {periodo.origen === 'HISTORICO' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-muted/50 text-muted-foreground border-border"
                                title="Cargado desde un archivo de Excel: no se liquida ni se reabre"
                              >
                                Histórico
                              </Badge>
                            )}
                            {periodo.vencida && (
                              <Badge variant="destructive" className="text-[10px]">Vencida</Badge>
                            )}
                          </div>
                        </td>
                        {esPrima && (
                          <td className="p-4">
                            <span className="text-sm">
                              {periodo.semestre === 1 ? '1° Semestre' : periodo.semestre === 2 ? '2° Semestre' : '—'}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold">
                            {periodo.total_colaboradores > 0
                              ? periodo.total_colaboradores
                              : <span className="text-muted-foreground">—</span>}
                          </span>
                        </td>
                        {esPrima && (
                          <td className="p-4 text-right">
                            <span className="text-sm">
                              {periodo.dias_promedio != null
                                ? periodo.dias_promedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })
                                : <span className="text-muted-foreground">—</span>}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-right">
                          {periodo.estado === 'BORRADOR'
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm font-bold text-primary">{fmtCOP(periodo.total_liquidado)}</span>}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-semibold ${periodo.total_consignado > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            {periodo.total_consignado > 0 ? fmtCOP(periodo.total_consignado) : '—'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {/* Operativa (último día hábil); la legal va en el tooltip. */}
                          <span
                            className={`text-sm ${periodo.vencida && periodo.monto_pendiente > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}
                            title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)} (${txt.tooltipLegal}). Operativa: último día hábil.`}
                          >
                            {formatFecha(periodo.fecha_limite_operativa)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {periodo.origen === 'HISTORICO' ? (
                              /* Un histórico solo se ve y se elimina; liquidar,
                                 reabrir o pagar responden 409 PERIODO_HISTORICO. */
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`${txt.ruta}/${periodo.id}`)}
                                  className="gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAEliminar(periodo)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Eliminar el histórico de este año"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : periodo.estado === 'BORRADOR' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`${txt.ruta}/${periodo.id}`)}
                                  className="gap-1 bg-primary hover:bg-primary/90"
                                >
                                  <Calculator className="h-4 w-4" />
                                  Liquidar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAEliminar(periodo)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Eliminar borrador"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`${txt.ruta}/${periodo.id}`)}
                                className="gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : periodos.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconoTab className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">{txt.emptyTitulo}</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer período para comenzar</p>
              <Button onClick={() => navigate(`${txt.ruta}/nueva`)} className="gap-2">
                <Plus className="h-4 w-4" />
                {txt.botonNuevo}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">Intenta ajustar los filtros</p>
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {eliminando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
