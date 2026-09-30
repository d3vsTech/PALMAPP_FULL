/**
 * Wizard de registro de novedades.
 *
 * Esta pantalla solo orquesta: guarda el borrador, valida el paso actual y
 * decide qué paso pintar. La forma de cada paso vive en `componentes/`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { BarraPasos } from './componentes/BarraPasos';
import { PasoTipoNovedad } from './componentes/PasoTipoNovedad';
import { PasoDetalles } from './componentes/PasoDetalles';
import { PasoConfirmacion } from './componentes/PasoConfirmacion';
import { BORRADOR_VACIO, TOTAL_PASOS, validarPaso, type BorradorNovedad } from './borrador';
import { COLABORADORES_MOCK } from './mock';

export default function NuevaNovedadPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [borrador, setBorrador] = useState<BorradorNovedad>(BORRADOR_VACIO);

  const colaborador = COLABORADORES_MOCK.find((c) => c.id === borrador.colaboradorId);

  const cambiar = (parcial: Partial<BorradorNovedad>) =>
    setBorrador((prev) => ({ ...prev, ...parcial }));

  const avanzar = () => {
    const error = validarPaso(paso, borrador);
    if (error) {
      toast.error(error);
      return;
    }
    setPaso((p) => p + 1);
  };

  const retroceder = () => {
    if (paso === 1) {
      navigate('/novedades');
      return;
    }
    setPaso((p) => p - 1);
  };

  const confirmar = () => {
    // Sin backend todavía: se avisa y se vuelve al listado.
    toast.success('Novedad registrada exitosamente');
    navigate('/novedades');
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/novedades')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />Volver a Novedades
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Registrar Novedad</h1>
        <p className="mt-1 text-muted-foreground">
          Reporta permisos, incapacidades, ausencias o terminaciones de contrato
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 sm:p-6">
          <BarraPasos actual={paso} />
        </CardContent>
      </Card>

      {paso === 1 && (
        <PasoTipoNovedad
          seleccionado={borrador.tipo}
          onSeleccionar={(tipo) => cambiar({ tipo })}
        />
      )}

      {paso === 2 && borrador.tipo && (
        <PasoDetalles
          tipo={borrador.tipo}
          borrador={borrador}
          colaboradores={COLABORADORES_MOCK}
          onCambiar={cambiar}
        />
      )}

      {paso === 3 && borrador.tipo && colaborador && (
        <PasoConfirmacion
          tipo={borrador.tipo}
          colaborador={colaborador}
          borrador={borrador}
        />
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={retroceder} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < TOTAL_PASOS ? (
          <Button onClick={avanzar} className="gap-2">
            Siguiente<ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={confirmar} className="gap-2 bg-success hover:bg-success/90">
            <Check className="h-4 w-4" />Registrar Novedad
          </Button>
        )}
      </div>
    </div>
  );
}
