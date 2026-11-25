/**
 * Pantalla 5 — Listado de liquidaciones finales (API_LIQUIDACIONES §11.2 y §11.5).
 *
 * Los filtros son del servidor: el backend pagina y ordena por fecha de retiro.
 * Las cards vienen de `resumen`, no de sumar la página, porque la página es
 * solo un recorte de lo que hay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Plus, FileText, Loader2, ChevronLeft, ChevronRight, Wallet, FilePen, BadgeCheck, CheckCircle2,
} from 'lucide-react';
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
import { ESTADO_BADGE, fmtCOP, fmtFecha, mensajeErrorLiquidacion } from './final/comunes';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import StatStrip from '../../components/common/StatStrip';
import SeccionEncabezado from '../../components/liquidaciones/SeccionEncabezado';
import FiltrosFila from '../../components/liquidaciones/FiltrosFila';
import VacioCard from '../../components/liquidaciones/VacioCard';

const POR_PAGINA = 15;

/** El desplegable no acepta una opcion con valor vacio, asi que el "sin
 *  filtro" viaja con esta palabra y se traduce a vacio al guardarlo. */
const TODOS = 'TODOS';

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
  const irANueva = () => navigate('/liquidaciones/liquidacion-final/nueva');
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstado('');
    setMotivoRetiro('');
    setAnio('');
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <SeccionEncabezado
        title="Liquidaciones finales"
        description="Liquidación de prestaciones al terminar un contrato."
        actions={
          puedeCrear && (
            <Button onClick={irANueva}>
              <Plus strokeWidth={2} />
              Nueva liquidación
            </Button>
          )
        }
      />

      {/* Cards del resumen (§11.2) */}
      <StatStrip
        items={[
          { label: 'Monto por pagar', value: fmtCOP(resumen?.monto_por_pagar ?? 0), note: 'Liquidaciones aprobadas', icon: Wallet, tone: 'green' },
          { label: 'Borradores', value: resumen?.borradores ?? 0, note: 'Sin aprobar', icon: FilePen, tone: 'amber' },
          { label: 'Aprobadas', value: resumen?.aprobadas ?? 0, note: 'Pendientes de pago', icon: BadgeCheck, tone: 'blue' },
          { label: 'Pagadas', value: resumen?.pagadas ?? 0, note: 'Finalizadas', icon: CheckCircle2, tone: 'green' },
        ]}
      />

      <div className="space-y-3">
        <FiltrosFila
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          placeholder="Buscar colaborador"
          activos={hayFiltros}
          resultados={meta?.total}
          onLimpiar={limpiarFiltros}
        >
          <Select
            value={estado || TODOS}
            onValueChange={(valor) => {
              setEstado(valor === TODOS ? '' : (valor as EstadoLiquidacionFinal));
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label="Estado" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              <SelectItem value="BORRADOR">Borrador</SelectItem>
              <SelectItem value="APROBADA">Aprobada</SelectItem>
              <SelectItem value="PAGADA">Pagada</SelectItem>
              <SelectItem value="ANULADA">Anulada</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={motivoRetiro || TODOS}
            onValueChange={(valor) => {
              setMotivoRetiro(valor === TODOS ? '' : (valor as MotivoRetiroCodigo));
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label="Motivo de retiro" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los motivos</SelectItem>
              {motivos.map((m) => (
                <SelectItem key={m.codigo} value={m.codigo}>
                  {m.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Año de retiro"
            aria-label="Año de retiro"
            value={anio}
            onChange={(e) => {
              setAnio(e.target.value);
              setPagina(1);
            }}
            className="w-full sm:w-32"
          />
        </FiltrosFila>

        {cargando && filas.length === 0 ? (
          <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando liquidaciones...
          </Card>
        ) : filas.length === 0 ? (
          <VacioCard
            icon={FileText}
            title={hayFiltros ? 'Ninguna liquidación coincide' : 'No hay liquidaciones finales registradas'}
            description={
              hayFiltros
                ? 'Ninguna liquidación coincide con los filtros.'
                : 'Crea la primera liquidación final de contrato.'
            }
            action={
              !hayFiltros && puedeCrear ? (
                <Button onClick={irANueva}>
                  <Plus strokeWidth={2} />
                  Crear primera liquidación
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="gap-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Comprobante</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Causa de terminación</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Fecha de retiro</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Neto a pagar</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Estado</th>
                    <th className="w-10 px-2 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-border ${cargando ? 'opacity-60' : ''}`}>
                  {filas.map((liq) => {
                    const to = `/liquidaciones/liquidacion-final/${liq.id}`;
                    const estadoBadge = (
                      <span className="flex flex-wrap items-center gap-1">
                        <Badge variant={ESTADO_BADGE[liq.estado]}>
                          {ESTADO_LIQUIDACION_LABEL[liq.estado]}
                        </Badge>
                        {/* PR-L14: una PAGADA cargada desde archivo no admite las mismas acciones. */}
                        {liq.origen === 'HISTORICO' && <Badge variant="outline">Histórico</Badge>}
                      </span>
                    );
                    return (
                      <tr key={liq.id} className="transition-colors hover:bg-muted/40">
                        <td className="min-w-[12rem] px-5 py-3">
                          <Link to={to} className="font-semibold text-foreground hover:text-primary">
                            {liq.empleado.nombre_completo}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {liq.empleado.cargo ?? `C.C. ${liq.empleado.documento}`}
                          </span>
                          <span className="mt-1 block sm:hidden">{estadoBadge}</span>
                        </td>
                        <td className="hidden px-4 py-3 tabular-nums text-muted-foreground lg:table-cell">
                          {liq.numero_comprobante}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {liq.motivo_etiqueta ?? 'Sin motivo'}
                          {liq.indemniza && (
                            <span className="block text-xs text-muted-foreground">Con indemnización</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                          {fmtFecha(liq.fecha_retiro)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                          {fmtCOP(liq.total_neto)}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">{estadoBadge}</td>
                        <td className="px-2 py-3 text-right">
                          <Link
                            to={to}
                            aria-label={`Ver detalle de ${liq.empleado.nombre_completo}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={2} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta && meta.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
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
                    >
                      <ChevronLeft strokeWidth={2} />
                      Anterior
                    </Button>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {meta.current_page} de {meta.last_page}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.current_page >= meta.last_page || cargando}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight strokeWidth={2} />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
