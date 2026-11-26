import { Link } from 'react-router';
import { Calculator, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PeriodoAccionProps {
  to: string;
  borrador: boolean;
  nombre: string;
}

/** Acción de fila: "Liquidar" si el período está en borrador; si no, flecha al detalle. */
export default function PeriodoAccion({ to, borrador, nombre }: PeriodoAccionProps) {
  if (borrador) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to={to}>
          <Calculator strokeWidth={2} />
          Liquidar
        </Link>
      </Button>
    );
  }
  return (
    <Link
      to={to}
      aria-label={`Abrir ${nombre}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ChevronRight className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}
