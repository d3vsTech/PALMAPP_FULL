/**
 * CrearEditarLote.tsx
 * §2.0 GET /lotes/semillas
 * §2.2 GET /lotes/{id}
 * §2.3 POST /lotes — predio_id*, nombre*, fecha_siembra?, hectareas_sembradas?, semillas_ids?
 * §2.4 PUT  /lotes/{id} — semillas_ids reemplaza todas
 */
import { useMemo, useState, useEffect } from 'react';
import { comoBoton } from '../../hooks/comoBoton';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { AlertCircle, ArrowLeft, Save, Sprout, Loader2 } from 'lucide-react';
import { lotesApi, prediosApi } from '../../../api/plantacion';
import IlustracionPalma from '../../components/common/IlustracionPalma';
import { toast } from 'sonner';

/** Lo mínimo que la pantalla necesita de cada predio del listado. */
interface PredioOpcion {
  id: number;
  nombre: string;
  hectareas_totales: string | number | null;
}

export default function CrearEditarLote() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('id');
  const predioIdParam  = sp.get('predio_id') ?? sp.get('predioId');
  const isEditing      = !!loteId;

  const [loading, setLoading]         = useState(false);
  const [nombre, setNombre]           = useState('');
  const [fechaSiembra, setFecha]      = useState('');
  const [hectareas, setHectareas]     = useState('');
  const [semillasList, setSemillas]   = useState<{ id: number; tipo: string; nombre: string }[]>([]);
  const [semillasIds, setSemillasIds] = useState<number[]>([]);
  const [predioId, setPredioId]       = useState(predioIdParam ?? '');
  const [predios, setPredios]         = useState<PredioOpcion[]>([]);
  /** Hectáreas libres del predio elegido, ya sin contar este lote. */
  const [disponibles, setDisponibles] = useState<number | null>(null);
  /** Lo que el lote ocupa hoy: al editar vuelve a la bolsa de libres. */
  const [hectareasPropias, setHectareasPropias] = useState(0);
  /** Para marcar la lista sin recorrer el arreglo por cada semilla. */
  const semillasSeleccionadas = useMemo(() => new Set(semillasIds), [semillasIds]);

  useEffect(() => {
    lotesApi.semillas().then(r => setSemillas(r.data ?? [])).catch(() => {});
    prediosApi.listar({ per_page: 100 })
      .then(r => setPredios((r.data ?? []) as PredioOpcion[]))
      .catch(() => toast.error('No se pudieron cargar los predios'));
  }, []);

  /**
   * Las hectáreas libres salen del resumen del predio (§1.6). Al editar, las
   * del propio lote ya están contadas como ocupadas, así que se devuelven.
   */
  useEffect(() => {
    if (!predioId) { setDisponibles(null); return; }
    let vigente = true;
    prediosApi.resumen(Number(predioId))
      .then(r => {
        if (!vigente) return;
        const libres = Number(r.data?.predio?.hectareas_disponibles ?? 0);
        const esElSuyo = String(r.data?.predio?.id ?? '') === String(predioId);
        setDisponibles(libres + (isEditing && esElSuyo ? hectareasPropias : 0));
      })
      .catch(() => { if (vigente) setDisponibles(null); });
    return () => { vigente = false; };
  }, [predioId, isEditing, hectareasPropias]);

  useEffect(() => {
    if (!loteId) return;
    lotesApi.ver(Number(loteId)).then(res => {
      const d = res.data;
      setNombre(d.nombre ?? '');
      setFecha(d.fecha_siembra ?? '');
      setHectareas(d.hectareas_sembradas != null ? String(Number(d.hectareas_sembradas)) : '');
      setSemillasIds((d.semillas ?? []).map((s: any) => Number(s.id)));
      setPredioId(String(d.predio_id ?? d.predio?.id ?? ''));
      setHectareasPropias(Number(d.hectareas_sembradas ?? 0));
    }).catch(() => toast.error('Error al cargar datos del lote'));
  }, [loteId]);

  const toggleSemilla = (id: number, checked: boolean) =>
    setSemillasIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('El nombre del lote es obligatorio'); return; }
    if (!predioId)      { toast.error('Elige el predio del lote'); return; }
    setLoading(true);
    try {
      if (isEditing && loteId) {
        const body: any = { nombre: nombre.trim(), predio_id: Number(predioId) };
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas)    body.hectareas_sembradas = Number(hectareas);
        body.semillas_ids = semillasIds;
        const res = await lotesApi.editar(Number(loteId), body);
        toast.success(res.message ?? 'Lote actualizado');
      } else {
        const body: any = { predio_id: Number(predioId), nombre: nombre.trim() };
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas)    body.hectareas_sembradas = Number(hectareas);
        if (semillasIds.length > 0) body.semillas_ids = semillasIds;
        const res = await lotesApi.crear(body);
        toast.success(res.message ?? 'Lote creado');
      }
      navigate('/plantacion', { state: { recargar: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
          aria-label="Volver"
          className="h-12 w-12 rounded-xl border border-border hover:bg-muted group-data-[barra-volver]/shell:max-md:hidden">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-success/30 bg-success-soft shadow-sm">
            <Sprout className="h-8 w-8 text-success" strokeWidth={2} />
          </div>
          <div>
            <h1>
              {isEditing ? 'Editar lote' : 'Crear nuevo lote'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? 'Modifica la información del lote existente'
                : 'Crea un lote dentro de un predio. Después podrás agregar sublotes, líneas y palmas.'}
            </p>
          </div>
        </div>
      </div>

      <Card className="gap-4 border-border shadow-sm">
        <CardHeader className="border-b bg-muted/60 pb-6">
          <CardTitle className="text-2xl">Información del lote</CardTitle>
          <CardDescription>
            Los campos marcados con <span className="text-destructive font-semibold">*</span> son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">

            {/* Predio */}
            <div className="space-y-3">
              <Label htmlFor="predio" className="text-base font-semibold">
                Predio <span className="text-destructive">*</span>
              </Label>
              <Select value={predioId} onValueChange={setPredioId}>
                <SelectTrigger id="predio" className="h-12 text-base">
                  <SelectValue placeholder="Selecciona un predio" />
                </SelectTrigger>
                <SelectContent>
                  {predios.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre} ({Number(p.hectareas_totales ?? 0).toFixed(2)} hectáreas totales)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {predioId && disponibles != null && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-4 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">
                    Hectáreas disponibles:{' '}
                    <strong className="font-bold text-primary tabular-nums">
                      {disponibles.toFixed(2)} hectáreas
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-base font-semibold">
                Nombre del lote <span className="text-destructive">*</span>
              </Label>
              <Input id="nombre" placeholder="Ej: Lote 1 - Norte" maxLength={100}
                value={nombre} onChange={e => setNombre(e.target.value)}
                className="h-12 text-base" autoFocus />
            </div>

            {/* Fecha + Hectáreas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="fechaSiembra" className="text-base font-semibold">
                  Fecha de siembra
                </Label>
                <Input id="fechaSiembra" type="date" value={fechaSiembra}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setFecha(e.target.value)} className="h-12 text-base" />
                <p className="text-sm text-muted-foreground">No puede ser una fecha futura.</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="hectareas" className="text-base font-semibold">
                  Hectáreas sembradas
                </Label>
                <Input id="hectareas" type="number" min="0" step="0.01" placeholder="45.5"
                  max={disponibles ?? undefined}
                  value={hectareas} onChange={e => setHectareas(e.target.value)} className="h-12 text-base" />
                {/* El backend rechaza con 422 si se pasa; el aviso lo adelanta. */}
                {disponibles != null && parseFloat(hectareas) > 0 && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    parseFloat(hectareas) > disponibles
                      ? 'border border-destructive/20 bg-destructive-soft text-destructive'
                      : 'border border-success/20 bg-success-soft text-success'
                  }`}>
                    {parseFloat(hectareas) > disponibles
                      ? 'Excede las hectáreas disponibles del predio'
                      : `Quedarán ${(disponibles - parseFloat(hectareas)).toFixed(2)} hectáreas disponibles`}
                  </div>
                )}
              </div>
            </div>

            {/* Semillas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Semillas asociadas</Label>
              <p className="text-sm text-muted-foreground">Selecciona una o más semillas del catálogo.</p>

              {semillasList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed bg-muted/10 p-8 text-center">
                  <IlustracionPalma variante="palma" className="mx-auto mb-3" />
                  <p className="mb-2 text-base font-semibold text-muted-foreground">No hay semillas en el catálogo</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Primero hay que crearlas en Configuración, en Maestros.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/configuracion?tab=maestros')}>
                    <Sprout className="h-4 w-4" strokeWidth={2} /> Ir a Maestros
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/60 p-6 md:grid-cols-2 lg:grid-cols-3">
                    {semillasList.map(s => {
                      const marcada = semillasSeleccionadas.has(Number(s.id));
                      return (
                      <div key={s.id}
                        className={`flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-4 transition-all ${
                          marcada
                            ? 'border-success/50 bg-success-soft shadow-sm'
                            : 'border-border bg-background'
                        }`}
                        {...comoBoton(() => toggleSemilla(Number(s.id), !marcada))}
                      >
                        <Checkbox
                          id={`semilla-${s.id}`}
                          checked={marcada}
                          onCheckedChange={checked => toggleSemilla(Number(s.id), checked as boolean)}
                        />
                        <label htmlFor={`semilla-${s.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          <span className="block">{s.nombre}</span>
                          <span className="text-xs text-muted-foreground font-normal">{s.tipo}</span>
                        </label>
                      </div>
                      );
                    })}
                  </div>
                  {semillasIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-2.5">
                      <span className="text-sm font-medium text-success">
                        {semillasIds.length} semilla{semillasIds.length !== 1 ? 's' : ''} seleccionada{semillasIds.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Al guardar, las semillas seleccionadas reemplazan las anteriores.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="barra-acciones mt-8 flex items-center justify-between gap-4 border-t pt-8">
            <Button variant="outline" onClick={() => navigate('/plantacion')} disabled={loading}
              className="h-12 px-6 text-base">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading} className="h-12 gap-2 px-8 text-base">
              {loading
                ? <><Loader2 className="h-5 w-5 animate-spin" />Guardando</>
                : <><Save className="h-5 w-5" strokeWidth={2} />{isEditing ? 'Guardar cambios' : 'Crear lote'}</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}