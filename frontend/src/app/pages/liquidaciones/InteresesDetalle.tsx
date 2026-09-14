/** Detalle de período de intereses: wizard compartido (API_LIQUIDACIONES §2.7). */
import PeriodoLiquidacionDetalle from './periodo/PeriodoLiquidacionDetalle';

export default function InteresesDetalle() {
  return <PeriodoLiquidacionDetalle tipo="INTERESES_CESANTIAS" />;
}
