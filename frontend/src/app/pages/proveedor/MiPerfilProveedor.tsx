import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import {
  User, Lock, Eye, EyeOff, Save, Loader2, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { proveedorAuthStorage } from '../../../api/proveedorAuth';
import { proveedorApi } from '../../../api/proveedor';

/**
 * Mi Perfil del Portal Proveedor.
 * Réplica visual exacta de `pages/perfil/MiPerfil.tsx` (lado finca) — misma
 * estructura de cards y campos, pero usando el usuario y endpoints del
 * proveedorAuthApi (token de proveedor, no de finca).
 */
export default function MiPerfilProveedor() {
  const userInicial = proveedorAuthStorage.getUser();
  const proveedor   = proveedorAuthStorage.getProveedor();
  const rol         = proveedorAuthStorage.getRol();

  // Mantenemos copia local mutable para reflejar cambios al guardar sin
  // tener que recargar la página.
  const [user, setUser] = useState(userInicial);

  // ─── Datos personales ─────────────────────────────────────────────────────
  const [nombre, setNombre]       = useState('');
  const [email, setEmail]         = useState('');
  const [savingPerfil, setSavingPerfil] = useState(false);
  /** Error inline en el campo email (validación 422). */
  const [errorEmail, setErrorEmail] = useState<string | null>(null);

  // ─── Contraseña ───────────────────────────────────────────────────────────
  const [passwordActual,  setPasswordActual]  = useState('');
  const [passwordNueva,   setPasswordNueva]   = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNueva,  setShowNueva]  = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  /** Errores inline por campo para el form de password. */
  const [errorPassActual,  setErrorPassActual]  = useState<string | null>(null);
  const [errorPassNueva,   setErrorPassNueva]   = useState<string | null>(null);
  const [errorPassConfirm, setErrorPassConfirm] = useState<string | null>(null);

  // Prellenar con datos actuales del usuario
  useEffect(() => {
    if (user) {
      setNombre(user.name  ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  // ─── Guardar perfil ───────────────────────────────────────────────────────
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEmail(null);

    const cambios: { name?: string; email?: string } = {};
    if (nombre.trim() !== (user?.name  ?? '')) cambios.name  = nombre.trim();
    if (email.trim()  !== (user?.email ?? '')) cambios.email = email.trim();

    if (Object.keys(cambios).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSavingPerfil(true);
    try {
      const res = await proveedorApi.actualizarPerfil(cambios);
      // Merge optimista: estado local + lo que envié + lo que devolvió el
      // backend (la `data` del backend gana si vino).
      const base = user ?? { id: 0, name: '', email: '' };
      const actualizado = {
        ...base,
        ...(cambios.name  ? { name:  cambios.name  } : {}),
        ...(cambios.email ? { email: cambios.email } : {}),
        ...(res.data ?? {}),
      };
      // `setUser` del storage dispara `proveedor-user-changed` para que el
      // header del layout refresque sin recargar.
      proveedorAuthStorage.setUser(actualizado);
      setUser(actualizado);
      toast.success(res.message ?? 'Perfil actualizado correctamente');
    } catch (err: any) {
      // Códigos específicos del doc §4
      if (err?.code === 'NO_DATA') {
        toast.info('No hay cambios para guardar');
      } else if (err?.errors?.email?.[0]) {
        // Error de validación inline en el campo email
        setErrorEmail(err.errors.email[0]);
      } else {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar el perfil');
      }
    } finally {
      setSavingPerfil(false);
    }
  };

  // ─── Cambiar contraseña ───────────────────────────────────────────────────
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPassActual(null);
    setErrorPassNueva(null);
    setErrorPassConfirm(null);

    if (passwordNueva !== passwordConfirm) {
      setErrorPassConfirm('Las contraseñas no coinciden');
      return;
    }
    if (passwordNueva.length < 8) {
      setErrorPassNueva('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSavingPass(true);
    try {
      const res = await proveedorApi.cambiarPassword({
        current_password:      passwordActual,
        password:              passwordNueva,
        password_confirmation: passwordConfirm,
      });
      toast.success(res.message ?? 'Contraseña actualizada correctamente');
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (err: any) {
      // Mapeo de códigos específicos del doc §4 → input correspondiente.
      if (err?.code === 'INVALID_CURRENT_PASSWORD') {
        setErrorPassActual(err.message ?? 'La contraseña actual es incorrecta');
      } else if (err?.code === 'SAME_PASSWORD') {
        setErrorPassNueva(err.message ?? 'La nueva contraseña debe ser diferente a la actual');
      } else if (err?.errors?.password?.[0]) {
        setErrorPassNueva(err.errors.password[0]);
      } else {
        toast.error(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
      }
    } finally {
      setSavingPass(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  const iniciales = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Texto de subrol: rol del proveedor (ADMIN/OPERADOR) + nombre de la empresa.
  const subtitulo = [
    rol === 'ADMIN' ? 'Administrador' : rol === 'OPERADOR' ? 'Operador' : null,
    proveedor?.nombre_empresa,
  ].filter(Boolean).join(' · ');

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
              <p className="font-semibold text-lg">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {subtitulo && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
              )}
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
                    onChange={e => { setEmail(e.target.value); setErrorEmail(null); }}
                    placeholder="tu@correo.com"
                    required
                    className={`pl-10 ${errorEmail ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                </div>
                {errorEmail && (
                  <p className="text-xs text-destructive">{errorEmail}</p>
                )}
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
                  onChange={e => { setPasswordActual(e.target.value); setErrorPassActual(null); }}
                  placeholder="Tu contraseña actual"
                  required
                  className={`pl-10 pr-10 ${errorPassActual ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button type="button" onClick={() => setShowActual(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errorPassActual && (
                <p className="text-xs text-destructive">{errorPassActual}</p>
              )}
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
                    onChange={e => { setPasswordNueva(e.target.value); setErrorPassNueva(null); }}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className={`pl-10 pr-10 ${errorPassNueva ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errorPassNueva && (
                  <p className="text-xs text-destructive">{errorPassNueva}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass_confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pass_confirm"
                    type={showNueva ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={e => { setPasswordConfirm(e.target.value); setErrorPassConfirm(null); }}
                    placeholder="Repite la nueva contraseña"
                    required
                    minLength={8}
                    className={`pl-10 ${errorPassConfirm ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errorPassConfirm && (
                  <p className="text-xs text-destructive">{errorPassConfirm}</p>
                )}
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
