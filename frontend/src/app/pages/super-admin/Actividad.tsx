import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { 
  Activity, 
  Building2, 
  User, 
  Package, 
  Play, 
  Pause, 
  Trash2,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

type TipoActividad = 
  | 'finca_creada' 
  | 'finca_suspendida' 
  | 'finca_activada' 
  | 'finca_eliminada'
  | 'admin_creado'
  | 'plan_cambiado'
  | 'configuracion_modificada';

interface AuditoriaItem {
  id: number;
  accion: string;
  fecha: string;
  usuario: string;
  correo: string;
  entidad_afectada: string;
  detalle: string;
  direccion_ip: string;
  tenant_id: number | null;
}

interface AuditoriaPagination {
  data?: any[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

export default function Actividad() {
  const { token } = useAuth();
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAccion, setFilterAccion] = useState('todas');
  const [filterModulo, setFilterModulo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadAuditorias = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterAccion !== 'todas') params.set('accion', filterAccion);
      if (filterModulo !== 'todos') params.set('modulo', filterModulo);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      params.set('per_page', '15');
      params.set('page', String(page));

      const result = await requestConToken<AuditoriaPagination>(
        `/api/v1/admin/auditorias?${params.toString()}`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(result.data) ? result.data : [];
      setAuditorias(items.map((item: any) => ({
        id: item.id,
        accion: String(item.accion ?? ''),
        fecha: String(item.fecha ?? ''),
        usuario: String(item.usuario ?? ''),
        correo: String(item.correo ?? ''),
        entidad_afectada: String(item.entidad_afectada ?? ''),
        detalle: String(item.detalle ?? ''),
        direccion_ip: String(item.direccion_ip ?? ''),
        tenant_id: item.tenant_id ?? null,
      })));
      setLastPage(result.last_page ?? 1);
      setTotal(result.total ?? items.length);
    } catch (error) {
      console.error('Error al cargar auditorías:', error);
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterAccion, filterModulo, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    void loadAuditorias();
  }, [loadAuditorias]);

  const getAccionConfig = (accion: string) => {
    switch (accion) {
      case 'CREAR':
        return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'EDITAR':
        return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'ELIMINAR':
        return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      case 'LOGIN_EXITOSO':
        return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'LOGIN_FALLIDO':
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
      case 'LOGOUT':
        return { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
      default:
        return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Actividad del Sistema</h1>
        <p className="text-slate-400">Registro completo de todas las acciones realizadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total registros</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Página actual</p>
          <p className="text-2xl font-bold text-white">{page} de {lastPage}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterAccion}
              onChange={(e) => { setPage(1); setFilterAccion(e.target.value); }}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="todas">Todas las acciones</option>
              <option value="CREAR">Crear</option>
              <option value="EDITAR">Editar</option>
              <option value="ELIMINAR">Eliminar</option>
              <option value="LOGIN_EXITOSO">Login exitoso</option>
              <option value="LOGIN_FALLIDO">Login fallido</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterModulo}
              onChange={(e) => { setPage(1); setFilterModulo(e.target.value); }}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="todos">Todos los módulos</option>
              <option value="AUTH">Autenticación</option>
              <option value="TENANTS">Fincas</option>
              <option value="USERS">Usuarios</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setPage(1); setFechaDesde(e.target.value); }}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Desde"
            />
          </div>

          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setPage(1); setFechaHasta(e.target.value); }}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Hasta"
            />
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Acción</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Fecha</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Usuario</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Módulo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Detalle</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <Activity className="w-5 h-5 animate-spin" />
                      Cargando actividad...
                    </div>
                  </td>
                </tr>
              ) : auditorias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No se encontró actividad</p>
                  </td>
                </tr>
              ) : (
                auditorias.map((auditoria) => {
                  const config = getAccionConfig(auditoria.accion);

                  return (
                    <tr key={auditoria.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 ${config.bg} border ${config.border} rounded-lg text-sm font-medium ${config.color}`}>
                          {auditoria.accion}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{auditoria.fecha}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-slate-300">{auditoria.usuario}</p>
                          <p className="text-xs text-slate-500">{auditoria.correo}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{auditoria.entidad_afectada}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-400">{auditoria.detalle}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500">{auditoria.direccion_ip}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Total: <span className="text-white font-semibold">{total}</span> registros
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
  );
}