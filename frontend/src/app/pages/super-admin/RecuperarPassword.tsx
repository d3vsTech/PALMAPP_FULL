import RecuperarPasswordView from '../auth/RecuperarPasswordView';

/**
 * El backend todavía no expone recuperación de contraseña para super admin.
 * `/v1/auth/forgot-password` es el de las fincas y no sirve aquí, así que la
 * pantalla queda armada y simulando el envío hasta que exista el endpoint.
 */
export default function RecuperarPassword() {
  return (
    <RecuperarPasswordView
      loginPath="/super-admin/login"
      rotulo="Super admin"
      placeholderEmail="admin@palmapp.com"
      enviar={() => new Promise((listo) => setTimeout(listo, 1200))}
    />
  );
}
