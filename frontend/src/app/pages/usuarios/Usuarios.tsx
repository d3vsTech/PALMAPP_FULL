import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Users, UserCheck, UserX, Plus, Search, Eye, Edit, Shield, Trash2, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario {
  id: number; name: string; email: string;
  status: boolean; is_admin: boolean; estado: boolean; asignado_at: string;
}
interface Resumen { total: number; activos: number; inactivos: number; }

export default function Usuarios() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, activos: 0, inactivos: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertDialog, setAlertDialog] = useState(false);
  const [usuarioToggle, setUsuarioToggle] = useState<{ id: number; nombre: string; accion: 'activar' | 'desactivar' | 'eliminar'; onConfirm: () => Promise<void> } | null>(null);

  const cargar = useCallback(async (search?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search?.trim()) params.set('search', search.trim());
      const res = await requestConToken<{ data: Usuario[]; resumen: Resumen }>(
        `/api/v1/tenant/usuarios?${params}`, { method: 'GET' }, token
      );
      setUsuarios(res.data ?? []);
      setResumen(res.resumen ?? { total: 0, activos: 0, inactivos: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const handleToggleEstado = (u: Usuario) => {
    const accion = u.estado ? 'desactivar' : 'activar';
    setUsuarioToggle({
      id: u.id, nombre: u.name, accion,
      onConfirm: async () => {
        await requestConToken(`/api/v1/tenant/usuarios/${u.id}/toggle`, { method: 'PATCH' }, token);
        toast.success(`Usuario ${accion}do correctamente`);
        setAlertDialog(false); setUsuarioToggle(null);
        await cargar(busqueda);
      }
    });
    setAlertDialog(true);
  };

  const handleEliminar = (u: Usuario) => {
    setUsuarioToggle({
      id: u.id, nombre: u.name, accion: 'eliminar',
      onConfirm: async () => {
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/tenant/usuarios/${u.id}`, { method: 'DELETE' }, token
        );
        toast.success(res.message ?? 'Usuario removido correctamente');
        setAlertDialog(false); setUsuarioToggle(null);
        await cargar(busqueda);
      }
    });
    setAlertDialog(true);
  };

  const getIniciales = (nombre: string) => {
    const p = nombre.split(' ');
    return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : nombre.substring(0, 2).toUpperCase();
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioToggle?.accion === 'desactivar' && (
                <span>Esto marcará a <strong>{usuarioToggle.nombre}</strong> como inactivo. El usuario no podrá acceder al sistema.</span>
              )}
              {usuarioToggle?.accion === 'activar' && (
                <span>Esto reactivará a <strong>{usuarioToggle?.nombre}</strong>. El usuario podrá acceder al sistema nuevamente.</span>
              )}
              {usuarioToggle?.accion === 'eliminar' && (
                <span>Esto eliminará permanentemente a <strong>{usuarioToggle.nombre}</strong>. Esta acción no se puede deshacer.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => usuarioToggle?.onConfirm()}
              className={usuarioToggle?.accion === 'desactivar' || usuarioToggle?.accion === 'eliminar' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {usuarioToggle?.accion === 'desactivar' && 'Desactivar'}
              {usuarioToggle?.accion === 'activar' && 'Activar'}
              {usuarioToggle?.accion === 'eliminar' && 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-1 mb-6">
        <h1>Gestión de Usuarios</h1>
        <p className="text-lead">Administra usuarios y permisos de la plataforma</p>
      </div>

      <div className="space-y-4">
        <h2>Resumen</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Total Usuarios', value: resumen.total, sub: 'registrados', icon: TrendingUp, color: 'text-primary bg-primary/10 border-primary/20', badge: 'Sistema' },
            { label: 'Usuarios Activos', value: resumen.activos, sub: 'activos', icon: UserCheck, color: 'text-success bg-success/10 border-success/20', badge: 'Con acceso' },
            { label: 'Usuarios Inactivos', value: resumen.inactivos, sub: 'inactivos', icon: UserX, color: 'text-muted-foreground bg-muted/50 border-muted', badge: 'Sin acceso' },
          ].map(({ label, value, sub, icon: Icon, color, badge }) => (
            <Card key={label} className="border-border hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">{label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold">{loading ? '—' : value}</p>
                      <span className="text-sm text-muted-foreground">{sub}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
                      <Icon className="h-4 w-4" /><span>{badge}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="mb-2">Lista de Usuarios</h2>
          <p className="text-muted-foreground">Todos los usuarios del sistema</p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="Buscar por nombre, email o rol..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={() => navigate('/usuarios/nuevo')} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> Nuevo Usuario
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Nombre</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Email</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${u.estado ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                              {getIniciales(u.name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{u.name}</span>
                              <Badge className={`w-fit mt-1 text-xs ${u.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}`}>
                                {u.estado ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">{u.email}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/${u.id}`)}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary" title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                              className="hover:bg-accent/10 hover:text-accent hover:border-accent" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!u.is_admin && (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/permisos/${u.id}`)}
                                className="hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500" title="Permisos">
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleToggleEstado(u)}
                              className={u.estado ? 'border-destructive/50 text-destructive hover:bg-destructive hover:text-white' : 'border-success/50 text-success hover:bg-success hover:text-primary'}
                              title={u.estado ? 'Desactivar' : 'Activar'}>
                              {u.estado ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleEliminar(u)} title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron usuarios</p>
              <p className="text-sm text-muted-foreground mb-4">
                {busqueda ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer usuario'}
              </p>
              {!busqueda && (
                <Button onClick={() => navigate('/usuarios/nuevo')} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Nuevo Usuario
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}