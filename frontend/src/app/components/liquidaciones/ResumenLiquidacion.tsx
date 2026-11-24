import { Button } from '../ui/button';
import { ArrowLeft, Check, Printer, MessageCircle, Download } from 'lucide-react';

interface ResumenLiquidacionProps {
  onVolver: () => void;
  onAceptar: () => void;
  onDescargarPDF: () => void;
  /**
   * Imprimir tiene que bajar el PDF del backend, igual que descargar:
   * `window.print()` sacaba el HTML de la pantalla con menú y botones.
   */
  onImprimir: () => void;
  onCompartirWhatsApp: () => void;
  children: React.ReactNode;
}

export default function ResumenLiquidacion({
  onVolver,
  onAceptar,
  onDescargarPDF,
  onImprimir,
  onCompartirWhatsApp,
  children,
}: ResumenLiquidacionProps) {
  return (
    <div className="space-y-6">
      {children}

      {/* Botones de acción */}
      <div className="flex justify-between items-center pt-4">
        <Button
          onClick={onVolver}
          variant="outline"
          size="lg"
          
        >
          <ArrowLeft className="h-5 w-5" />
          Volver a Editar
        </Button>
        <div className="flex gap-3">
          <Button
            onClick={onAceptar}
            className="bg-success hover:bg-success"
            size="lg"
          >
            <Check className="h-5 w-5" />
            Aceptar
          </Button>
          <Button
            onClick={onImprimir}
            variant="outline"
            
            size="lg"
          >
            <Printer className="h-5 w-5" />
            Imprimir
          </Button>
          <Button
            onClick={onCompartirWhatsApp}
            variant="outline"
            className="text-success border-success/40 hover:bg-success-soft"
            size="lg"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
          <Button
            onClick={onDescargarPDF}
            variant="outline"
            
            size="lg"
          >
            <Download className="h-5 w-5" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
