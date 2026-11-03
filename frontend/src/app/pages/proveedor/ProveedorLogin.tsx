import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthFrame from '../auth/AuthFrame';
import PasswordField from '../auth/PasswordField';
import { esDemasiadosIntentos, mensajeDeError, mensajeDeEspera } from '../../../api/errores';
import {
  proveedorAuthApi,
  proveedorAuthStorage,
  ProveedorAuthErrorCodes,
} from '../../../api/proveedorAuth';

export default function ProveedorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Limpia cualquier sesión previa (token vencido, otro proveedor, etc.)
      proveedorAuthStorage.clearAll();

      const res = await proveedorAuthApi.login(email, password);
      proveedorAuthStorage.setToken(res.token);
      proveedorAuthStorage.setUser(res.user);

      if (res.requires_proveedor_selection && res.proveedores?.length) {
        // Caso B: el usuario tiene varios proveedores activos → al selector.
        proveedorAuthStorage.setPendientes(res.proveedores);
        navigate('/proveedor/seleccionar', { replace: true });
        return;
      }

      // Caso A: auto-select. El token ya incluye claims del proveedor.
      if (res.proveedor) proveedorAuthStorage.setProveedor(res.proveedor);
      if (res.rol) proveedorAuthStorage.setRol(res.rol);

      // Compatibilidad con código legacy que lee proveedorSession.
      localStorage.setItem('proveedorSession', JSON.stringify({
        email: res.user.email,
        nombre: res.proveedor?.nombre_empresa ?? res.user.name,
      }));

      toast.success(`Bienvenido ${res.proveedor?.nombre_empresa ?? res.user.name}`);
      navigate('/proveedor/dashboard', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === ProveedorAuthErrorCodes.USE_ADMIN_LOGIN) {
        setError('Eres super admin. Usa el panel de administración para iniciar sesión.');
        setTimeout(() => navigate('/super-admin/login'), 1500);
      } else if (code === ProveedorAuthErrorCodes.USER_INACTIVE) {
        setError('Tu cuenta está inactiva. Contacta al administrador.');
      } else if (code === ProveedorAuthErrorCodes.NO_PROVEEDORES_ACTIVOS) {
        setError('No tienes proveedores activos asignados. Contacta al administrador.');
      } else {
        setError(esDemasiadosIntentos(err)
          ? mensajeDeEspera(err)
          : mensajeDeError(err, 'No se pudo iniciar sesión.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      rotulo="Portal de proveedores"
      frase="Vende tus insumos a las fincas palmeras: catálogo, pedidos y despachos en un solo lugar."
    >
      <div className="mb-6 space-y-1.5">
        <h1>Portal de proveedores</h1>
        <p className="text-sm text-muted-foreground">Ingresa con el correo y la contraseña de tu empresa.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="empresa@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-10"
            required
          />
        </div>

        <PasswordField
          id="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          extra={
            <Link to="/proveedor/recuperar-password" className="text-[13px] font-medium text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          Iniciar sesión
        </Button>
      </form>

      <div className="mt-8 space-y-1 border-t border-border pt-5">
        <p className="text-[13px] font-medium text-muted-foreground">Otros accesos</p>
        <Link
          to="/login"
          className="flex items-center justify-between rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Soy de una finca
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </AuthFrame>
  );
}
