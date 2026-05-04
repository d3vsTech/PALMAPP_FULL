import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/proveedor/dashboard', icon: LayoutDashboard },
  { name: 'Mis Productos', href: '/proveedor/productos', icon: Package },
  { name: 'Pedidos', href: '/proveedor/pedidos', icon: ShoppingCart },
  { name: 'Estadísticas', href: '/proveedor/estadisticas', icon: BarChart3 },
  { name: 'Configuración', href: '/proveedor/configuracion', icon: Settings },
];

export default function ProveedorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    // Limpiar sesión del proveedor
    localStorage.removeItem('proveedorSession');
    navigate('/proveedor/login');
  };

  const isActiveRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar para móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-xl">
            <div className="flex h-full flex-col">
              {/* Header del sidebar móvil */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">AgroInsumos</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navegación móvil */}
              <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-white'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer del sidebar móvil */}
              <div className="p-4 border-t border-border">
                <div className="mb-3 px-1">
                  <p className="text-sm font-medium">AgroInsumos del Valle</p>
                  <p className="text-xs text-muted-foreground">Portal de proveedor</p>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar para escritorio */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 border-r border-border bg-card">
          {/* Header del sidebar */}
          <div className="flex items-center gap-3 p-6">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">AgroInsumos</p>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-4 pt-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-border">
            <div className="mb-3 px-1">
              <p className="text-sm font-medium">AgroInsumos del Valle</p>
              <p className="text-xs text-muted-foreground">Portal de proveedor</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header superior */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">AgroInsumos</p>
                  <p className="text-xs text-muted-foreground">Proveedor</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}