import { proveedorAuthApi, ProveedorAuthErrorCodes } from '../../../api/proveedorAuth';
import RestablecerPasswordView from '../auth/RestablecerPasswordView';

export default function ProveedorRestablecerPassword() {
  return (
    <RestablecerPasswordView
      loginPath="/proveedor/login"
      recuperarPath="/proveedor/recuperar-password"
      rotulo="Portal de proveedores"
      restablecer={async ({ token, email, password }) => {
        try {
          await proveedorAuthApi.resetPassword({
            token,
            email,
            password,
            password_confirmation: password,
          });
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code === ProveedorAuthErrorCodes.PASSWORD_RESET_FAILED) {
            throw new Error(
              (err as { message?: string }).message ?? 'El enlace ya venció o no es válido.',
            );
          }
          throw new Error(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña');
        }
      }}
    />
  );
}
