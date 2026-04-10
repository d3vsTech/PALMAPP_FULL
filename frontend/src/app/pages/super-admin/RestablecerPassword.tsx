import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Shield } from 'lucide-react';

export default function RestablecerPasswordSuperAdmin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Token del enlace del correo
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validaciones
  const isPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && doPasswordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!isPasswordValid) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!token) {
      setError('Token inválido o expirado. Por favor, solicita un nuevo enlace.');
      return;
    }

    setLoading(true);

    try {
      // Simulación de API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Aquí iría la lógica real de API
      // await resetPassword({ token, newPassword });
      
      setSuccess(true);
      
      // Redirigir al login de super admin después de 2 segundos
      setTimeout(() => {
        navigate('/super-admin/login', { 
          state: { 
            message: 'Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña.' 
          } 
        });
      }, 2000);
      
    } catch (err) {
      setError('Hubo un error al restablecer la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Si el token no existe o es inválido
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-center text-red-400">Token inválido</CardTitle>
            <CardDescription className="text-center text-slate-300">
              El enlace de restablecimiento no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/super-admin/recuperar-password')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Solicitar nuevo enlace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          {/* Shield Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>

          <CardTitle className="text-center text-white">
            {!success ? 'Restablecer contraseña' : '¡Contraseña actualizada!'}
          </CardTitle>
          <CardDescription className="text-center text-slate-300">
            {!success 
              ? 'Ingresa tu nueva contraseña de Super Admin (mínimo 8 caracteres)'
              : 'Tu contraseña se ha actualizado correctamente'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nueva Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-200">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    className={`pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 ${
                      newPassword.length > 0 && !isPasswordValid 
                        ? 'border-red-500 focus-visible:ring-red-500' 
                        : ''
                    } ${
                      newPassword.length > 0 && isPasswordValid 
                        ? 'border-blue-500 focus-visible:ring-blue-500' 
                        : ''
                    }`}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <p className={`text-xs ${isPasswordValid ? 'text-blue-400' : 'text-slate-400'}`}>
                    {isPasswordValid ? '✓' : '○'} Mínimo 8 caracteres
                  </p>
                )}
              </div>

              {/* Confirmar Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                    className={`pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 ${
                      confirmPassword.length > 0 && !doPasswordsMatch 
                        ? 'border-red-500 focus-visible:ring-red-500' 
                        : ''
                    } ${
                      confirmPassword.length > 0 && doPasswordsMatch 
                        ? 'border-blue-500 focus-visible:ring-blue-500' 
                        : ''
                    }`}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs ${doPasswordsMatch ? 'text-blue-400' : 'text-red-400'}`}>
                    {doPasswordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={!canSubmit}
              >
                {loading ? 'Actualizando...' : 'Restablecer contraseña'}
              </Button>

              {/* Volver al login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/super-admin/login')}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  disabled={loading}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center border-2 border-blue-500/50">
                  <CheckCircle2 className="h-10 w-10 text-blue-400" />
                </div>
              </div>
              <p className="text-slate-300">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
