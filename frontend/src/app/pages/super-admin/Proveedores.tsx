import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Store, Plus, Edit2, Trash2, Pause, Play, Search, Filter,
  RefreshCw, Loader2, Eye, Star, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CrearProveedorModal, {
  type ProveedorFormData,
} from '../../components/super-admin/CrearProveedorModal';
import {
  marketProveedoresAdminApi,
  type ProveedorAdmin,
  type EstadoProveedor,
} from '../../../api/marketProveedoresAdmin';

const PAGE_SIZE = 10;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function estadoClasses(estado: EstadoProveedor) {
  switch (estado) {
    case 'activo':     return 'border-green-500/20 bg-green-500/10 text-green-400';
    case 'suspendido': return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    case 'inactivo':   return 'border-red-500/20 bg-red-500/10 text-red-400';
  }
}

function estadoDot(estado: EstadoProveedor) {
  switch (estado) {
    case 'activo':     return 'bg-green-400';
    case 'suspendido': return 'bg-yellow-400';
    case 'inactivo':   return 'bg-red-400';
  }
}

function proveedorToForm(p: ProveedorAdmin | null): ProveedorFormData | null {
  if (!p) return null;
  return {
    nombre_empresa: p.nombre_empresa,
    nit: p.nit ?? '',
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    ciudad: p.ciudad,
    departamento: p.departamento,
    descripcion: p.descripcion ?? '',
    logo_url: p.logo_url ?? '',
  };
}

function buildPayload(data: ProveedorFormData) {
  const payload: any = {
    nombre_empresa: data.nombre_empresa.trim(),
    telefono: data.telefono.trim(),
    email: data.email.trim(),
    direccion: data.direccion.trim(),
    ciudad: data.ciudad.trim(),
    departamento: data.departamento.trim(),
  };
  if (data.nit.trim()) payload.nit = data.nit.trim();
  if (data.descripcion.trim()) payload.descripcion = data.descripcion.trim();
  if (data.logo_url.trim()) payload.logo_url = data.logo_url.trim();
  return payload;
}

