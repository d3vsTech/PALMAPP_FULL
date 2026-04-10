import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Edit, Shield, Loader2, User, Mail, Calendar, ShieldCheck } from 'lucide-react';

interface Usuario {
  id: number; name: string; email: string;
  status: boolean; is_admin: boolean; estado: boolean; asignado_at: string;
}

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    const cargar = async () => {
      try {
        const res = await requestConToken<{ data: Usuario[] }>(
          `/api/v1/tenant/usuarios`, { method: 'GET' }, token
        );
        const u = (res.data ?? []).find(x => String(x.id) === id);
        setUsuario(u ?? null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Usuario no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/usuarios')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  const iniciales = usuario.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1>Detalle de Usuario</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/usuarios/editar/${id}`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
          {!usuario.is_admin && (
            <Button variant="outline" onClick={() => navigate(`/usuarios/permisos/${id}`)}
              className="hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500">
              <Shield className="h-4 w-4 mr-2" /> Permisos
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${usuario.estado ? 'bg-primary/10 text-primary border-2 border-primary/20' : 'bg-muted text-muted-foreground border-2 border-border'}`}>
              {iniciales}
            </div>
            <div>
              <h2 className="text-xl font-bold">{usuario.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={usuario.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}>
                  {usuario.estado ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge className={usuario.is_admin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-muted'}>
                  {usuario.is_admin ? 'Administrador' : 'Usuario'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="font-medium">{usuario.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Asignado el</p>
                <p className="font-medium">{new Date(usuario.asignado_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            {usuario.is_admin && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-sm text-primary">Este usuario tiene todos los permisos del sistema</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}