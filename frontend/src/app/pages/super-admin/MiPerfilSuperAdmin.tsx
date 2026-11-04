/**
 * Mi perfil del super admin.
 *
 * El backend no tiene un endpoint propio de perfil para el equipo PalmApp.
 * Se usa el CRUD de usuarios globales, `PUT /admin/users/{id}`, con el id del
 * usuario de la sesión. Por eso no pide la contraseña actual: ese endpoint no
 * la recibe.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminApi, type UpdateGlobalUserPayload } from '../../../api/superAdmin';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import PageHeader from '../../components/common/PageHeader';
import PasswordField from '../auth/PasswordField';

export default function MiPerfilSuperAdmin() {
  const { user, updateUser } = useAuth();

  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNombre(user?.nombre ?? '');
    setEmail(user?.email ?? '');
  }, [user?.nombre, user?.email]);

  const iniciales = (user?.nombre ?? 'S')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');

    if (!nombre.trim() || !email.trim()) {
      setError('El nombre y el correo son obligatorios.');
      return;
    }

    const payload: UpdateGlobalUserPayload = {
      name: nombre.trim(),
      email: email.trim(),
    };

    // La contraseña es opcional: solo se manda si la escribió.
    if (password.trim()) {
      if (password.trim().length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== confirmacion) {
        setError('Las contraseñas no coinciden. Escríbela igual en ambos campos.');
        return;
      }
      payload.password = password.trim();
    }

    setGuardando(true);
    try {
      const res = await superAdminApi.updateUsuario(user.id, payload);
      updateUser({ nombre: payload.name, email: payload.email });
      setPassword('');
      setConfirmacion('');
      toast.success(res.message ?? 'Perfil actualizado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Mi perfil"
        description="Tus datos de acceso al panel del equipo PalmApp."
        backTo="/super-admin/dashboard"
      />

      <Card className="gap-4">
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-frame text-lg font-bold text-accent">
              {iniciales}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{user?.nombre}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Super admin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={guardar} className="space-y-6">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <User className="h-4 w-4" strokeWidth={2} />
              </span>
              Datos de la cuenta
            </CardTitle>
            <CardDescription>El nombre y el correo con los que entras al panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="perfil-nombre">Nombre</Label>
                <Input
                  id="perfil-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-correo">Correo electrónico</Label>
                <Input
                  id="perfil-correo"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@palmapp.com"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>Déjala vacía si no la vas a cambiar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="perfil-password"
                label="Contraseña nueva"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                disabled={guardando}
              />
              {password.trim() !== '' && (
                <PasswordField
                  id="perfil-password-confirmacion"
                  label="Confirmar contraseña"
                  value={confirmacion}
                  onChange={setConfirmacion}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  disabled={guardando}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2} />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
