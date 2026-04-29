import { useAuth } from '../../contexts/AuthContext';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { PalmappLogo } from '../common/PalmappLogo';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, string> = {
      dueño: 'Dueño',
      administrador: 'Administrador',
      jefe_campo: 'Jefe de Campo',
    };
    return roles[rol] || rol;
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card glass-subtle shadow-sm">
      <div className="flex h-20 items-center justify-between px-8 lg:px-8 pl-20 lg:pl-8">
        {/* Isotipo visible en móvil y tablet (oculto en lg+) */}
        <div className="flex items-center gap-4">
          <PalmappLogo
            variant="isotipo"
            className="h-12 w-12 lg:hidden"
          />
        </div>

        {/* Acciones del usuario */}
        <div className="flex items-center gap-4">
          {/* Menú de usuario */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                {user?.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="font-medium text-foreground text-sm">{user?.nombre}</span>
                <span className="text-xs text-muted-foreground">{user?.rol && getRolDisplay(user.rol)}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info */}
                <div className="p-4 border-b border-border">
                  <p className="font-bold text-foreground">{user?.nombre}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.rol && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRolDisplay(user.rol)}
                    </p>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/perfil');
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                  >
                    <User className="h-5 w-5 text-muted-foreground icon-palmapp" strokeWidth={2.5} />
                    <span className="font-medium text-foreground">Mi perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-left text-destructive"
                  >
                    <LogOut className="h-5 w-5 icon-palmapp" strokeWidth={2.5} />
                    <span className="font-medium">Cerrar sesión</span>
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