/**
 * Cesantías — listado de períodos anuales, conectado a
 * GET /liquidaciones/periodos + /resumen (API_LIQUIDACIONES §2).
 * Diseño V.24; datos reales desde PR-L3.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus, FileText, Calculator, Eye, Search, Filter, Trash2,
  Users, AlertTriangle, PiggyBank, CheckCircle, Clock, Loader2,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type LiquidacionPeriodoItem,
  type ResumenLiquidaciones,
} from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

/** Cesantías se pagan con centavos (2.168.589,72). */
const fmtCOP = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;

const fmtMillones = (n: number) => `$${(Number(n ?? 0) / 1_000_000).toFixed(2)}M`;

export default function CesantiasTab() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

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
        tipo: 'CESANTIAS',
        estado: filtroEstado !== 'todos' ? (filtroEstado as 'BORRADOR' | 'CERRADA') : undefined,
        per_page: 50,
      }),
      liquidacionesApi.resumen({ tipo: 'CESANTIAS' }),
    ])
      .then(([listRes, resRes]) => {
        if (reqId !== reqIdRef.current) return;
        setPeriodos(listRes.data);
        setResumen(resRes.data);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'Error al cargar períodos de cesantías');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const periodosFiltrados = useMemo(() => {
    if (!filtroBusqueda) return periodos;
    const q = filtroBusqueda.toLowerCase();
    return periodos.filter(
      (p) => p.descripcion.toLowerCase().includes(q) || String(p.anio).includes(q),
    );
  }, [periodos, filtroBusqueda]);

  // Alerta de vencimiento: el período con consignación pendiente más próximo
  // a su fecha límite operativa (o ya vencido).
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
          <h2>Cesantías</h2>
          <p className="text-muted-foreground mt-1">Gestión de períodos anuales de cesantías</p>
        </div>
        <Button onClick={() => navigate('/liquidaciones/cesantias/nueva')} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Período de Cesantías
        </Button>
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
          <p className="text-sm font-semibold text-foreground mb-4">Resumen de cesantías</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Cesantías</p>
                <p className="text-2xl font-bold text-primary">{fmtMillones(resumen?.total_liquidado ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Períodos cerrados</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Consignadas</p>
                <p className="text-2xl font-bold text-success">{fmtMillones(resumen?.total_consignado ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Giradas al fondo</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Períodos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{resumen?.periodos_pendientes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Por liquidar o consignar</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Sin consignar</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          {(filtroEstado !== 'todos' || filtroBusqueda !== '') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline">{periodosFiltrados.length} resultado{periodosFiltrados.length !== 1 ? 's' : ''}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setFiltroEstado('todos'); setFiltroBusqueda(''); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      <div className="space-y-3">
        <div>
          <h2 className="mb-1">Períodos de Cesantías</h2>
          <p className="text-muted-foreground">Historial de liquidaciones anuales de cesantías</p>
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
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaboradores</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Cesantías</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consignado</th>
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
                          <StatusBadge status={periodo.estado} />
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold">
                            {periodo.total_colaboradores > 0
                              ? periodo.total_colaboradores
                              : <span className="text-muted-foreground">—</span>}
                          </span>
                        </td>
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
                            title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)} (Ley 50/1990). Operativa: último día hábil.`}
                          >
                            {formatFecha(periodo.fecha_limite_operativa)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {periodo.estado === 'BORRADOR' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/liquidaciones/cesantias/${periodo.id}`)}
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
                                onClick={() => navigate(`/liquidaciones/cesantias/${periodo.id}`)}
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
              <PiggyBank className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de cesantías</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer período para comenzar</p>
              <Button onClick={() => navigate('/liquidaciones/cesantias/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Período de Cesantías
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">Intenta ajustar los filtros</p>
              <Button variant="outline" onClick={() => { setFiltroEstado('todos'); setFiltroBusqueda(''); }}>
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
              Se borra el borrador con sus colaboradores agregados. Esta acción no se puede deshacer.
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
