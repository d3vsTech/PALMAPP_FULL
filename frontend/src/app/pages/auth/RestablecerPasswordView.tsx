import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, Check, CheckCircle2, Circle, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/lib/utils';
import AuthFrame from './AuthFrame';
import PasswordField from './PasswordField';

function Regla({ ok, mal, children }: { ok: boolean; mal?: boolean; children: React.ReactNode }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-success' : mal ? 'text-destructive' : 'text-muted-foreground')}>
      {ok
        ? <Check className="h-3.5 w-3.5" strokeWidth={2} />
        : mal
          ? <X className="h-3.5 w-3.5" strokeWidth={2} />
          : <Circle className="h-3 w-3" strokeWidth={2} />}
      {children}
    </p>
  );
}

interface RestablecerPasswordViewProps {
  loginPath: string;
  recuperarPath: string;
  rotulo?: string;
  descripcion?: string;
  /**
   * El backend de la app y el de proveedores piden el correo junto al token.
   * El del super admin solo el token.
   */
  requiereEmail?: boolean;
  /** Guarda la contraseña nueva. Lanza para mostrar el error. */
  restablecer: (datos: { token: string; email: string; password: string }) => Promise<void>;
}

/** Contraseña nueva a partir del token del correo. La comparten los tres accesos. */
export default function RestablecerPasswordView({
  loginPath,
  recuperarPath,
  rotulo,
  descripcion = 'Escribe tu contraseña nueva. Debe tener al menos 8 caracteres.',
  requiereEmail = true,
  restablecer,
}: RestablecerPasswordViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const largoOk = password.length >= 8;
  const coinciden = password === confirmacion && confirmacion.length > 0;
  const puedeEnviar = largoOk && coinciden && !loading;
  const enlaceValido = Boolean(token) && (!requiereEmail || Boolean(email));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!largoOk) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!coinciden) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await restablecer({ token, email, password });
      setExito(true);
      setTimeout(() => navigate(loginPath), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!enlaceValido) {
    return (
      <AuthFrame rotulo={rotulo}>
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive-soft text-destructive">
              <AlertCircle className="h-5 w-5" strokeWidth={2} />
            </span>
            <h1>El enlace no es válido</h1>
            <p className="text-sm text-muted-foreground">
              El enlace para restablecer la contraseña no es válido o ya venció. Pide uno nuevo.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={() => navigate(recuperarPath)}>
              Solicitar enlace nuevo
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground">
              <Link to={loginPath}>Volver al inicio de sesión</Link>
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  if (exito) {
    return (
      <AuthFrame rotulo={rotulo}>
        <div className="space-y-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
          </span>
          <h1>Contraseña actualizada</h1>
          <p className="text-sm text-muted-foreground">Te llevamos al inicio de sesión…</p>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame rotulo={rotulo}>
      <div className="mb-6 space-y-1.5">
        <h1>Restablecer contraseña</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
        {email && (
          <p className="text-sm text-muted-foreground">
            Para <span className="font-semibold text-foreground">{email}</span>.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordField
          id="password-nueva"
          label="Contraseña nueva"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          disabled={loading}
          invalid={password.length > 0 && !largoOk}
          hint={password.length > 0 && <Regla ok={largoOk}>Mínimo 8 caracteres</Regla>}
        />

        <PasswordField
          id="password-confirmacion"
          label="Confirmar contraseña"
          value={confirmacion}
          onChange={setConfirmacion}
          placeholder="Repite la contraseña"
          autoComplete="new-password"
          disabled={loading}
          invalid={confirmacion.length > 0 && !coinciden}
          hint={
            confirmacion.length > 0 && (
              <Regla ok={coinciden} mal={!coinciden}>
                {coinciden ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
              </Regla>
            )
          }
        />

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!puedeEnviar} isLoading={loading}>
          Guardar contraseña
        </Button>
      </form>

      <Link
        to={loginPath}
        className="mt-8 inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Volver al inicio de sesión
      </Link>
    </AuthFrame>
  );
}
