import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';

type StatusType =
  | 'BORRADOR'
  | 'EN_PROGRESO'
  | 'CERRADA'
  | 'APROBADO'
  | 'EN_CAMINO'
  | 'EN_PLANTA'
  | 'FINALIZADO'
  | 'EN_DISPUTA'
  | 'Activo'
  | 'Inactivo'
  | 'PENDIENTE'
  | 'PAGADA'
  | 'CANCELADA'
  | 'Vigente'
  | 'Terminado';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

/**
 * Variantes del diseño. Los rótulos de nómina no son los códigos (§10.1):
 * "Finalizada" se guarda CERRADA y "En borrador" es BORRADOR.
 */
const statusConfig: Record<StatusType, { label: string; variant: Variant }> = {
  BORRADOR: { label: 'En borrador', variant: 'secondary' },
  EN_PROGRESO: { label: 'En progreso', variant: 'info' },
  CERRADA: { label: 'Finalizada', variant: 'outline' },
  APROBADO: { label: 'Aprobado', variant: 'success' },
  EN_CAMINO: { label: 'En camino', variant: 'info' },
  EN_PLANTA: { label: 'En planta', variant: 'warning' },
  FINALIZADO: { label: 'Finalizado', variant: 'secondary' },
  EN_DISPUTA: { label: 'En disputa', variant: 'destructive' },
  Activo: { label: 'Activo', variant: 'success' },
  Inactivo: { label: 'Inactivo', variant: 'secondary' },
  PENDIENTE: { label: 'Pendiente', variant: 'warning' },
  PAGADA: { label: 'Pagada', variant: 'success' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
  Vigente: { label: 'Vigente', variant: 'success' },
  Terminado: { label: 'Terminado', variant: 'secondary' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' as Variant };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
