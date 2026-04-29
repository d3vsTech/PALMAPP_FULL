import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { ArrowLeft, User, Mail, Lock, Save, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function UsuarioNuevoEditar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();
  const esEdicion = !!id;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!esEdicion || !token) return;
    (async () => {
      try {
        // La API no tiene GET /usuarios/{id} — usamos el listado y filtramos
        const res = await requestConToken<{ data: any[] }>(
          `/api/v1/tenant/usuarios`, { method: 'GET' }, token
        );
        const u = (res.data ?? []).find((u: any) => String(u.id) === String(id));
        if (u) { setNombre(u.name ?? ''); setEmail(u.email ?? ''); }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally { setCargando(false); }
    })();
  }, [id, esEdicion, token]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!email.trim()) errs.email = 'El correo electrónico es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'El correo no es válido';
    if (!esEdicion && !password) errs.password = 'La contraseña es requerida';
    else if (password && password.length < 8) errs.password = 'La contraseña debe tener al menos 8 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const body: any = { name: nombre, email };
      if (password) body.password = password;
      if (esEdicion) {
        await requestConToken(`/api/v1/tenant/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
        toast.success('Usuario actualizado correctamente');
      } else {
        await requestConToken('/api/v1/tenant/usuarios', { method: 'POST', body: JSON.stringify(body) }, token);
        toast.success('Usuario creado correctamente');
      }
      navigate('/usuarios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/usuarios">Usuarios</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-foreground">{esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
          <p className="text-muted-foreground">{esEdicion ? 'Modifica la información del usuario' : 'Registra un nuevo usuario en el sistema'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="glass-subtle border-border shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Información del Usuario</CardTitle>
                <CardDescription>Completa los datos del usuario</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Nombre Completo
                </Label>
                <Input id="nombre" placeholder="Carlos Rodríguez" value={nombre}
                  onChange={e => { setNombre(e.target.value); setErrors(p => { const n = {...p}; delete n.nombre; return n; }); }}
                  className={errors.nombre ? 'border-destructive' : ''} />
                {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Correo Electrónico
                </Label>
                <Input id="email" type="email" placeholder="usuario@ejemplo.com" value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => { const n = {...p}; delete n.email; return n; }); }}
                  className={errors.email ? 'border-destructive' : ''} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Contraseña {esEdicion && '(Opcional)'}
                </Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'}
                    placeholder={esEdicion ? 'Dejar en blanco para no cambiar' : 'Mínimo 8 caracteres'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.password; return n; }); }}
                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                {esEdicion && <p className="text-xs text-muted-foreground">Solo completa este campo si deseas cambiar la contraseña</p>}
              </div>

              {/* Repetir contraseña — solo si se está escribiendo una */}
              {(!esEdicion || password) && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Repetir Contraseña
                  </Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.confirmPassword; return n; }); }}
                      className={`pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`} />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}
            </div>
            
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/usuarios')} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" /> {esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
}