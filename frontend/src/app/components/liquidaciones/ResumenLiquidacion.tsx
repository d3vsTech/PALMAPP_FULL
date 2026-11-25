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

      {/* Acciones al final, alineadas a la derecha */}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Button onClick={onVolver} variant="ghost" className="sm:mr-auto">
          <ArrowLeft strokeWidth={2} />
          Volver a editar
        </Button>
        <Button onClick={onImprimir} variant="outline">
          <Printer strokeWidth={2} />
          Imprimir
        </Button>
        <Button onClick={onCompartirWhatsApp} variant="outline">
          <MessageCircle strokeWidth={2} />
          WhatsApp
        </Button>
        <Button onClick={onDescargarPDF} variant="outline">
          <Download strokeWidth={2} />
          Descargar PDF
        </Button>
        <Button onClick={onAceptar}>
          <Check strokeWidth={2} />
          Aceptar
        </Button>
      </div>
    </div>
  );
}
