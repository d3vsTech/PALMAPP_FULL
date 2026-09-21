/**
 * Pantalla 5 — Listado de liquidaciones finales (API_LIQUIDACIONES §11.2 y §11.5).
 *
 * Los filtros son del servidor: el backend pagina y ordena por fecha de retiro.
 * Las cards vienen de `resumen`, no de sumar la página, porque la página es
 * solo un recorte de lo que hay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Eye, Plus, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  liquidacionFinalApi,
  type EstadoLiquidacionFinal,
  type LiquidacionFinalItem,
  type MetaPaginacion,
  type MotivoRetiroCodigo,
  type MotivoRetiroItem,
  type ResumenLiquidacionFinal,
  ESTADO_LIQUIDACION_LABEL,
} from '../../../api/liquidacionFinal';
import { ESTADO_BADGE, ESTADO_NOTA, fmtCOP, fmtFecha, mensajeErrorLiquidacion } from './final/comunes';

const POR_PAGINA = 15;

export default function LiquidacionFinalTab() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  const puedeCrear = hasPermiso('liquidaciones.crear');

  const [resumen, setResumen] = useState<ResumenLiquidacionFinal | null>(null);
  const [filas, setFilas] = useState<LiquidacionFinalItem[]>([]);
  const [meta, setMeta] = useState<MetaPaginacion | null>(null);
  const [motivos, setMotivos] = useState<MotivoRetiroItem[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros del servidor.
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<EstadoLiquidacionFinal | ''>('');
  const [motivoRetiro, setMotivoRetiro] = useState<MotivoRetiroCodigo | ''>('');
  const [anio, setAnio] = useState('');
  const [pagina, setPagina] = useState(1);

  // Descarta respuestas de peticiones que ya quedaron viejas.
  const reqIdRef = useRef(0);

  // El catálogo de motivos no cambia: se pide una vez para el select.
  useEffect(() => {
    let vivo = true;
    liquidacionFinalApi
      .motivos()
      .then((m) => {
        if (vivo) setMotivos(m);
      })
      .catch(() => {
        /* El select queda vacío; el listado sigue siendo usable. */
      });
    return () => {
      vivo = false;
    };
  }, []);

  // El buscador espera a que el usuario deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    const anioNum = anio ? Number(anio) : undefined;
    try {
      const [res, listado] = await Promise.all([
        liquidacionFinalApi.resumen(anioNum),
        liquidacionFinalApi.listar({
          q: q || undefined,
          estado: estado || undefined,
          motivo_retiro: motivoRetiro || undefined,
          anio: anioNum,
          page: pagina,
          per_page: POR_PAGINA,
        }),
      ]);
      if (reqId !== reqIdRef.current) return;
      setResumen(res);
      setFilas(listado.data);
      setMeta(listado.meta);
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo cargar el listado de liquidaciones'));
      setFilas([]);
      setMeta(null);
    } finally {
      if (reqId === reqIdRef.current) setCargando(false);
    }
  }, [q, estado, motivoRetiro, anio, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayFiltros = Boolean(q || estado || motivoRetiro || anio);

  return (
    <div className="space-y-6">
      {/* Cards del resumen (§11.2) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Borradores</p>
            <p className="text-2xl font-bold text-muted-foreground">{resumen?.borradores ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">sin aprobar</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Aprobadas</p>
            <p className="text-2xl font-bold text-primary">{resumen?.aprobadas ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">pendientes de pago</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagadas</p>
            <p className="text-2xl font-bold text-success">{resumen?.pagadas ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">finalizadas</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Monto por Pagar</p>
            <p className="text-2xl font-bold text-foreground">{fmtCOP(resumen?.monto_por_pagar ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">aprobadas sin pagar</p>
          </CardContent>
        </Card>
      </div>

      {puedeCrear && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={() => navigate('/liquidaciones/liquidacion-final/nueva')}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Nueva Liquidación
          </Button>
        </div>
      )}

      {/* Filtros */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nombre, cédula o cargo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoLiquidacionFinal | '');
            setPagina(1);
          }}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="APROBADA">Aprobada</option>
          <option value="PAGADA">Pagada</option>
          <option value="ANULADA">Anulada</option>
        </select>

        <select
          value={motivoRetiro}
          onChange={(e) => {
            setMotivoRetiro(e.target.value as MotivoRetiroCodigo | '');
            setPagina(1);
          }}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los motivos</option>
          {motivos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.etiqueta}
            </option>
          ))}
        </select>

        <Input
          type="number"
          placeholder="Año de retiro"
          value={anio}
          onChange={(e) => {
            setAnio(e.target.value);
            setPagina(1);
          }}
          className="h-9"
        />
      </div>

      {/* Tabla */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Comprobante</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Causa Terminación</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha Retiro</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto a Pagar</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {hayFiltros
                            ? 'Ninguna liquidación coincide con el filtro'
                            : 'Todavía no hay liquidaciones finales'}
                        </p>
                        {!hayFiltros && puedeCrear && (
                          <Button
                            onClick={() => navigate('/liquidaciones/liquidacion-final/nueva')}
                            className="mt-2 gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Crear la primera
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filas.map((liq, index) => (
                    <tr
                      key={liq.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {liq.empleado.nombre_completo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {liq.empleado.cargo ?? `CC ${liq.empleado.documento}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{liq.numero_comprobante}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{liq.motivo_etiqueta ?? '—'}</span>
                          {liq.indemniza && (
                            <span className="text-xs text-amber-600">con indemnización</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{fmtFecha(liq.fecha_retiro)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-primary">{fmtCOP(liq.total_neto)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className={ESTADO_BADGE[liq.estado]}>
                            {ESTADO_LIQUIDACION_LABEL[liq.estado]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{ESTADO_NOTA[liq.estado]}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/liquidaciones/liquidacion-final/${liq.id}`)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{filas.length}</span> de{' '}
                <span className="font-medium text-foreground">{meta.total}</span> liquidaciones
              </p>
              {meta.last_page > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={meta.current_page <= 1 || cargando}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {meta.current_page} de {meta.last_page}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={meta.current_page >= meta.last_page || cargando}
                    onClick={() => setPagina((p) => p + 1)}
                    className="gap-1"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
