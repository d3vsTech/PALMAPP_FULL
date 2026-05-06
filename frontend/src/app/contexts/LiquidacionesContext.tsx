import { createContext, useContext, useState, ReactNode } from 'react';

// Tipos compartidos
export interface CesantiaColaborador {
  id: string;
  colaboradorId: string;
  nombreCompleto: string;
  cargo: string;
  fechaIngreso: string;
  salarioBasico: number;
  auxilioTransporte: number;
  promedioPrestacional: number;
  cesantiasAcumuladas: number;
  periodoInicio: string;
  periodoFin: string;
  consignada: boolean;
  fechaConsignacion?: string;
  fondoCesantias: string;
}

export interface InteresesColaborador {
  id: string;
  colaboradorId: string;
  nombreCompleto: string;
  cargo: string;
  fechaIngreso: string;
  saldoCesantias31Dic: number;
  interesesCalculados: number;
  periodoInicio: string;
  periodoFin: string;
  pagado: boolean;
  fechaPago?: string;
  fondoCesantias: string;
}

export interface PrimaColaborador {
  id: string;
  colaboradorId: string;
  nombreCompleto: string;
  cargo: string;
  fechaIngreso: string;
  salarioBasico: number;
  auxilioTransporte: number;
  promedioPrestacional: number;
  primaCalculada: number;
  semestre: 'PRIMER_SEMESTRE' | 'SEGUNDO_SEMESTRE';
  periodoInicio: string;
  periodoFin: string;
  diasTrabajados: number;
  pagada: boolean;
  fechaPago?: string;
}

export interface VacacionesColaborador {
  id: string;
  colaboradorId: string;
  nombreCompleto: string;
  cargo: string;
  fechaIngreso: string;
  salarioBasico: number;
  diasCausados: number;
  diasDisfrutados: number;
  diasPendientes: number;
  diasCompensados: number;
  ultimoPeriodoInicio: string;
  ultimoPeriodoFin: string;
  diasHabilesLaborados: number;
  valorCompensacion?: number;
  estado: 'DISPONIBLE' | 'PARCIAL' | 'COMPENSADO' | 'ACTUALIZADO';
}

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
}

// Contexto
interface LiquidacionesContextType {
  cesantias: CesantiaColaborador[];
  setCesantias: (cesantias: CesantiaColaborador[]) => void;
  intereses: InteresesColaborador[];
  setIntereses: (intereses: InteresesColaborador[]) => void;
  primas: PrimaColaborador[];
  setPrimas: (primas: PrimaColaborador[]) => void;
  vacaciones: VacacionesColaborador[];
  setVacaciones: (vacaciones: VacacionesColaborador[]) => void;
  liquidacionesFinales: LiquidacionFinal[];
  setLiquidacionesFinales: (liquidaciones: LiquidacionFinal[]) => void;
}

const LiquidacionesContext = createContext<LiquidacionesContextType | undefined>(undefined);

export function LiquidacionesProvider({ children }: { children: ReactNode }) {
  const [cesantias, setCesantias] = useState<CesantiaColaborador[]>([]);
  const [intereses, setIntereses] = useState<InteresesColaborador[]>([]);
  const [primas, setPrimas] = useState<PrimaColaborador[]>([]);
  const [vacaciones, setVacaciones] = useState<VacacionesColaborador[]>([]);
  const [liquidacionesFinales, setLiquidacionesFinales] = useState<LiquidacionFinal[]>([]);

  return (
    <LiquidacionesContext.Provider
      value={{
        cesantias,
        setCesantias,
        intereses,
        setIntereses,
        primas,
        setPrimas,
        vacaciones,
        setVacaciones,
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

// Hook para KPIs consolidados
export function useKPIsLiquidaciones() {
  const { cesantias, intereses, primas, vacaciones, liquidacionesFinales } = useLiquidaciones();

  // Cesantías
  const cesantiasPendientes = cesantias.filter(c => !c.consignada).length;
  const montoCesantiasPendientes = cesantias
    .filter(c => !c.consignada)
    .reduce((sum, c) => sum + c.cesantiasAcumuladas, 0);

  // Intereses
  const interesesPendientes = intereses.filter(i => !i.pagado).length;
  const montoInteresesPendientes = intereses
    .filter(i => !i.pagado)
    .reduce((sum, i) => sum + i.interesesCalculados, 0);

  // Prima
  const primasPendientes = primas.filter(p => !p.pagada).length;
  const montoPrimasPendientes = primas
    .filter(p => !p.pagada)
    .reduce((sum, p) => sum + p.primaCalculada, 0);

  // Vacaciones
  const totalDiasVacacionesPendientes = vacaciones.reduce((sum, v) => sum + v.diasPendientes, 0);

  // Liquidaciones finales
  const liquidacionesBorrador = liquidacionesFinales.filter(l => l.estado === 'BORRADOR').length;

  return {
    cesantiasPendientes,
    montoCesantiasPendientes,
    interesesPendientes,
    montoInteresesPendientes,
    primasPendientes,
    montoPrimasPendientes,
    totalDiasVacacionesPendientes,
    liquidacionesBorrador,
  };
}
