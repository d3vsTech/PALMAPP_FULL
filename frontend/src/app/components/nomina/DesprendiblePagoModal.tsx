import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { FileText, Printer, CheckCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface DesprendibleData {
  colaborador: {
    nombres: string;
    apellidos: string;
    cedula: string;
    cargo: string;
  };
  periodo: string;
  // Devengados
  salarioBase: number;
  jornales: Array<{ fecha: string; labor: string; valor: number }>;
  cosechas: Array<{ fecha: string; descripcion: string; valor: number }>;
  bonificaciones: number;
  subsidioTransporte: number;
  // Deducciones
  salud: number;
  pension: number;
  prestamos: number;
  // Totales
  totalDevengado: number;
  totalDeducciones: number;
  netoPagar: number;
  // Estado de pago
  pagado: boolean;
  infoPago?: string;
}

interface DesprendiblePagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DesprendibleData;
  onMarcarPagado?: (info: string) => void;
}

export function DesprendiblePagoModal({
  isOpen,
  onClose,
  data,
  onMarcarPagado,
}: DesprendiblePagoModalProps) {
  const [mostrarPago, setMostrarPago] = useState(false);
  const [infoPago, setInfoPago] = useState(data.infoPago || '');

  const handleImprimir = () => {
    window.print();
  };

  const handleMarcarPagado = () => {
    if (onMarcarPagado) {
      onMarcarPagado(infoPago);
      setMostrarPago(false);
    }
  };

  const totalJornales = data.jornales.reduce((sum, j) => sum + j.valor, 0);
  const totalCosechas = data.cosechas.reduce((sum, c) => sum + c.valor, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Desprendible de Pago
            </div>
            {data.pagado && (
              <Badge className="bg-success text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Pagado
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Colilla de pago - {data.periodo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4" id="desprendible-content">
          {/* Información del Colaborador */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="font-semibold">
                  {data.colaborador.nombres} {data.colaborador.apellidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="font-semibold">{data.colaborador.cedula}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cargo</p>
                <p className="font-semibold">{data.colaborador.cargo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="font-semibold">{data.periodo}</p>
              </div>
            </div>
          </div>

          {/* DEVENGADOS */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-success" />
              Devengados
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salario Base</span>
                <span className="font-medium">${data.salarioBase.toLocaleString('es-CO')}</span>
              </div>

              {data.subsidioTransporte > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subsidio de Transporte</span>
                  <span className="font-medium">${data.subsidioTransporte.toLocaleString('es-CO')}</span>
                </div>
              )}

              {data.bonificaciones > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonificaciones</span>
                  <span className="font-medium">${data.bonificaciones.toLocaleString('es-CO')}</span>
                </div>
              )}

              {data.jornales.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jornales</span>
                  <span className="font-medium">${totalJornales.toLocaleString('es-CO')}</span>
                </div>
              )}

              {data.cosechas.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cosechas</span>
                  <span className="font-medium">${totalCosechas.toLocaleString('es-CO')}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between font-semibold text-success">
                <span>Total Devengado</span>
                <span>${data.totalDevengado.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* Detalle de Jornales */}
          {data.jornales.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Detalle de Jornales</h4>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Labor</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.jornales.map((jornal, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {new Date(jornal.fecha).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="text-sm">{jornal.labor}</TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          ${jornal.valor.toLocaleString('es-CO')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Detalle de Cosechas */}
          {data.cosechas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Detalle de Cosechas</h4>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cosechas.map((cosecha, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {new Date(cosecha.fecha).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="text-sm">{cosecha.descripcion}</TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          ${cosecha.valor.toLocaleString('es-CO')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* DEDUCCIONES */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-destructive" />
              Deducciones
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salud (4%)</span>
                <span className="font-medium text-destructive">
                  -${data.salud.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pensión (4%)</span>
                <span className="font-medium text-destructive">
                  -${data.pension.toLocaleString('es-CO')}
                </span>
              </div>

              {data.prestamos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Préstamos</span>
                  <span className="font-medium text-destructive">
                    -${data.prestamos.toLocaleString('es-CO')}
                  </span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between font-semibold text-destructive">
                <span>Total Deducciones</span>
                <span>-${data.totalDeducciones.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* NETO A PAGAR */}
          <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Neto a Pagar</p>
                <p className="text-4xl font-bold text-primary">
                  ${data.netoPagar.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Devengado: ${data.totalDevengado.toLocaleString('es-CO')}</div>
                <div>Deducciones: -${data.totalDeducciones.toLocaleString('es-CO')}</div>
              </div>
            </div>
          </div>

          {/* Información de Pago */}
          {data.pagado && data.infoPago && (
            <div className="rounded-lg bg-success/10 border border-success/30 p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4" />
                Información de Pago
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.infoPago}</p>
            </div>
          )}

          {/* Formulario para marcar como pagado */}
          {!data.pagado && mostrarPago && (
            <div className="space-y-3">
              <Label htmlFor="infoPago">Información de Pago</Label>
              <Textarea
                id="infoPago"
                placeholder="Ej: Pago realizado vía transferencia bancaria Bancolombia cuenta ***1234. Comprobante #ABC123"
                value={infoPago}
                onChange={(e) => setInfoPago(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleImprimir} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>

          {!data.pagado && !mostrarPago && (
            <Button
              onClick={() => setMostrarPago(true)}
              className="flex-1 bg-success hover:bg-success/90"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar como Pagado
            </Button>
          )}

          {!data.pagado && mostrarPago && (
            <>
              <Button variant="outline" onClick={() => setMostrarPago(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMarcarPagado} className="bg-success hover:bg-success/90">
                Confirmar Pago
              </Button>
            </>
          )}

          {data.pagado && (
            <Button onClick={onClose} className="flex-1">
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
