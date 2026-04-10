import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export default function SinAcceso() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sin permisos de acceso</h1>
          {user && (
            <p className="text-muted-foreground">
              Hola <span className="font-medium text-foreground">{user.nombre}</span>, tu cuenta no tiene
              permisos asignados en esta finca.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Contacta a tu administrador para que te asigne los permisos necesarios.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-destructive text-white font-semibold text-sm hover:bg-destructive/90 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}