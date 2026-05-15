/**
 * Pantalla "Usuarios por Proveedor" (super admin).
 *
 * Endpoints:
 *   GET    /api/v1/admin/market/proveedores/{id}
 *   GET    /api/v1/admin/market/proveedores/{id}/usuarios
 *   POST   /api/v1/admin/market/proveedores/{id}/usuarios
 *   PUT    /api/v1/admin/market/proveedores/{id}/usuarios/{userId}
 *   DELETE /api/v1/admin/market/proveedores/{id}/usuarios/{userId}
 *
 * Modos del modal de creación:
 *   - "new":       crea un User nuevo y lo vincula al proveedor.
 *   - "existing":  asigna un User global ya existente al proveedor.
 *
 * Reglas:
 *   - Roles permitidos: ADMIN | OPERADOR.
 *   - 409 USER_ALREADY_ASSIGNED si el user ya está activo en el proveedor.
 *   - 200 con mensaje "Usuario reactivado..." si el pivot existía desactivado.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Users, Plus, Search, Edit2, Trash2, Shield, Check, X,
  Loader2, UserPlus, Pause, Play, Store,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  marketProveedoresAdminApi,
  type ProveedorAdmin,
  type ProveedorUser,
  type RolProveedorUser,
  MarketProveedoresErrorCodes,
} from '../../../api/marketProveedoresAdmin';
import { requestConToken } from '../../../api/request';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const ROLES: RolProveedorUser[] = ['ADMIN', 'OPERADOR'];

const EMPTY_CREATE_FORM = {
  user_id: '',
  email: '',
  name: '',
  password: '',
  rol: 'ADMIN' as RolProveedorUser,
};

const EMPTY_EDIT_FORM = {
  name: '',
  email: '',
  password: '',
  rol: 'ADMIN' as RolProveedorUser,
  estado: true,
};

interface GlobalUserOption {
  id: number;
  name: string;
  email: string;
}

function formatDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString('es-CO');
}

function getAssignmentStatusClasses(active: boolean) {
  return active
    ? 'border-green-500/30 bg-green-500/10 text-green-400'
    : 'border-red-500/30 bg-red-500/10 text-red-400';
}

export default function UsuariosProveedor() {
  const navigate = useNavigate();
  const { proveedorId } = useParams();
  const id = Number(proveedorId);

  const [proveedor, setProveedor] = useState<ProveedorAdmin | null>(null);
  const [proveedorLoading, setProveedorLoading] = useState(true);

  const [users, setUsers] = useState<ProveedorUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [assignmentMode, setAssignmentMode] = useState<'new' | 'existing'>('new');
  const [saving, setSaving] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ProveedorUser | null>(null);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const [globalUsers, setGlobalUsers] = useState<GlobalUserOption[]>([]);
  const [loadingGlobalUsers, setLoadingGlobalUsers] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    variant: 'warning' | 'danger'; onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const showConfirm = (
    title: string, description: string,
    variant: 'warning' | 'danger', onConfirm: () => Promise<void>,
  ) => setConfirmDialog({ open: true, title, description, variant, onConfirm });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));

  // ── Cargas iniciales ─────────────────────────────────────────────────────
  const loadProveedor = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setProveedorLoading(true);
    try {
      const res = await marketProveedoresAdminApi.ver(id);
      setProveedor(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el proveedor');
    } finally {
      setProveedorLoading(false);
    }
  }, [id]);

  const loadUsers = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setUsersLoading(true);
    try {
      const res = await marketProveedoresAdminApi.listarUsuarios(id);
      setUsers(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [id]);

  const loadGlobalUsers = useCallback(async () => {
    setLoadingGlobalUsers(true);
    try {
      // Reusa endpoint global del super admin.
      const res = await requestConToken<{ data?: any[] }>(
        '/api/v1/admin/users?per_page=100&status=true',
        { method: 'GET' },
        localStorage.getItem('palmapp_token'),
      );
      const items = Array.isArray(res.data) ? res.data : [];
      setGlobalUsers(items.map(it => ({
        id: Number(it?.id ?? 0),
        name: String(it?.name ?? ''),
        email: String(it?.email ?? ''),
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios globales');
    } finally {
      setLoadingGlobalUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadProveedor();
    void loadUsers();
  }, [loadProveedor, loadUsers]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openCreateModal = async () => {
    setModalMode('create');
    setAssignmentMode('new');
    setCreateForm(EMPTY_CREATE_FORM);
    setSelectedUser(null);
    setShowModal(true);
    await loadGlobalUsers();
  };

  const openEditModal = (user: ProveedorUser) => {
    setModalMode('edit');
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: '',
      rol: (user.rol as RolProveedorUser) ?? 'ADMIN',
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

  // ── Filtro + métricas ────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return true;
    return (
      u.name.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      String(u.rol).toLowerCase().includes(t)
    );
  });

  const totalActivos = users.filter(u => u.estado).length;
  const totalInactivos = users.length - totalActivos;
  const totalGlobalInactive = users.filter(u => !u.status).length;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isFinite(id)) return;

    let payload: Record<string, unknown>;

    if (assignmentMode === 'existing') {
      if (!createForm.user_id) {
        toast.error('Selecciona un usuario existente');
        return;
      }
      payload = { user_id: Number(createForm.user_id), rol: createForm.rol };
    } else {
      if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
        toast.error('Completa nombre, email y contraseña');
        return;
      }
      if (createForm.password.trim().length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password.trim(),
        rol: createForm.rol,
      };
    }

    setSaving(true);
    try {
      const res = await marketProveedoresAdminApi.crearUsuario(id, payload);
      toast.success(res.message ?? 'Usuario vinculado al proveedor');
      closeModal();
      await loadUsers();
    } catch (err: any) {
      if (err?.code === MarketProveedoresErrorCodes.USER_ALREADY_ASSIGNED) {
        toast.error(err.message ?? 'El usuario ya está asignado a este proveedor');
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo agregar el usuario');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isFinite(id) || !selectedUser) return;

    const payload: Record<string, unknown> = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      rol: editForm.rol,
      estado: editForm.estado,
    };
    if (editForm.password.trim()) {
      if (editForm.password.trim().length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      payload.password = editForm.password.trim();
    }

    setSaving(true);
    try {
      const res = await marketProveedoresAdminApi.actualizarUsuario(id, selectedUser.id, payload);
      toast.success(res.message ?? 'Usuario actualizado');
      closeModal();
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = (user: ProveedorUser) => {
    const accion = user.estado ? 'desactivar' : 'activar';
    showConfirm(
      `${accion[0].toUpperCase()}${accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a "${user.name}" en este proveedor?`,
      'warning',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.actualizarUsuario(id, user.id, {
            estado: !user.estado,
          });
          toast.success(res.message ?? `Usuario ${accion}do`);
          closeConfirm();
          await loadUsers();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
        }
      },
    );
  };

  const handleRemove = (user: ProveedorUser) => {
    showConfirm(
      'Remover usuario',
      `¿Seguro que deseas desvincular a "${user.name}" del proveedor?`,
      'danger',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.eliminarUsuario(id, user.id);
          toast.success(res.message ?? 'Usuario desvinculado');
          closeConfirm();
          await loadUsers();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo desvincular');
        }
      },
    );
  };

  if (!Number.isFinite(id)) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-400">Proveedor inválido.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/super-admin/proveedores')}
            className="mt-1 p-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Usuarios por Proveedor
            </h1>
            {proveedorLoading ? (
              <p className="text-gray-400">Cargando proveedor...</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Store className="w-4 h-4 text-[#9032F0]" />
                <span className="text-white font-semibold">
                  {proveedor?.nombre_empresa || 'Proveedor'}
                </span>
                {proveedor?.nit && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">NIT: {proveedor.nit}</span>
                  </>
                )}
                <span className="text-gray-500">•</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-gray-300">
                  {proveedor?.email}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-gray-300 capitalize">
                  {proveedor?.estado || '—'}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-sm text-gray-400 mb-1">Globales inactivos</p>
          <p className="text-3xl font-bold text-yellow-300">{totalGlobalInactive}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="w-full rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">Usuario</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">Rol</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">Asignación</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400">Asignado</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando usuarios del proveedor...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No hay usuarios asignados a este proveedor</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold">{u.name}</p>
                      <p className="text-sm text-gray-400 mt-1">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#9032F0]/30 bg-[#9032F0]/10 px-3 py-1 text-xs font-semibold text-[#c79cff]">
                        <Shield className="w-3 h-3" />
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${getAssignmentStatusClasses(u.estado)}`}>
                        {u.estado ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {u.estado ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{formatDate(u.asignado_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleEstado(u)}
                          className={`p-2 rounded-lg transition-colors ${u.estado ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                          title={u.estado ? 'Desactivar' : 'Activar'}
                        >
                          {u.estado ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleRemove(u)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Desvincular del proveedor"
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

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modalMode === 'create' ? 'Agregar usuario al proveedor' : 'Editar usuario'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {modalMode === 'create'
                    ? 'Crea un usuario nuevo o asigna uno existente del sistema'
                    : 'Modifica datos, rol o estado de la asignación'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {modalMode === 'create' ? (
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  {/* Switcher */}
                  <div className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('new')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        assignmentMode === 'new'
                          ? 'bg-gradient-to-r from-[#9032F0] to-[#6506FF] text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Crear usuario nuevo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('existing')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        assignmentMode === 'existing'
                          ? 'bg-gradient-to-r from-[#9032F0] to-[#6506FF] text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Asignar usuario existente
                    </button>
                  </div>

                  {assignmentMode === 'new' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
                          <input
                            type="text"
                            value={createForm.name}
                            onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                          <input
                            type="email"
                            value={createForm.email}
                            onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                            placeholder="usuario@correo.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña *</label>
                        <input
                          type="password"
                          value={createForm.password}
                          onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Usuario existente *
                        {loadingGlobalUsers && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                            <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                          </span>
                        )}
                      </label>
                      <select
                        value={createForm.user_id}
                        onChange={e => setCreateForm(p => ({ ...p, user_id: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                      >
                        <option value="" className="bg-[#111]">Selecciona un usuario</option>
                        {globalUsers.map(u => (
                          <option key={u.id} value={u.id} className="bg-[#111]">
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Si el usuario ya pertenece a este proveedor verás un error.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rol dentro del proveedor</label>
                    <select
                      value={createForm.rol}
                      onChange={e => setCreateForm(p => ({ ...p, rol: e.target.value as RolProveedorUser }))}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} className="bg-[#111]">{r}</option>
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
                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                      ) : (
                        <><Plus className="w-4 h-4" /> Agregar usuario</>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nueva contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                      placeholder="Dejar en blanco para no cambiar"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
                    <select
                      value={editForm.rol}
                      onChange={e => setEditForm(p => ({ ...p, rol: e.target.value as RolProveedorUser }))}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} className="bg-[#111]">{r}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.estado}
                      onChange={e => setEditForm(p => ({ ...p, estado: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-200">Asignación activa</span>
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
                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                      ) : (
                        <><Edit2 className="w-4 h-4" /> Guardar cambios</>
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
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
