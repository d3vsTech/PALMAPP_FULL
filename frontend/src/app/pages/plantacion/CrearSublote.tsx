import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Sprout, Loader2 } from 'lucide-react';
import { sublotesApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearSublote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('loteId');
  const [nombreSublote, setNombreSublote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombreSublote.trim()) {
      alert('El nombre del sublote es obligatorio');
      return;
    }

    // Aquí se guardaría el sublote
    console.log('Crear sublote:', {
      loteId,
      nombre: nombreSublote.trim()
    });

    // Volver al detalle del lote
    navigate(`/plantacion/lote/${loteId}`);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/plantacion/lote/${loteId}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Sprout className="h-10 w-10 text-success" />
            Nuevo Sublote
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea un nuevo sublote dentro del lote
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card className="glass-subtle border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Sublote</CardTitle>
          <CardDescription>
            Ingresa el nombre del sublote. La cantidad de palmas se actualizará automáticamente al agregar líneas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre del Sublote */}
            <div className="space-y-2">
              <Label htmlFor="nombreSublote" className="text-base">
                Nombre del Sublote <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombreSublote"
                placeholder="Ej: Sublote A1, Norte 1, Sector B"
                value={nombreSublote}
                onChange={(e) => setNombreSublote(e.target.value)}
                className="h-12 text-base"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Usa un nombre descriptivo que te ayude a identificar este sublote fácilmente
              </p>
            </div>

            {/* Información adicional */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex gap-3">
                <Sprout className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• La cantidad de palmas se calculará automáticamente al agregar líneas</li>
                    <li>• El sublote se creará en estado <strong>Activo</strong></li>
                    <li>• Podrás gestionar líneas y palmas después de crear el sublote</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/plantacion/lote/${loteId}`)}
                className="flex-1 h-12 text-base"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
              >
                <Sprout className="h-5 w-5 mr-2" />
                Crear Sublote
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}