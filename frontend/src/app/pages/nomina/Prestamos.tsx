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
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { comparePersonaByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { Card } from '../../components/ui/card';
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
  Plus, Search, Eye, Loader2, Paperclip, Trash2, HandCoins, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi,
  type Prestamo,
  type EstadoPrestamo,
  type IndicadoresPrestamos,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { thead, th, td } from '../../components/nomina/piezas';

const estadoConfig: Record<EstadoPrestamo, { label: string; variant: 'info' | 'success' | 'secondary' }> = {
  VIGENTE:   { label: 'Vigente',   variant: 'info' },
  PAGADO:    { label: 'Pagado',    variant: 'success' },
  CANCELADO: { label: 'Cancelado', variant: 'secondary' },
};

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

function nombreDeEmpleado(p: Prestamo): string {
  if (p.empleado?.nombre_completo) return p.empleado.nombre_completo;
  return p.empleado?.id ? `Empleado #${p.empleado.id}` : 'Colaborador sin nombre';
}

/** Formatea YYYY-MM-DD como "05 ene 2026" sin desfase por zona horaria. */
const fmtFecha = (s: string | null | undefined): string => formatFecha(s, { day: '2-digit', month: 'short', year: 'numeric' });

export default function Prestamos() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresPrestamos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<Prestamo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Guard contra respuestas fuera de orden al cambiar el filtro rápido:
  // solo la carga más reciente puede setear estado.
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    const estadoParam = filtroEstado !== 'todos' ? (filtroEstado as EstadoPrestamo) : undefined;
    Promise.all([
      prestamosApi.listar({ estado: estadoParam, per_page: 100 }),
      prestamosApi.indicadores().catch(() => null),
    ])
      .then(([listRes, indRes]) => {
        if (reqId !== reqIdRef.current) return;
        setPrestamos(listRes.data ?? []);
        if (indRes) setIndicadores(indRes.data);
      })
      .catch((err: ApiError) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(err.message ?? 'Error al cargar préstamos');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
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
      <PageHeader
        backTo="/nomina"
        eyebrow="Pagos"
        title="Préstamos"
        description="Adelantos y préstamos registrados a colaboradores."
        actions={
          <Button onClick={() => navigate('/nomina/nuevo-prestamo')}>
            <Plus strokeWidth={2} />
            Nuevo préstamo
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: 'Saldo pendiente', value: `$${totalVigente.toLocaleString('es-CO')}`, note: 'En préstamos vigentes', icon: Wallet, tone: 'amber' },
          { label: 'Préstamos vigentes', value: countVigente, note: 'Con saldo pendiente', icon: HandCoins, tone: 'blue' },
        ]}
      />

      {/* Préstamos registrados. Los filtros van en la linea del titulo:
          en el diseño no tienen tarjeta propia. */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2>Préstamos registrados</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input
                type="search"
                aria-label="Buscar préstamo"
                placeholder="Buscar colaborador, cédula o concepto"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger aria-label="Estado" className="w-full sm:w-52">
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
        </div>

        <Card className="gap-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={thead}>
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
                  <th className={`${th} hidden text-left lg:table-cell`}>Concepto</th>
                  <th className={`${th} hidden text-right lg:table-cell`}>Monto total</th>
                  <th className={`${th} text-right`}>Saldo</th>
                  <th className={`${th} hidden text-right lg:table-cell`}>Cuota</th>
                  <th className={`${th} hidden text-left lg:table-cell`}>Avance</th>
                  <th className={`${th} hidden text-left xl:table-cell`}>Fecha fin</th>
                  <th className={`${th} hidden text-left sm:table-cell`}>Estado</th>
                  <th className="px-5 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando préstamos...
                      </span>
                    </td>
                  </tr>
                ) : prestamosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {prestamos.length === 0
                        ? 'Aún no hay préstamos registrados. Crea uno con «Nuevo préstamo».'
                        : 'No se encontraron préstamos con los filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  [...prestamosFiltrados].sort((a, b) =>
                    comparePersonaByFirstName(a.empleado ?? {}, b.empleado ?? {})
                  ).map((p) => {
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
                      <tr key={p.id} className="transition-colors hover:bg-muted/40">
                        <td className="min-w-[12rem] px-5 py-3">
                          <Link
                            to={`/nomina/prestamos/${p.id}`}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {nombre}
                          </Link>
                          <span className="block text-xs text-muted-foreground">C.C. {cedula}</span>
                        </td>
                        <td className={`${td} hidden text-muted-foreground lg:table-cell`}>
                          <span className="inline-flex items-center gap-1.5">
                            {p.concepto}
                            {p.documento && (
                              <span title={`Soporte: ${p.documento.nombre_archivo}`}>
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`${td} hidden text-right tabular-nums lg:table-cell`}>
                          ${total.toLocaleString('es-CO')}
                        </td>
                        <td className={`${td} text-right font-semibold tabular-nums text-foreground`}>
                          ${saldo.toLocaleString('es-CO')}
                        </td>
                        <td className={`${td} hidden text-right tabular-nums lg:table-cell`}>
                          ${cuota.toLocaleString('es-CO')}
                        </td>
                        <td className={`${td} hidden lg:table-cell`}>
                          <div className="flex min-w-[100px] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                              {p.avance ?? `${p.cuotas_pagadas}/${p.num_cuotas}`}
                            </span>
                          </div>
                        </td>
                        <td className={`${td} hidden text-muted-foreground xl:table-cell`}>
                          {fmtFecha(p.fecha_fin)}
                        </td>
                        <td className={`${td} hidden sm:table-cell`}>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* El nombre ya lleva al detalle; este queda como
                                atajo desde el lado de las acciones. */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground"
                              onClick={() => navigate(`/nomina/prestamos/${p.id}`)}
                              aria-label="Ver el préstamo"
                              title="Ver el detalle, el calendario de cuotas y el soporte"
                            >
                              <Eye strokeWidth={2} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/nomina/prestamos/${p.id}/abonos`)}
                            >
                              Abonos
                            </Button>
                            {puedeCancelar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPrestamoAEliminar(p)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Cancelar préstamo"
                                title="Cancelar préstamo"
                              >
                                <Trash2 strokeWidth={2} />
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
        </Card>
      </section>

      <AlertDialog
        open={!!prestamoAEliminar}
        onOpenChange={(o) => !o && setPrestamoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              El préstamo quedará cancelado y sus cuotas pendientes
              dejarán de aparecer en la liquidación. Esta acción no aplica a
              cuotas ya aplicadas en nóminas cerradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarPrestamo}
              disabled={eliminando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {eliminando ? 'Cancelando...' : 'Cancelar préstamo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
