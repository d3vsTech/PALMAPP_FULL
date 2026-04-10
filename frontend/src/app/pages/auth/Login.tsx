import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/AppButton';
import { Input } from '../../components/ui/AppInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Eye, EyeOff, UserCircle, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PalmappLogo } from '../../components/common/PalmappLogo';
import palmaBg from '../../../assets/fe9f1db39291ab118443c5878157a8c4732de54c.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const redirectTo = await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Fondo con patrón sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none grid-pattern-subtle" />

      {/* Lado izquierdo - Branding */}
      <div className="hidden w-1/2 flex-col justify-center p-12 lg:flex relative z-10 bg-card/40 backdrop-blur-sm border-r border-border">
        <div className="space-y-8 max-w-xl mx-auto">
          {/* Logo y título */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <PalmappLogo 
                variant="complete"
                className="h-20 w-auto"
              />
            </div>
          </div>

          {/* Descripción principal */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight text-foreground">
              Sistema integral de gestión agrícola para tu plantación
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Administra predios, colaboradores, operaciones diarias y toda la gestión 
              administrativa de tu finca palmera desde un solo lugar.
            </p>
          </div>

          {/* Características principales */}
          <div className="space-y-3">
            {[
              'Control de producción en tiempo real',
              'Gestión de nómina y liquidaciones',
              'Seguimiento de operaciones diarias',
              'Métricas y reportes detallados'
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-all duration-300"
              >
                <div className="h-2 w-2 rounded-full bg-accent shadow-md" />
                <p className="font-medium text-foreground">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado derecho - Formulario de login */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 relative z-10 overflow-hidden">
        {/* Imagen de fondo */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${palmaBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay muy sutil para mantener legibilidad */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
        </div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 bg-white/98 backdrop-blur-md border-border/50">
          <CardHeader>
            {/* Isotipo móvil */}
            <div className="flex justify-center lg:hidden mb-6">
              <PalmappLogo variant="isotipo" className="h-16 w-16" />
            </div>

            <CardTitle className="text-center">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder a Palmapp
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {/* Campo Email */}
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {/* Campo Contraseña */}
              <div className="space-y-2">
                <label className="block font-medium text-foreground">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Link recuperar contraseña */}
              <div className="flex items-center justify-end">
                <Link
                  to="/recuperar-password"
                  className="text-sm text-primary hover:underline font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Botón iniciar sesión */}
              <Button 
                type="submit" 
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                {!loading && 'Iniciar sesión'}
              </Button>

              {/* Link al Super Admin */}
              <div className="pt-4 text-center border-t border-border">
                <Link
                  to="/super-admin/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Acceso de Super Administrador →
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}