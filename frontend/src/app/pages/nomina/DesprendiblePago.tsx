// DESPRENDIBLE DE PAGO - Vista de confirmación después de liquidar v2.0
// v2.0: Diseño moderno sin bordes gruesos, fondos sutiles, bordes laterales de color
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Check,
  Printer,
  Download,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';
import { nominaPeriodos, colaboradores } from '../../lib/mockData';
import { useRef } from 'react';

// Mock de datos de liquidación (esto vendría del backend)
const liquidacionData = {
  c1: {
    tipoSalario: 'VARIABLE',
    diasTrabajados: 10,
    base: 865000,
    extras: 0,
    incapacidades: 0,
    totalBruto: 865000,
    subsidioTransporte: 162000,
    salud: 34600,
    pension: 34600,
    adelantos: 50000,
    ahorro: 20000,
    bonificacion: 0,
    totalNeto: 887800,
  },
  c2: {
    tipoSalario: 'FIJO',
    diasTrabajados: 15,
    base: 1500000,
    extras: 0,
    incapacidades: 0,
    totalBruto: 1500000,
    subsidioTransporte: 162000,
    salud: 60000,
    pension: 60000,
    adelantos: 0,
    ahorro: 0,
    bonificacion: 58364,
    totalNeto: 1600364,
  },
  c3: {
    tipoSalario: 'VARIABLE',
    diasTrabajados: 8,
    base: 652000,
    extras: 0,
    incapacidades: 0,
    totalBruto: 652000,
    subsidioTransporte: 162000,
    salud: 26080,
    pension: 26080,
    adelantos: 0,
    ahorro: 0,
    bonificacion: 0,
    totalNeto: 761840,
  },
};

