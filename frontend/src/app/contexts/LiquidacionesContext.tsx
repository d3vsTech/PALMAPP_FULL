import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';

// Tipos compartidos
export type EstadoLiquidacion = 'BORRADOR' | 'APROBADA' | 'PAGADA' | 'ANULADA';
export type TipoContrato = 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR';
export type CausaTerminacion = 'RENUNCIA' | 'DESPIDO_JUSTA_CAUSA' | 'DESPIDO_SIN_JUSTA_CAUSA' | 'MUTUO_ACUERDO' | 'VENCIMIENTO_CONTRATO';

export interface LiquidacionFinal {
  id: string;
  colaboradorId: string;
  nombreCompleto: string;
  cargo: string;
  tipoContrato: TipoContrato;
  fechaIngreso: string;
  fechaRetiro: string;
  causaTerminacion: CausaTerminacion;
  salarioBasico: number;
  auxilioTransporte: number;
  cesantias: number;
  interesesCesantias: number;
  prima: number;
  vacaciones: number;
  diasSalarioPendiente: number;
  salarioPendiente: number;
  indemnizacion: number;
  deduccionSeguridadSocial: number;
  deduccionPrestamos: number;
  otrosDeducciones: number;
  totalDevengado: number;
  totalDeducciones: number;
  netoAPagar: number;
  estado: EstadoLiquidacion;
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaPago?: string;
  observaciones?: string;
  // Campos opcionales de liquidaciones generadas desde NuevaLiquidacionFinal
  tipoLiquidacion?: 'normal' | 'final' | '';
  motivoRetiro?: string;
}

// Contexto
// Los setters son los dispatchers de useState tal cual: aceptan tanto el
// array nuevo como una función updater `(prev) => next`, que es como los
// usan las pantallas de detalle.
interface LiquidacionesContextType {
  liquidacionesFinales: LiquidacionFinal[];
  setLiquidacionesFinales: Dispatch<SetStateAction<LiquidacionFinal[]>>;
}

const LiquidacionesContext = createContext<LiquidacionesContextType | undefined>(undefined);

export function LiquidacionesProvider({ children }: { children: ReactNode }) {
  const [liquidacionesFinales, setLiquidacionesFinales] = useState<LiquidacionFinal[]>([]);

  return (
    <LiquidacionesContext.Provider
      value={{
        liquidacionesFinales,
        setLiquidacionesFinales,
      }}
    >
      {children}
    </LiquidacionesContext.Provider>
  );
}

export function useLiquidaciones() {
  const context = useContext(LiquidacionesContext);
  if (context === undefined) {
    throw new Error('useLiquidaciones must be used within a LiquidacionesProvider');
  }
  return context;
}
