/**
 * Período de la pantalla.
 *
 * Antes eran botones pegados dentro de un recuadro, con el activo en verde.
 * Eso no sale del diseño: ahí el período es un desplegable de 160px, uno
 * solo, al lado del título de los indicadores. Con cinco opciones el grupo
 * de botones además doblaba línea en pantalla angosta.
 *
 * Cada pantalla sigue pasando sus propias opciones, así que la lista es la
 * misma de antes y nadie cambia su llamada.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../lib/utils';

export interface OpcionPeriodo<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SelectorPeriodoProps<T extends string> {
  valor: T;
  opciones: readonly OpcionPeriodo<T>[];
  onChange: (valor: T) => void;
  className?: string;
}

export default function SelectorPeriodo<T extends string>({
  valor,
  opciones,
  onChange,
  className,
}: SelectorPeriodoProps<T>) {
  return (
    <Select value={valor} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label="Período" className={cn('w-40', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opcion) => (
          <SelectItem key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
