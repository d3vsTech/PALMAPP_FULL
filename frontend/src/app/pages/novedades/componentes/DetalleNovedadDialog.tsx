/**
 * Detalle de una novedad, con descarga del soporte para firma.
 *
 * Recibe `novedad = null` cuando está cerrado: así el padre guarda un solo
 * estado en vez de un booleano y la novedad por separado.
 */
import { Button } from '../../../components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '../../../components/ui/dialog';
import { Calendar, Download } from 'lucide-react';
import { descargarSoporte } from '../soportePdf';
import {
  TIPOS_NOVEDAD, etiquetaDias, formatFecha, iniciales, type Novedad,
} from '../tipos';

interface Props {
  novedad: Novedad | null;
  onCerrar: () => void;
}

/** Par etiqueta/valor de la rejilla de datos. */
function Dato({ label, valor, icono, destacado }: {
  label: string;
  valor: string;
  icono?: boolean;
  destacado?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icono && <Calendar className="h-3 w-3" />}
        {label}
      </p>
      <p className={destacado ? 'text-sm font-bold text-primary' : 'text-sm font-medium'}>{valor}</p>
    </div>
  );
}

export function DetalleNovedadDialog({ novedad, onCerrar }: Props) {
  return (
    <Dialog open={!!novedad} onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}>
      <DialogContent className="max-w-lg gap-0 rounded-2xl p-0">
        {novedad && (() => {
          const tipo = TIPOS_NOVEDAD[novedad.tipo];
          return (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5 pr-12">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${tipo.dot}`} />
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-semibold">{tipo.label}</DialogTitle>
                    <DialogDescription className="mt-0.5 text-xs">
                      Registrada el {formatFecha(novedad.fechaRegistro)}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {iniciales(novedad.colaborador)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{novedad.colaborador}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {novedad.cargo} · {novedad.cedula}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
                <Dato icono label="Fecha inicio" valor={formatFecha(novedad.fechaInicio)} />
                {/* Las terminaciones se guardan con `dias = 0`: no hay rango. */}
                {novedad.dias > 0 && (
                  <>
                    <Dato icono label="Fecha fin" valor={formatFecha(novedad.fechaFin)} />
                    <Dato
                      destacado
                      label="Días"
                      valor={`${novedad.dias} ${etiquetaDias(novedad.dias)}`}
                    />
                  </>
                )}
                <Dato
                  label="Remuneración"
                  valor={tipo.remunerado ? `Remunerado · ${tipo.pct}` : 'No remunerado'}
                />
              </div>

              {novedad.observaciones && (
                <div className="border-t border-border px-6 pb-4 pt-4">
                  <p className="mb-1 text-xs text-muted-foreground">Observaciones</p>
                  <p className="text-sm text-foreground">{novedad.observaciones}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => descargarSoporte(novedad)}
                  className="gap-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar soporte para firma
                </Button>
                <Button variant="outline" size="sm" onClick={onCerrar}>Cerrar</Button>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
