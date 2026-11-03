import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Loader2, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import {
  proveedorApi,
  toNumber,
  buildImagenUrl,
  type DashboardProveedorResponse,
  type EstadoPedidoProv,
} from '../../../api/proveedor';
import { proveedorAuthStorage } from '../../../api/proveedorAuth';
import { formatFecha as formatFechaSafe } from '../../utils/fecha';
import { cop, copCompacto, num } from '../../lib/formato';

type VarianteBadge = 'warning' | 'info' | 'success' | 'destructive' | 'secondary';

const ESTADOS: Record<EstadoPedidoProv, { label: string; variante: VarianteBadge }> = {
  pendiente:   { label: 'Pendiente',      variante: 'warning' },
  confirmado:  { label: 'Confirmado',     variante: 'info' },
  preparando:  { label: 'En preparación', variante: 'info' },
  en_transito: { label: 'En camino',      variante: 'info' },
  entregado:   { label: 'Entregado',      variante: 'success' },
  cancelado:   { label: 'Cancelado',      variante: 'destructive' },
};

/** Aquí el vacío se muestra como '' y no como '—'. */
const formatFecha = (iso: string): string => (iso ? formatFechaSafe(iso) : '');

export default function ProveedorDashboard() {
  const proveedor = proveedorAuthStorage.getProveedor();
  const user = proveedorAuthStorage.getUser();
  const nombreProveedor = proveedor?.nombre_empresa ?? user?.name ?? 'Proveedor';

  const [data, setData] = useState<DashboardProveedorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proveedorApi.dashboard()
      .then((res) => setData(res.data))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'No se pudo cargar el panel');
      })
      .finally(() => setLoading(false));
  }, []);

  const indicadores = data?.indicadores;
  const pedidos = data?.pedidos_recientes ?? [];
  const productos = data?.productos_mas_vendidos ?? [];

  const variacion = indicadores?.variacion_ventas_porcentaje;
  const notaVentas = variacion == null
    ? 'Sin datos del mes anterior'
    : `${variacion > 0 ? '+' : ''}${num(variacion, 1)} % frente al mes anterior`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal de proveedores"
        title={`Hola, ${nombreProveedor}`}
        description="Resumen de tu actividad en el marketplace."
        actions={
          <Button asChild>
            <Link to="/proveedor/productos/nuevo">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      <StatStrip
        loading={loading}
        items={[
          {
            label: 'Ventas del mes',
            value: copCompacto(indicadores?.ventas_mes_actual ?? 0),
            note: notaVentas,
            trend: variacion == null || variacion === 0 ? undefined : {
              label: `${num(Math.abs(variacion), 1)} %`,
              direction: variacion > 0 ? 'up' : 'down',
              positive: variacion > 0,
            },
          },
          {
            label: 'Productos activos',
            value: num(indicadores?.productos_activos ?? 0),
            note: `de ${num(indicadores?.productos_total ?? 0)} publicados`,
          },
          {
            label: 'Pedidos pendientes',
            value: num(indicadores?.pedidos_pendientes ?? 0),
            note: `${num(indicadores?.pedidos_en_proceso ?? 0)} en proceso`,
          },
          {
            label: 'Pedidos completados',
            value: num(indicadores?.pedidos_completados_mes ?? 0),
            note: 'este mes',
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <h3>Pedidos recientes</h3>
              <p className="text-xs text-muted-foreground">Lo último que te pidieron las fincas</p>
            </div>
            <Link
              to="/proveedor/pedidos"
              className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-t border-border py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : pedidos.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                title="Todavía no tienes pedidos"
                description="Cuando una finca te compre, el pedido aparece aquí."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {pedidos.map((pedido) => {
                const estado = ESTADOS[pedido.estado] ?? ESTADOS.pendiente;
                return (
                  <li key={pedido.id}>
                    <Link
                      to={`/proveedor/pedidos/${pedido.codigo}`}
                      className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-foreground">
                            {pedido.tenant?.nombre ?? '—'}
                          </span>
                          <Badge variant={estado.variante}>{estado.label}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                          {pedido.primer_producto?.nombre ?? '—'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {num(pedido.primer_producto?.cantidad ?? 0)}
                          {pedido.primer_producto?.unidad ? ` ${pedido.primer_producto.unidad}` : ''}
                          {' · '}{formatFecha(pedido.fecha_pedido)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-semibold text-foreground">
                        {cop(toNumber(pedido.total))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden">
          <div className="px-5 py-4">
            <h3>Productos más vendidos</h3>
            <p className="text-xs text-muted-foreground">Por ingresos acumulados</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-t border-border py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : productos.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                title="Todavía no hay ventas"
                description="Cuando empieces a vender, aquí verás qué se mueve más."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {productos.map((producto) => {
                const imagen = buildImagenUrl(producto.imagen_principal);
                return (
                  <li key={producto.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      {imagen ? (
                        <img
                          src={imagen}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Package className="h-4 w-4" strokeWidth={2} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground" title={producto.nombre}>
                          {producto.nombre}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {num(producto.unidades_vendidas)} unidades vendidas
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-foreground">
                        {copCompacto(toNumber(producto.ingresos_acumulados))}
                      </span>
                      <span className="block text-xs text-muted-foreground">ingresos</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