export default function Proveedores() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | EstadoProveedor>('TODOS');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [stats, setStats] = useState({ total: 0, activos: 0, suspendidos: 0, inactivos: 0 });

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<ProveedorAdmin | null>(null);

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
  ) => setConfirmDialog({ open: true, title, description, variant, onConfirm });

  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false }));

  const loadProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketProveedoresAdminApi.listar({
        buscar: search.trim() || undefined,
        estado: filterEstado === 'TODOS' ? undefined : filterEstado,
        sort_by: 'nombre_empresa',
        sort_dir: 'asc',
        per_page: PAGE_SIZE,
        page,
      });
      setProveedores(res.data ?? []);
      setLastPage(toNumber(res.last_page, 1));
      setTotalItems(toNumber(res.total, 0));
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudieron cargar los proveedores');
      setProveedores([]);
      setLastPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [search, filterEstado, page]);

  // Calcular stats sobre todos los proveedores (sin filtros) en la primera carga
  const loadStats = useCallback(async () => {
    try {
      const res = await marketProveedoresAdminApi.listar({ per_page: 1000 });
      const all = res.data ?? [];
      setStats({
        total: all.length,
        activos: all.filter((p) => p.estado === 'activo').length,
        suspendidos: all.filter((p) => p.estado === 'suspendido').length,
        inactivos: all.filter((p) => p.estado === 'inactivo').length,
      });
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  useEffect(() => {
    const t = window.setTimeout(() => { void loadProveedores(); }, 250);
    return () => window.clearTimeout(t);
  }, [loadProveedores]);

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadProveedores()]);
    toast.success('Listado actualizado');
  };

  const handleOpenCreate = () => { setSelected(null); setShowModal(true); };

  const handleOpenEdit = async (id: number) => {
    setLoadingEditId(id);
    try {
      const res = await marketProveedoresAdminApi.ver(id);
      setSelected(res.data);
      setShowModal(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cargar el proveedor');
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleSave = async (form: ProveedorFormData) => {
    setSaving(true);
    try {
      if (selected) {
        const res = await marketProveedoresAdminApi.actualizar(selected.id, buildPayload(form));
        toast.success(res.message ?? 'Proveedor actualizado');
      } else {
        const res = await marketProveedoresAdminApi.crear(buildPayload(form));
        toast.success(res.message ?? 'Proveedor creado');
      }
      setShowModal(false);
      setSelected(null);
      await Promise.all([loadStats(), loadProveedores()]);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (p: ProveedorAdmin) => {
    const accion = p.estado === 'activo' ? 'suspender' : 'activar';
    showConfirm(
      `${accion.charAt(0).toUpperCase() + accion.slice(1)} proveedor`,
      `¿Seguro que deseas ${accion} "${p.nombre_empresa}"?`,
      p.estado === 'activo' ? 'warning' : 'warning',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.toggleEstado(p.id);
          toast.success(res.message ?? 'Estado actualizado');
          closeConfirm();
          await Promise.all([loadStats(), loadProveedores()]);
        } catch (err: any) {
          toast.error(err?.message ?? 'No se pudo cambiar el estado');
        }
      },
    );
  };

  const handleDelete = (p: ProveedorAdmin) => {
    if (p.estado === 'activo') {
      toast.error('Suspende el proveedor antes de eliminarlo');
      return;
    }
    showConfirm(
      'Eliminar proveedor',
      `¿Seguro que deseas eliminar "${p.nombre_empresa}"? Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.eliminar(p.id);
          toast.success(res.message ?? 'Proveedor eliminado');
          closeConfirm();
          if (page > 1 && proveedores.length === 1) {
            setPage((prev) => Math.max(1, prev - 1));
            await loadStats();
          } else {
            await Promise.all([loadStats(), loadProveedores()]);
          }
        } catch (err: any) {
          const code = err?.code;
          if (code === 'PROVIDER_ACTIVE') {
            toast.error('Suspende el proveedor antes de eliminarlo');
          } else {
            toast.error(err?.message ?? 'No se pudo eliminar el proveedor');
          }
        }
      },
    );
  };

  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Gestión de Proveedores</h1>
          <p className="text-sm md:text-base text-slate-400">
            Administra las empresas proveedoras del marketplace
          </p>
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
            Crear nuevo proveedor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-400">{stats.activos}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Suspendidos</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.suspendidos}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Inactivos</p>
          <p className="text-2xl font-bold text-red-400">{stats.inactivos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Buscar por empresa, NIT o email..."
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterEstado}
              onChange={(e) => { setPage(1); setFilterEstado(e.target.value as any); }}
              className="pl-11 pr-10 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 appearance-none cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="suspendido">Suspendidos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <p className="text-sm text-slate-400">
            Mostrando{' '}
            <span className="text-white font-semibold">{showingFrom}-{showingTo}</span>{' '}
            de <span className="text-white font-semibold">{totalItems}</span> proveedores
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Empresa</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contacto</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ubicación</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Estado</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Calificación</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Productos</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Pedidos</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando proveedores...
                    </div>
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <Store className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No se encontraron proveedores</p>
                  </td>
                </tr>
              ) : (
                proveedores.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#9032F0]/20 to-[#6506FF]/20 rounded-lg flex items-center justify-center border border-[#9032F0]/30 overflow-hidden">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.nombre_empresa} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-5 h-5 text-[#9032F0]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.nombre_empresa}</p>
                          <p className="text-xs text-slate-400">ID: {p.id}</p>
                          <p className="text-xs text-slate-500">NIT: {p.nit || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{p.email || '—'}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.telefono || 'Sin teléfono'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">
                        {p.ciudad || '—'}{p.departamento ? `, ${p.departamento}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{p.direccion || 'Sin dirección'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${estadoClasses(p.estado)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${estadoDot(p.estado)}`} />
                        {p.estado.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-300">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        {Number(p.calificacion_promedio ?? 0).toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{p.total_ventas ?? 0} ventas</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{p.total_productos ?? 0}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{p.total_pedidos ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.total_usuarios ?? 0} usuarios</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleOpenEdit(p.id)}
                          disabled={loadingEditId === p.id}
                          className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Ver/Editar"
                        >
                          {loadingEditId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => navigate(`/super-admin/proveedores/${p.id}/usuarios`)}
                          className="p-2 hover:bg-cyan-500/10 text-cyan-400 rounded-lg transition-colors"
                          title="Usuarios del proveedor"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => void handleOpenEdit(p.id)}
                          disabled={loadingEditId === p.id}
                          className="p-2 hover:bg-purple-500/10 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {p.estado === 'activo' ? (
                          <button
                            onClick={() => handleToggle(p)}
                            className="p-2 hover:bg-yellow-500/10 text-yellow-400 rounded-lg transition-colors"
                            title="Suspender"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(p)}
                            className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors"
                            title="Activar"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(p)}
                          disabled={p.estado === 'activo'}
                          className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={p.estado === 'activo' ? 'Suspende primero' : 'Eliminar'}
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

        {/* Paginación */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Página <span className="text-white font-semibold">{page}</span> de{' '}
            <span className="text-white font-semibold">{lastPage}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <CrearProveedorModal
        isOpen={showModal}
        onClose={() => {
          if (saving) return;
          setShowModal(false);
          setSelected(null);
        }}
        onSave={handleSave}
        proveedorData={proveedorToForm(selected)}
        isEdit={Boolean(selected)}
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
    </div>
  );
}
