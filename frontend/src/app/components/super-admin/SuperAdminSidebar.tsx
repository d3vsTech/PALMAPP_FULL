import { NavLink, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Building2, 
  Activity, 
  Stethoscope,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import devsLogo from '../../../assets/eb1a1adfa70fe9c390e3eaf8f02fa384f2ad4e3d.png';

const navigation = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Fincas', href: '/super-admin/fincas', icon: Building2 },
  { name: 'Actividad del sistema', href: '/super-admin/actividad', icon: Activity },
  { name: 'Diagnósticos', href: '/super-admin/diagnosticos', icon: Stethoscope },
];

export default function SuperAdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-72 bg-black border-r border-white/10 flex flex-col">
      {/* Header con Logo Devs Technology */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-xl shadow-[#9032F0]/30 flex-shrink-0">
            <img src={devsLogo} alt="Devs Technology" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-sm truncate">Devs Technology</h1>
            <p className="text-xs text-gray-400 font-medium">Control Central</p>
          </div>
        </div>
        
        {/* Badge de estado */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#9032F0]/10 border border-[#9032F0]/30 rounded-full">
          <div className="w-1.5 h-1.5 bg-[#9032F0] rounded-full animate-pulse shadow-sm shadow-[#9032F0]"></div>
          <span className="text-xs font-semibold text-[#9032F0]">Sistema Activo</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-[#9032F0]/20 to-[#6506FF]/20 text-white border border-[#9032F0]/30 shadow-lg shadow-[#9032F0]/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Efecto de brillo en hover */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#9032F0]/10 via-[#6506FF]/10 to-transparent animate-pulse" />
                )}
                
                <item.icon className={`w-5 h-5 transition-all duration-200 relative z-10 ${
                  isActive 
                    ? 'text-[#9032F0] scale-110' 
                    : 'group-hover:scale-110 group-hover:text-[#9032F0]'
                }`} />
                <span className="flex-1 relative z-10">{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-[#9032F0] relative z-10 animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-gradient-to-t from-white/5 to-transparent">
        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
          <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-[#9032F0]/20 to-[#6506FF]/20 border border-[#9032F0]/30 rounded-lg text-xs font-semibold text-[#9032F0]">
            <div className="w-1.5 h-1.5 bg-[#9032F0] rounded-full animate-pulse shadow-sm shadow-[#9032F0]"></div>
            Super Admin
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-red-500/30"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="flex-1 text-left">Cerrar sesión</span>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </aside>
  );
}