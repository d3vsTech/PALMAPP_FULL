import { authApi } from '../../../api/auth';
import { esDemasiadosIntentos, mensajeDeError, mensajeDeEspera } from '../../../api/errores';
import RestablecerPasswordView from './RestablecerPasswordView';

export default function RestablecerPassword() {
  return (
    <RestablecerPasswordView
      loginPath="/login"
      recuperarPath="/recuperar-password"
      restablecer={async ({ token, email, password }) => {
        try {
          await authApi.resetPassword({
            token,
            email,
            password,
            password_confirmation: password,
          });
        } catch (err) {
          throw new Error(esDemasiadosIntentos(err)
            ? mensajeDeEspera(err)
            : mensajeDeError(err, 'No se pudo restablecer la contraseña'));
        }
      }}
    />
  );
}
