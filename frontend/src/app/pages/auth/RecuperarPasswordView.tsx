import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthFrame from './AuthFrame';

interface RecuperarPasswordViewProps {
  /** Ruta del inicio de sesión al que se vuelve. */
  loginPath: string;
  /** Rótulo bajo el logo, por ejemplo "Super admin". */
  rotulo?: string;
  placeholderEmail?: string;
  /** Pide el enlace al backend que corresponda. Lanza para mostrar el error. */
  enviar: (email: string) => Promise<void>;
}

/**
 * Solicitud del enlace de recuperación. La comparten la app, el portal de
 * proveedores y el super admin; cada uno trae su propio `enviar`.
 */
export default function RecuperarPasswordView({
  loginPath,
  rotulo,
  placeholderEmail = 'tu@correo.com',
  enviar,
}: RecuperarPasswordViewProps) {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await enviar(email);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame rotulo={rotulo}>
      {!enviado ? (
        <>
          <div className="mb-6 space-y-1.5">
            <h1>Recuperar contraseña</h1>
            <p className="text-sm text-muted-foreground">
              Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.
            </p>
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
                placeholder={placeholderEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-10"
                required
              />
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Clock className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Por seguridad, el enlace vence en 60 minutos y solo se puede usar una vez.
            </p>

            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
              Enviar enlace
            </Button>
          </form>

          <Link
            to={loginPath}
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Volver al inicio de sesión
          </Link>
        </>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <h1>Revisa tu correo</h1>
            <p className="text-sm text-muted-foreground">
              Si <span className="font-semibold text-foreground">{email}</span> está registrado, en unos minutos te llega
              el enlace para restablecer la contraseña.
            </p>
          </div>

          <div className="rounded-lg bg-muted/60 px-4 py-3">
            <p className="text-[13px] font-medium text-muted-foreground">Qué sigue</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-foreground">
              <li>Abre el correo; si no aparece, revisa la carpeta de spam.</li>
              <li>Haz clic en el enlace antes de 60 minutos.</li>
              <li>Crea la contraseña nueva e inicia sesión.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link to={loginPath}>Volver al inicio de sesión</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setEnviado(false);
                setEmail('');
              }}
            >
              ¿No te llegó? Intenta con otro correo
            </Button>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
