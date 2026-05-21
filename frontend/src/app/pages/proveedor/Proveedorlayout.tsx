import { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { proveedorAuthApi, proveedorAuthStorage } from '../../../api/proveedorAuth';

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

  // Datos vivos de la sesión actual (proveedor seleccionado + usuario)
  const [proveedor, setProveedor] = useState(proveedorAuthStorage.getProveedor());
  const [user, setUser]           = useState(proveedorAuthStorage.getUser());

  // Si no hay sesión válida → mandar al login.
  useEffect(() => {
    if (!proveedorAuthStorage.getToken()) {
      navigate('/proveedor/login', { replace: true });
    }
    // `storage` cubre cambios desde OTRA pestaña (ej. seleccionar otro proveedor).
    const onStorage = () => {
      setProveedor(proveedorAuthStorage.getProveedor());
      setUser(proveedorAuthStorage.getUser());
    };
    // `proveedor-user-changed` cubre cambios desde la MISMA pestaña — lo dispara
    // la pantalla Mi Perfil al guardar nombre/email.
    const onUserChanged = () => setUser(proveedorAuthStorage.getUser());
    window.addEventListener('storage', onStorage);
    window.addEventListener('proveedor-user-changed', onUserChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('proveedor-user-changed', onUserChanged);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try { await proveedorAuthApi.logout(); } catch { /* ignorar */ }
    proveedorAuthStorage.clearAll();
    navigate('/proveedor/login', { replace: true });
  };

  const nombreEmpresa = proveedor?.nombre_empresa ?? 'Proveedor';
  const nombreUsuario = user?.name ?? 'Usuario';
  const emailUsuario  = user?.email ?? '';
  const rolUsuario    = proveedorAuthStorage.getRol();
  const rolLabel = rolUsuario === 'ADMIN'
    ? 'Administrador'
    : rolUsuario === 'OPERADOR' ? 'Operador' : '';
  const inicialUsuario = nombreUsuario.charAt(0).toUpperCase();

  // Dropdown del avatar (igual al Topbar de finca, sin "Cerrar sesión").
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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
                    <p className="text-sm font-semibold">{nombreEmpresa}</p>
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
              <p className="font-semibold">{nombreEmpresa}</p>
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
              <p className="text-sm font-medium">{nombreEmpresa}</p>
              <p className="text-xs text-muted-foreground truncate">{nombreUsuario}</p>
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
              {/* Dropdown del usuario (réplica del Topbar de finca sin
                  "Cerrar sesión" — el logout vive en el footer del sidebar). */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    {inicialUsuario}
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="font-medium text-foreground text-sm">{nombreUsuario}</span>
                    {rolLabel && (
                      <span className="text-xs text-muted-foreground">{rolLabel}</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {/* Datos del usuario */}
                    <div className="p-4 border-b border-border">
                      <p className="font-bold text-foreground truncate">{nombreUsuario}</p>
                      {emailUsuario && (
                        <p className="text-sm text-muted-foreground truncate">{emailUsuario}</p>
                      )}
                      {rolLabel && (
                        <p className="text-xs text-muted-foreground mt-1">{rolLabel}</p>
                      )}
                    </div>

                    {/* Acciones — solo "Mi perfil", sin Cerrar sesión */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/proveedor/perfil');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <User className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
                        <span className="font-medium text-foreground">Mi perfil</span>
                      </button>
                    </div>
                  </div>
                )}
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