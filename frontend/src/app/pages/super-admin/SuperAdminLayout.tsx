import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import SuperAdminSidebar from '../../components/super-admin/SuperAdminSidebar';

export default function SuperAdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#9032F0]/30 border-t-[#9032F0] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }

  if (user?.rol !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-black">
      <SuperAdminSidebar />
      <main className="md:ml-72 min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-black pt-16 md:pt-0">
        {/* Fondo decorativo — pointer-events-none para no bloquear clicks.
            NO usamos un wrapper `relative z-10` sobre el Outlet porque crearía
            un nuevo stacking context y los modales (z-50) quedarían atrapados
            debajo del sidebar (z-30 a nivel raíz). */}
        <div className="fixed inset-0 md:ml-72 pointer-events-none overflow-hidden -z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#9032F008_1px,transparent_1px),linear-gradient(to_bottom,#9032F008_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#9032F0]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#6506FF]/5 rounded-full blur-3xl" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}