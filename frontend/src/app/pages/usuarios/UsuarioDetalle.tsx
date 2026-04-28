import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Edit, Mail, Shield, Calendar, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario {
  id: number; name: string; email: string;
  is_admin: boolean; estado: boolean; asignado_at: string;
  finca?: string;
}

export default function UsuarioDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, user } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const fincaNombre = user?.fincaActual?.nombre ?? '';



  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        // La API no tiene GET /usuarios/{id} — usamos el listado y filtramos
        const res = await requestConToken<{ data: Usuario[] }>(
          `/api/v1/tenant/usuarios`, { method: 'GET' }, token
        );
        const found = (res.data ?? []).find(u => String(u.id) === String(id));
        if (found) setUsuario(found);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally { setLoading(false); }
    })();
  }, [id, token]);

  const getIniciales = (nombre: string) => {
    const p = nombre.split(' ');
    return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : nombre.substring(0, 2).toUpperCase();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Cargando usuario...
    </div>
  );

  if (!usuario) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Usuario no encontrado</p>
      <Button onClick={() => navigate('/usuarios')} className="mt-4">Volver a Usuarios</Button>
    </div>
  );

  const getRolColor = (isAdmin: boolean) =>
    isAdmin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}
            className="h-10 w-10 rounded-lg border border-border hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1>Detalle de Usuario</h1>
              <Badge className={usuario.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}>
                {usuario.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-lead">Información completa del usuario</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/usuarios/editar/${id}`)} className="gap-2 bg-primary hover:bg-primary/90">
          <Edit className="h-4 w-4" /> Editar
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${usuario.estado ? 'bg-primary/10 text-primary border-2 border-primary/20' : 'bg-muted text-muted-foreground border-2 border-border'}`}>
              {getIniciales(usuario.name)}
            </div>
            <div className="flex-1 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-semibold text-lg">{usuario.name}</p>
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-lg truncate" title={usuario.email}>{usuario.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rol</p>
                <Badge className={`${getRolColor(usuario.is_admin)} text-sm px-3 py-1`}>
                  {usuario.is_admin ? 'Administrador' : 'Usuario'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-semibold text-lg">{usuario.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Información de Contacto</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Correo Electrónico</p>
                <p className="font-medium">{usuario.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Información del Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rol Asignado</p>
                <Badge className={`${getRolColor(usuario.is_admin)} text-base px-3 py-1`}>
                  {usuario.is_admin ? 'Administrador' : 'Usuario'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estado de la Cuenta</p>
                <Badge className={`${usuario.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'} text-base px-3 py-1`}>
                  {usuario.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

            </div>
          </CardContent>
        </Card>

        {(usuario.asignado_at || fincaNombre) && (
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Asignación</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Finca Asignada</p>
                  <p className="font-medium text-lg">{fincaNombre || usuario.finca || '—'}</p>
                </div>
                {usuario.asignado_at && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Fecha de Asignación</p>
                    <p className="font-medium">
                      {new Date(usuario.asignado_at).toLocaleDateString('es-CO', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2>Acciones Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/usuarios/permisos/${id}`)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Gestionar Permisos</h3>
                  <p className="text-sm text-muted-foreground">Configura los permisos del usuario</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/usuarios/editar/${id}`)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Editar Información</h3>
                  <p className="text-sm text-muted-foreground">Actualiza los datos del usuario</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}