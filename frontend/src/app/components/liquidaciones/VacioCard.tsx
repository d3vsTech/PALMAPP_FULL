import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/card';

interface VacioCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vacío: ícono en círculo, una línea de título, una de explicación y la acción. */
export default function VacioCard({ title, description, action }: VacioCardProps) {
  return (
    <Card className="items-center gap-4 px-6 py-12 text-center">
      <div className="space-y-1">
        <h3>{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </Card>
  );
}
