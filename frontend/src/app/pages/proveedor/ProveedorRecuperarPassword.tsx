import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { ArrowLeft, Mail, CheckCircle2, Store } from 'lucide-react';
import { PalmappLogo } from '../../components/common/PalmappLogo';
import { proveedorAuthApi } from '../../../api/proveedorAuth';

export default function ProveedorRecuperarPassword() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // Si el link del email apunta a /proveedor/recuperar-password con token+email
  // (en vez de /proveedor/reset-password), redirigimos al formulario de reset
  // preservando los query params.
  useEffect(() => {
    const token = sp.get('token');
    const emailParam = sp.get('email');
    if (token && emailParam) {
      navigate(`/proveedor/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`, { replace: true });
    }
  }, [sp, navigate]);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await proveedorAuthApi.forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <PalmappLogo variant="isotipo" className="h-12 w-auto" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Portal Proveedores</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recuperar contraseña</h1>
          <p className="text-center text-sm text-muted-foreground">
            Ingresa el correo asociado a tu cuenta de proveedor y te enviaremos
            un enlace para restablecer tu contraseña
          </p>
        </div>

        {enviado ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-green-600">¡Correo enviado!</p>
            <p className="text-sm text-muted-foreground">
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
            </p>
            <Link to="/proveedor/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="proveedor@empresa.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
            <Link to="/proveedor/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
