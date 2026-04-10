import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  Power,
  Shield,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { requestConToken } from '../../../api/request';

interface TenantAssignment {
  tenant_id?: number;
  nombre?: string;
  nit?: string;
  estado_tenant?: string;
  plan?: string;
  rol?: string;
  estado?: boolean;
}

interface UsuarioGlobal {
  id: number;
  name: string;
  email: string;
  is_super_admin: boolean;
  status: boolean;
  created_at?: string;
  tenants: TenantAssignment[];
}

interface DashboardUsersResponse {
  data?: {
    usuarios?: {
      total?: number;
      activos?: number;
      super_admins?: number;
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

interface UserDetailResponse {
  data?: any;
}

interface UsuarioFormData {
  name: string;
  email: string;
  password: string;
  is_super_admin: boolean;
  status: boolean;
}

const PAGE_SIZE = 10;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'si', 'sí', 'activo', 'activa'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'inactivo', 'inactiva'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeUser(raw: any): UsuarioGlobal {
  return {
    id: toNumber(raw?.id),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    is_super_admin: toBoolean(raw?.is_super_admin, false),
    status: toBoolean(raw?.status, true),
    created_at: raw?.created_at ? String(raw.created_at) : '',
    tenants: Array.isArray(raw?.tenants) ? raw.tenants : [],
  };
}

function buildUserFormData(user?: UsuarioGlobal | null): UsuarioFormData {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    is_super_admin: user?.is_super_admin ?? false,
    status: user?.status ?? true,
  };
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('es-CO');
}

function getUserTypeClasses(isSuperAdmin: boolean) {
  return isSuperAdmin
    ? 'border-[#9032F0]/30 bg-[#9032F0]/10 text-[#c79cff]'
    : 'border-blue-500/30 bg-blue-500/10 text-blue-300';
}

function getStatusClasses(status: boolean) {
  return status
    ? 'border-green-500/30 bg-green-500/10 text-green-400'
    : 'border-red-500/30 bg-red-500/10 text-red-400';
}

export default function Usuarios() {
  const { token } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    variant: 'warning' | 'danger'; onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const showConfirm = (title: string, description: string, variant: 'warning' | 'danger', onConfirm: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, variant, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }));
  const [modalLoading, setModalLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'true' | 'false'>(
    'todos',
  );
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<
    'todos' | 'true' | 'false'
  >('todos');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    superAdmins: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioGlobal | null>(
    null,
  );
  const [formData, setFormData] = useState<UsuarioFormData>(
    buildUserFormData(),
  );

  const loadStats = useCallback(async () => {
    if (!token) return;

    try {
      const result = await requestConToken<DashboardUsersResponse>(
        '/api/v1/admin/dashboard',
        { method: 'GET' },
        token,
      );

      setStats({
        total: toNumber(result.data?.usuarios?.total, 0),
        activos: toNumber(result.data?.usuarios?.activos, 0),
        superAdmins: toNumber(result.data?.usuarios?.super_admins, 0),
      });
    } catch (error) {
      console.error('Error cargando estadísticas de usuarios:', error);
    }
  }, [token]);

  const loadUsuarios = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedStatus !== 'todos') params.set('status', selectedStatus);
      if (selectedSuperAdmin !== 'todos') {
        params.set('is_super_admin', selectedSuperAdmin);
      }

      params.set('per_page', String(PAGE_SIZE));
      params.set('page', String(page));

