/**
 * Barra inferior para celular: cuatro módulos frecuentes y "Más" para abrir
 * el menú completo.
 *
 * El diseño llegó filtrando por rol porque el prototipo no tiene backend.
 * Aquí manda el permiso, el mismo criterio que usa el menú lateral.
 */
import { Link, useLocation } from 'react-router';
import { LayoutGrid } from 'lucide-react';
import { useAuth, esAdmin } from '../../contexts/AuthContext';
import { cn } from '../lib/utils';
import { navItems, esRutaActiva, type NavItem } from './Sidebar';
import { abrirMenuMovil, esPantallaFormulario } from './shellState';

/** Módulos que van en la barra inferior, en orden de preferencia. */
const PREFERIDOS = ['/', '/operaciones', '/viajes', '/nomina', '/colaboradores', '/agente-ia'];

/** Nombres largos que no caben en una quinta parte de la pantalla. */
const CORTOS: Record<string, string> = {
  '/': 'Inicio',
  '/agente-ia': 'Agente',
  '/nomina': 'Pagos',
};

export default function BottomNav() {
  const location = useLocation();
  const { user, hasPermiso } = useAuth();

  const visibles = navItems.filter((item) => {
    if (esAdmin(user)) return true;
    if (item.permiso) return hasPermiso(item.permiso);
    return true;
  });

  const items = PREFERIDOS
    .map((href) => visibles.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, 4);

  // Sin módulo activo entre los cuatro, el usuario está en otro: se resalta "Más".
  const enOtro = !items.some((i) => esRutaActiva(location.pathname, i.href));

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden',
        // En un formulario estorba: ahí abajo van los botones de guardar.
        esPantallaFormulario(location.pathname) && 'max-md:hidden',
      )}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const activo = esRutaActiva(location.pathname, item.href);
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
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  activo && 'bg-accent/30 dark:bg-accent/20',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={activo ? 2.3 : 2} />
              </span>
              {CORTOS[item.href] ?? item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={abrirMenuMovil}
          className={cn(
            'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
            enOtro ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', enOtro && 'bg-accent/30 dark:bg-accent/20')}>
            <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          Más
        </button>
      </div>
    </nav>
  );
}
