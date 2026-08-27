/**
 * Configuración → Calendario de Festivos (doc §14.1).
 *
 * Lectura + delta del tenant. Los festivos con `origen: 'NACIONAL'` son
 * inmutables — el backend responde 403 `FESTIVO_NACIONAL_INMUTABLE` si se
 * intenta mutar. Para "cambiar" un nacional, el tenant crea su propia fila:
 *  - `activo: false` suprime el festivo nacional (opera ese día por convenio).
 *  - `activo: true` renombra o agrega un festivo local.
 *
 * Cada GET dispara verificación oportunista contra la fuente externa
 * (Nager.Date). El bloque `verificacion` refleja el estado de la última.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { festivosApi, NominaErrorCodes } from '../../../api';
import type { Festivo, FestivoPayload, FestivoVerificacion } from '../../../api';
import type { ApiError } from '../../../api';

const CURRENT_YEAR = new Date().getFullYear();
// §14.1 — Backend rechaza años fuera de [1984, año actual + 5] con FESTIVO_FUERA_DE_RANGO.
const AÑOS_DISPONIBLES = Array.from(
  { length: CURRENT_YEAR + 5 - 1984 + 1 },
  (_, i) => 1984 + i,
).reverse();

type ModoDialogo = 'crear' | 'editar';

interface CalendarioFestivosProps {
  /**
   * `true` cuando el componente se renderiza como pantalla propia
   * (`/configuracion/festivos`); muestra el botón "Volver a Configuración".
   * Cuando se embebe como tab dentro de Configuracion, se pasa `false`.
   * Default: pantalla standalone.
   */
  standalone?: boolean;
}

