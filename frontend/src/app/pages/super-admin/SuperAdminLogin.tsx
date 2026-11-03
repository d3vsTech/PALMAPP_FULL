import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthFrame from '../auth/AuthFrame';
import PasswordField from '../auth/PasswordField';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.rol === 'super_admin') {
      navigate('/super-admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // El tercer argumento manda el login contra `/v1/admin-auth/login`.
      await login(email, password, true);
      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : 'Credenciales inválidas. Revisa el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      rotulo="Super admin"
      frase="Panel del equipo PalmApp para administrar fincas, planes y el estado del sistema."
    >
      <div className="mb-6 space-y-1.5">
        <h1>Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Acceso exclusivo para el equipo de PalmApp.</p>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@palmapp.com"
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
            <Link to="/super-admin/recuperar-password" className="text-[13px] font-medium text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          Iniciar sesión
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Acceso para usuarios de finca
      </Link>
    </AuthFrame>
  );
}
