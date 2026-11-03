import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Store,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { EVT_ABRIR_MENU, useEventoShell } from '../layout/shellState';
import { PalmappLogo } from '../common/PalmappLogo';
import { cn } from '../lib/utils';

export interface SuperAdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  seccion: 'clientes' | 'sistema';
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  { label: 'Panel general', href: '/super-admin/dashboard', icon: LayoutDashboard, seccion: 'clientes' },
  { label: 'Fincas', href: '/super-admin/fincas', icon: Building2, seccion: 'clientes' },
  { label: 'Proveedores', href: '/super-admin/proveedores', icon: Store, seccion: 'clientes' },
  { label: 'Actividad del sistema', href: '/super-admin/actividad', icon: Activity, seccion: 'sistema' },
  { label: 'Diagnósticos', href: '/super-admin/diagnosticos', icon: Stethoscope, seccion: 'sistema' },
];

const TITULOS_SECCION: Record<SuperAdminNavItem['seccion'], string> = {
  clientes: 'Clientes',
  sistema: 'Sistema',
};

export function esRutaSuperAdminActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SuperAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEventoShell(EVT_ABRIR_MENU, useCallback(() => setMobileOpen(true), []));
  // El menú lateral de móvil solo se cerraba tocando el fondo.
  useCerrarConEscape(mobileOpen, () => setMobileOpen(false));

  const cerrarSesion = () => {
    logout();
    navigate('/super-admin/login');
  };

  const secciones = (['clientes', 'sistema'] as const).map((clave) => ({
    clave,
    items: superAdminNavItems.filter((i) => i.seccion === clave),
  }));

  // Un elemento, no un componente: definido aquí dentro, React lo veía nuevo
  // en cada render y remontaba el menú entero.
  const contenido = (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <PalmappLogo variant="isotipo" tono="blanco" className="h-8 w-auto" alt="" />
          <PalmappLogo variant="wordmark" tono="blanco" className="h-[18px] w-auto" />
        </div>
        <p className="mt-1.5 pl-[42px] text-xs font-medium text-sidebar-primary">Super admin</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 pt-3">
        {secciones.map((seccion) => (
          <div key={seccion.clave} className="mb-5">
            <p className="mb-1.5 px-3 text-xs font-medium text-sidebar-foreground/45">
              {TITULOS_SECCION[seccion.clave]}
            </p>
            <div className="space-y-0.5">
              {seccion.items.map((item) => {
                const Icon = item.icon;
                const activo = esRutaSuperAdminActiva(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={activo ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors duration-150',
                      activo
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground [&>svg]:text-sidebar-primary'
                        : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-3">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">{user?.nombre}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/55">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col lg:flex">{contenido}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 w-64 max-w-[85vw] animate-in slide-in-from-left duration-200">
            {contenido}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3.5 flex h-9 w-9 items-center justify-center rounded-[10px] text-sidebar-foreground/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
