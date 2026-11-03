import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { esDemasiadosIntentos, mensajeDeError, mensajeDeEspera } from '../../../api/errores';
import AuthFrame from './AuthFrame';
import PasswordField from './PasswordField';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // `login` decide el destino: selección de finca, panel o super admin.
      const redirectTo = await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(esDemasiadosIntentos(err)
        ? mensajeDeEspera(err)
        : mensajeDeError(err, 'Credenciales inválidas. Verifica tu correo y contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <div className="mb-6 space-y-1.5">
        <h1>Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Ingresa con el correo y la contraseña de tu finca.</p>
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
            placeholder="tu@correo.com"
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
            <Link to="/recuperar-password" className="text-[13px] font-medium text-primary hover:underline">
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
          to="/proveedor/login"
          className="flex items-center justify-between rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Portal de proveedores
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link
          to="/super-admin/login"
          className="flex items-center justify-between rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Super admin (equipo PalmApp)
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </AuthFrame>
  );
}