export default function CalendarioFestivos({ standalone = true }: CalendarioFestivosProps = {}) {
  const [anio, setAnio] = useState<number>(CURRENT_YEAR);
  const [cargando, setCargando] = useState(true);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [verificacion, setVerificacion] = useState<FestivoVerificacion | undefined>(undefined);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [modo, setModo] = useState<ModoDialogo>('crear');
  const [festivoEditando, setFestivoEditando] = useState<Festivo | null>(null);
  const [form, setForm] = useState<FestivoPayload>({
    fecha: '',
    nombre: '',
    activo: true,
    observacion: '',
  });
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<Festivo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = async (anioObjetivo: number) => {
    setCargando(true);
    try {
      const res = await festivosApi.listar(anioObjetivo);
      setFestivos(res.data.festivos ?? []);
      setVerificacion(res.data.verificacion);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cargar el calendario');
      setFestivos([]);
      setVerificacion(undefined);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  const abrirCrear = () => {
    setModo('crear');
    setFestivoEditando(null);
    setForm({ fecha: `${anio}-01-01`, nombre: '', activo: true, observacion: '' });
    setDialogoAbierto(true);
  };

  const abrirEditar = (f: Festivo) => {
    if (f.origen === 'NACIONAL') {
      toast.error('Los festivos nacionales no se pueden editar. Crea uno propio del tenant para esa fecha.');
      return;
    }
    setModo('editar');
    setFestivoEditando(f);
    setForm({
      fecha: f.fecha,
      nombre: f.nombre,
      activo: f.activo,
      observacion: f.observacion ?? '',
    });
    setDialogoAbierto(true);
  };

  const guardar = async () => {
    if (!form.fecha || !form.nombre.trim()) {
      toast.error('Fecha y nombre son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      if (modo === 'crear') {
        await festivosApi.crear(form);
        toast.success('Festivo creado');
      } else if (festivoEditando) {
        await festivosApi.editar(festivoEditando.id, form);
        toast.success('Festivo actualizado');
      }
      setDialogoAbierto(false);
      await cargar(anio);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.FESTIVO_NACIONAL_INMUTABLE) {
        toast.error('No se puede modificar un festivo nacional. Crea uno propio del tenant.');
      } else if (e.code === NominaErrorCodes.FESTIVO_DUPLICADO) {
        toast.error('Ya existe un festivo del tenant para esa fecha');
      } else if (e.code === NominaErrorCodes.FESTIVO_FUERA_DE_RANGO) {
        toast.error('Año fuera del rango permitido (1984 a año actual + 5)');
      } else {
        toast.error(e.message ?? 'No se pudo guardar el festivo');
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await festivosApi.eliminar(aEliminar.id);
      toast.success('Festivo eliminado');
      setAEliminar(null);
      await cargar(anio);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.FESTIVO_NACIONAL_INMUTABLE) {
        toast.error('Los festivos nacionales no se pueden eliminar');
      } else {
        toast.error(e.message ?? 'No se pudo eliminar el festivo');
      }
    } finally {
      setEliminando(false);
    }
  };

  const festivosOrdenados = useMemo(
    () => [...festivos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [festivos],
  );

  const totalVigentes = festivosOrdenados.filter((f) => f.vigente).length;

  return (
    <div className="space-y-6">
      <div>
        {standalone && (
          <Button variant="ghost" size="sm" asChild className="gap-2 mb-4">
            <Link to="/configuracion">
              <ArrowLeft className="h-4 w-4" />
              Volver a Configuración
            </Link>
          </Button>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">Calendario de Festivos</h1>
            <p className="text-muted-foreground text-sm">
              Los festivos nacionales son de solo lectura. Puedes agregar festivos
              locales o suprimir alguno nacional creando tu propia fila para esa fecha.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Año</Label>
              <Select
                value={String(anio)}
                onValueChange={(v) => setAnio(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {AÑOS_DISPONIBLES.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={abrirCrear} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar festivo
            </Button>
          </div>
        </div>
      </div>

      {/* Estado de verificación (§14.1). */}
      {verificacion && (
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            {verificacion.estado === 'COINCIDE' ? (
              <>
                <Check className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm">
                  <strong>Coincide con {verificacion.fuente}</strong>
                  <span className="text-muted-foreground"> · verificado el {verificacion.verificado_at}</span>
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm">
                  <strong className="text-amber-800 dark:text-amber-200">
                    Discrepancia con {verificacion.fuente}
                  </strong>
                  <span className="text-muted-foreground"> · verificado el {verificacion.verificado_at}</span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    Solo local: {verificacion.solo_local.length} · Solo remoto: {verificacion.solo_remoto.length}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Listado. */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{totalVigentes}</strong> festivo{totalVigentes !== 1 ? 's' : ''} vigente{totalVigentes !== 1 ? 's' : ''} en {anio}
            </p>
          </div>

          {cargando ? (
            <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : festivosOrdenados.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay festivos para este año.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[120px_1fr_120px_100px_120px_auto] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40 border-b">
                <span>Fecha</span>
                <span>Nombre</span>
                <span>Origen</span>
                <span>Activo</span>
                <span>Base legal</span>
                <span className="text-right">Acciones</span>
              </div>
              {festivosOrdenados.map((f) => (
                <div
                  key={f.id}
                  className={`grid grid-cols-[120px_1fr_120px_100px_120px_auto] gap-2 px-4 py-3 items-center text-sm border-b last:border-b-0 ${
                    !f.vigente ? 'opacity-60' : ''
                  }`}
                >
                  <span className="font-mono text-xs">{f.fecha}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.nombre}</p>
                    {f.trasladado_desde && (
                      <p className="text-xs text-muted-foreground">
                        Trasladado desde {f.trasladado_desde}
                      </p>
                    )}
                    {f.observacion && (
                      <p className="text-xs text-muted-foreground truncate">{f.observacion}</p>
                    )}
                  </div>
                  <span>
                    {f.origen === 'NACIONAL' ? (
                      <Badge variant="secondary" className="text-xs">Nacional</Badge>
                    ) : (
                      <Badge className="text-xs bg-primary/15 text-primary hover:bg-primary/20">
                        Del tenant
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs">
                    {f.activo ? (
                      <span className="text-success">Sí</span>
                    ) : (
                      <span className="text-destructive">Suprimido</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {f.base_legal ?? '—'}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {f.origen === 'TENANT' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => abrirEditar(f)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setAEliminar(f)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-[10px] uppercase text-muted-foreground pr-1">
                        Inmutable
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo crear / editar. */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modo === 'crear' ? 'Agregar festivo' : 'Editar festivo'}
            </DialogTitle>
            <DialogDescription>
              Solo puedes crear festivos <strong>del tenant</strong>. Los nacionales
              son inmutables. Para suprimir uno nacional, crea el tuyo con
              <em> Activo</em> apagado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                disabled={modo === 'editar'}
              />
              {modo === 'editar' && (
                <p className="text-xs text-muted-foreground mt-1">
                  La fecha no se puede cambiar. Elimina y crea uno nuevo si es necesario.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Fiesta patronal de la finca"
              />
            </div>
            <div>
              <Label htmlFor="observacion">Observación (opcional)</Label>
              <Input
                id="observacion"
                value={form.observacion ?? ''}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                placeholder="Ej: acuerdo colectivo"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="activo"
                checked={form.activo}
                onCheckedChange={(checked) =>
                  setForm({ ...form, activo: checked === true })
                }
              />
              <div className="grid gap-1 leading-none">
                <Label htmlFor="activo" className="cursor-pointer">
                  Festivo activo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desactívalo si esta fila es para <strong>suprimir</strong> un festivo nacional en tu finca (opera ese día por convenio).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {modo === 'crear' ? 'Crear' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminar. */}
      <AlertDialog open={!!aEliminar} onOpenChange={(open) => !open && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar festivo</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{aEliminar?.nombre}</strong> del {aEliminar?.fecha}.
              Si suprimía un festivo nacional, éste volverá a aplicar automáticamente.
              Esta acción no afecta nóminas ya liquidadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={eliminando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {eliminando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
