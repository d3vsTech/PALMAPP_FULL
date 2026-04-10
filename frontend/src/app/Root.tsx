import { Outlet, Navigate } from 'react-router';
import { useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';

export default function Root() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Esperar a que termine de verificar sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.rol === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}