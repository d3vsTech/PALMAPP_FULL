import { useState } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simular llamada API para enviar email de recuperación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // En producción, aquí iría la llamada real a la API:
      // await api.post('/super-admin/recuperar-password', { email });
      
      setEmailEnviado(true);
    } catch (err) {
      setError('No se pudo enviar el correo. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#9032F010_1px,transparent_1px),linear-gradient(to_bottom,#9032F010_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Esferas de color flotantes */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#9032F0]/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#6506FF]/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo PALMAPP */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#9032F0] to-[#6506FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#9032F0]/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">PALMAPP</h1>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          {!emailEnviado ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Recuperar Contraseña</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300 font-medium">{error}</p>
                  </div>
                )}

                {/* Campo Email */}
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
                      placeholder="admin@palmapp.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Info de expiración */}
                <div className="p-3 bg-[#9032F0]/10 border border-[#9032F0]/30 rounded-xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#9032F0] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed">
                    El enlace de recuperación expirará en <span className="font-bold text-white">60 minutos</span> por seguridad.
                  </p>
                </div>

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#9032F0] to-[#6506FF] hover:from-[#9032F0]/90 hover:to-[#6506FF]/90 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#9032F0]/30 hover:shadow-[#9032F0]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Enviando enlace...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>Enviar Enlace de Recuperación</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Estado de éxito */}
              <div className="text-center space-y-6">
                {/* Icono de éxito */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 border-2 border-green-500/30 rounded-full">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>

                {/* Mensaje de éxito */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">¡Correo Enviado!</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Hemos enviado un enlace de recuperación a
                  </p>
                  <p className="text-white font-semibold">{email}</p>
                </div>

                {/* Instrucciones */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left space-y-3">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">Pasos a seguir:</span>
                  </p>
                  <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Revisa tu bandeja de entrada</li>
                    <li>Haz clic en el enlace de recuperación</li>
                    <li>Establece tu nueva contraseña</li>
                    <li>Inicia sesión con tus nuevas credenciales</li>
                  </ol>
                </div>

                {/* Aviso de expiración */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200 text-left leading-relaxed">
                    El enlace expirará en <span className="font-bold">60 minutos</span>. Si no recibes el correo, revisa tu carpeta de spam.
                  </p>
                </div>

                {/* Botón reenviar */}
                <button
                  onClick={() => {
                    setEmailEnviado(false);
                    setEmail('');
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#9032F0]/30 rounded-xl text-white font-semibold transition-all duration-200"
                >
                  Enviar a otro correo
                </button>
              </div>
            </>
          )}
        </div>

        {/* Link para volver al login */}
        <div className="mt-6 text-center">
          <Link 
            to="/super-admin/login" 
            className="text-sm text-gray-400 hover:text-[#9032F0] transition-colors font-medium inline-flex items-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio de sesión
          </Link>
        </div>

        {/* Info adicional */}
        <div className="mt-6 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#9032F0] to-[#6506FF] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#9032F0]/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-300 leading-relaxed">
                <span className="font-bold text-white">Seguridad:</span> Por tu protección, el enlace de recuperación solo puede usarse una vez y expira automáticamente después de 60 minutos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
