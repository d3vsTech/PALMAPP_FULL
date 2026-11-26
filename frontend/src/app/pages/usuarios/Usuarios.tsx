import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usuariosApi, type UsuarioTenant, type ResumenUsuarios } from '../../../api/usuarios';
import { sortByFirstName } from '../../utils/personas';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import Avatar from '../../components/common/Avatar';
import { Users, UserCheck, UserX, Plus, Search, Pencil, Shield, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Usuario = UsuarioTenant;
type Resumen = ResumenUsuarios;

/** Acción pendiente de confirmar en el diálogo. */
type Pendiente = {
  id: number;
  nombre: string;
  accion: 'activar' | 'desactivar' | 'eliminar';
  onConfirm: () => Promise<void>;
};

export default function Usuarios() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, activos: 0, inactivos: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertDialog, setAlertDialog] = useState(false);
  const searchMounted = useRef(false);
  const [usuarioToggle, setUsuarioToggle] = useState<Pendiente | null>(null);

  const cargar = useCallback(async (search?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await usuariosApi.getUsuarios(
        search?.trim() ? { search: search.trim() } : undefined,
      );
      setUsuarios(res.data ?? []);
      setResumen(res.resumen ?? { total: 0, activos: 0, inactivos: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const handleToggleEstado = (u: Usuario) => {
    const accion = u.estado ? 'desactivar' : 'activar';
    setUsuarioToggle({
      id: u.id, nombre: u.name, accion,
      onConfirm: async () => {
        try {
          await usuariosApi.toggleUsuario(u.id);
          toast.success(`Usuario ${accion}do correctamente`);
          setAlertDialog(false); setUsuarioToggle(null);
          await cargar(busqueda);
        } catch (err: any) {
          if (err?.code === 'SELF_TOGGLE_DENIED') {
            toast.error('No puedes desactivarte a ti mismo');
          } else {
            toast.error(err?.message ?? 'Error al cambiar estado del usuario');
          }
        }
      },
    });
    setAlertDialog(true);
  };

  const handleEliminar = (u: Usuario) => {
    setUsuarioToggle({
      id: u.id, nombre: u.name, accion: 'eliminar',
      onConfirm: async () => {
        try {
          const res = await usuariosApi.deleteUsuario(u.id);
          toast.success(res.message ?? 'Usuario removido correctamente');
          setAlertDialog(false); setUsuarioToggle(null);
          await cargar(busqueda);
        } catch (err: any) {
          if (err?.code === 'SELF_REMOVE_DENIED') {
            toast.error('No puedes removerte a ti mismo');
          } else {
            toast.error(err?.message ?? 'Error al eliminar usuario');
          }
        }
      },
    });
    setAlertDialog(true);
  };

  // Orden alfabético por primer nombre (helper unificado del sistema).
  const usuariosFiltrados = sortByFirstName(
    usuarios.filter(u =>
      u.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email?.toLowerCase().includes(busqueda.toLowerCase())
    ),
  );

  return (
    <div className="space-y-6">
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {usuarioToggle?.accion === 'desactivar' && '¿Desactivar usuario?'}
              {usuarioToggle?.accion === 'activar' && '¿Activar usuario?'}
              {usuarioToggle?.accion === 'eliminar' && '¿Eliminar usuario?'}
            </AlertDialogTitle>
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

      <PageHeader
        title="Usuarios"
        description="Administra usuarios y permisos de la plataforma."
        actions={
          <Button onClick={() => navigate('/usuarios/nuevo')}>
            <Plus strokeWidth={2} />
            Nuevo usuario
          </Button>
        }
      />

      <StatStrip
        loading={loading}
        items={[
          { label: 'Usuarios', value: resumen.total, note: 'registrados', icon: Users, tone: 'blue' },
          { label: 'Activos', value: resumen.activos, note: 'con acceso al sistema', icon: UserCheck, tone: 'green' },
          { label: 'Inactivos', value: resumen.inactivos, note: 'sin acceso al sistema', icon: UserX, tone: 'neutral' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2>Lista de usuarios</h2>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            type="search"
            placeholder="Buscar por nombre, correo o rol"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Card className="items-center py-14 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando usuarios...
          </p>
        </Card>
      ) : usuariosFiltrados.length > 0 ? (
        <Card className="gap-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[13px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Nombre</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Correo</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Rol</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Estado</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={u.name} className={u.estado ? undefined : 'opacity-60'} />
                        <div className="min-w-0">
                          <Link to={`/usuarios/${u.id}`} className="font-semibold text-foreground hover:text-primary">
                            {u.name}
                          </Link>
                          <span className="block break-all text-xs text-muted-foreground md:hidden">{u.email}</span>
                          {/* El estado acompaña al nombre mientras su columna no cabe. */}
                          <span className="mt-1 block sm:hidden">
                            <Badge variant={u.estado ? 'success' : 'secondary'}>{u.estado ? 'Activo' : 'Inactivo'}</Badge>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.email}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{u.is_admin ? 'Administrador' : 'Usuario'}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={u.estado ? 'success' : 'secondary'}>{u.estado ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => navigate(`/usuarios/permisos/${u.id}`)}
                          aria-label="Permisos"
                          title={u.is_admin ? 'Permisos (Administrador de la finca)' : 'Permisos'}
                        >
                          <Shield strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => handleToggleEstado(u)}
                          aria-label={u.estado ? 'Desactivar' : 'Activar'}
                          title={u.estado ? 'Desactivar' : 'Activar'}
                        >
                          {u.estado ? <UserX strokeWidth={2} /> : <UserCheck strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => handleEliminar(u)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 strokeWidth={2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>No se encontraron usuarios</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {busqueda ? 'Intenta con otros términos de búsqueda.' : 'Comienza agregando tu primer usuario.'}
            </p>
          </div>
          {busqueda ? (
            <Button variant="outline" size="sm" onClick={() => setBusqueda('')}>Limpiar búsqueda</Button>
          ) : (
            <Button onClick={() => navigate('/usuarios/nuevo')}>
              <Plus strokeWidth={2} />
              Nuevo usuario
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
