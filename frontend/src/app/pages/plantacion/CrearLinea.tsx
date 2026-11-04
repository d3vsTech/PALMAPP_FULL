/**
 * CrearLinea.tsx
 * §5.1 GET /lineas?sublote_id=X — sugerir siguiente número libre
 * §5.3 POST /lineas — sublote_id*, numero*, cantidad_palmas?
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { SquareStack, Loader2 } from 'lucide-react';
import { lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';

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

  useEffect(() => {
    if (!subloteId) return;
    lineasApi.listar({ sublote_id: Number(subloteId), per_page: 100 })
      .then(res => {
        const nums = (res.data ?? []).map((l: any) => Number(l.numero)).sort((a: number, b: number) => a - b);
        setNumerosExistentes(nums);
        let sig = 1;
        while (nums.includes(sig)) sig++;
        setNumero(String(sig));
      })
      .catch(() => {});
  }, [subloteId]);

  const generatePreviewCodes = () => {
    const numLinea = parseInt(numero);
    const cantPalmas = parseInt(cantTeorica);
    if (isNaN(numLinea) || numLinea < 1 || isNaN(cantPalmas) || cantPalmas < 1) return [];
    return Array.from({ length: Math.min(cantPalmas, 5) }, (_, i) =>
      `${nombreSublote}-L${numLinea}-${String(i + 1).padStart(3, '0')}`
    );
  };
  const previewCodes = generatePreviewCodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(numero);
    if (!numero.trim() || isNaN(num) || num < 1) { toast.error('El número debe ser mayor o igual a 1'); return; }
    if (!subloteId) { toast.error('Sublote no especificado'); return; }
    if (numerosExistentes.includes(num)) {
      toast.error(`La línea ${num} ya existe. El siguiente número libre es ${Math.max(...numerosExistentes) + 1}`);
      return;
    }
    const cant = cantTeorica ? parseInt(cantTeorica) : undefined;
    if (cantTeorica && (isNaN(cant!) || cant! < 0)) { toast.error('Cantidad inválida'); return; }

    setLoading(true);
    try {
      const body: any = { sublote_id: Number(subloteId), numero: num };
      if (cant != null && cant > 0) body.cantidad_palmas = cant;
      const res = await lineasApi.crear(body);
      toast.success(res.message ?? 'Línea creada correctamente');
      navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId, recargar: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear línea');
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backTo={`/plantacion/lote/${loteId}`}
        eyebrow="Mi plantación"
        title="Nueva línea"
        description={`Crea una línea dentro de ${nombreSublote}.`}
      />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-2xl">Información de la línea</CardTitle>
          <CardDescription>
            Las palmas de esta línea llevan códigos secuenciales, sin repetirse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="numeroLinea" className="text-base">
                Número de línea <span className="text-destructive">*</span>
              </Label>
              <Input id="numeroLinea" type="number" step="1" min="1" placeholder="Ej: 1, 2, 3"
                value={numero} onChange={e => setNumero(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Debe ser un número único dentro de este sublote, desde 1.
              </p>
              {numerosExistentes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ya existe{numerosExistentes.length > 1 ? 'n' : ''} la{numerosExistentes.length > 1 ? 's' : ''} línea
                  {numerosExistentes.length > 1 ? 's' : ''}{' '}
                  <span className="font-semibold text-foreground tabular-nums">{numerosExistentes.join(', ')}</span>.
                </p>
              )}
            </div>

            {/* El backend solo guarda el número: las palmas se crean aparte,
                así que el campo sigue siendo opcional. */}
            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad de palmas <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="cantidadPalmas" type="number" step="1" min="0" max="9999" placeholder="Ej: 50"
                value={cantTeorica} onChange={e => setCantTeorica(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Cantidad prevista para esta línea, entre 1 y 9.999. Las palmas se crean desde Agregar palmas.
              </p>
            </div>

            {previewCodes.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <p className="mb-2.5 text-sm font-semibold text-foreground">Así quedarán los códigos</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewCodes.map((code, index) => (
                    <span key={index}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold tabular-nums">
                      {code}
                    </span>
                  ))}
                </div>
                {parseInt(cantTeorica) > 5 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Y {(parseInt(cantTeorica) - 5).toLocaleString('es-CO')} palmas más.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary-soft p-6">
              <div className="flex gap-3">
                <SquareStack className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Las palmas llevan el formato <span className="font-semibold text-foreground">{nombreSublote}-L[número]-[contador]</span></li>
                    <li>• El contador de palmas usa 3 dígitos (001, 002, 003...)</li>
                    <li>• La línea se creará en estado <strong>Activo</strong></li>
                    <li>• Al eliminar esta línea, sus palmas quedan en el sublote sin línea</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="barra-acciones flex items-center gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })}
                className="h-12 flex-1 text-base">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-12 flex-1 text-base">
                {loading
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Creando</>
                  : <><SquareStack className="h-5 w-5" strokeWidth={2} />Crear línea</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
