import { Outlet } from 'react-router';
import { LiquidacionesProvider } from '../../contexts/LiquidacionesContext';

export default function LiquidacionesLayout() {
  return (
    <LiquidacionesProvider>
      <Outlet />
    </LiquidacionesProvider>
  );
}
