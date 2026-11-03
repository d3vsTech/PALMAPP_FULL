import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { proveedorAuthApi } from '../../../api/proveedorAuth';
import RecuperarPasswordView from '../auth/RecuperarPasswordView';

export default function ProveedorRecuperarPassword() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // Si el enlace del correo apunta aquí con token y email, en vez de a
  // /proveedor/reset-password, se manda al formulario conservando los params.
  useEffect(() => {
    const token = sp.get('token');
    const email = sp.get('email');
    if (token && email) {
      navigate(
        `/proveedor/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        { replace: true },
      );
    }
  }, [sp, navigate]);

  return (
    <RecuperarPasswordView
      loginPath="/proveedor/login"
      rotulo="Portal de proveedores"
      placeholderEmail="empresa@correo.com"
      enviar={(email) => proveedorAuthApi.forgotPassword(email).then(() => undefined)}
    />
  );
}
