import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ChevronDown, LayoutGrid, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AvisoSinSenal from '../../components/layout/AvisoSinSenal';
import InicioBarraMovil from '../../components/layout/InicioBarraMovil';
import { abrirMenuMovil } from '../../components/layout/shellState';
import SuperAdminSidebar, {
  esRutaSuperAdminActiva,
  superAdminNavItems,
} from '../../components/super-admin/SuperAdminSidebar';
import { cn } from '../../components/lib/utils';

/** Barra inferior en celular: las cuatro secciones frecuentes y "Más". */
function SuperAdminBottomNav() {
  const location = useLocation();
  const items = superAdminNavItems.slice(0, 4);
  const enOtro = !items.some((i) => esRutaSuperAdminActiva(location.pathname, i.href));

  const clase = (activo: boolean) =>
    cn('flex flex-col items-center gap-1 py-2 text-[11px] font-medium', activo ? 'text-primary' : 'text-muted-foreground');
  const icono = (activo: boolean) =>
    cn('flex h-7 w-12 items-center justify-center rounded-full', activo && 'bg-accent/30 dark:bg-accent/20');

  const CORTOS: Record<string, string> = { '/super-admin/dashboard': 'Inicio' };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const activo = esRutaSuperAdminActiva(location.pathname, item.href);
          return (
            <Link key={item.href} to={item.href} aria-current={activo ? 'page' : undefined} className={clase(activo)}>
              <span className={icono(activo)}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={activo ? 2.3 : 2} />
              </span>
              {CORTOS[item.href] ?? item.label}
            </Link>
          );
        })}
        <button type="button" onClick={abrirMenuMovil} className={clase(enOtro)}>
          <span className={icono(enOtro)}>
            <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          Más
        </button>
      </div>
    </nav>
  );
}

/** Barra superior del panel. Se vuelve translúcida al desplazar el contenido. */
function SuperAdminTopbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const clicFuera = (evento: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(evento.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', clicFuera);
    return () => document.removeEventListener('mousedown', clicFuera);
  }, [dropdownOpen]);

  const modulo = superAdminNavItems.find((item) => esRutaSuperAdminActiva(location.pathname, item.href));

  const oscuro = theme === 'dark';

  const iniciales = (user?.nombre ?? 'S')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200',
        desplazado ? 'border-border/80 bg-background/75 backdrop-blur-xl' : 'border-transparent bg-background',
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-2 md:h-16 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1 md:gap-3">
          {/* El menú completo se abre con "Más", abajo. */}
          <InicioBarraMovil titulo={modulo?.label} nivelRaiz={2} />
          <span className="hidden truncate text-sm text-muted-foreground md:block">
            Super admin
            {modulo && (
              <>
                <span className="mx-1 text-muted-foreground/50">/</span>
                <span className="font-semibold text-foreground">{modulo.label}</span>
              </>
            )}
          </span>
        </div>

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
              <span className="text-[13px] font-semibold text-foreground">{user?.nombre}</span>
              <span className="text-[11px] text-muted-foreground">Super admin</span>
            </span>
            <ChevronDown
              className={cn('hidden h-4 w-4 text-muted-foreground transition-transform md:block', dropdownOpen && 'rotate-180')}
              strokeWidth={2}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-popover shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{user?.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { navigate('/super-admin/perfil'); setDropdownOpen(false); }}
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
  );
}

export default function SuperAdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
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
    <div data-barra-volver className="group/shell flex h-dvh overflow-hidden bg-frame">
      <SuperAdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:my-2.5 lg:mr-2.5 lg:rounded-[20px]">
        <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
          <SuperAdminTopbar />
          <AvisoSinSenal />
          <div
            key={location.pathname}
            className="pagina-entra mx-auto w-full max-w-[1440px] px-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pb-28 lg:pb-10"
          >
            <Outlet />
          </div>
        </main>
      </div>
      <SuperAdminBottomNav />
    </div>
  );
}
