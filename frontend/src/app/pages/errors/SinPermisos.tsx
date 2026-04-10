import { Link } from 'react-router';
import { Button } from '../../components/ui/AppButton';
import { ShieldAlert, Home } from 'lucide-react';

export default function SinPermisos() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="mb-2 text-4xl font-bold">403</h1>
      <h2 className="mb-4 text-2xl">Sin permisos de acceso</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        No tienes los permisos necesarios para acceder a esta página.
        Contacta a tu administrador si crees que deberías tener acceso.
      </p>
      <Button asChild>
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}