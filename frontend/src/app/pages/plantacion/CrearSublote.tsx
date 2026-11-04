/**
 * CrearSublote.tsx
 * §3.3 POST /sublotes — lote_id*, nombre*, cantidad_palmas?
 * §4.6 GET /palmas/batch/{id} — polling cada 3s
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sprout, Loader2 } from 'lucide-react';
import { sublotesApi, palmasApi, type BatchStatus } from '../../../api/plantacion';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';

export default function CrearSublote() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');

  const [nombre, setNombre]     = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading]   = useState(false);
  const [batch, setBatch]       = useState<BatchStatus | null>(null);

  const pollBatch = async (batchId: string) => {
    const INTERVAL = 3_000;
    const TIMEOUT  = 600_000;
    const start    = Date.now();
    while (Date.now() - start < TIMEOUT) {
      await new Promise(r => setTimeout(r, INTERVAL));
      try {
        const res = await palmasApi.getBatch(batchId);
        setBatch(res.data);
        if (res.data.finished) {
          if (res.data.has_failures) {
            toast.error('El sublote se creó pero hubo un error creando las palmas');
          } else {
            toast.success('Sublote y palmas creados correctamente');
          }
          setLoading(false);
          navigate(`/plantacion/lote/${loteId}`, { state: { recargar: true } });
          return;
        }
      } catch { break; }
    }
    setLoading(false);
    toast.error('Tiempo de espera agotado');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!loteId)        { toast.error('Lote no especificado'); return; }
    const cant = cantidad ? parseInt(cantidad) : 0;
    if (cantidad && (isNaN(cant) || cant < 0 || cant > 99999)) {
      toast.error('La cantidad debe estar entre 0 y 99.999'); return;
    }
    setLoading(true);
    setBatch(null);
    // Con el trabajo en segundo plano el botón sigue bloqueado hasta que
    // `pollBatch` termine; en cualquier otra salida se libera aquí.
    let enSegundoPlano = false;
    try {
      const body: any = { lote_id: Number(loteId), nombre: nombre.trim() };
      if (cant > 0) body.cantidad_palmas = cant;
      const res = await sublotesApi.crear(body);
      if (res.palmas_async === true && res.batch_id) {
        enSegundoPlano = true;
        toast.info(`Sublote creado. Creando ${cant.toLocaleString('es-CO')} palmas en segundo plano...`);
        pollBatch(res.batch_id);
      } else {
        toast.success(res.message ?? 'Sublote creado correctamente');
        navigate(`/plantacion/lote/${loteId}`, { state: { recargar: true } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear sublote');
    } finally {
      if (!enSegundoPlano) setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backTo={`/plantacion/lote/${loteId}`}
        eyebrow="Mi plantación"
        title="Nuevo sublote"
        description="Crea un sublote dentro del lote."
      />

      {/* Avance del lote de palmas que corre en segundo plano */}
      {loading && batch && (
        <Card className="border-primary/25 bg-primary-soft">
          <CardContent className="space-y-2 py-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-primary">Creando palmas en segundo plano</span>
              <span className="text-muted-foreground tabular-nums">{batch.progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${batch.progress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-2xl">Información del sublote</CardTitle>
          <CardDescription>
            El nombre identifica el sublote. La cantidad de palmas se actualiza sola al agregar líneas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombreSublote" className="text-base">
                Nombre del sublote <span className="text-destructive">*</span>
              </Label>
              <Input id="nombreSublote" placeholder="Ej: Sublote A1, Norte 1, Sector B" maxLength={50}
                value={nombre} onChange={e => setNombre(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Usa un nombre que te sirva para reconocerlo de un vistazo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad de palmas <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="cantidadPalmas" type="number" step="1" min="0" max="99999"
                placeholder="Déjalo vacío si las agregas después"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Si pones una cantidad, las palmas se crean solas. Más de 5.000 se procesan en segundo plano.
              </p>
            </div>

            {nombre && (
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <p className="text-sm text-muted-foreground">
                  Los códigos quedarán así: <span className="font-semibold text-foreground tabular-nums">{nombre}-001</span>,{' '}
                  <span className="font-semibold text-foreground tabular-nums">{nombre}-002</span> y siguientes.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary-soft p-6">
              <div className="flex gap-3">
                <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• La cantidad de palmas se recalcula al agregar líneas</li>
                    <li>• El sublote se creará en estado <strong>Activo</strong></li>
                    <li>• Las líneas y las palmas se gestionan después de crearlo</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="barra-acciones flex items-center gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`)}
                className="h-12 flex-1 text-base">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-12 flex-1 text-base">
                {loading
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Creando</>
                  : <><Sprout className="h-5 w-5" strokeWidth={2} />Crear sublote</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
