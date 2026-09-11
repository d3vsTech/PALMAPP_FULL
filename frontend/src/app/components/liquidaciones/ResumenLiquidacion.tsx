import { Button } from '../ui/button';
import { ArrowLeft, Check, Printer, MessageCircle, Download } from 'lucide-react';

interface ResumenLiquidacionProps {
  onVolver: () => void;
  onAceptar: () => void;
  onDescargarPDF: () => void;
  onCompartirWhatsApp: () => void;
  children: React.ReactNode;
}

export default function ResumenLiquidacion({
  onVolver,
  onAceptar,
  onDescargarPDF,
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
          className="gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver a Editar
        </Button>
        <div className="flex gap-3">
          <Button
            onClick={onAceptar}
            className="gap-2 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Check className="h-5 w-5" />
            Aceptar
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2"
            size="lg"
          >
            <Printer className="h-5 w-5" />
            Imprimir
          </Button>
          <Button
            onClick={onCompartirWhatsApp}
            variant="outline"
            className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
            size="lg"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Button>
          <Button
            onClick={onDescargarPDF}
            variant="outline"
            className="gap-2"
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
