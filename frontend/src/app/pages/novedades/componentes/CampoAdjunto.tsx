/** Soporte documental. Siempre opcional: el certificado llega días después. */
import { useRef } from 'react';
import { Label } from '../../../components/ui/label';
import { Paperclip, X } from 'lucide-react';

interface Props {
  etiqueta: string;
  /** Texto bajo el campo. Útil cuando el motivo pide soporte. */
  ayuda?: string;
  /** Extensiones que acepta el backend, de `init.parametros.soporte`. */
  mimes: string[];
  maxKb: number;
  archivo: File | null;
  onCambiar: (archivo: File | null) => void;
}

export function CampoAdjunto({ etiqueta, ayuda, mimes, maxKb, archivo, onCambiar }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const accept = mimes.map((m) => `.${m}`).join(',');
  const maxMb = Math.round(maxKb / 1024);

  const quitar = () => {
    onCambiar(null);
    // Sin esto el input conserva el archivo y no dispara `change` si se
    // vuelve a elegir el mismo.
    if (input.current) input.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>
        {etiqueta}
        <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
      </Label>
      <input
        ref={input}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => onCambiar(e.target.files?.[0] ?? null)}
      />
      {archivo ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Paperclip className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{archivo.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {(archivo.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={quitar}
            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Quitar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="group flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Paperclip className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
          <span className="transition-colors group-hover:text-foreground">
            Adjuntar archivo{' '}
            <span className="text-xs">({mimes.join(', ')} · máx. {maxMb} MB)</span>
          </span>
        </button>
      )}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}
