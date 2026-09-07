import { Navigate } from 'react-router';
import { useAuth, esAdmin } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  permiso?: string;
  roles?: string[];
}

export default function ProtectedRoute({ children, permiso, roles }: Props) {
  const { user, hasPermiso } = useAuth();

  // Admins tienen todo — mismo criterio que hasPermiso (esAdmin).
  if (esAdmin(user)) {
    return <>{children}</>;
  }

  // Verificar rol requerido
  if (roles && roles.length > 0 && user?.rol) {
    if (!roles.includes(user.rol)) {
      return <Navigate to="/403" replace />;
    }
  }

  // Verificar permiso requerido
  if (permiso && !hasPermiso(permiso)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}