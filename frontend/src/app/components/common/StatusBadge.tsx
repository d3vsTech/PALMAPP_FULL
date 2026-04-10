import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';

type StatusType = 
  | 'BORRADOR'
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

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: string }> = {
  BORRADOR: { label: 'Borrador', variant: 'secondary' },
  CERRADA: { label: 'Cerrada', variant: 'default' },
  APROBADO: { label: 'Aprobado', variant: 'default' },
  EN_CAMINO: { label: 'En Camino', variant: 'default' },
  EN_PLANTA: { label: 'En Planta', variant: 'default' },
  FINALIZADO: { label: 'Finalizado', variant: 'outline' },
  EN_DISPUTA: { label: 'En Disputa', variant: 'destructive' },
  Activo: { label: 'Activo', variant: 'default' },
  Inactivo: { label: 'Inactivo', variant: 'secondary' },
  PENDIENTE: { label: 'Pendiente', variant: 'secondary' },
  PAGADA: { label: 'Pagada', variant: 'default' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
  Vigente: { label: 'Vigente', variant: 'default' },
  Terminado: { label: 'Terminado', variant: 'secondary' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant as any}
      className={cn(
        status === 'Activo' && 'bg-success hover:bg-success/80 text-success-foreground',
        status === 'APROBADO' && 'bg-success hover:bg-success/80 text-success-foreground',
        status === 'FINALIZADO' && 'bg-muted hover:bg-muted/80 text-muted-foreground',
        status === 'EN_CAMINO' && 'bg-info hover:bg-info/80 text-info-foreground',
        status === 'EN_PLANTA' && 'bg-warning hover:bg-warning/80 text-warning-foreground',
        status === 'CERRADA' && 'bg-muted hover:bg-muted/80 text-foreground',
        status === 'PAGADA' && 'bg-success hover:bg-success/80 text-success-foreground',
        status === 'Vigente' && 'bg-success hover:bg-success/80 text-success-foreground',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
