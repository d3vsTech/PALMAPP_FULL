import { ReactNode } from 'react';
import { Card } from '../ui/card';

interface TotalResumenProps {
  conteoLabel: string;
  conteo: ReactNode;
  totalLabel: string;
  total: ReactNode;
}

/** Cierre de una liquidación: número de colaboradores a la izquierda y total destacado a la derecha. */
export default function TotalResumen({ conteoLabel, conteo, totalLabel, total }: TotalResumenProps) {
  return (
    <Card className="flex-row items-end justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">{conteoLabel}</p>
        <p className="mt-1 text-lg font-bold text-foreground">{conteo}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-medium text-muted-foreground">{totalLabel}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{total}</p>
      </div>
    </Card>
  );
}
