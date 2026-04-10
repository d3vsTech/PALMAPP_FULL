import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Shield,
  Activity,
  RefreshCw,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('es-CO');
}

export default function SuperAdminDashboard() {
  const { token } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const result = await requestConToken<DashboardResponse>(
        '/api/v1/admin/dashboard',
        { method: 'GET' },
        token,
      );

      setDashboardData(result.data ?? null);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el dashboard del super admin',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalFincas = toNumber(dashboardData?.tenants?.total, 0);
  const fincasActivas = toNumber(dashboardData?.tenants?.activos, 0);
  const fincasSuspendidas = toNumber(dashboardData?.tenants?.suspendidos, 0);
  const fincasInactivas = toNumber(dashboardData?.tenants?.inactivos, 0);

  const usuariosTotales = toNumber(dashboardData?.usuarios?.total, 0);
  const usuariosActivos = toNumber(dashboardData?.usuarios?.activos, 0);
  const superAdmins = toNumber(dashboardData?.usuarios?.super_admins, 0);

  const totalAsignaciones = toNumber(dashboardData?.asignaciones?.total, 0);
  const tenantsRecientes = dashboardData?.tenants_recientes ?? [];

  const porcentajeActivas = totalFincas > 0
    ? Math.round((fincasActivas / totalFincas) * 100)
    : 0;

  const estadosChartData = useMemo(
    () => [
      { nombre: 'Activas', total: fincasActivas },
      { nombre: 'Suspendidas', total: fincasSuspendidas },
      { nombre: 'Inactivas', total: fincasInactivas },
    ],
    [fincasActivas, fincasSuspendidas, fincasInactivas],
  );

  const rolesChartData = useMemo(() => {
    const porRol = dashboardData?.asignaciones?.por_rol ?? {};

    return Object.entries(porRol).map(([rol, total]) => ({
      rol,
      total: toNumber(total, 0),
    }));
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="inline-flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Panel de Control Central
          </h1>
          <p className="text-gray-400">
            Vista general del sistema Devs Technology
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Recargar
          </button>

          <div className="px-4 py-2 bg-gradient-to-r from-[#9032F0]/10 to-[#6506FF]/10 border border-[#9032F0]/30 rounded-xl">
            <p className="text-sm font-semibold text-[#9032F0]">Sistema AGRO CAMPO</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Fincas */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#9032F0]/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#9032F0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#9032F0]/10 rounded-xl group-hover:bg-[#9032F0]/20 transition-colors border border-[#9032F0]/20">
                <Building2 className="w-6 h-6 text-[#9032F0]" />
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg font-medium">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{totalFincas}</p>
            <p className="text-sm text-gray-400">Fincas registradas</p>
          </div>
        </div>

        {/* Fincas Activas */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#6506FF]/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6506FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#6506FF]/10 rounded-xl group-hover:bg-[#6506FF]/20 transition-colors border border-[#6506FF]/20">
                <CheckCircle2 className="w-6 h-6 text-[#6506FF]" />
              </div>
              <span className="text-xs text-[#9032F0] bg-[#9032F0]/10 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold border border-[#9032F0]/20">
                <TrendingUp className="w-3 h-3" />
                {porcentajeActivas}%
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{fincasActivas}</p>
            <p className="text-sm text-gray-400">Fincas activas</p>
          </div>
        </div>

        {/* Fincas Suspendidas */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-yellow-500/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors border border-yellow-500/20">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg font-medium">
                Estado
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{fincasSuspendidas}</p>
            <p className="text-sm text-gray-400">Fincas suspendidas</p>
          </div>
        </div>

        {/* Fincas Inactivas */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-red-500/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors border border-red-500/20">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg font-medium">
                Estado
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{fincasInactivas}</p>
            <p className="text-sm text-gray-400">Fincas inactivas</p>
          </div>
        </div>

        {/* Usuarios Totales */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#9032F0]/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#9032F0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#9032F0]/10 rounded-xl group-hover:bg-[#9032F0]/20 transition-colors border border-[#9032F0]/20">
                <Users className="w-6 h-6 text-[#9032F0]" />
              </div>
              <span className="text-xs text-[#9032F0] bg-[#9032F0]/10 px-2 py-1 rounded-lg font-semibold border border-[#9032F0]/20">
                {usuariosActivos} activos
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{usuariosTotales}</p>
            <p className="text-sm text-gray-400">Usuarios del sistema</p>
          </div>
        </div>

        {/* Super Admins */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#6506FF]/50 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6506FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#6506FF]/10 rounded-xl group-hover:bg-[#6506FF]/20 transition-colors border border-[#6506FF]/20">
                <Shield className="w-6 h-6 text-[#c79cff]" />
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg font-medium">
                Global
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{superAdmins}</p>
            <p className="text-sm text-gray-400">Super admins</p>
          </div>
        </div>

        {/* Asignaciones */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#9032F0]/50 transition-all duration-300 group col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#9032F0]/5 via-[#6506FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#9032F0]/10 to-[#6506FF]/10 rounded-xl group-hover:from-[#9032F0]/20 group-hover:to-[#6506FF]/20 transition-colors border border-[#9032F0]/20">
                <Activity className="w-6 h-6 text-[#9032F0]" />
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg font-medium">
                Asignaciones
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-white mb-1">{totalAsignaciones}</p>
                <p className="text-sm text-gray-400">Total de asignaciones</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white mb-1">
                  {rolesChartData.length}
                </p>
                <p className="text-sm text-gray-400">Roles con actividad</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Estado de las fincas */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Estado de las fincas</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadosChartData}>
              <defs>
                <linearGradient id="gradient-estados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9032F0" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6506FF" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.08} />
              <XAxis dataKey="nombre" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid rgba(144, 50, 240, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  backdropFilter: 'blur(20px)',
                }}
              />
              <Bar dataKey="total" fill="url(#gradient-estados)" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Asignaciones por rol */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Asignaciones por rol</h3>

          {rolesChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No hay datos de asignaciones por rol
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rolesChartData}>
                <defs>
                  <linearGradient id="gradient-roles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6506FF" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#9032F0" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.08} />
                <XAxis dataKey="rol" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(144, 50, 240, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(20px)',
                  }}
                />
                <Bar dataKey="total" fill="url(#gradient-roles)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tenants Recientes */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Fincas recientes</h3>
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg font-medium border border-white/10">
            Últimos registros
          </span>
        </div>

        {tenantsRecientes.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-gray-400">
            No hay fincas recientes para mostrar
          </div>
        ) : (
          <div className="space-y-3">
            {tenantsRecientes.map((tenant) => (
              <div
                key={String(tenant.id)}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-white/10 bg-black/20 p-4 hover:border-[#9032F0]/30 transition-all duration-200"
              >
                <div>
                  <p className="text-white font-semibold">{tenant.nombre}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    NIT: {tenant.nit || '—'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-[#9032F0]/20 bg-[#9032F0]/10 px-3 py-1 text-xs font-semibold text-[#c79cff]">
                    {tenant.plan || 'Sin plan'}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                    {tenant.estado || 'Sin estado'}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                    {formatDate(tenant.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}