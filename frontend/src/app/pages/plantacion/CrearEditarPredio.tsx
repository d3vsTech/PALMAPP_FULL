/**
 * CrearEditarPredio.tsx
 * §1.2 GET /predios/{id}         — cargar para editar
 * §1.3 POST /predios              — nombre*, ubicacion*, latitud?, longitud?, hectareas_totales?
 * §1.4 PUT  /predios/{id}         — mismos campos + estado?
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { MapPin, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { prediosApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearEditarPredio() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const editId        = params.get('edit');      // ?edit=ID viene de MiPlantacion
  const isEditing     = !!editId;

  const [loading, setLoading] = useState(false);
  // §1.3 campos: nombre*, ubicacion*
  const [nombre, setNombre]       = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [hectareas, setHectareas] = useState('');

  // §1.2 Cargar predio existente para editar
  useEffect(() => {
    if (!editId) return;
    prediosApi.ver(Number(editId))
      .then(res => {
        const d = res.data;
        setNombre(d.nombre ?? '');
        setUbicacion(d.ubicacion ?? '');
        setHectareas(d.hectareas_totales != null ? String(Number(d.hectareas_totales)) : '');
      })
      .catch(() => toast.error('Error al cargar el predio'));
  }, [editId]);

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('El nombre del predio es obligatorio'); return; }
    if (!ubicacion.trim()) { toast.error('La ubicación es obligatoria'); return; }
    setLoading(true);
    try {
      const body: any = { nombre: nombre.trim().slice(0, 50), ubicacion: ubicacion.trim().slice(0, 100) };
      if (hectareas && !isNaN(Number(hectareas))) body.hectareas_totales = Number(hectareas);

      if (isEditing && editId) {
        const res = await prediosApi.editar(Number(editId), body);   // §1.4
        toast.success(res.message ?? 'Predio actualizado');
      } else {
        const res = await prediosApi.crear(body);                    // §1.3
        toast.success(res.message ?? 'Predio creado');
      }
      navigate('/plantacion');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">{isEditing ? 'Editar Predio' : 'Crear Nuevo Predio'}</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Modifica los datos del predio' : 'Ingresa los datos básicos del predio'}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Predio</CardTitle>
          <CardDescription>Los campos con * son obligatorios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-base font-semibold">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input id="nombre" placeholder="Ej: Finca La Esperanza" maxLength={50}
              value={nombre} onChange={e => setNombre(e.target.value)} className="h-12 text-base" autoFocus />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ubicacion" className="text-base font-semibold">
                Ubicación <span className="text-destructive">*</span>
              </Label>
              <Input id="ubicacion" placeholder="Ej: Acacías, Meta" maxLength={100}
                value={ubicacion} onChange={e => setUbicacion(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hectareas" className="text-base font-semibold">
                Hectáreas Totales
              </Label>
              <Input id="hectareas" type="number" min="0" step="0.01" placeholder="Ej: 150"
                value={hectareas} onChange={e => setHectareas(e.target.value)} className="h-12 text-base" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" disabled={loading}
              onClick={() => navigate('/plantacion')} className="flex-1 h-12">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              {loading
                ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Guardando...</>
                : <><Save className="h-5 w-5 mr-2" />{isEditing ? 'Guardar Cambios' : 'Crear Predio'}</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}