/** Indicador de progreso del wizard de registro. */
import { Check, ClipboardList, FileText, type LucideIcon } from 'lucide-react';

interface Paso {
  numero: number;
  titulo: string;
  icono: LucideIcon;
}

export const PASOS: Paso[] = [
  { numero: 1, titulo: 'Tipo de novedad', icono: ClipboardList },
  { numero: 2, titulo: 'Detalles',        icono: FileText      },
  { numero: 3, titulo: 'Confirmación',    icono: Check         },
];

export function BarraPasos({ actual }: { actual: number }) {
  return (
    <div className="flex items-center">
      {PASOS.map((paso, idx) => {
        const completado = actual > paso.numero;
        const activo = actual === paso.numero;
        const Icono = paso.icono;

        return (
          <div key={paso.numero} className="flex flex-1 items-center last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  completado ? 'border-primary bg-primary'
                    : activo ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                {completado
                  ? <Check className="h-5 w-5 text-white" />
                  : <Icono className={`h-5 w-5 ${activo ? 'text-primary' : 'text-muted-foreground'}`} />}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${activo || completado ? 'text-primary' : 'text-muted-foreground'}`}>
                  Paso {paso.numero}
                </p>
                {/* El título se oculta en móvil: no cabe bajo un círculo de 40px. */}
                <p className={`hidden text-xs sm:block ${activo ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {paso.titulo}
                </p>
              </div>
            </div>
            {idx < PASOS.length - 1 && (
              <div className={`mx-3 mb-5 h-0.5 flex-1 transition-colors ${completado ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
