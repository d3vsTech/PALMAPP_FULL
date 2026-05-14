import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, CheckCircle, Shield, BarChart3, Users,
} from 'lucide-react';

const devsLogo = '/Devs_logo.jpeg';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.rol === 'super_admin') {
      navigate('/super-admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, true);
      navigate('/super-admin/dashboard');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: 'Gestión Multi-Finca',
      description: 'Administra múltiples fincas desde un solo panel centralizado',
    },
    {
      icon: Users,
      title: 'Control de Usuarios',
      description: 'Asigna permisos personalizados a cada usuario del sistema',
    },
    {
      icon: Shield,
      title: 'Seguridad Avanzada',
      description: 'Auditoría completa y monitoreo de todas las acciones',
    },
    {
      icon: CheckCircle,
      title: 'Diagnósticos en Tiempo Real',
      description: 'Monitorea el estado del sistema y servidor 24/7',
    },
  ];

  return (
    <div className="min-h-screen bg-black flex">
      {/* Lado izquierdo - Branding y características (sólo en pantallas anchas) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a1a1a] via-black to-black relative overflow-hidden items-center">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#9032F010_1px,transparent_1px),linear-gradient(to_bottom,#9032F010_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#9032F0]/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#6506FF]/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
        </div>

        <div className="relative z-10 px-12 xl:px-16 py-12 w-full max-w-xl mx-auto">
          {/* Logo + título */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shadow-2xl shadow-[#9032F0]/50 flex-shrink-0">
                <img
                  src={devsLogo}
                  alt="Devs Technology"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">PALMAPP</h1>
                <div className="h-1 w-20 bg-gradient-to-r from-[#9032F0] to-[#6506FF] rounded-full mt-1" />
              </div>
            </div>
            <p className="text-lg text-gray-300 font-medium leading-relaxed">
              El control de tu cultivo en la palma de tu mano
            </p>
          </div>

          {/* Características */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-[#9032F0] uppercase tracking-wider">
              Características del Sistema
            </h3>
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-[#9032F0]/10 group-hover:border-[#9032F0]/30 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-[#9032F0]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer dentro del bloque centrado */}
          <div className="mt-10 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
              <span>Sistema Activo • v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#9032F008_1px,transparent_1px),linear-gradient(to_bottom,#9032F008_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#9032F0]/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shadow-lg shadow-[#9032F0]/30 flex-shrink-0">
                <img src={devsLogo} alt="Devs Technology" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold text-white">PALMAPP</h1>
            </div>
            <p className="text-sm text-gray-400">Panel de Administración Central</p>
          </div>

          {/* Card del formulario */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Iniciar Sesión</h2>
              <p className="text-sm text-gray-400">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                  <p className="text-sm text-red-300 font-medium">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-white">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#9032F0] transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 transition-all backdrop-blur-sm"
                    placeholder="devs@d3vs.tech"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-white">
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#9032F0] transition-colors z-10" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 transition-all backdrop-blur-sm"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#9032F0] transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#9032F0] to-[#6506FF] hover:from-[#9032F0]/90 hover:to-[#6506FF]/90 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#9032F0]/30 hover:shadow-[#9032F0]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando acceso...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Volver al login normal */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-gray-400 hover:text-[#9032F0] transition-colors font-medium inline-flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Acceso para usuarios de finca
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