      const result = await requestConToken<LaravelPagination<any>>(
        `/api/v1/admin/users?${params.toString()}`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(result.data) ? result.data : [];

      setUsuarios(items.map(normalizeUser));
      setLastPage(toNumber(result.last_page ?? result.meta?.last_page, 1));
      setTotalItems(toNumber(result.total ?? result.meta?.total, items.length));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los usuarios',
      );
      setUsuarios([]);
      setLastPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedStatus, selectedSuperAdmin, token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsuarios();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadUsuarios]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUsuario(null);
    setFormData(buildUserFormData());
    setShowModal(true);
  };

  const openModalWithDetail = async (
    mode: 'edit' | 'view',
    userId: number,
  ) => {
    if (!token) return;

    setModalMode(mode);
    setShowModal(true);
    setModalLoading(true);

    try {
      const result = await requestConToken<UserDetailResponse>(
        `/api/v1/admin/users/${userId}`,
        { method: 'GET' },
        token,
      );

      const user = normalizeUser(result.data ?? {});
      setSelectedUsuario(user);
      setFormData(buildUserFormData(user));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el detalle del usuario',
      );
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) return;

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      is_super_admin: formData.is_super_admin,
      status: formData.status,
    };

    if (!payload.name || !payload.email) {
      toast.error('Nombre y email son obligatorios');
      return;
    }

    if (modalMode === 'create' && !formData.password.trim()) {
      toast.error('La contraseña es obligatoria para crear el usuario');
      return;
    }

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    setSaving(true);

    try {
      if (modalMode === 'create') {
        const result = await requestConToken<{ message?: string }>(
          '/api/v1/admin/users',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          token,
        );

        toast.success(result.message ?? 'Usuario creado correctamente');
      } else if (selectedUsuario) {
        const result = await requestConToken<{ message?: string }>(
          `/api/v1/admin/users/${selectedUsuario.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
          token,
        );

        toast.success(result.message ?? 'Usuario actualizado correctamente');
      }

      setShowModal(false);
      setSelectedUsuario(null);
      setFormData(buildUserFormData());

      await Promise.all([loadStats(), loadUsuarios()]);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el usuario',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async (usuario: UsuarioGlobal) => {
    if (!token) return;

    const accion = usuario.status ? 'desactivar' : 'activar';

    showConfirm(
      `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a ${usuario.name}?`,
      accion === 'desactivar' ? 'warning' : 'success' as any,
      async () => {
        const result = await requestConToken<{ message?: string }>(
          `/api/v1/admin/users/${usuario.id}/toggle`,
          { method: 'PATCH' },
          token,
        );
        toast.success(result.message ?? 'Estado del usuario actualizado');

      await Promise.all([loadStats(), loadUsuarios()]);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado del usuario',
      );
    }
  };

  const totalInactivos = Math.max(0, stats.total - stats.activos);
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Usuarios Globales</h1>
          <p className="text-gray-400">
            CRUD de usuarios globales conectado con la API real
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9032F0] to-[#6506FF] px-5 py-3 text-white font-semibold hover:opacity-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Crear usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Total</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Activos</p>
          <p className="text-3xl font-bold text-green-400">{stats.activos}</p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Inactivos</p>
          <p className="text-3xl font-bold text-red-400">{totalInactivos}</p>
        </div>

        <div className="rounded-2xl border border-[#9032F0]/20 bg-[#9032F0]/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Super Admins</p>
          <p className="text-3xl font-bold text-[#c79cff]">
            {stats.superAdmins}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr,0.8fr,0.8fr] gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              placeholder="Buscar por nombre o email..."
              className="w-full rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
            />
          </div>

          <div className="relative">
            <Filter className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setPage(1);
                setSelectedStatus(e.target.value as 'todos' | 'true' | 'false');
              }}
              className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
            >
              <option value="todos" className="bg-[#111]">
                Todos los estados
              </option>
              <option value="true" className="bg-[#111]">
                Activos
              </option>
              <option value="false" className="bg-[#111]">
                Inactivos
              </option>
            </select>
          </div>

          <div className="relative">
            <Filter className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <select
              value={selectedSuperAdmin}
              onChange={(e) => {
                setPage(1);
                setSelectedSuperAdmin(
                  e.target.value as 'todos' | 'true' | 'false',
                );
              }}
              className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
            >
              <option value="todos" className="bg-[#111]">
                Todos los tipos
              </option>
              <option value="true" className="bg-[#111]">
                Solo Super Admin
              </option>
              <option value="false" className="bg-[#111]">
                Solo usuarios normales
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <p className="text-sm text-gray-400">
            Mostrando{' '}
            <span className="text-white font-semibold">
              {showingFrom}-{showingTo}
            </span>{' '}
            de <span className="text-white font-semibold">{totalItems}</span>{' '}
            usuarios
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Usuario
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Email
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Tipo
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Estado
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Tenants
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Creado
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-semibold">{usuario.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {usuario.id}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-white">{usuario.email}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getUserTypeClasses(
                          usuario.is_super_admin,
                        )}`}
                      >
                        <Shield className="w-3 h-3" />
                        {usuario.is_super_admin ? 'Super Admin' : 'Usuario'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          usuario.status,
                        )}`}
                      >
                        {usuario.status ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {usuario.status ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-white">
                        {usuario.tenants?.length ?? 0}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">
                        {formatDate(usuario.created_at)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void openModalWithDetail('view', usuario.id)}
                          className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void openModalWithDetail('edit', usuario.id)}
                          className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void handleToggleUser(usuario)}
                          className={`p-2 rounded-lg transition-colors ${
                            usuario.status
                              ? 'text-yellow-400 hover:bg-yellow-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                          }`}
                          title={usuario.status ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <p className="text-sm text-gray-400">
            Página <span className="text-white font-semibold">{page}</span> de{' '}
            <span className="text-white font-semibold">{lastPage}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
              disabled={page >= lastPage}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modalMode === 'create' && 'Crear usuario'}
                  {modalMode === 'edit' && 'Editar usuario'}
                  {modalMode === 'view' && 'Detalle del usuario'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {modalMode === 'create' &&
                    'Crear un nuevo usuario global del sistema'}
                  {modalMode === 'edit' &&
                    'Actualizar nombre, email, estado y permisos'}
                  {modalMode === 'view' &&
                    'Consulta las asignaciones del usuario'}
                </p>
              </div>

              <button
                onClick={() => {
                  if (saving) return;
                  setShowModal(false);
                  setSelectedUsuario(null);
                  setFormData(buildUserFormData());
                }}
                className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-144px)] overflow-y-auto p-6">
              {modalLoading ? (
                <div className="py-14 text-center">
                  <div className="inline-flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando detalle...
                  </div>
                </div>
              ) : modalMode === 'view' && selectedUsuario ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {selectedUsuario.name}
                    </h3>
                    <p className="text-gray-400">{selectedUsuario.email}</p>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getUserTypeClasses(
                          selectedUsuario.is_super_admin,
                        )}`}
                      >
                        <Shield className="w-3 h-3" />
                        {selectedUsuario.is_super_admin
                          ? 'Super Admin'
                          : 'Usuario'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          selectedUsuario.status,
                        )}`}
                      >
                        {selectedUsuario.status ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {selectedUsuario.status ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Tenants asignados
                    </h4>

                    {selectedUsuario.tenants.length === 0 ? (
                      <p className="text-gray-400">
                        Este usuario no tiene tenants asignados.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedUsuario.tenants.map((tenant, index) => (
                          <div
                            key={`${tenant.tenant_id ?? index}-${tenant.nombre ?? 'tenant'}`}
                            className="rounded-xl border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-white font-semibold">
                                  {tenant.nombre ?? 'Tenant sin nombre'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  NIT: {tenant.nit ?? '—'}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {tenant.rol && (
                                  <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                                    {tenant.rol}
                                  </span>
                                )}

                                {tenant.plan && (
                                  <span className="rounded-lg border border-[#9032F0]/20 bg-[#9032F0]/10 px-3 py-1 text-xs font-semibold text-[#c79cff]">
                                    {tenant.plan}
                                  </span>
                                )}

                                {tenant.estado_tenant && (
                                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                                    {tenant.estado_tenant}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveUser} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                        placeholder="Nombre completo"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                        placeholder="usuario@correo.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {modalMode === 'create'
                        ? 'Contraseña *'
                        : 'Contraseña nueva (opcional)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                      placeholder={
                        modalMode === 'create'
                          ? 'Mínimo 8 caracteres'
                          : 'Déjalo vacío si no vas a cambiarla'
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_super_admin}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_super_admin: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-200">
                        Es Super Admin
                      </span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.status}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-200">
                        Usuario activo
                      </span>
                    </label>
                  </div>

                  {modalMode === 'edit' && selectedUsuario?.tenants?.length ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <h4 className="text-white font-semibold mb-3">
                        Tenants asignados actualmente
                      </h4>

                      <div className="space-y-2">
                        {selectedUsuario.tenants.map((tenant, index) => (
                          <div
                            key={`${tenant.tenant_id ?? index}-${tenant.nombre ?? 'tenant'}`}
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                          >
                            <p className="text-sm font-medium text-white">
                              {tenant.nombre ?? 'Tenant sin nombre'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {tenant.rol ?? 'Sin rol'} · {tenant.plan ?? 'Sin plan'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (saving) return;
                        setShowModal(false);
                        setSelectedUsuario(null);
                        setFormData(buildUserFormData());
                      }}
                      className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#9032F0] to-[#6506FF] text-white font-semibold hover:opacity-95 transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          {modalMode === 'create'
                            ? 'Crear usuario'
                            : 'Guardar cambios'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {modalMode === 'view' && !modalLoading && (
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUsuario(null);
                    setFormData(buildUserFormData());
                  }}
                  className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}