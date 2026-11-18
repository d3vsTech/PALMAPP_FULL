import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Store,
  User,
  X,
} from 'lucide-react';
import { Sun } from 'lucide-react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useTheme } from '../../contexts/ThemeContext';
import AvisoSinSenal from '../../components/layout/AvisoSinSenal';
import InicioBarraMovil from '../../components/layout/InicioBarraMovil';
import { PalmappLogo } from '../../components/common/PalmappLogo';
import { cn } from '../../components/lib/utils';
import { proveedorAuthApi, proveedorAuthStorage } from '../../../api/proveedorAuth';

const navegacion = [
  { nombre: 'Panel de inicio', href: '/proveedor/dashboard', icon: LayoutDashboard },
  { nombre: 'Mis productos', href: '/proveedor/productos', icon: Package },
  { nombre: 'Pedidos', href: '/proveedor/pedidos', icon: ShoppingCart },
  { nombre: 'Estadísticas', href: '/proveedor/estadisticas', icon: BarChart3 },
  { nombre: 'Configuración', href: '/proveedor/configuracion', icon: Settings },
];

export default function ProveedorLayout() {
  const { theme, toggleTheme } = useTheme();
  const oscuro = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  // El menú lateral de móvil solo se cerraba tocando el fondo.
  useCerrarConEscape(menuAbierto, () => setMenuAbierto(false));

  // Datos vivos de la sesión: proveedor seleccionado y usuario.
  const [proveedor, setProveedor] = useState(() => proveedorAuthStorage.getProveedor());
  const [user, setUser] = useState(() => proveedorAuthStorage.getUser());

  useEffect(() => {
    if (!proveedorAuthStorage.getToken()) {
      navigate('/proveedor/login', { replace: true });
    }
    // `storage` cubre cambios desde OTRA pestaña, por ejemplo elegir otro proveedor.
    const alCambiarStorage = () => {
      setProveedor(proveedorAuthStorage.getProveedor());
      setUser(proveedorAuthStorage.getUser());
    };
    // `proveedor-user-changed` cubre la MISMA pestaña: lo dispara Mi perfil al guardar.
    const alCambiarUsuario = () => setUser(proveedorAuthStorage.getUser());
    window.addEventListener('storage', alCambiarStorage);
    window.addEventListener('proveedor-user-changed', alCambiarUsuario);
    return () => {
      window.removeEventListener('storage', alCambiarStorage);
      window.removeEventListener('proveedor-user-changed', alCambiarUsuario);
    };
  }, [navigate]);

  const cerrarSesion = async () => {
    try { await proveedorAuthApi.logout(); } catch { /* la sesión local se limpia igual */ }
    proveedorAuthStorage.clearAll();
    navigate('/proveedor/login', { replace: true });
  };

  const nombreEmpresa = proveedor?.nombre_empresa ?? 'Proveedor';
  const nombreUsuario = user?.name ?? 'Usuario';
  const emailUsuario = user?.email ?? '';
  const rol = proveedorAuthStorage.getRol();
  const rolLabel = rol === 'ADMIN' ? 'Administrador' : rol === 'OPERADOR' ? 'Operador' : '';
  const iniciales = nombreUsuario
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const clicFuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', clicFuera);
    return () => document.removeEventListener('mousedown', clicFuera);
  }, [dropdownOpen]);

  // La barra superior se vuelve translúcida cuando el contenido se desplaza.
  const headerRef = useRef<HTMLElement>(null);
  const [desplazado, setDesplazado] = useState(false);
  useEffect(() => {
    const scroller = headerRef.current?.parentElement;
    if (!scroller) return;
    const alMover = () => setDesplazado(scroller.scrollTop > 4);
    alMover();
    scroller.addEventListener('scroll', alMover, { passive: true });
    return () => scroller.removeEventListener('scroll', alMover);
  }, []);

  const esRutaActiva = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const moduloActual = navegacion.find((item) => esRutaActiva(item.href));

  // Un elemento, no un componente: definido aquí dentro, React lo veía nuevo
  // en cada render y remontaba el menú entero.
  const contenido = (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <PalmappLogo variant="isotipo" tono="blanco" className="h-8 w-auto" alt="" />
        <PalmappLogo variant="wordmark" tono="blanco" className="h-[18px] w-auto" />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 pt-2">
        <p className="mb-1.5 px-3 text-xs font-medium text-sidebar-foreground/45">Proveedores</p>
        <div className="space-y-0.5">
          {navegacion.map((item) => {
            const Icon = item.icon;
            const activo = esRutaActiva(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMenuAbierto(false)}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors duration-150',
                  activo
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground [&>svg]:text-sidebar-primary'
                    : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                <span className="truncate">{item.nombre}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 space-y-1 p-3">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-sidebar-accent-foreground">
              {nombreEmpresa}
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">
              Portal de proveedor
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div data-barra-volver className="group/shell flex h-dvh overflow-hidden bg-frame">
      <aside className="hidden w-64 shrink-0 flex-col lg:flex">{contenido}</aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 w-64 max-w-[85vw] animate-in slide-in-from-left duration-200">
            {contenido}
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3.5 flex h-9 w-9 items-center justify-center rounded-[10px] text-sidebar-foreground/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* `min-w-0`: sin esto una tabla ancha estira esta columna y empuja la
          página entera, que es lo que se ve cortado. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:my-2.5 lg:mr-2.5 lg:rounded-[20px]">
        <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
          <header
            ref={headerRef}
            className={cn(
              'sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200',
              desplazado ? 'border-border/80 bg-background/75 backdrop-blur-xl' : 'border-transparent bg-background',
            )}
          >
            <div className="flex h-14 items-center justify-between gap-2 px-2 md:h-16 md:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-1 md:gap-3">
                {/* El menú completo se abre con "Más", en la barra de abajo. */}
                <InicioBarraMovil titulo={moduloActual?.nombre} nivelRaiz={2} />
                <span className="hidden truncate text-sm text-muted-foreground md:block">
                  Proveedores
                  {moduloActual && (
                    <>
                      <span className="mx-1 text-muted-foreground/50">/</span>
                      <span className="font-semibold text-foreground">{moduloActual.nombre}</span>
                    </>
                  )}
                </span>
              </div>

              {/* El cierre de sesión vive en el pie del menú, no aquí. */}
              <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
              >
                {oscuro
                  ? <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
                  : <Moon className="h-[18px] w-[18px]" strokeWidth={2} />}
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Tu cuenta"
                  className="flex min-h-11 items-center gap-2.5 rounded-lg py-1 pl-1 pr-1 transition-colors hover:bg-muted md:pr-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-frame text-[12px] font-bold text-accent">
                    {iniciales}
                  </span>
                  <span className="hidden flex-col items-start leading-tight md:flex">
                    <span className="text-[13px] font-semibold text-foreground">{nombreUsuario}</span>
                    {rolLabel && <span className="text-[11px] text-muted-foreground">{rolLabel}</span>}
                  </span>
                  <ChevronDown
                    className={cn('hidden h-4 w-4 text-muted-foreground transition-transform md:block', dropdownOpen && 'rotate-180')}
                    strokeWidth={2}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-popover shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-foreground">{nombreUsuario}</p>
                      {emailUsuario && <p className="truncate text-xs text-muted-foreground">{emailUsuario}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); navigate('/proveedor/perfil'); }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <User className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      Mi perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => { toggleTheme(); setDropdownOpen(false); }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted md:hidden"
                    >
                      {oscuro
                        ? <Sun className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                        : <Moon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />}
                      {oscuro ? 'Modo claro' : 'Modo oscuro'}
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </header>

          <AvisoSinSenal />

          <div
            key={location.pathname}
            className="pagina-entra mx-auto w-full max-w-[1440px] px-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pb-28 lg:pb-10"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra inferior en celular: las cuatro secciones frecuentes y "Más". */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-2">
          {navegacion.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const activo = esRutaActiva(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
                  activo ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full',
                    activo && 'bg-accent/30 dark:bg-accent/20',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={activo ? 2.3 : 2} />
                </span>
                {item.href === '/proveedor/dashboard' ? 'Inicio' : item.nombre}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
              !moduloActual || moduloActual.href === '/proveedor/configuracion'
                ? 'text-primary'
                : 'text-muted-foreground',
            )}
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            Más
          </button>
        </div>
      </nav>
    </div>
  );
}
