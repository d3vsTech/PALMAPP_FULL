/**
 * CrearEditarPredio.tsx
 * §1.2 GET /predios/{id}         — cargar para editar
 * §1.3 POST /predios              — nombre*, ubicacion*, hectareas_totales?
 * §1.4 PUT  /predios/{id}         — mismos campos
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { MapPin, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { prediosApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearEditarPredio() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const editId        = params.get('edit');
  const isEditing     = !!editId;

  const [loading, setLoading] = useState(false);
  const [nombre, setNombre]       = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [notas, setNotas]         = useState('');

  // §1.2 Cargar predio para editar
  useEffect(() => {
    if (!editId) return;
    prediosApi.ver(Number(editId))
      .then(res => {
        const d = res.data;
        setNombre(d.nombre ?? '');
        setUbicacion(d.ubicacion ?? '');
        setHectareas(d.hectareas_totales != null ? String(Number(d.hectareas_totales)) : '');
        setNotas(d.notas ?? '');
      })
      .catch(() => toast.error('Error al cargar el predio'));
  }, [editId]);

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('El nombre del predio es obligatorio'); return; }
    if (!ubicacion.trim()) { toast.error('La ubicación es obligatoria'); return; }
    if (hectareas && (isNaN(Number(hectareas)) || Number(hectareas) <= 0)) {
      toast.error('Las hectáreas deben ser un número válido mayor a 0'); return;
    }
    setLoading(true);
    try {
      const body: any = {
        nombre:   nombre.trim().slice(0, 50),
        ubicacion: ubicacion.trim().slice(0, 100),
      };
      if (hectareas && !isNaN(Number(hectareas))) body.hectareas_totales = Number(hectareas);

      if (isEditing && editId) {
        const res = await prediosApi.editar(Number(editId), body);
        toast.success(res.message ?? 'Predio actualizado');
      } else {
        const res = await prediosApi.crear(body);
        toast.success(res.message ?? 'Predio creado');
      }
      navigate('/plantacion');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/plantacion')}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 shadow-lg">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {isEditing ? 'Editar Predio' : 'Crear Nuevo Predio'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? 'Modifica la información del predio existente'
                : 'Ingresa la información básica del nuevo predio'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-2xl">Información del Predio</CardTitle>
          <CardDescription>
            Los campos marcados con <span className="text-destructive font-semibold">*</span> son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Nombre */}
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Nombre del Predio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Puerto Arturo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={50}
                className="h-12 text-base"
                autoFocus
              />
            </div>

            {/* Ubicación + Hectáreas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="ubicacion" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  Ubicación <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ubicacion"
                  placeholder="Ej: Vereda El Silencio, Municipio Palmira"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  maxLength={100}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="hectareas" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Hectáreas Totales
                </Label>
                <Input
                  id="hectareas"
                  type="number"
                  placeholder="Ej: 250"
                  value={hectareas}
                  onChange={(e) => setHectareas(e.target.value)}
                  min="0"
                  step="0.01"
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-3">
              <Label htmlFor="notas" className="text-base font-semibold">
                Notas (opcional)
              </Label>
              <Textarea
                id="notas"
                placeholder="Notas adicionales sobre el predio..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={5}
                className="resize-none text-base"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-between items-center gap-4 pt-8 mt-8 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/plantacion')}
              disabled={loading}
              className="h-12 px-6 text-base"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="h-12 px-8 text-base gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-5 w-5" />{isEditing ? 'Guardar Cambios' : 'Crear Predio'}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}