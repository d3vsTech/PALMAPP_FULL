import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usuariosApi, type UpdateUsuarioPayload } from '../../../api/usuarios';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import PageHeader from '../../components/common/PageHeader';
import { Info, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function UsuarioNuevoEditar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();
  const esEdicion = !!id;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!esEdicion || !token) return;
    (async () => {
      try {
        // GET /usuarios/{id} retorna { data: UsuarioTenant }
        const res = await usuariosApi.getUsuario(Number(id));
        const u = res.data;
        if (u) { setNombre(u.name ?? ''); setEmail(u.email ?? ''); }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally { setCargando(false); }
    })();
  }, [id, esEdicion, token]);

  const limpiarError = (campo: string) =>
    setErrors(p => { const n = { ...p }; delete n[campo]; return n; });

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
      if (esEdicion) {
        const payload: UpdateUsuarioPayload = { name: nombre, email };
        if (password) payload.password = password;
        await usuariosApi.updateUsuario(Number(id), payload);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuariosApi.createUsuario({ name: nombre, email, password });
        toast.success('Usuario creado correctamente');
      }
      navigate('/usuarios');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'USER_ALREADY_ASSIGNED') {
        toast.error('El usuario ya está asignado a esta finca');
      } else if (code === 'MAX_USERS_REACHED') {
        toast.error('Se alcanzó el límite de usuarios del plan');
      } else {
        toast.error(err?.message ?? 'Error al guardar usuario');
      }
    } finally { setLoading(false); }
  };

  /** Campo de contraseña con el botón de ver y ocultar. */
  const campoPassword = (
    campo: 'password' | 'confirmPassword',
    etiqueta: string,
    placeholder: string,
    valor: string,
    onChange: (v: string) => void,
    visible: boolean,
    toggle: () => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={campo}>
        {etiqueta}
        {esEdicion && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </Label>
      <div className="relative">
        <Input
          id={campo}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={valor}
          disabled={cargando}
          onChange={(e) => { onChange(e.target.value); limpiarError(campo); }}
          aria-invalid={!!errors[campo]}
          className={errors[campo] ? 'border-destructive pr-10' : 'pr-10'}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
          onClick={toggle}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff strokeWidth={2} /> : <Eye strokeWidth={2} />}
        </Button>
      </div>
      {errors[campo] && <p className="text-sm text-destructive">{errors[campo]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/usuarios"
        eyebrow="Usuarios"
        title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
        description={esEdicion ? 'Modifica la información del usuario.' : 'Registra un nuevo usuario en el sistema.'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del usuario</CardTitle>
            <CardDescription>Nombre y correo con el que entrará a la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  placeholder="Carlos Rodríguez"
                  value={nombre}
                  disabled={cargando}
                  onChange={(e) => { setNombre(e.target.value); limpiarError('nombre'); }}
                  aria-invalid={!!errors.nombre}
                  className={errors.nombre ? 'border-destructive' : ''}
                />
                {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="carlos.rodriguez@ejemplo.com"
                  value={email}
                  disabled={cargando}
                  onChange={(e) => { setEmail(e.target.value); limpiarError('email'); }}
                  aria-invalid={!!errors.email}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceso</CardTitle>
            <CardDescription>
              {esEdicion
                ? 'Solo completa estos campos si deseas cambiar la contraseña.'
                : 'La contraseña debe tener al menos 8 caracteres.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {campoPassword(
                'password',
                'Contraseña',
                esEdicion ? 'Dejar en blanco para no cambiar' : 'Mínimo 8 caracteres',
                password,
                setPassword,
                showPassword,
                () => setShowPassword(v => !v),
              )}
              {campoPassword(
                'confirmPassword',
                'Confirmar contraseña',
                esEdicion ? 'Confirmar nueva contraseña' : 'Repite la contraseña',
                confirmPassword,
                setConfirmPassword,
                showConfirm,
                () => setShowConfirm(v => !v),
              )}
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <p className="text-sm text-muted-foreground">
                Los permisos específicos se configuran después de crear el usuario, en la sección de permisos.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/usuarios')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || cargando}>
            {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
}
