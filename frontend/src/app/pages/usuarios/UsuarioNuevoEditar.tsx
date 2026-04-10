import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Save, Loader2, User, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function UsuarioNuevoEditar() {
  const { id } = useParams<{ id: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [error, setError] = useState('');

  // Cargar datos si es edición
  useEffect(() => {
    if (!esEdicion || !token) { setCargando(false); return; }
    const cargar = async () => {
      try {
        const res = await requestConToken<{ data: any }>(
          `/api/v1/tenant/usuarios?search=`, { method: 'GET' }, token
        );
        // Buscar el usuario por id en la lista
        const u = (res.data ?? []).find((x: any) => String(x.id) === id);
        if (u) { setNombre(u.name); setEmail(u.email); }
      } catch { /* silencioso */ }
      finally { setCargando(false); }
    };
    cargar();
  }, [esEdicion, id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (esEdicion) {
        const body: any = { name: nombre, email };
        if (password) body.password = password;
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/tenant/usuarios/${id}`,
          { method: 'PUT', body: JSON.stringify(body) }, token
        );
        toast.success(res.message ?? 'Usuario actualizado correctamente');
      } else {
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/tenant/usuarios`,
          { method: 'POST', body: JSON.stringify({ name: nombre, email, password }) }, token
        );
        toast.success(res.message ?? 'Usuario creado correctamente');
      }
      navigate('/usuarios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1>{esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
          <p className="text-lead">{esEdicion ? 'Actualiza los datos del usuario' : 'Agrega un nuevo usuario a la finca'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{esEdicion ? 'Datos del usuario' : 'Información del nuevo usuario'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre del usuario" required className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com" required className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Contraseña {esEdicion && <span className="text-muted-foreground font-normal">(dejar en blanco para no cambiar)</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={esEdicion ? 'Dejar en blanco para no cambiar' : 'Mínimo 8 caracteres'}
                  required={!esEdicion} minLength={esEdicion ? 0 : 8} className="pl-10" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/usuarios')} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}