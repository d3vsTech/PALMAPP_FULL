/**
 * CrearLinea.tsx
 * §5.1 GET /lineas?sublote_id=X — listar para sugerir siguiente número
 * §5.3 POST /lineas              — sublote_id*, numero* (≥1, único), cantidad_palmas?
 *   Validación backend: 422 si numero ya existe en el sublote
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, SquareStack, Loader2 } from 'lucide-react';
import { lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearLinea() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');
  const subloteId      = sp.get('subloteId');
  const nombreSublote  = sp.get('nombreSublote') ?? 'Sublote';

  const [numerosExistentes, setNumerosExistentes] = useState<number[]>([]);
  const [numero, setNumero]           = useState('');
  const [cantTeorica, setCantTeorica] = useState('');
  const [loading, setLoading]         = useState(false);

  // §5.1 Cargar líneas existentes del sublote para sugerir siguiente número libre
  useEffect(() => {
    if (!subloteId) return;
    lineasApi.listar({ sublote_id: Number(subloteId), per_page: 100 })
      .then(res => {
        const nums = (res.data ?? [])
          .map((l: any) => Number(l.numero))
          .sort((a: number, b: number) => a - b);
        setNumerosExistentes(nums);
        // Sugerir siguiente libre
        let sig = 1;
        while (nums.includes(sig)) sig++;
        setNumero(String(sig));
      })
      .catch(() => {});
  }, [subloteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(numero);
    if (!numero.trim() || isNaN(num) || num < 1) {
      toast.error('El número debe ser mayor o igual a 1'); return;
    }
    if (!subloteId) { toast.error('Sublote no especificado'); return; }

    const cant = cantTeorica ? parseInt(cantTeorica) : undefined;
    if (cantTeorica && (isNaN(cant!) || cant! < 0)) {
      toast.error('Cantidad inválida'); return;
    }

    // Validar duplicado antes de llamar al API (§5.3 devuelve 422 si ya existe)
    if (numerosExistentes.includes(num)) {
      toast.error(`La línea ${num} ya existe. El siguiente número libre es ${Math.max(...numerosExistentes) + 1}`);
      return;
    }

    setLoading(true);
    try {
      const body: any = { sublote_id: Number(subloteId), numero: num };
      if (cant != null && cant > 0) body.cantidad_palmas = cant;
      const res = await lineasApi.crear(body);  // §5.3
      toast.success(res.message ?? 'Línea creada correctamente');
      // Pasar subloteId para que LoteDetalle auto-expanda el sublote
      navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear línea');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <SquareStack className="h-10 w-10 text-success" /> Nueva Línea
          </h1>
          <p className="text-muted-foreground mt-1">
            En sublote <strong className="text-primary">{nombreSublote}</strong>
          </p>
        </div>
      </div>

      <Card className="border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información de la Línea</CardTitle>
          <CardDescription>El número debe ser único dentro del sublote</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base">
                Número de Línea <span className="text-destructive">*</span>
              </Label>
              <Input type="number" min="1" placeholder="Ej: 1, 2, 3..."
                value={numero} onChange={e => setNumero(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Mínimo 1 · único por sublote
              </p>
              {numerosExistentes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ya existe{numerosExistentes.length > 1 ? 'n' : ''}: <span className="font-mono text-primary">{numerosExistentes.join(', ')}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base">
                Cantidad Teórica de Palmas <span className="text-muted-foreground text-sm font-normal">(opcional)</span>
              </Label>
              {/* §5.3 cantidad_palmas = teórico (informativo) */}
              <Input type="number" min="0" placeholder="Ej: 50"
                value={cantTeorica} onChange={e => setCantTeorica(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Es informativo. Las palmas reales se crean desde "Agregar Palmas".
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })} className="flex-1 h-12">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 h-12 bg-success hover:bg-success/90 text-primary shadow-lg shadow-success/20">
                {loading
                  ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Creando...</>
                  : <><SquareStack className="h-5 w-5 mr-2" />Crear Línea</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}