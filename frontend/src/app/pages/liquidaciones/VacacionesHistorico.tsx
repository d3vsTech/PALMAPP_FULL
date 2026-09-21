/**
 * Histórico de vacaciones liquidadas (API_LIQUIDACIONES §10.7).
 *
 * Los filtros van al backend, no al arreglo: los totales del pie vienen en
 * `meta.totales` y cubren el filtro completo, no solo la página visible.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Search, Download, Eye, Loader2, Banknote, MoreHorizontal, RotateCcw, Ban,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  vacacionesApi,
  type EstadoVacacion,
  type MetaHistoricoVacaciones,
  type OrigenVacacion,
  type VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import {
  ESTADO_VACACION_BADGE, ESTADO_VACACION_LABEL, ORIGEN_LABEL,
  descargarBlob, fmtCOP, fmtDias,
} from './vacaciones/comunes';
import PagoVacacionDialog from './vacaciones/PagoVacacionDialog';
import AnularVacacionDialog, { type ModoAnulacion } from './vacaciones/AnularVacacionDialog';

export default function VacacionesHistorico() {
  const navigate = useNavigate();

  const [filas, setFilas] = useState<VacacionItem[]>([]);
  const [meta, setMeta] = useState<MetaHistoricoVacaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroOrigen, setFiltroOrigen] = useState('todos');

  const [aPagar, setAPagar] = useState<VacacionItem | null>(null);
  const [aAnular, setAAnular] = useState<{ fila: VacacionItem; modo: ModoAnulacion } | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    vacacionesApi
      .listar({
        q: filtroNombre.trim() || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoVacacion) : undefined,
        origen: filtroOrigen !== 'todos' ? (filtroOrigen as OrigenVacacion) : undefined,
        page: pagina,
        per_page: 25,
      })
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setFilas(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'Error al cargar el histórico');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    const t = setTimeout(cargar, filtroNombre ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen, pagina]);

  // Cualquier filtro nuevo vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen]);

  const hayFiltros =
    filtroNombre || filtroDesde || filtroHasta ||
    filtroEstado !== 'todos' || filtroOrigen !== 'todos';

  const limpiar = () => {
    setFiltroNombre('');
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroEstado('todos');
    setFiltroOrigen('todos');
  };

  const descargarComprobante = async (v: VacacionItem) => {
    setDescargando(v.id);
    try {
      const blob = await vacacionesApi.comprobantePdf(v.id);
      descargarBlob(blob, `vacaciones_${v.empleado.documento}_${v.numero_comprobante}.pdf`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el comprobante');
    } finally {
      setDescargando(null);
    }
  };

  const reemplazar = (v: VacacionItem) =>
    setFilas((prev) => prev.map((f) => (f.id === v.id ? v : f)));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">Histórico de Vacaciones</h1>
        <p className="mt-1 text-muted-foreground">Registro de todas las vacaciones liquidadas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Desde</span>
          <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="h-9" />
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Hasta</span>
          <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="h-9" />
        </div>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="APROBADA">Pendiente de pago</SelectItem>
            <SelectItem value="PAGADA">Pagada</SelectItem>
            <SelectItem value="CANCELADA">Anulada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo origen</SelectItem>
            <SelectItem value="SISTEMA">Liquidadas aquí</SelectItem>
            <SelectItem value="HISTORICO">Registros históricos</SelectItem>
          </SelectContent>
        </Select>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar filtros</Button>
        )}
      </div>

      {/* Tabla */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Comprobante</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días disfrute</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días dinero</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Rango</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha pago</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Total</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Estado</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando registros
                      </span>
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {hayFiltros
                        ? 'No se encontraron registros con los filtros aplicados'
                        : 'Todavía no hay vacaciones liquidadas'}
                    </td>
                  </tr>
                ) : (
                  filas.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{h.empleado.nombre_completo}</span>
                          <span className="text-xs text-muted-foreground">{h.empleado.cargo ?? `CC ${h.empleado.documento}`}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{h.numero_comprobante}</span>
                          {h.origen !== 'SISTEMA' && (
                            <span className="text-xs text-muted-foreground">{ORIGEN_LABEL[h.origen]}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-success">{fmtDias(h.dias_habiles)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-amber-600">
                          {h.dias_dinero > 0 ? fmtDias(h.dias_dinero) : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {h.fecha_inicio ? `${formatFecha(h.fecha_inicio)} — ${formatFecha(h.fecha_fin)}` : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{formatFecha(h.pago.fecha_pago)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-foreground">{fmtCOP(h.valor_total)}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={ESTADO_VACACION_BADGE[h.estado]}>
                          {ESTADO_VACACION_LABEL[h.estado]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {h.estado === 'APROBADA' && h.origen === 'SISTEMA' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAPagar(h)}
                              className="gap-1.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Pagar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/liquidaciones/vacaciones/${h.id}`)}
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={descargando === h.id}
                            onClick={() => descargarComprobante(h)}
                            className="gap-1.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            {descargando === h.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Download className="h-3.5 w-3.5" />}
                            PDF
                          </Button>
                          {/* Las dos anulaciones van en menú: son destructivas
                              y no deben quedar al lado de "Ver" (§10.9, §10.10). */}
                          {h.estado !== 'CANCELADA' && h.origen !== 'LIQUIDACION_FINAL' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="px-2">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {h.estado === 'PAGADA' && (
                                  <DropdownMenuItem
                                    onClick={() => setAAnular({ fila: h, modo: 'pago' })}
                                    className="gap-2"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Anular pago
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setAAnular({ fila: h, modo: 'liquidacion' })}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Anular liquidación
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{meta?.totales.registros ?? 0}</span> registros
              {(filtroDesde || filtroHasta) && ' en el período seleccionado'}
              {meta && meta.totales.pendientes_pago > 0 && (
                <span> · {meta.totales.pendientes_pago} sin pagar</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Total pagado:{' '}
              <span className="font-semibold text-foreground">{fmtCOP(meta?.totales.total_pagado ?? 0)}</span>
            </p>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button
                variant="outline" size="sm"
                disabled={pagina <= 1 || cargando}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={pagina >= meta.last_page || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PagoVacacionDialog
        vacacion={aPagar}
        onCerrar={() => setAPagar(null)}
        onPagada={reemplazar}
      />

      <AnularVacacionDialog
        vacacion={aAnular?.fila ?? null}
        modo={aAnular?.modo ?? 'pago'}
        onCerrar={() => setAAnular(null)}
        onAnulada={reemplazar}
      />
    </div>
  );
}
