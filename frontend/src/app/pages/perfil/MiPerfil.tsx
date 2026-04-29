import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import {
  User, Lock, Eye, EyeOff, Save, Loader2, CheckCircle2, Mail,
} from 'lucide-react';
import { toast } from 'sonner';

export default function MiPerfil() {
  const { user, token } = useAuth();

  // ─── Datos personales ─────────────────────────────────────────────────────
  const [nombre, setNombre]       = useState('');
  const [email, setEmail]         = useState('');
  const [savingPerfil, setSavingPerfil] = useState(false);

  // ─── Contraseña ───────────────────────────────────────────────────────────
  const [passwordActual,  setPasswordActual]  = useState('');
  const [passwordNueva,   setPasswordNueva]   = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNueva,  setShowNueva]  = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);

  // Prellenar con datos actuales del usuario
  useEffect(() => {
    if (user) {
      setNombre(user.nombre ?? '');
      setEmail(user.email  ?? '');
    }
  }, [user]);

  // ─── Guardar perfil ───────────────────────────────────────────────────────
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();

    const cambios: Record<string, string> = {};
    if (nombre.trim() !== (user?.nombre ?? '')) cambios.name  = nombre.trim();
    if (email.trim()  !== (user?.email  ?? '')) cambios.email = email.trim();

    if (Object.keys(cambios).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSavingPerfil(true);
    try {
      const res = await requestConToken<{ message?: string; data?: any }>(
        '/api/v1/tenant/perfil',
        { method: 'PUT', body: JSON.stringify(cambios) },
        token,
      );
      // Actualizar localStorage con los nuevos datos
      const stored = localStorage.getItem('palmapp_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (cambios.name)  parsed.nombre = cambios.name;
        if (cambios.email) parsed.email  = cambios.email;
        localStorage.setItem('palmapp_user', JSON.stringify(parsed));
      }
      toast.success(res.message ?? 'Perfil actualizado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setSavingPerfil(false);
    }
  };

  // ─── Cambiar contraseña ───────────────────────────────────────────────────
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordNueva !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordNueva.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSavingPass(true);
    try {
      const res = await requestConToken<{ message?: string }>(
        '/api/v1/tenant/perfil/password',
        {
          method: 'PUT',
          body: JSON.stringify({
            current_password:      passwordActual,
            password:              passwordNueva,
            password_confirmation: passwordConfirm,
          }),
        },
        token,
      );
      toast.success(res.message ?? 'Contraseña actualizada correctamente');
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setSavingPass(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  const iniciales = user?.nombre
    ? user.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Mi Perfil</h1>
        <p className="text-lead">Administra tu información personal y contraseña</p>
      </div>

      {/* Avatar + info actual */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 text-xl font-bold text-primary shrink-0">
              {iniciales}
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.nombre}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {user?.rol === 'administrador' ? 'Administrador' : user?.rol}
                {user?.fincaActual ? ` · ${user.fincaActual.nombre}` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario: editar nombre y email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Datos personales
          </CardTitle>
          <CardDescription>
            Actualiza tu nombre y correo electrónico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPerfil} className="gap-2 min-w-[160px]">
                {savingPerfil
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : <><Save className="w-4 h-4" /> Guardar datos</>
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Formulario: cambiar contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>
            Necesitas tu contraseña actual para establecer una nueva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pass_actual">Contraseña actual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pass_actual"
                  type={showActual ? 'text' : 'password'}
                  value={passwordActual}
                  onChange={e => setPasswordActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                  className="pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowActual(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pass_nueva">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pass_nueva"
                    type={showNueva ? 'text' : 'password'}
                    value={passwordNueva}
                    onChange={e => setPasswordNueva(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="pl-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass_confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pass_confirm"
                    type={showNueva ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    minLength={8}
                    className="pl-10"
                  />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPass} className="gap-2 min-w-[180px]">
                {savingPass
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : <><Save className="w-4 h-4" /> Cambiar contraseña</>
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}