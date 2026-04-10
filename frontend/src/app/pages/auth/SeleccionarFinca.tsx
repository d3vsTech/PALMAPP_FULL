import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, ChevronRight, Loader2, LogOut } from 'lucide-react';
import { PalmappLogo } from '../../components/common/PalmappLogo';

export default function SeleccionarFinca() {
  const { user, availableTenants, selectFinca, logout } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Usar availableTenants del contexto (más confiable que user.fincas)
  const fincas = availableTenants.length > 0
    ? availableTenants
    : (user?.fincas ?? []);

  const handleSelect = async (tenantId: number) => {
    setError('');
    setLoadingId(tenantId);
    try {
      await selectFinca(tenantId);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo seleccionar la finca');
      setLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <PalmappLogo variant="isotipo" className="h-12 w-auto mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Selecciona tu finca</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Bienvenido, <span className="font-medium text-foreground">{user.nombre}</span>.
              Tienes acceso a {fincas.length} {fincas.length === 1 ? 'finca' : 'fincas'}.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {/* Lista de fincas */}
        <div className="space-y-3">
          {fincas.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No tienes fincas activas asignadas.
            </div>
          ) : (
            fincas.map((finca) => (
              <button
                key={finca.id}
                onClick={() => handleSelect(finca.id)}
                disabled={loadingId !== null}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left disabled:opacity-60 group"
              >
                {/* Icono */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{finca.nombre}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {finca.nit && (
                      <span className="text-xs text-muted-foreground">NIT: {finca.nit}</span>
                    )}
                    {finca.rol && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {finca.rol}
                      </span>
                    )}
                    {finca.plan && (
                      <span className="text-xs text-muted-foreground">{finca.plan}</span>
                    )}
                  </div>
                </div>

                {/* Arrow / Spinner */}
                <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                  {loadingId === finca.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}