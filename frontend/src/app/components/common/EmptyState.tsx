import IlustracionPalma, { varianteParaVacio } from './IlustracionPalma';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  /** Se acepta por compatibilidad, pero no se muestra: el vacio lleva ilustracion. */
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <IlustracionPalma variante={varianteParaVacio(`${title} ${description}`)} className="mb-4" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
