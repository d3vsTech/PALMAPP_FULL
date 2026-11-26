import { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface Dato {
  label: string;
  value: ReactNode;
}

/** Lista de datos en rejilla: etiqueta pequeña en mayúsculas y valor debajo. */
export default function DatoLista({ items, className }: { items: Dato[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map(d => (
        <div key={d.label} className="min-w-0">
          <dt className="text-[13px] font-medium text-muted-foreground">{d.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}
