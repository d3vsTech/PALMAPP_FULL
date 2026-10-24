/**
 * Un desplegable con buscador.
 *
 * El `Select` de siempre obliga a recorrer la lista con la rueda del mouse.
 * Con treinta labores de finca eso es incómodo, y en una lista larga el
 * usuario ya sabe qué busca: escribir tres letras es más rápido que bajar
 * hasta encontrarlo.
 *
 * Se abre con clic o con Enter, filtra mientras se escribe y se cierra al
 * elegir o con Escape.
 */
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '../ui/command';

export interface OpcionBuscable {
  valor: string;
  etiqueta: string;
}

export function SelectorBuscable({
  opciones,
  valor,
  onChange,
  marcador = 'Seleccionar',
  marcadorBusqueda = 'Buscar...',
  sinResultados = 'Sin coincidencias',
  id,
  disabled = false,
}: {
  opciones: OpcionBuscable[];
  valor: string;
  onChange: (valor: string) => void;
  marcador?: string;
  marcadorBusqueda?: string;
  sinResultados?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={elegida ? '' : 'text-muted-foreground'}>
            {elegida?.etiqueta ?? marcador}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={marcadorBusqueda} />
          <CommandList>
            <CommandEmpty>{sinResultados}</CommandEmpty>
            <CommandGroup>
              {opciones.map((o) => (
                <CommandItem
                  key={o.valor}
                  // `value` es lo que el buscador compara, así que va el texto
                  // visible y no el identificador.
                  value={o.etiqueta}
                  onSelect={() => {
                    onChange(o.valor);
                    setAbierto(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${o.valor === valor ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {o.etiqueta}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
