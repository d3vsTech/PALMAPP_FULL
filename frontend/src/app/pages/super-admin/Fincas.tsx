import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  Search,
  Filter,
  Users,
  RefreshCw,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CrearFincaModal, {
  type FincaFormData,
} from '../../components/super-admin/CrearFincaModal';

type EstadoTenant = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

interface FincaItem {
  id: number;
  tipoPersona: string;
  nombre: string;
  nit: string;
  razonSocial: string;
  correoContacto: string;
  telefono: string;
  direccion: string;
  departamento: string;
  municipio: string;
  estado: EstadoTenant;
  fechaActivacion: string;
  fechaSuspension: string;
  totalUsuarios: number;
  totalEmpleados: number;
}

interface DashboardStatsResponse {
  data?: {
    tenants?: {
      total?: number;
      activos?: number;
      suspendidos?: number;
      inactivos?: number;
    };
  };
}

interface LaravelPagination<T> {
  data?: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  meta?: {
    current_page?: number;
    last_page?: number;
    total?: number;
  };
}

interface TenantDetailResponse {
  data?: any;
  modulos?: Record<string, unknown>;
  config_nomina?: Record<string, unknown>;
}

const PAGE_SIZE = 10;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEstado(value: unknown): EstadoTenant {
  const normalized = String(value ?? 'ACTIVO').trim().toUpperCase();

  if (normalized === 'SUSPENDIDO' || normalized === 'INACTIVO') {
    return normalized;
  }

  return 'ACTIVO';
}

/**
 * Formatea una fecha del backend (YYYY-MM-DD o ISO completo) al formato DD/MM/YYYY.
 * Si la fecha es inválida o vacía, devuelve "—".
 */