export default function DesprendiblePago() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();
  const desprendibleRef = useRef<HTMLDivElement>(null);

  const periodo = nominaPeriodos.find((p) => p.id === nominaId);
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  const liquidacion = liquidacionData[colaboradorId as keyof typeof liquidacionData];

  if (!periodo || !colaborador || !liquidacion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No encontrado</h1>
          <p className="text-muted-foreground mb-4">No se encontró la información</p>
          <Button onClick={() => navigate('/nomina')}>Volver a Nómina</Button>
        </div>
      </div>
    );
  }

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargar = () => {
    // Aquí iría la lógica para generar PDF
    alert('Generando PDF del desprendible...');
  };

  const handleEnviarWhatsApp = () => {
    // Aquí iría la lógica para enviar por WhatsApp
    const telefono = colaborador.telefono || '';
    const mensaje = `Hola ${colaborador.nombres}, te enviamos tu desprendible de pago del período ${periodo.periodo}. Total neto a pagar: $${liquidacion.totalNeto.toLocaleString('es-CO')}`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const handleAceptar = () => {
    navigate(`/nomina/${nominaId}`);
  };

  const nombreCompleto = `${colaborador.nombres} ${colaborador.apellidos}`;
  const fechaActual = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header - NO SE IMPRIME */}
      <div className="print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground">Desprendible Generado</h1>
          <p className="text-muted-foreground mt-2">Liquidación confirmada exitosamente</p>
        </div>
      </div>

      {/* DESPRENDIBLE - SE IMPRIME */}
      <div ref={desprendibleRef} className="print:p-8">
        <Card className="border border-border shadow-lg max-w-4xl mx-auto">
          <CardContent className="p-8">
            {/* Header del desprendible */}
            <div className="mb-8">
              <div className="grid grid-cols-3 mb-6">
                <div className="col-span-1 p-6 flex items-center justify-center bg-primary/5 rounded-l-lg">
                  <div className="text-center">
                    <div className="text-primary font-bold text-xl">FINCA</div>
                    <div className="text-success font-bold text-xl">PUERTO ARTURO</div>
                  </div>
                </div>
                <div className="col-span-2 p-6 flex items-center justify-center bg-muted/30 rounded-r-lg">
                  <h2 className="text-2xl font-bold text-center">
                    DESPRENDIBLE DE NÓMINA
                  </h2>
                </div>
              </div>

              {/* Información del colaborador */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">NOMBRE</span>
                  <div className="font-semibold text-base mt-1">{nombreCompleto}</div>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">CÉDULA</span>
                  <div className="font-semibold text-base mt-1">{colaborador.numeroDocumento}</div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">FECHA</span>
                  <div className="font-semibold text-base mt-1">{fechaActual}</div>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">PERÍODO</span>
                  <div className="font-semibold text-base mt-1">{periodo.periodo}</div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">BASE</span>
                  <div className="font-semibold text-base mt-1">{liquidacion.tipoSalario}</div>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="font-bold text-muted-foreground text-xs">DÍAS CANCELADOS</span>
                  <div className="font-semibold text-base mt-1">{liquidacion.diasTrabajados}</div>
                </div>
              </div>
            </div>

            {/* Tabla de liquidación */}
            <div className="space-y-6">
              {/* DEVENGADO */}
              <div className="bg-success/5 rounded-lg p-5 border-l-4 border-success">
                <h3 className="font-bold text-sm text-success mb-4">DEVENGADO</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {liquidacion.tipoSalario === 'VARIABLE' ? 'BASE (JORNALES)' : 'SUELDO BÁSICO'}
                    </span>
                    <span className="font-bold text-base">
                      ${liquidacion.base.toLocaleString('es-CO')}
                    </span>
                  </div>
                  {liquidacion.extras > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">EXTRAS (HORAS/DOMIN)</span>
                      <span className="font-bold text-base">
                        ${liquidacion.extras.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  {liquidacion.incapacidades > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">INCAPACIDADES</span>
                      <span className="font-bold text-base">
                        ${liquidacion.incapacidades.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-success/30 pt-3 mt-3">
                    <div className="flex justify-between items-center bg-success/10 p-3 rounded">
                      <span className="font-bold text-success">TOTAL BRUTO</span>
                      <span className="font-bold text-lg text-success">
                        ${liquidacion.totalBruto.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-medium text-sm">SUBSIDIO TRANSPORTE</span>
                    <span className="font-bold text-base">
                      ${liquidacion.subsidioTransporte.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>

              {/* DEDUCCIONES */}
              <div className="bg-destructive/5 rounded-lg p-5 border-l-4 border-destructive">
                <h3 className="font-bold text-sm text-destructive mb-4">DEDUCCIONES</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">DESCUENTO SALUD (4%)</span>
                    <span className="font-bold text-base text-destructive">
                      ${liquidacion.salud.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">DESCUENTO PENSIÓN (4%)</span>
                    <span className="font-bold text-base text-destructive">
                      ${liquidacion.pension.toLocaleString('es-CO')}
                    </span>
                  </div>
                  {liquidacion.adelantos > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">DCTO ADELANTOS</span>
                      <span className="font-bold text-base text-destructive">
                        ${liquidacion.adelantos.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  {liquidacion.ahorro > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">AHORRO</span>
                      <span className="font-bold text-base text-destructive">
                        ${liquidacion.ahorro.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BONIFICACIÓN */}
              {liquidacion.bonificacion > 0 && (
                <div className="bg-green-50 rounded-lg p-5 border-l-4 border-green-500">
                  <h3 className="font-bold text-sm text-green-700 mb-4">BONIFICACIÓN</h3>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">BONIFICACIÓN</span>
                    <span className="font-bold text-base text-green-700">
                      ${liquidacion.bonificacion.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}

              {/* TOTAL NETO */}
              <div className="bg-primary/10 rounded-lg p-6 border-2 border-primary mt-8">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-2xl">TOTAL NETO</span>
                  <span className="font-bold text-4xl text-primary">
                    ${liquidacion.totalNeto.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="h-20 border-b-2 border-muted-foreground/30 mb-3"></div>
                  <p className="text-sm font-semibold text-muted-foreground">FIRMA RECIBIDO</p>
                </div>
                <div className="text-center">
                  <div className="h-20 border-b-2 border-muted-foreground/30 mb-3"></div>
                  <p className="text-sm font-semibold text-muted-foreground">HUELLA</p>
                </div>
              </div>
            </div>

            {/* Nota al pie */}
            <div className="mt-6 text-xs text-center text-muted-foreground italic">
              <p>
                Este desprendible es un documento oficial de pago. Consérvelo para sus registros.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de acción duplicados abajo - NO SE IMPRIME */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <Button
          onClick={handleAceptar}
          size="lg"
          className="gap-2 bg-success hover:bg-success/90"
        >
          <Check className="h-5 w-5" />
          Aceptar
        </Button>

        <Button onClick={handleImprimir} variant="outline" size="lg" className="gap-2">
          <Printer className="h-5 w-5" />
          Imprimir
        </Button>

        <Button
          onClick={handleEnviarWhatsApp}
          variant="outline"
          size="lg"
          className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
        >
          <MessageCircle className="h-5 w-5" />
          Enviar WhatsApp
        </Button>

        <Button onClick={handleDescargar} variant="outline" size="lg" className="gap-2">
          <Download className="h-5 w-5" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}
