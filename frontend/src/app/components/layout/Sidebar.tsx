import { Link, useLocation } from 'react-router';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { Button } from '../ui/AppButton';
import { PalmappLogo } from '../common/PalmappLogo';
import {
  Home,
  ShoppingCart,
  Sprout,
  Users,
  DollarSign,
  Clipboard,
  Truck,
  Settings,
  ShoppingBag,
  Menu,
  X,
  UserCog,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  permiso?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Home,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'dashboard.ver',
  },
  {
    label: 'Mi Plantación',
    href: '/plantacion',
    icon: Sprout,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'lotes.ver',
  },
  {
    label: 'Colaboradores',
    href: '/colaboradores',
    icon: Users,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'colaboradores.ver',
  },
  {
    label: 'Operaciones',
    href: '/operaciones',
    icon: Clipboard,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'operaciones.ver',
  },
  {
    label: 'Viajes',
    href: '/viajes',
    icon: Truck,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'remisiones.ver',
  },
  {
    label: 'Nómina',
    href: '/nomina',
    icon: DollarSign,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'nomina.ver',
  },
  {
    label: 'Agente IA',
    href: '/agente-ia',
    icon: Sparkles,
    roles: ['dueño', 'administrador', 'jefe_campo'],
  },
  {
    label: 'Market',
    href: '/market',
    icon: ShoppingBag,
    roles: ['dueño', 'administrador', 'jefe_campo'],
  },
  {
    label: 'Gestión de Usuarios',
    href: '/usuarios',
    icon: UserCog,
    roles: ['administrador'],
    permiso: 'usuarios.ver',
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['dueño', 'administrador', 'jefe_campo'],
    permiso: 'configuracion.editar',
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, hasPermiso } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const esAdmin = user?.is_super_admin || user?.rol === 'administrador';

  const filteredItems = navItems.filter(item => {
    // Admins ven todo
    if (esAdmin) return true;
    // Usuarios normales: mostrar si tiene el permiso del item
    if (item.permiso) return hasPermiso(item.permiso);
    // Items sin permiso (Agente IA): mostrar a todos los autenticados
    return true;
  });

  const NavContent = () => (
    <div className="flex h-full flex-col bg-card glass-subtle border-r border-border">
      {/* Logo y título */}
      <div className="flex h-20 items-center justify-center border-b border-border px-6">
        <PalmappLogo 
          variant="complete"
          className="h-12 w-auto"
        />
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
                          (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon 
                className={cn(
                  'h-5 w-5 icon-palmapp transition-transform duration-200',
                  !isActive && 'group-hover:scale-110'
                )} 
                strokeWidth={2.5}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="font-bold text-foreground">
            Finca Puerto Arturo
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de gestión integral
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — solo visible en pantallas grandes (lg ≥ 1024px) */}
      <aside className="hidden w-72 flex-col bg-card lg:flex">
        <NavContent />
      </aside>

      {/* Mobile / Tablet Menu — overlay + sidebar deslizable */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-in slide-in-from-left duration-300">
            <NavContent />
          </div>
        </div>
      )}

      {/* Botón Hamburguesa — visible hasta lg */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed left-4 top-4 z-40 lg:hidden bg-card/80 backdrop-blur-sm border border-border hover:bg-muted shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </>
  );
}