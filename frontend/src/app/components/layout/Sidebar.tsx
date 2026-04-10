import { Link, useLocation } from 'react-router';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { Button } from '../ui/AppButton';
import { PalmappLogo } from '../common/PalmappLogo';
import {
  Home,
  Sprout,
  Users,
  DollarSign,
  Clipboard,
  Truck,
  Settings,
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
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Home,
    roles: ['dueño', 'administrador', 'jefe_campo'],
  },
  {
    label: 'Mi Plantación',
    href: '/plantacion',
    icon: Sprout,
    roles: ['administrador'],
  },
  {
    label: 'Colaboradores',
    href: '/colaboradores',
    icon: Users,
    roles: ['administrador'],
  },
  {
    label: 'Gestión de Usuarios',
    href: '/usuarios',
    icon: UserCog,
    roles: ['administrador'],
  },
  {
    label: 'Nómina',
    href: '/nomina',
    icon: DollarSign,
    roles: ['administrador'],
  },
  {
    label: 'Operaciones',
    href: '/operaciones',
    icon: Clipboard,
    roles: ['administrador', 'jefe_campo'],
  },
  {
    label: 'Viajes',
    href: '/viajes',
    icon: Truck,
    roles: ['administrador', 'jefe_campo'],
  },
  {
    label: 'Agente IA',
    href: '/agente-ia',
    icon: Sparkles,
    roles: ['dueño', 'administrador', 'jefe_campo'],
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['administrador'],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter(item =>
    user?.rol && item.roles.includes(user.rol as UserRole)
  );

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
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col bg-card md:flex">
        <NavContent />
      </aside>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
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

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </>
  );
}