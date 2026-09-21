import { Outlet } from 'react-router';

/**
 * Contenedor de las cinco pestañas del módulo. Ya no envuelve ningún
 * contexto: cada pantalla pide sus datos al backend cuando los necesita.
 */
export default function LiquidacionesLayout() {
  return <Outlet />;
}
