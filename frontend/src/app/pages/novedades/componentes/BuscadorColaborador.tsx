/** Campo de búsqueda con sugerencias para elegir un colaborador. */
import { useMemo, useRef, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { User } from 'lucide-react';
import type { Colaborador } from '../tipos';

interface Props {
  colaboradores: Colaborador[];
  seleccionadoId: string;
  onSeleccionar: (id: string) => void;
}

export function BuscadorColaborador({ colaboradores, seleccionadoId, onSeleccionar }: Props) {
  const seleccionado = colaboradores.find((c) => c.id === seleccionadoId);
  const [texto, setTexto] = useState(seleccionado?.nombre ?? '');
  const [abierto, setAbierto] = useState(false);
  // El blur del input se dispara antes que el click de la sugerencia, así que
  // se cierra con retardo. El timeout se guarda para poder cancelarlo.
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return colaboradores;
    return colaboradores.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.cedula.includes(q),
    );
  }, [colaboradores, texto]);

  const elegir = (c: Colaborador) => {
    if (cierre.current) clearTimeout(cierre.current);
    onSeleccionar(c.id);
    setTexto(c.nombre);
    setAbierto(false);
  };

  return (
    <div className="space-y-1.5">
      <Label>Colaborador</Label>
      <div className="relative">
        <User className="absolute left-3 top-2.5 z-10 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o cédula..."
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            onSeleccionar('');
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => { cierre.current = setTimeout(() => setAbierto(false), 150); }}
        />
        {abierto && filtrados.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => elegir(c)}
                className="flex w-full flex-col border-b border-border px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted"
              >
                <span className="font-medium text-foreground">{c.nombre}</span>
                <span className="text-xs text-muted-foreground">{c.cedula} · {c.cargo}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {seleccionado && <p className="text-xs text-muted-foreground">{seleccionado.cargo}</p>}
    </div>
  );
}
