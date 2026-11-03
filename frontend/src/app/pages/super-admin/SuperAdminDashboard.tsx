import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { formatFechaHora } from '../../utils/fecha';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import {
  barCategoryGap,
  barLabelProps,
  barProps,
  CHART_COLORS,
  gridProps,
  tooltipProps,
  xAxisProps,
  yAxisProps,
} from '../../components/common/chartTheme';
import { num } from '../../lib/formato';

interface DashboardResponse {
  data?: {
    tenants?: {
      total?: number;
      activos?: number;
      suspendidos?: number;
      inactivos?: number;
    };
    usuarios?: {
      total?: number;
      activos?: number;
      super_admins?: number;
    };
    asignaciones?: {
      total?: number;
      por_rol?: Record<string, number>;
    };
    tenants_recientes?: Array<{
      id: number | string;
      nombre: string;
      nit?: string;
      estado?: string;
      plan?: string;
      created_at?: string;
    }>;
  };
}

function aNumero(valor: unknown, porDefecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

/** El estado que manda el backend, con el color que le corresponde. */
function variantePorEstado(estado?: string) {
  const e = (estado ?? '').toLowerCase();
  if (e === 'activo' || e === 'activa') return 'success' as const;
  if (e === 'suspendido' || e === 'suspendida') return 'warning' as const;
  if (e === 'inactivo' || e === 'inactiva') return 'destructive' as const;
  return 'secondary' as const;
}

export default function SuperAdminDashboard() {
  const { token } = useAuth();

  const [datos, setDatos] = useState<DashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (esRecarga = false) => {
    if (!token) return;

    if (esRecarga) setRecargando(true);
    else setLoading(true);
    setError('');

    try {
      const res = await requestConToken<DashboardResponse>(
        '/api/v1/admin/dashboard',
        { method: 'GET' },
        token,
      );
      setDatos(res.data ?? null);
    } catch (err) {
      console.error('Error al cargar el panel de super admin:', err);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el panel');
    } finally {
      setLoading(false);
      setRecargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const totalFincas = aNumero(datos?.tenants?.total);
  const fincasActivas = aNumero(datos?.tenants?.activos);
  const fincasSuspendidas = aNumero(datos?.tenants?.suspendidos);
  const fincasInactivas = aNumero(datos?.tenants?.inactivos);

  const usuariosTotales = aNumero(datos?.usuarios?.total);
  const usuariosActivos = aNumero(datos?.usuarios?.activos);
  const superAdmins = aNumero(datos?.usuarios?.super_admins);

  const totalAsignaciones = aNumero(datos?.asignaciones?.total);
  const recientes = datos?.tenants_recientes ?? [];

  const porcentajeActivas = totalFincas > 0 ? Math.round((fincasActivas / totalFincas) * 100) : 0;

  const estadosChart = useMemo(
    () => [
      { nombre: 'Activas', total: fincasActivas },
      { nombre: 'Suspendidas', total: fincasSuspendidas },
      { nombre: 'Inactivas', total: fincasInactivas },
    ],
    [fincasActivas, fincasSuspendidas, fincasInactivas],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Panel general"
        description="Estado de las fincas clientes, sus usuarios y las asignaciones del sistema."
        actions={
          <Button variant="outline" onClick={() => void cargar(true)} disabled={recargando}>
            {recargando
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
            Recargar
          </Button>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <StatStrip
        loading={loading}
        items={[
          {
            label: 'Fincas registradas',
            value: num(totalFincas),
            note: `${num(fincasActivas)} activas · ${num(fincasSuspendidas)} suspendidas`,
          },
          {
            label: 'Fincas inactivas',
            value: num(fincasInactivas),
            note: `${porcentajeActivas} % del total está activo`,
          },
          {
            label: 'Usuarios',
            value: num(usuariosTotales),
            note: `${num(usuariosActivos)} activos`,
          },
          {
            label: 'Super admins',
            value: num(superAdmins),
            note: `${num(totalAsignaciones)} asignaciones en total`,
          },
        ]}
      />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Estado de las fincas</CardTitle>
          <CardDescription>Cuántas fincas hay en cada estado</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={estadosChart} barCategoryGap={barCategoryGap} margin={{ top: 24, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nombre" {...xAxisProps} />
                <YAxis {...yAxisProps} allowDecimals={false} width={44} />
                <Tooltip {...tooltipProps} formatter={(valor: number) => [num(valor), 'Fincas']} />
                <Bar {...barProps} dataKey="total" fill={CHART_COLORS[0]}>
                  <LabelList dataKey="total" {...barLabelProps} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <h3>Fincas recientes</h3>
            <p className="text-xs text-muted-foreground">Los últimos registros del sistema</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-border py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : recientes.length === 0 ? (
          <div className="border-t border-border py-12 text-center text-sm text-muted-foreground">
            No hay fincas recientes para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Finca</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Plan</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recientes.map((finca) => (
                  <tr key={String(finca.id)} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <span className="font-semibold text-foreground">{finca.nombre}</span>
                      <span className="block text-xs text-muted-foreground">
                        NIT {finca.nit || '—'}
                        <span className="sm:hidden"> · {finca.plan || 'Sin plan'}</span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {finca.plan || 'Sin plan'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={variantePorEstado(finca.estado)}>
                        {finca.estado || 'Sin estado'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">
                      {formatFechaHora(finca.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
