import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Users, UserCheck, UserX, Plus, Search,
  Eye, Edit, Shield, Trash2, TrendingUp, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Usuario {
  id: number;
  name: string;
  email: string;
  status: boolean;
  is_admin: boolean;
  estado: boolean;
  asignado_at: string;
}

interface Resumen { total: number; activos: number; inactivos: number; }

export default function Usuarios() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, activos: 0, inactivos: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    variant: 'warning' | 'danger'; onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const showConfirm = (title: string, description: string, variant: 'warning' | 'danger', onConfirm: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, variant, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));

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
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const handleToggle = (u: Usuario) => {
    const accion = u.estado ? 'desactivar' : 'activar';
    showConfirm(
      `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a ${u.name}?`,
      'warning',
      async () => {
        await requestConToken(`/api/v1/tenant/usuarios/${u.id}/toggle`, { method: 'PATCH' }, token);
        toast.success(`Usuario ${accion}do correctamente`);
        closeConfirm();
        await cargar(busqueda);
      }
    );
  };

  const handleEliminar = (u: Usuario) => {
    showConfirm(
      'Remover usuario',
      `¿Seguro que deseas remover a ${u.name} de la finca? No se puede deshacer.`,
      'danger',
      async () => {
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/tenant/usuarios/${u.id}`, { method: 'DELETE' }, token
        );
        toast.success(res.message ?? 'Usuario removido correctamente');
        closeConfirm();
        await cargar(busqueda);
      }
    );
  };

  const getIniciales = (nombre: string) => {
    const p = nombre.split(' ');
    return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirm}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}
              className={confirmDialog.variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.variant === 'danger' ? 'Eliminar' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="text-lead">Administra usuarios y permisos de la finca</p>
        </div>
        <button onClick={() => cargar(busqueda)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Usuarios', value: resumen.total, sub: 'registrados', icon: TrendingUp, color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Usuarios Activos', value: resumen.activos, sub: 'con acceso', icon: UserCheck, color: 'text-success bg-success/10 border-success/20' },
          { label: 'Usuarios Inactivos', value: resumen.inactivos, sub: 'sin acceso', icon: UserX, color: 'text-muted-foreground bg-muted/50 border-muted' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">{label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{loading ? '—' : value}</p>
                <span className="text-sm text-muted-foreground">{sub}</span>
              </div>
              <div className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
                <Icon className="h-4 w-4" /><span>{sub}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o email..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={() => navigate('/usuarios/nuevo')} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> Nuevo Usuario
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando usuarios...
          </div>
        ) : usuarios.length === 0 ? (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron usuarios</p>
              <p className="text-sm text-muted-foreground mb-4">
                {busqueda ? 'Intenta con otros términos' : 'Agrega tu primer usuario'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Usuario</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Email</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Rol</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${u.estado ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                              {getIniciales(u.name)}
                            </div>
                            <div>
                              <span className="font-semibold text-sm">{u.name}</span>
                              <Badge className={`w-fit mt-1 ml-1 text-xs ${u.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}`}>
                                {u.estado ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-foreground">{u.email}</td>
                        <td className="p-4">
                          <Badge className={u.is_admin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-muted'}>
                            {u.is_admin ? 'Administrador' : 'Usuario'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/${u.id}`)} title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/editar/${u.id}`)} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!u.is_admin && (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/usuarios/permisos/${u.id}`)} title="Permisos"
                                className="hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500">
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline"
                              onClick={() => handleToggle(u)}
                              className={u.estado ? 'border-destructive/50 text-destructive hover:bg-destructive hover:text-white' : 'border-success/50 text-success hover:bg-success hover:text-white'}
                              title={u.estado ? 'Desactivar' : 'Activar'}>
                              {u.estado ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleEliminar(u)} title="Remover">
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
        )}
      </div>
    </div>
  );
}