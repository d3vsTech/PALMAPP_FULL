/**
 * AjustesCosecha
 *
 * Pantalla dedicada a resolver cosechas con gajos pendientes tipo clavijo.
 * Se llega solo desde el banner de alerta en el paso Cosecha del conteo.
 *
 * URL: /viajes/ajustes-cosecha
 *
 * Diseño alineado con V.20/PalmApp — se conserva la conexión al backend
 * real (§13 API_VIAJES.md); solo cambia la presentación visual.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  ArrowLeft, TriangleAlert, Sparkles, Truck, Clock, Loader2,
} from 'lucide-react';
import {
  ajustesCosechaApi,
  type CosechaConAjustePendiente, type IndicadorAgregado,
} from '../../../api/ajustesCosecha';
import { ModalAjustarCosecha } from '../../components/viajes/ModalAjustarCosecha';

function formatKg(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return kg.toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' kg';
}

export default function AjustesCosecha() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CosechaConAjustePendiente[]>([]);
  const [indicador, setIndicador] = useState<IndicadorAgregado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<CosechaConAjustePendiente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ajustesCosechaApi.listar();
      setItems(res.data.cosechas);
      setIndicador(res.data.indicador);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirModal = (c: CosechaConAjustePendiente) => {
    setSeleccionada(c);
    setModalAbierto(true);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/viajes')}
          className="mb-2 gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1>Ajustes de cosecha</h1>
        <p className="text-muted-foreground mt-1">
          Cosechas con gajos pendientes desde hace 3+ viajes. Decide qué hacer con ellos.
        </p>
      </div>

      {/* Métricas */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-border hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cosechas afectadas</p>
                <p className="text-4xl font-bold">{indicador?.cosechas_afectadas ?? 0}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center">
                <TriangleAlert className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Gajos pendientes total</p>
                <p className="text-4xl font-bold">{indicador?.gajos_pendientes_total ?? 0}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Peso estimado</p>
                <p className="text-4xl font-bold">{formatKg(indicador?.peso_estimado_total ?? 0)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de cosechas */}
      {cargando ? (
        <Card className="border-border">
          <CardContent className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando cosechas con pendientes...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Todo en orden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No hay cosechas con gajos pendientes que requieran ajuste.
            </p>
            <Button onClick={() => navigate('/viajes')} className="mt-4">
              Volver a Viajes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((cosecha) => {
            const fechaReporte = new Date(cosecha.operacion.fecha + 'T00:00:00')
              .toLocaleDateString('es-CO');
            return (
              <Card key={cosecha.id} className="border-border hover:shadow-md transition-all duration-300">
                <CardContent className="p-5">
                  {/* Fila superior */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">
                          {cosecha.lote?.nombre ?? 'Sin lote'}
                          {cosecha.sublote?.nombre ? ` · ${cosecha.sublote.nombre}` : ''}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                          {cosecha.viajes_transcurridos} viajes sin resolver
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Reportado el {fechaReporte}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                        Peso estimado perdido
                      </p>
                      <p className="text-xl font-bold text-destructive">
                        {formatKg(cosecha.peso_estimado_perdido)}
                      </p>
                    </div>
                  </div>

                  {/* Fila de métricas */}
                  <div className="rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="flex gap-8 flex-wrap flex-1">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Reportados</p>
                        <p className="font-bold text-base">{cosecha.gajos_reportados}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Reconteo</p>
                        <p className="font-bold text-base">{cosecha.gajos_reconteo ?? '–'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">En viajes</p>
                        <p className="font-bold text-base">{cosecha.gajos_en_viajes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Pendientes</p>
                        <p className="font-bold text-base text-orange-500">{cosecha.gajos_pendientes}</p>
                      </div>
                    </div>
                    <Button className="gap-2 shrink-0" onClick={() => abrirModal(cosecha)}>
                      <TriangleAlert className="h-4 w-4" />
                      Ajustar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ModalAjustarCosecha
        open={modalAbierto}
        cosecha={seleccionada}
        onClose={() => setModalAbierto(false)}
        onAjustado={() => {
          setModalAbierto(false);
          setSeleccionada(null);
          cargar();
        }}
      />
    </div>
  );
}
