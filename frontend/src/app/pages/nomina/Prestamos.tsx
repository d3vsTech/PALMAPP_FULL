/**
 * Listado de Préstamos / Adelantos a colaboradores.
 *
 * Conectado a `prestamosApi` (doc API_NOMINA.md §15):
 *  - GET  /prestamos/indicadores  → 2 cards (vigentes + saldo total)
 *  - GET  /prestamos              → tabla paginada con filtros
 *  - DELETE /prestamos/{id}       → soft-delete (Cancelar)
 *
 * El estado del préstamo lo maneja el backend:
 *  - VIGENTE: hay cuotas pendientes
 *  - PAGADO:  `cuotas_pagadas == num_cuotas` (motor lo marca al aplicar cuota)
 *  - CANCELADO: soft-delete manual
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
  ArrowLeft, Plus, Search, DollarSign, User, Calendar, Loader2, Trash2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi,
  type Prestamo,
  type EstadoPrestamo,
  type IndicadoresPrestamos,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';

const estadoConfig: Record<EstadoPrestamo, { label: string; className: string }> = {
  VIGENTE:   { label: 'Vigente',   className: 'bg-primary/10 text-primary border-primary/20' },
  PAGADO:    { label: 'Pagado',    className: 'bg-success/10 text-success border-success/20' },
  CANCELADO: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
};

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

function nombreDeEmpleado(p: Prestamo): string {
  return p.empleado?.nombre_completo ?? `Empleado #${p.empleado?.id ?? '—'}`;
}

/** Formatea YYYY-MM-DD a dd/mm/yyyy sin desfase por zona horaria. */
function fmtFecha(s: string | null | undefined): string {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mes, d] = m;
  return `${d}/${mes}/${y}`;
}

export default function Prestamos() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresPrestamos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<Prestamo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = () => {
    setCargando(true);
    const estadoParam = filtroEstado !== 'todos' ? (filtroEstado as EstadoPrestamo) : undefined;
    Promise.all([
      prestamosApi.listar({ estado: estadoParam, per_page: 100 }),
      prestamosApi.indicadores().catch(() => null),
    ])
      .then(([listRes, indRes]) => {
        setPrestamos(listRes.data ?? []);
        if (indRes) setIndicadores(indRes.data);
      })
      .catch((err: ApiError) => {
        toast.error(err.message ?? 'Error al cargar préstamos');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const prestamosFiltrados = prestamos.filter((p) => {
    if (busqueda === '') return true;
    const nombre = nombreDeEmpleado(p).toLowerCase();
    const cedula = (p.empleado?.documento ?? '').toLowerCase();
    const concepto = (p.concepto ?? '').toLowerCase();
    const q = busqueda.toLowerCase();
    return nombre.includes(q) || cedula.includes(q) || concepto.includes(q);
  });

  // Fallback: si el backend no devuelve indicadores, calcularlos desde la lista
  const countVigente = indicadores?.prestamos_vigentes
    ?? prestamos.filter((p) => p.estado === 'VIGENTE').length;
  const totalVigente = indicadores?.saldo_total_pendiente
    ?? prestamos
      .filter((p) => p.estado === 'VIGENTE')
      .reduce((s, p) => s + toNumber(p.saldo_pendiente), 0);

  const eliminarPrestamo = async () => {
    if (!prestamoAEliminar) return;
    setEliminando(true);
    try {
      await prestamosApi.eliminar(prestamoAEliminar.id);
      toast.success('Préstamo cancelado');
      setPrestamoAEliminar(null);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cancelar el préstamo');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina">
            <ArrowLeft className="h-4 w-4" />
            Volver a Pagos
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Préstamos</h1>
            <p className="text-muted-foreground mt-1">
              Adelantos y préstamos registrados a colaboradores
            </p>
          </div>
          <Button
            onClick={() => navigate('/nomina/nuevo-prestamo')}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Préstamos Vigentes
                </p>
                <p className="text-2xl font-bold text-foreground">{countVigente}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Con saldo pendiente</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalVigente.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">En préstamos vigentes</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por colaborador, cédula o concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="PAGADO">Pagado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Concepto</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Monto Total</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Saldo Pendiente</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Cuota</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Avance</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Fecha fin</span>
                  </th>
                  <th className="text-center p-4 text-xs font-semibold text-muted-foreground">Estado</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Cargando préstamos...
                      </div>
                    </td>
                  </tr>
                ) : prestamosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-sm text-muted-foreground">
                      {prestamos.length === 0
                        ? 'Aún no hay préstamos registrados. Crea uno con el botón "Nuevo Préstamo".'
                        : 'No se encontraron préstamos con los filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  prestamosFiltrados.map((p, idx) => {
                    const cfg = estadoConfig[p.estado] ?? estadoConfig.CANCELADO;
                    const pct = p.num_cuotas > 0
                      ? Math.round((p.cuotas_pagadas / p.num_cuotas) * 100)
                      : 0;
                    const saldo = toNumber(p.saldo_pendiente);
                    const total = toNumber(p.valor_total);
                    const cuota = toNumber(p.cuota_valor);
                    const nombre = nombreDeEmpleado(p);
                    const cedula = p.empleado?.documento ?? '—';
                    // Solo VIGENTE se puede cancelar. PAGADO y CANCELADO
                    // están bloqueados por backend (doc §6).
                    const puedeCancelar = p.estado === 'VIGENTE';
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-semibold text-sm">{nombre}</p>
                          <p className="text-xs text-muted-foreground">CC {cedula}</p>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{p.concepto}</td>
                        <td className="p-4 text-right text-sm font-medium">
                          ${total.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-bold ${saldo === 0 ? 'text-success' : 'text-foreground'}`}>
                            ${saldo.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="p-4 text-right text-sm">
                          ${cuota.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {p.avance ?? `${p.cuotas_pagadas}/${p.num_cuotas}`}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {fmtFecha(p.fecha_fin)}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/nomina/prestamos/${p.id}`)}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {puedeCancelar && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPrestamoAEliminar(p)}
                                className="text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                                title="Cancelar préstamo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!prestamoAEliminar}
        onOpenChange={(o) => !o && setPrestamoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              El préstamo quedará en estado CANCELADO y sus cuotas pendientes
              dejarán de aparecer en la liquidación. Esta acción no aplica a
              cuotas ya aplicadas en nóminas cerradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarPrestamo}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Cancelando...' : 'Cancelar préstamo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
