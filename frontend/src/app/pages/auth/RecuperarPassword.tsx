import { authApi } from '../../../api/auth';
import { esDemasiadosIntentos, mensajeDeError, mensajeDeEspera } from '../../../api/errores';
import RecuperarPasswordView from './RecuperarPasswordView';

export default function RecuperarPassword() {
  return (
    <RecuperarPasswordView
      loginPath="/login"
      enviar={async (email) => {
        try {
          await authApi.forgotPassword({ email });
        } catch (err) {
          throw new Error(esDemasiadosIntentos(err)
            ? mensajeDeEspera(err)
            : mensajeDeError(err, 'No se pudo enviar el correo'));
        }
      }}
    />
  );
}
