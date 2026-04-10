import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Check,
  X,
  Loader2,
  UserPlus,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type RolTenant = 'ADMIN';

interface TenantInfo {
  id: number;
  nombre: string;
  nit: string;
  estado: string;
  plan: string;
}

interface TenantUser {
  id: number;
  name: string;
  email: string;
  status: boolean;
  rol: RolTenant | string;
  estado: boolean;
  asignado_at?: string;
}

interface GlobalUserOption {
  id: number;
  name: string;
  email: string;
}

interface TenantUsersResponse {
  data?: any[];
}

interface TenantDetailResponse {
  data?: any;
}

interface LaravelPagination<T> {
  data?: T[];
}

const ROLES: RolTenant[] = ['ADMIN'];

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

function normalizeTenant(raw: any): TenantInfo {
  return {
    id: toNumber(raw?.id),
    nombre: String(raw?.nombre ?? ''),
    nit: String(raw?.nit ?? ''),
    estado: String(raw?.estado ?? 'ACTIVO'),
    plan: String(raw?.plan ?? '—'),
  };
}

function normalizeTenantUser(raw: any): TenantUser {
  return {
    id: toNumber(raw?.id),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    status: toBoolean(raw?.status, true),
    rol: String(raw?.rol ?? 'ADMIN'),
    estado: toBoolean(raw?.estado, true),
    asignado_at: raw?.asignado_at ? String(raw.asignado_at) : '',
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

function getAssignmentStatusClasses(isActive: boolean) {
  return isActive
    ? 'border-green-500/30 bg-green-500/10 text-green-400'
    : 'border-red-500/30 bg-red-500/10 text-red-400';
}

function getGlobalUserStatusClasses(isActive: boolean) {
  return isActive
    ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
}

const EMPTY_CREATE_FORM = {
  user_id: '',
  email: '',
  name: '',
  password: '',
  rol: 'ADMIN' as RolTenant,
};

const EMPTY_EDIT_FORM = {
  name: '',
  email: '',
  rol: 'ADMIN' as RolTenant,
  estado: true,
};
export default function UsuariosFinca() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const { token } = useAuth();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [assignmentMode, setAssignmentMode] = useState<'existing' | 'new'>(
    'new',
  );
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    variant: 'warning' | 'danger'; onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const showConfirm = (title: string, description: string, variant: 'warning' | 'danger', onConfirm: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, variant, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }));

  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const [globalUsers, setGlobalUsers] = useState<GlobalUserOption[]>([]);
  const [loadingGlobalUsers, setLoadingGlobalUsers] = useState(false);

  const loadTenant = useCallback(async () => {
    if (!token || !tenantId) return;

    setTenantLoading(true);

    try {
      const result = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );

      setTenant(normalizeTenant(result.data ?? {}));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la finca',
      );
    } finally {
      setTenantLoading(false);
    }
  }, [tenantId, token]);

  const loadTenantUsers = useCallback(async () => {
    if (!token || !tenantId) return;

    setUsersLoading(true);

    try {
      const result = await requestConToken<TenantUsersResponse>(
        `/api/v1/admin/tenants/${tenantId}/users`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(result.data) ? result.data : [];
      setUsers(items.map(normalizeTenantUser));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los usuarios de la finca',
      );
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId, token]);

  const loadGlobalUsers = useCallback(async () => {
    if (!token) return;

    setLoadingGlobalUsers(true);

    try {
      const result = await requestConToken<LaravelPagination<any>>(
        `/api/v1/admin/users?per_page=100&status=true`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(result.data) ? result.data : [];

      setGlobalUsers(
        items.map((item) => ({
          id: toNumber(item?.id),
          name: String(item?.name ?? ''),
          email: String(item?.email ?? ''),
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los usuarios globales',
      );
    } finally {
      setLoadingGlobalUsers(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTenant();
    void loadTenantUsers();
  }, [loadTenant, loadTenantUsers]);

  const openCreateModal = async () => {
    setModalMode('create');
    setAssignmentMode('new');
    setCreateForm(EMPTY_CREATE_FORM);
    setSelectedUser(null);
    setShowModal(true);

    await loadGlobalUsers();
  };

  const openEditModal = (user: TenantUser) => {
    setModalMode('edit');
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      rol: (user.rol as RolTenant) || 'ADMIN',
      estado: user.estado,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setSelectedUser(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      String(user.rol).toLowerCase().includes(term)
    );
  });

  const totalActivos = users.filter((user) => user.estado).length;
  const totalInactivos = users.length - totalActivos;
  const totalGlobalInactive = users.filter((user) => !user.status).length;

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token || !tenantId) return;

    let payload: Record<string, unknown>;

    if (assignmentMode === 'existing') {
      if (!createForm.user_id) {
        toast.error('Selecciona un usuario existente');
        return;
      }

      payload = {
        user_id: Number(createForm.user_id),
        rol: createForm.rol,
      };
    } else {
      if (
        !createForm.email.trim() ||
        !createForm.name.trim() ||
        !createForm.password.trim()
      ) {
        toast.error('Completa nombre, email y contraseña');
        return;
      }

      payload = {
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        password: createForm.password.trim(),
        rol: createForm.rol,
      };
    }

    setSaving(true);

    try {
      const result = await requestConToken<{ message?: string }>(
        `/api/v1/admin/tenants/${tenantId}/users`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      toast.success(
        result.message ?? 'Usuario agregado/asignado a la finca correctamente',
      );

      closeModal();
      await loadTenantUsers();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo agregar el usuario a la finca',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token || !tenantId || !selectedUser) return;

    setSaving(true);

    try {
      const result = await requestConToken<{ message?: string }>(
        `/api/v1/admin/tenants/${tenantId}/users/${selectedUser.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            rol: editForm.rol,
            estado: editForm.estado,
          }),
        },
        token,
      );

      toast.success(result.message ?? 'Asignación actualizada correctamente');

      closeModal();
      await loadTenantUsers();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la asignación',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (user: TenantUser) => {
    if (!token || !tenantId) return;
    const accion = user.estado ? 'desactivar' : 'activar';
    showConfirm(
      `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a "${user.name}" en esta finca?`,
      'warning',
      async () => {
        try {
          const result = await requestConToken<{ message?: string }>(
            `/api/v1/admin/tenants/${tenantId}/users/${user.id}`,
            { method: 'PUT', body: JSON.stringify({ estado: !user.estado }) },
            token,
          );
          toast.success(result.message ?? `Usuario ${accion}do correctamente`);
          closeConfirm();
          await loadTenantUsers();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
        }
      },
    );
  };

  const handleRemove = async (user: TenantUser) => {
    if (!token || !tenantId) return;

    showConfirm(
      'Remover usuario',
      `¿Seguro que deseas remover a "${user.name}" de esta finca?`,
      'danger',
      async () => {
        try {
          const result = await requestConToken<{ message?: string }>(
            `/api/v1/admin/tenants/${tenantId}/users/${user.id}`,
            { method: 'DELETE' },
            token,
          );
          toast.success(result.message ?? 'Usuario removido de la finca');
          closeConfirm();
          await loadTenantUsers();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo remover el usuario');
        }
      },
    );
  };

  if (!tenantId) {
    return (
      <div className="p-8">
        <p className="text-red-400">Tenant inválido.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/super-admin/fincas')}
            className="mt-1 p-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Usuarios por Finca
            </h1>

            {tenantLoading ? (
              <p className="text-gray-400">Cargando finca...</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-white font-semibold">
                  {tenant?.nombre || 'Finca'}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">NIT: {tenant?.nit || '—'}</span>
                <span className="text-gray-500">•</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-gray-300">
                  {tenant?.plan || '—'}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-gray-300">
                  {tenant?.estado || '—'}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => void openCreateModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9032F0] to-[#6506FF] px-5 py-3 text-white font-semibold hover:opacity-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Agregar usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Total asignados</p>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Asignaciones activas</p>
          <p className="text-3xl font-bold text-green-400">{totalActivos}</p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Asignaciones inactivas</p>
          <p className="text-3xl font-bold text-red-400">{totalInactivos}</p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <p className="text-sm text-gray-400 mb-1">Usuarios globales inactivos</p>
          <p className="text-3xl font-bold text-yellow-300">
            {totalGlobalInactive}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="w-full rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Usuario
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Rol
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Asignación
                </th>
                
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">
                  Asignado
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando usuarios de la finca...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                      No hay usuarios asignados a esta finca
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-400 mt-1">{user.email}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#9032F0]/30 bg-[#9032F0]/10 px-3 py-1 text-xs font-semibold text-[#c79cff]">
                        <Shield className="w-3 h-3" />
                        {user.rol}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getAssignmentStatusClasses(
                          user.estado,
                        )}`}
                      >
                        {user.estado ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {user.estado ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">
                        {formatDate(user.asignado_at)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Editar rol"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void handleToggleEstado(user)}
                          className={`p-2 rounded-lg transition-colors ${user.estado ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                          title={user.estado ? 'Desactivar en finca' : 'Activar en finca'}
                        >
                          {user.estado ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => void handleRemove(user)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remover usuario de la finca"
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
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modalMode === 'create'
                    ? 'Agregar usuario a la finca'
                    : 'Editar asignación'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {modalMode === 'create'
                    ? 'Asignar un usuario existente o crear uno nuevo'
                    : 'Cambiar rol o estado dentro del tenant'}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {modalMode === 'create' ? (
                <form onSubmit={handleCreateSubmit} className="space-y-5">

                  <>
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre *
                          </label>
                          <input
                            type="text"
                            value={createForm.name}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                            placeholder="Nombre completo"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={createForm.email}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                            placeholder="usuario@correo.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contraseña *
                        </label>
                        <input
                          type="password"
                          value={createForm.password}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                    </>
                  </>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rol dentro de la finca
                    </label>
                    <select
                      value={createForm.rol}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          rol: e.target.value as RolTenant,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                    >
                      {ROLES.map((rol) => (
                        <option key={rol} value={rol} className="bg-[#111]">
                          {rol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
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
                          <Plus className="w-4 h-4" />
                          Agregar usuario
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                        placeholder="Nombre completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rol dentro de la finca
                    </label>
                    <select
                      value={editForm.rol}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          rol: e.target.value as RolTenant,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                    >
                      {ROLES.map((rol) => (
                        <option key={rol} value={rol} className="bg-[#111]">
                          {rol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.estado}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          estado: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-200">
                      Asignación activa
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
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
                          <Edit2 className="w-4 h-4" />
                          Guardar cambios
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}