/**
 * Menú lateral sobre el marco verde (SISTEMA_VISUAL.md, dirección "verde
 * profundo" del 29 de octubre de 2026).
 *
 * El diseño llegó filtrando por rol porque el prototipo no tiene backend.
 * Aquí manda el permiso, que es lo que el tenant configura de verdad.
 */
import { Link, useLocation } from 'react-router';
import { useCallback, useState } from 'react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useAuth, esAdmin } from '../../contexts/AuthContext';
import { cn } from '../lib/utils';
import { PalmappLogo } from '../common/PalmappLogo';
import { EVT_ABRIR_MENU, useEventoShell, useMenuColapsado } from './shellState';
import {
  Home,
  ShoppingCart,
  Sprout,
  Users,
  DollarSign,
  Clipboard,
  Truck,
  Settings,
  X,
  UserCog,
  CalendarDays,
  Sparkles,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react';

/** Las tres agrupaciones del menú. El orden es el de la lista. */
export type SeccionNav = 'finca' | 'personal' | 'herramientas';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  seccion: SeccionNav;
  /** Sin permiso, el item se le muestra a todo el que haya entrado. */
  permiso?: string;
}

export const navItems: NavItem[] = [
  { label: 'Panel de inicio', href: '/', icon: Home, seccion: 'finca', permiso: 'dashboard.ver' },
  { label: 'Mi plantación', href: '/plantacion', icon: Sprout, seccion: 'finca', permiso: 'lotes.ver' },
  { label: 'Operaciones', href: '/operaciones', icon: Clipboard, seccion: 'finca', permiso: 'operaciones.ver' },
  // El módulo se llamó "remisiones" y el permiso quedó con ese nombre mucho
  // después de que el backend pasara a `viajes.*`. Mientras un usuario
  // conservara el viejo se veía igual; al reguardar sus permisos desde la
  // pantalla nueva, que solo manda `viajes.*`, el módulo le desaparecía.
  { label: 'Viajes', href: '/viajes', icon: Truck, seccion: 'finca', permiso: 'viajes.ver' },
  { label: 'Colaboradores', href: '/colaboradores', icon: Users, seccion: 'personal', permiso: 'colaboradores.ver' },
  { label: 'Pagos', href: '/nomina', icon: DollarSign, seccion: 'personal', permiso: 'nomina.ver' },
  { label: 'Novedades', href: '/novedades', icon: CalendarDays, seccion: 'personal', permiso: 'novedades.ver' },
  { label: 'Liquidaciones', href: '/liquidaciones', icon: FileText, seccion: 'personal', permiso: 'liquidaciones.ver' },
  { label: 'Agente IA', href: '/agente-ia', icon: Sparkles, seccion: 'herramientas' },
  { label: 'Tienda de insumos', href: '/market', icon: ShoppingCart, seccion: 'herramientas' },
  { label: 'Gestión de usuarios', href: '/usuarios', icon: UserCog, seccion: 'herramientas', permiso: 'usuarios.ver' },
  { label: 'Configuración', href: '/configuracion', icon: Settings, seccion: 'herramientas', permiso: 'configuracion.editar' },
];

export const TITULOS_SECCION: Record<SeccionNav, string> = {
  finca: 'Finca',
  personal: 'Personal y pagos',
  herramientas: 'Herramientas',
};

export function esRutaActiva(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

/** Placeholder del logo: hasta dos iniciales del nombre de la finca. */
function inicialesFinca(nombre?: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '—';
  return partes.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

export default function Sidebar() {
  const location = useLocation();
  const { user, hasPermiso } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [colapsado, setColapsado] = useMenuColapsado();

  const abrir = useCallback(() => setMobileOpen(true), []);
  useEventoShell(EVT_ABRIR_MENU, abrir);
  // El menú lateral de móvil solo se cerraba tocando el fondo.
  useCerrarConEscape(mobileOpen, () => setMobileOpen(false));

  const visibles = navItems.filter((item) => {
    // Admins ven todo, mismo criterio único (esAdmin) que rutas y permisos.
    if (esAdmin(user)) return true;
    if (item.permiso) return hasPermiso(item.permiso);
    return true;
  });

  const secciones = (['finca', 'personal', 'herramientas'] as const)
    .map((clave) => ({ clave, items: visibles.filter((i) => i.seccion === clave) }))
    .filter((s) => s.items.length > 0);

  const finca = user?.fincaActual;

  // Un elemento, no un componente: definido aquí dentro, React lo veía nuevo
  // en cada render y remontaba el menú entero.
  const contenido = (compacto: boolean) => (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5', compacto ? 'justify-center px-2' : 'px-5')}>
        <PalmappLogo variant="isotipo" tono="blanco" className="h-8 w-auto" alt="" />
        {!compacto && <PalmappLogo variant="wordmark" tono="blanco" className="h-[18px] w-auto" />}
      </div>

      <nav className={cn('min-h-0 flex-1 overflow-y-auto custom-scrollbar pb-4 pt-2', compacto ? 'px-2.5' : 'px-3')}>
        {secciones.map((seccion) => (
          <div key={seccion.clave} className="mb-5">
            {compacto ? (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
            ) : (
              <p className="mb-1.5 px-3 text-xs font-medium text-sidebar-foreground/45">
                {TITULOS_SECCION[seccion.clave]}
              </p>
            )}
            <div className="space-y-0.5">
              {seccion.items.map((item) => {
                const Icon = item.icon;
                const activo = esRutaActiva(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={activo ? 'page' : undefined}
                    title={compacto ? item.label : undefined}
                    aria-label={compacto ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-[10px] py-2.5 text-[14px] font-medium transition-colors duration-150',
                      compacto ? 'justify-center px-0' : 'px-3',
                      activo
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground [&>svg]:text-sidebar-primary'
                        : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    {!compacto && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* `logo_url` llega absoluto desde el login, select-tenant y me. Si es
          null la finca no cargó logo y se muestran las iniciales. */}
      <div className={cn('shrink-0', compacto ? 'p-2.5' : 'p-3')}>
        <div
          title={compacto ? finca?.nombre : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl bg-white/[0.06]',
            compacto ? 'justify-center p-2' : 'px-3 py-2.5',
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
            {finca?.logo_url ? (
              <img src={finca.logo_url} alt={finca.nombre} className="h-full w-full object-contain" />
            ) : (
              <span className="text-[11px] font-bold text-sidebar-primary">{inicialesFinca(finca?.nombre)}</span>
            )}
          </span>
          {!compacto && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-sidebar-accent-foreground" title={finca?.nombre}>
                {finca?.nombre ?? 'Sin finca seleccionada'}
              </span>
              <span className="block truncate text-[11px] text-sidebar-foreground/55">
                Sistema de gestión integral
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* `shrink-0` evita que el menú se comprima cuando el contenido de al
          lado trae una tabla ancha. */}
      <aside
        className={cn(
          'relative z-40 hidden shrink-0 flex-col transition-[width] duration-200 ease-out lg:flex',
          colapsado ? 'w-[76px]' : 'w-64',
        )}
      >
        {contenido(colapsado)}
        <button
          type="button"
          onClick={() => setColapsado(!colapsado)}
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
          title={colapsado ? 'Expandir menú' : 'Contraer menú'}
          className="absolute -right-3 top-[22px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary"
        >
          {colapsado
            ? <ChevronsRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            : <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={2.2} />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 w-72 max-w-[85vw] animate-in slide-in-from-left duration-200">
            {contenido(false)}
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
