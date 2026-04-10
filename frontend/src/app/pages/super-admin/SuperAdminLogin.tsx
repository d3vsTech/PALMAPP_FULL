import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Sprout, Eye, EyeOff} from 'lucide-react';
import { Link } from 'react-router';
const devsLogo = '/Devs_logo.jpeg';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, true);
      navigate('/super-admin/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión');
      }

      console.error('Error login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#9032F010_1px,transparent_1px),linear-gradient(to_bottom,#9032F010_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#9032F0]/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#6506FF]/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#9032F0]/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '10s' }}
        />

        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#9032F0]/30 to-transparent" />
        <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#6506FF]/30 to-transparent" />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-[#9032F0]/20">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-24 h-24 bg-white rounded-2xl p-3 shadow-2xl shadow-[#9032F0]/30">
                <img
                  src={devsLogo}
                  alt="Devs Technology"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#9032F0]/20 to-[#6506FF]/20 blur-xl" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Devs Technology
            </h1>
            <p className="text-sm text-gray-400 font-medium mb-4">
              Sistema de Gestión Agrícola
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#9032F0]/10 border border-[#9032F0]/30 rounded-full">
              <div className="w-2 h-2 bg-[#9032F0] rounded-full animate-pulse shadow-lg shadow-[#9032F0]/70" />
              <span className="text-xs font-semibold text-[#9032F0]">
                Panel de Control Central
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-red-300 text-center font-medium">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-white"
              >
                Email
              </label>

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#9032F0] transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 transition-all backdrop-blur-sm"
                  placeholder="devs@d3vs.tech"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-white"
              >
                Contraseña
              </label>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#9032F0] transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                  
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#9032F0] to-[#6506FF] hover:from-[#9032F0]/90 hover:to-[#6506FF]/90 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-[#9032F0]/30 hover:shadow-[#9032F0]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando acceso...</span>
                </>
              ) : (
                <>
                  <span>Acceder al Sistema</span>
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="space-y-2">
              <p className="text-xs text-center text-gray-400">
                Sistema exclusivo para administración centralizada
              </p>
              <p className="text-xs text-center text-gray-500">
                Gestión multi-finca • Control total • Analytics avanzados
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-gray-400 hover:text-[#9032F0] transition-colors font-medium inline-flex items-center gap-2 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver al login de finca
          </a>
        </div>

        <div className="mt-6 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#9032F0] to-[#6506FF] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#9032F0]/30">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div className="flex-1">
              <p className="text-xs text-gray-300 leading-relaxed">
                <span className="font-bold text-white">Devs Technology:</span>{' '}
                Plataforma SaaS para gestión integral de fincas agrícolas.
                Administra múltiples propiedades, usuarios, planes y
                configuración global.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}