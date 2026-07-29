/**
 * AjustesCosecha
 *
 * Pantalla dedicada a resolver cosechas con gajos pendientes tipo clavijo.
 * Se llega solo desde el banner de alerta en `/viajes` — sin item de
 * sidebar dedicado.
 *
 * URL: /viajes/ajustes-cosecha
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, AlertTriangle, Loader2, Truck, Clock, User, Sparkles,
} from 'lucide-react';
import {
  ajustesCosechaApi,
  type CosechaConAjustePendiente,
} from '../../../api/ajustesCosecha';
import { ModalAjustarCosecha } from '../../components/viajes/ModalAjustarCosecha';

export default function AjustesCosecha() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CosechaConAjustePendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<CosechaConAjustePendiente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ajustesCosechaApi.listar();
      setItems(res.data);
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

  const totalPendientes = items.reduce((s, c) => s + c.gajos_pendientes, 0);
  const pesoEstimadoPerdido = items.reduce(
    (s, c) => s + c.gajos_pendientes * (c.peso_promedio_gajo ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/viajes')}
          className="mb-3 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Ajustes de cosecha</h1>
        <p className="text-muted-foreground mt-1">
          Cosechas con gajos pendientes desde hace 3+ viajes. Decide qué hacer con ellos.
        </p>
      </div>

      {/* Resumen. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cosechas afectadas</p>
                <p className="text-2xl font-bold text-foreground mt-1">{items.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Gajos pendientes total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalPendientes}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Peso estimado</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {pesoEstimadoPerdido.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla. */}
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
            <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-success" />
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
        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.cosecha_id} className="border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">
                        {c.lote?.nombre ?? 'Sin lote'}
                        {c.sublote?.nombre && (
                          <span className="text-muted-foreground font-normal">
                            {' · '}{c.sublote.nombre}
                          </span>
                        )}
                      </h3>
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 border">
                        {c.viajes_transcurridos} viajes sin resolver
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Reportado el {new Date(c.planilla_fecha + 'T00:00:00').toLocaleDateString('es-CO')}
                      </span>
                      {c.reportado_por && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {c.reportado_por}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/30 rounded-lg p-2.5">
                      <Metric label="Reportados" valor={c.gajos_reportados} />
                      <Metric label="Reconteo" valor={c.gajos_reconteo ?? '—'} />
                      <Metric label="En viajes" valor={c.gajos_asignados_total} />
                      <Metric
                        label="Pendientes"
                        valor={c.gajos_pendientes}
                        destacado
                      />
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:min-w-[180px]">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Peso estimado perdido
                      </p>
                      <p className="text-lg font-bold text-orange-600">
                        {(c.gajos_pendientes * (c.peso_promedio_gajo ?? 0)).toLocaleString('es-CO', {
                          maximumFractionDigits: 0,
                        })} kg
                      </p>
                    </div>
                    <Button onClick={() => abrirModal(c)} className="gap-2 whitespace-nowrap">
                      <AlertTriangle className="h-4 w-4" />
                      Ajustar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

function Metric({ label, valor, destacado }: { label: string; valor: number | string; destacado?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-semibold ${destacado ? 'text-amber-600' : 'text-foreground'}`}>
        {valor}
      </p>
    </div>
  );
}
