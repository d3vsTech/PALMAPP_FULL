/**
 * Barra superior pegada al contenido.
 *
 * Se vuelve translúcida cuando el contenido se desplaza debajo, y muestra en
 * qué módulo está parado el usuario. El scroll no es el de la ventana: vive
 * en el `main` de `AppShell`, que es el padre de este header.
 *
 * En celular el inicio de la barra lo arma `InicioBarraMovil`: flecha de
 * volver o logo, y el título del módulo. El menú completo se abre desde la
 * barra inferior, no desde aquí.
 */
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronDown, Download, LogOut, Moon, Search, Sun, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { navItems, esRutaActiva, TITULOS_SECCION } from './Sidebar';
import { abrirBuscador } from './shellState';
import { pedirInstalacion, useFormaInstalar } from '../../lib/appInstalable';
import InicioBarraMovil from './InicioBarraMovil';
import BotonTour from '../tour/BotonTour';

const ROLES: Record<string, string> = {
  dueño: 'Dueño',
  administrador: 'Administrador',
  jefe_campo: 'Jefe de campo',
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [desplazado, setDesplazado] = useState(false);
  const formaInstalar = useFormaInstalar();

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

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  // Chrome instala de una; iOS no tiene ese evento y solo queda explicar el paso.
  const instalar = () => {
    setDropdownOpen(false);
    if (formaInstalar === 'directa') pedirInstalacion();
    else toast('Instala PalmApp en tu iPhone', { description: 'Toca el botón Compartir y luego "Agregar a inicio".' });
  };

  const modulo = navItems.find((item) => esRutaActiva(location.pathname, item.href));

  const iniciales = (user?.nombre ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  const oscuro = theme === 'dark';

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200',
        desplazado ? 'border-border/80 bg-background/75 backdrop-blur-xl' : 'border-transparent bg-background',
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-2 md:h-16 md:gap-3 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1 md:gap-3">
          {/* En celular el menú completo se abre con "Más", en la barra
              inferior; aquí solo van la flecha de volver y el título. */}
          <InicioBarraMovil titulo={modulo?.label} />
          {modulo && (
            <span className="hidden truncate text-sm text-muted-foreground md:block">
              {TITULOS_SECCION[modulo.seccion]}
              <span className="mx-1 text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">{modulo.label}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <BotonTour />

          <button
            type="button"
            onClick={abrirBuscador}
            className="hidden h-9 w-64 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-muted-strong md:flex"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
            <span className="flex-1 text-left">Buscar</span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={abrirBuscador}
            aria-label="Buscar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted md:hidden"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>

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

          <span className="mx-1 hidden h-6 w-px bg-border md:block" />

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
                <span className="text-[11px] text-muted-foreground">
                  {user?.rol ? (ROLES[user.rol] ?? user.rol) : ''}
                </span>
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
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { navigate('/perfil'); setDropdownOpen(false); }}
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
                  {formaInstalar && (
                    <button
                      type="button"
                      onClick={instalar}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      Instalar PalmApp
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { cerrarSesion(); setDropdownOpen(false); }}
                    className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive-soft"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
