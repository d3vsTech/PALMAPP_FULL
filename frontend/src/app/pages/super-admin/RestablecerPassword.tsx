import RestablecerPasswordView from '../auth/RestablecerPasswordView';

/**
 * Igual que la pantalla de recuperación: sin endpoint de super admin todavía,
 * así que el guardado se simula. El enlace solo trae token, no correo.
 */
export default function RestablecerPassword() {
  return (
    <RestablecerPasswordView
      loginPath="/super-admin/login"
      recuperarPath="/super-admin/recuperar-password"
      rotulo="Super admin"
      descripcion="Escribe tu contraseña nueva de super admin. Debe tener al menos 8 caracteres."
      requiereEmail={false}
      restablecer={() => new Promise((listo) => setTimeout(listo, 1200))}
    />
  );
}
