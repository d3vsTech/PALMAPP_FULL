import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Building2, ChevronRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mensajeDeError } from '../../../api/errores';
import { PalmappLogo } from '../../components/common/PalmappLogo';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/lib/utils';

/** Iniciales de la finca cuando no hay logo cargado. */
function iniciales(nombre: string): string {
  const partes = nombre.split(' ').filter((p) => p.length > 2);
  const corte = partes.length > 0 ? partes : [nombre];
  return corte.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
}

export default function SeleccionarFinca() {
  const { user, availableTenants, selectFinca, logout } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // `availableTenants` del contexto es más confiable que `user.fincas`.
  const fincas = availableTenants.length > 0 ? availableTenants : (user?.fincas ?? []);

  const seleccionar = async (tenantId: number) => {
    setError('');
    setLoadingId(tenantId);
    try {
      await selectFinca(tenantId);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo seleccionar la finca'));
      setLoadingId(null);
    }
  };

  const cerrarSesion = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <PalmappLogo variant="complete" className="h-8 w-auto" />
          {user && (
            <div className="min-w-0 text-right leading-tight">
              <p className="truncate text-[13px] font-semibold text-foreground">{user.nombre}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-3xl">
        <div className="mb-6 space-y-1.5">
          <h1>Selecciona una finca</h1>
          <p className="text-sm text-muted-foreground">
            Tienes acceso a {fincas.length} {fincas.length === 1 ? 'finca' : 'fincas'}. Elige con cuál vas a trabajar.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {fincas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No tienes fincas activas asignadas.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {fincas.map((finca) => {
              const cargando = loadingId === finca.id;
              return (
                <li key={finca.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(finca.id)}
                    disabled={loadingId !== null}
                    className={cn(
                      'flex w-full items-center gap-4 px-4 py-4 text-left transition-colors disabled:cursor-default sm:px-5',
                      cargando ? 'bg-primary-soft' : 'hover:bg-muted/40',
                    )}
                  >
                    {/* `logo_url` llega absoluto en cada item de `tenants[]` del
                        login (API_AUTH_FINCA §1) y es null si la finca no cargó
                        ninguno: ahí van las iniciales. */}
                    {finca.logo_url ? (
                      <img
                        src={finca.logo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border border-border object-contain"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
                        {iniciales(finca.nombre) || <Building2 className="h-5 w-5" strokeWidth={2} />}
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-foreground">{finca.nombre}</span>
                        {finca.rol && <Badge variant="secondary">{finca.rol}</Badge>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {finca.nit && <span>NIT {finca.nit}</span>}
                        {finca.plan && <span>{finca.plan}</span>}
                      </span>
                    </span>

                    {cargando ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Puedes cambiar de finca más tarde desde el menú lateral.
        </p>

        <button
          type="button"
          onClick={cerrarSesion}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Cerrar sesión
        </button>
        </div>
      </main>

      <footer className="border-t border-border py-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PalmApp · Tu palma en la palma
        </p>
      </footer>
    </div>
  );
}