function formatearFecha(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '—';
  // Soporta "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss" y "YYYY-MM-DD HH:mm:ss"
  const ymd = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return raw;
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

function normalizeTenant(raw: any): FincaItem {
  return {
    id: toNumber(raw?.id),
    tipoPersona: String(raw?.tipo_persona ?? 'NATURAL'),
    nombre: String(raw?.nombre ?? ''),
    nit: String(raw?.nit ?? ''),
    razonSocial: String(raw?.razon_social ?? ''),
    correoContacto: String(raw?.correo_contacto ?? ''),
    telefono: String(raw?.telefono ?? ''),
    direccion: String(raw?.direccion ?? ''),
    departamento: String(raw?.departamento ?? ''),
    municipio: String(raw?.municipio ?? ''),
    estado: normalizeEstado(raw?.estado ?? raw?.status),
    fechaActivacion: String(raw?.fecha_activacion ?? ''),
    fechaSuspension: String(raw?.fecha_suspension ?? ''),
    totalUsuarios: toNumber(raw?.total_usuarios, 0),
    totalEmpleados: toNumber(raw?.total_empleados, 0),
  };
}

function fincaToFormData(finca: FincaItem | null): FincaFormData | null {
  if (!finca) return null;

  return {
    tipo_persona: (finca as any).tipoPersona || 'NATURAL',
    nombre: finca.nombre,
    nit: finca.nit,
    razon_social: finca.razonSocial,
    correo_contacto: finca.correoContacto,
    telefono: finca.telefono,
    direccion: finca.direccion,
    departamento: finca.departamento,
    municipio: finca.municipio,
    fecha_activacion: finca.fechaActivacion,
    fecha_suspension: finca.fechaSuspension,
  };
}

function buildTenantPayload(formData: FincaFormData) {
  const payload: Record<string, unknown> = {
    tipo_persona: formData.tipo_persona,
    nombre: formData.nombre.trim(),
  };

  const optionalStrings: Record<string, string> = {
    nit: formData.nit.trim(),
    razon_social: formData.razon_social.trim(),
    correo_contacto: formData.correo_contacto.trim(),
    telefono: formData.telefono.trim(),
    direccion: formData.direccion.trim(),
    departamento: formData.departamento.trim(),
    municipio: formData.municipio.trim(),
    fecha_activacion: formData.fecha_activacion ? formData.fecha_activacion.split('-').reverse().join('/') : '',
    fecha_suspension: formData.fecha_suspension ? formData.fecha_suspension.split('-').reverse().join('/') : '',
  };

  Object.entries(optionalStrings).forEach(([key, value]) => {
    if (value) {
      payload[key] = value;
    }
  });

  return payload;
}

function getEstadoClasses(estado: EstadoTenant) {
  switch (estado) {
    case 'ACTIVO':
      return 'border-green-500/20 bg-green-500/10 text-green-400';
    case 'SUSPENDIDO':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    case 'INACTIVO':
      return 'border-red-500/20 bg-red-500/10 text-red-400';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300';
  }
}

function getEstadoDot(estado: EstadoTenant) {
  switch (estado) {
    case 'ACTIVO':
      return 'bg-green-400';
    case 'SUSPENDIDO':
      return 'bg-yellow-400';
    case 'INACTIVO':
      return 'bg-red-400';
    default:
      return 'bg-slate-400';
  }
}

export default function Fincas() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [fincas, setFincas] = useState<FincaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | EstadoTenant>(
    'TODOS',
  );

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    inactivos: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedFinca, setSelectedFinca] = useState<FincaItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailFinca, setDetailFinca] = useState<FincaItem | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'warning' | 'danger';
    onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const showConfirm = (
    title: string,
    description: string,
    variant: 'warning' | 'danger',
    onConfirm: () => Promise<void>,
  ) => {
    setConfirmDialog({ open: true, title, description, variant, onConfirm });
  };

  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, open: false }));

  const handleOpenDetail = async (tenantId: number) => {
    if (!token) return;

    setLoadingDetailId(tenantId);

    try {
      const result = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );

      const tenant = normalizeTenant(result.data ?? {});
      setDetailFinca(tenant);
      setShowDetailModal(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el detalle de la finca',
      );
    } finally {
      setLoadingDetailId(null);
    }
  };

  const loadStats = useCallback(async () => {
    if (!token) return;

    try {
      const result = await requestConToken<DashboardStatsResponse>(
        '/api/v1/admin/dashboard',
        { method: 'GET' },
        token,
      );

      setStats({
        total: toNumber(result.data?.tenants?.total, 0),
        activos: toNumber(result.data?.tenants?.activos, 0),
        suspendidos: toNumber(result.data?.tenants?.suspendidos, 0),
        inactivos: toNumber(result.data?.tenants?.inactivos, 0),
      });
    } catch (error) {
      console.error('Error cargando estadísticas de fincas:', error);
    }
  }, [token]);

  const loadFincas = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (filterEstado !== 'TODOS') params.set('estado', filterEstado);

      params.set('sort_by', 'nombre');
      params.set('sort_dir', 'asc');
      params.set('per_page', String(PAGE_SIZE));
      params.set('page', String(page));

      const result = await requestConToken<LaravelPagination<any>>(
        `/api/v1/admin/tenants?${params.toString()}`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(result.data) ? result.data : [];

      setFincas(items.map(normalizeTenant));
      setLastPage(toNumber(result.last_page ?? result.meta?.last_page, 1));
      setTotalItems(toNumber(result.total ?? result.meta?.total, items.length));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron cargar las fincas',
      );
      setFincas([]);
      setLastPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [filterEstado, page, searchTerm, token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadFincas();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadFincas]);

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadFincas()]);
    toast.success('Listado de fincas actualizado');
  };

  const handleOpenCreate = () => {
    setSelectedFinca(null);
    setShowModal(true);
  };

  const handleOpenEdit = async (tenantId: number) => {
    if (!token) return;

    setLoadingEditId(tenantId);

    try {
      const result = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );

      const tenant = normalizeTenant(result.data ?? {});

      setSelectedFinca(tenant);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el detalle de la finca',
      );
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleSaveFinca = async (formData: FincaFormData) => {
    if (!token) return;

    setSaving(true);

    try {
      const payload = buildTenantPayload(formData);

      if (selectedFinca) {
        const result = await requestConToken<{ message?: string }>(
          `/api/v1/admin/tenants/${selectedFinca.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
          token,
        );

        toast.success(result.message ?? 'Finca actualizada correctamente');
      } else {
        const result = await requestConToken<{ message?: string }>(
          '/api/v1/admin/tenants',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          token,
        );

        toast.success(result.message ?? 'Finca creada correctamente');
      }

      setShowModal(false);
      setSelectedFinca(null);

      await Promise.all([loadStats(), loadFincas()]);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la finca',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (finca: FincaItem) => {
    if (!token) return;

    if (finca.estado === 'INACTIVO') {
      toast.error('Un tenant inactivo no se puede activar/suspender desde aquí');
      return;
    }

    const accion = finca.estado === 'ACTIVO' ? 'suspender' : 'activar';

    showConfirm(
      `${accion.charAt(0).toUpperCase() + accion.slice(1)} finca`,
      `¿Seguro que deseas ${accion} la finca "${finca.nombre}"?`,
      finca.estado === 'ACTIVO' ? 'warning' : 'success' as any,
      async () => {
        const result = await requestConToken<{ message?: string }>(
          `/api/v1/admin/tenants/${finca.id}/toggle`,
          { method: 'PATCH' },
          token,
        );
        toast.success(result.message ?? 'Estado de la finca actualizado');
        closeConfirm();
        await Promise.all([loadStats(), loadFincas()]);
      },
    );
  };

  const handleDelete = async (finca: FincaItem) => {
    if (!token) return;

    showConfirm(
      'Eliminar finca',
      `¿Seguro que deseas eliminar "${finca.nombre}"? Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        const result = await requestConToken<{ message?: string }>(
          `/api/v1/admin/tenants/${finca.id}`,
          { method: 'DELETE' },
          token,
        );
        toast.success(result.message ?? 'Finca eliminada correctamente');
        closeConfirm();
        if (page > 1 && fincas.length === 1) {
          setPage((prev) => Math.max(1, prev - 1));
          await loadStats();
        } else {
          await Promise.all([loadStats(), loadFincas()]);
        }
      },
    );
  };

  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestión de Fincas</h1>
          <p className="text-slate-400">Administra todos los clientes del sistema</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            <Plus className="w-5 h-5" />
            Crear nueva finca
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Activas</p>
          <p className="text-2xl font-bold text-green-400">{stats.activos}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Suspendidas</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.suspendidos}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Inactivas</p>
          <p className="text-2xl font-bold text-red-400">{stats.inactivos}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              placeholder="Buscar por nombre, NIT o razón social..."
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterEstado}
              onChange={(e) => {
                setPage(1);
                setFilterEstado(e.target.value as 'TODOS' | EstadoTenant);
              }}
              className="pl-11 pr-10 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activas</option>
              <option value="SUSPENDIDO">Suspendidas</option>
              <option value="INACTIVO">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <p className="text-sm text-slate-400">
            Mostrando{' '}
            <span className="text-white font-semibold">
              {showingFrom}-{showingTo}
            </span>{' '}
            de <span className="text-white font-semibold">{totalItems}</span>{' '}
            fincas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Finca</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contacto</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ubicación</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Estado</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Activación</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Suspensión</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Usuarios</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando fincas...
                    </div>
                  </td>
                </tr>
              ) : fincas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No se encontraron fincas</p>
                  </td>
                </tr>
              ) : (
                fincas.map((finca) => (
                  <tr
                    key={finca.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{finca.nombre}</p>
                          <p className="text-xs text-slate-400">ID: {finca.id}</p>
                          <p className="text-xs text-slate-500">NIT: {finca.nit || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{finca.correoContacto || '—'}</p>
                      <p className="text-xs text-slate-500 mt-1">{finca.telefono || 'Sin teléfono'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">
                        {finca.municipio || '—'}
                        {finca.departamento ? `, ${finca.departamento}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{finca.direccion || 'Sin dirección'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${getEstadoClasses(finca.estado)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getEstadoDot(finca.estado)}`}></div>
                        {finca.estado}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{formatearFecha(finca.fechaActivacion)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{formatearFecha(finca.fechaSuspension)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{finca.totalUsuarios || 0} asignados</p>
                      <p className="text-xs text-slate-500 mt-1">{finca.totalEmpleados || 0} empleados</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleOpenDetail(finca.id)}
                          disabled={loadingDetailId === finca.id}
                          className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Ver detalle"
                        >
                          {loadingDetailId === finca.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            navigate(`/super-admin/fincas/${finca.id}/usuarios`)
                          }
                          className="p-2 hover:bg-cyan-500/10 text-cyan-400 rounded-lg transition-colors"
                          title="Usuarios por finca"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void handleOpenEdit(finca.id)}
                          disabled={loadingEditId === finca.id}
                          className="p-2 hover:bg-purple-500/10 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          {loadingEditId === finca.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Edit2 className="w-4 h-4" />
                          )}
                        </button>

                        {finca.estado === 'ACTIVO' ? (
                          <button
                            onClick={() => void handleToggle(finca)}
                            className="p-2 hover:bg-yellow-500/10 text-yellow-400 rounded-lg transition-colors"
                            title="Suspender"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleToggle(finca)}
                            disabled={finca.estado === 'INACTIVO'}
                            className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors disabled:opacity-40"
                            title="Activar"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => void handleDelete(finca)}
                          className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Página <span className="text-white font-semibold">{page}</span> de{' '}
            <span className="text-white font-semibold">{lastPage}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
              disabled={page >= lastPage}
              className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <CrearFincaModal
        isOpen={showModal}
        onClose={() => {
          if (saving) return;
          setShowModal(false);
          setSelectedFinca(null);
        }}
        onSave={handleSaveFinca}
        fincaData={fincaToFormData(selectedFinca)}
        isEdit={Boolean(selectedFinca)}
        isSaving={saving}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />

      {/* Modal de detalle */}
      {showDetailModal && detailFinca && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{detailFinca.nombre}</h2>
                  <p className="text-sm text-white/80">Detalle de la finca</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailFinca(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6 space-y-6">
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Información General</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Nombre</p>
                    <p className="text-white">{detailFinca.nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">NIT</p>
                    <p className="text-white">{detailFinca.nit || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Razón Social</p>
                    <p className="text-white">{detailFinca.razonSocial || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Estado</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${getEstadoClasses(detailFinca.estado)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getEstadoDot(detailFinca.estado)}`}></div>
                      {detailFinca.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Correo</p>
                    <p className="text-white">{detailFinca.correoContacto || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Teléfono</p>
                    <p className="text-white">{detailFinca.telefono || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Ubicación</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Departamento</p>
                    <p className="text-white">{detailFinca.departamento || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Municipio</p>
                    <p className="text-white">{detailFinca.municipio || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Dirección</p>
                    <p className="text-white">{detailFinca.direccion || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Fechas y Usuarios</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Fecha Activación</p>
                    <p className="text-white">{formatearFecha(detailFinca.fechaActivacion)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fecha Suspensión</p>
                    <p className="text-white">{formatearFecha(detailFinca.fechaSuspension)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Usuarios Asignados</p>
                    <p className="text-white">{detailFinca.totalUsuarios}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Empleados</p>
                    <p className="text-white">{detailFinca.totalEmpleados}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}