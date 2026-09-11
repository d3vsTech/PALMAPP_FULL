import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';

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
  // Campos opcionales de liquidaciones generadas desde NuevaVacaciones
  cedula?: string;
  salarioPromedio?: number;
  auxilioTransporte?: number;
  vacacionesCalculada?: number;
  periodoInicio?: string;
  periodoFin?: string;
  tipoVacaciones?: string;
  pagado?: boolean;
  fechaPago?: string;
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
  // Campos opcionales de liquidaciones generadas desde NuevaLiquidacionFinal
  tipoLiquidacion?: 'normal' | 'final' | '';
  motivoRetiro?: string;
}

// Contexto
// Los setters son los dispatchers de useState tal cual: aceptan tanto el
// array nuevo como una función updater `(prev) => next`, que es como los
// usan las pantallas de detalle.
interface LiquidacionesContextType {
  cesantias: CesantiaColaborador[];
  setCesantias: Dispatch<SetStateAction<CesantiaColaborador[]>>;
  intereses: InteresesColaborador[];
  setIntereses: Dispatch<SetStateAction<InteresesColaborador[]>>;
  primas: PrimaColaborador[];
  setPrimas: Dispatch<SetStateAction<PrimaColaborador[]>>;
  vacaciones: VacacionesColaborador[];
  setVacaciones: Dispatch<SetStateAction<VacacionesColaborador[]>>;
  liquidacionesFinales: LiquidacionFinal[];
  setLiquidacionesFinales: Dispatch<SetStateAction<LiquidacionFinal[]>>;
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
