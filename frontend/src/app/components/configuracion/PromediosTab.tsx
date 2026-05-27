import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus, Edit, Trash2, TrendingUp, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type PromedioLote,
} from '../../../api/configuracion';
import { lotesApi } from '../../../api/plantacion';

/**
 * Tab "Promedios por Lote" conectado al API real (§5 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/promedios-lote        → listado (filtro lote_id, anio)
 *   POST   /api/v1/tenant/promedios-lote        → crear
 *   PUT    /api/v1/tenant/promedios-lote/{id}   → editar
 *   DELETE /api/v1/tenant/promedios-lote/{id}   → eliminar
 *
 * Crear/editar falla con 409 PROMEDIO_DUPLICADO si ya existe el par lote+año.
 * Los lotes vienen de lotesApi (plantacion).
 */

interface LoteOpcion {
  id: number;
  nombre: string;
}

const ANIO_ACTUAL = new Date().getFullYear();
const aniosDisponibles = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - 2 + i);

const FORM_VACIO = { lote_id: '', promedio: '', anio: String(ANIO_ACTUAL) };

export function PromediosTab() {
  const [promedios, setPromedios] = useState<PromedioLote[]>([]);
  const [lotes, setLotes] = useState<LoteOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [anioSeleccionado, setAnioSeleccionado] = useState(ANIO_ACTUAL);

  const [openModal, setOpenModal] = useState(false);
  const [promedioEdit, setPromedioEdit] = useState<PromedioLote | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [promedioAEliminar, setPromedioAEliminar] = useState<PromedioLote | null>(null);

  const cargar = (anio: number) => {
    setCargando(true);
    Promise.all([
      configuracionApi.promediosLote.listar({ anio, per_page: 100 }),
      lotesApi.listar({ per_page: 100 }),
    ])
      .then(([resPromedios, resLotes]) => {
        setPromedios(resPromedios.data);
        setLotes(resLotes.data.map((l: any) => ({ id: l.id, nombre: l.nombre })));
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los promedios'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar(anioSeleccionado);
  }, [anioSeleccionado]);

  const nombreLote = (item: PromedioLote) =>
    item.lote?.nombre ?? lotes.find((l) => l.id === item.lote_id)?.nombre ?? `Lote ${item.lote_id}`;

  const handleOpenModal = (promedio?: PromedioLote) => {
    if (promedio) {
      setPromedioEdit(promedio);
      setFormData({
        lote_id: String(promedio.lote_id),
        promedio: String(promedio.promedio),
        anio: String(promedio.anio),
      });
    } else {
      setPromedioEdit(null);
      setFormData({ ...FORM_VACIO, anio: String(anioSeleccionado) });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    const loteId = Number(formData.lote_id);
    const promedioNum = Number(formData.promedio);
    const anioNum = Number(formData.anio);
    if (!loteId || !(promedioNum > 0) || !anioNum) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const payload = { lote_id: loteId, promedio: promedioNum, anio: anioNum };
      if (promedioEdit) {
        const res = await configuracionApi.promediosLote.editar(promedioEdit.id, payload);
        toast.success(res.message ?? 'Promedio actualizado');
      } else {
        const res = await configuracionApi.promediosLote.crear(payload);
        toast.success(res.message ?? 'Promedio creado');
      }
      setOpenModal(false);
      cargar(anioSeleccionado);
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.PROMEDIO_DUPLICADO) {
        toast.error('Ya existe un promedio para ese lote en ese año');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el promedio');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!promedioAEliminar) return;
    try {
      await configuracionApi.promediosLote.eliminar(promedioAEliminar.id);
      setPromedios((prev) => prev.filter((p) => p.id !== promedioAEliminar.id));
      toast.success('Promedio eliminado');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar el promedio');
    } finally {
      setPromedioAEliminar(null);
    }
  };

  const promedioGeneral =
    promedios.length > 0
      ? promedios.reduce((sum, p) => sum + Number(p.promedio), 0) / promedios.length
      : 0;

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {promedioEdit ? 'Editar Promedio' : 'Nuevo Promedio'}
            </DialogTitle>
            <DialogDescription>
              Kg promedio por gajo para un lote en un año
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lote">
                Lote <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.lote_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, lote_id: value }))
                }
              >
                <SelectTrigger id="lote">
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((lote) => (
                    <SelectItem key={lote.id} value={String(lote.id)}>
                      {lote.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anio">
                Año <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.anio}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, anio: value }))
                }
              >
                <SelectTrigger id="anio">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={String(anio)}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promedio">
                Kg Promedio por Gajo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promedio"
                type="number"
                step="0.1"
                placeholder="14.5"
                value={formData.promedio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, promedio: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!promedioAEliminar}
        onOpenChange={(open) => !open && setPromedioAEliminar(null)}
        title="Eliminar promedio"
        description={`¿Estás seguro de eliminar el promedio de "${
          promedioAEliminar ? nombreLote(promedioAEliminar) : ''
        }"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Promedios Anuales
              </CardTitle>
              <CardDescription>
                Kg promedio por gajo para cada lote
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Año:</Label>
                <Select
                  value={anioSeleccionado.toString()}
                  onValueChange={(value) => setAnioSeleccionado(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aniosDisponibles.map((anio) => (
                      <SelectItem key={anio} value={anio.toString()}>
                        {anio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Promedio
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI Promedio General */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Promedio General {anioSeleccionado}</p>
                <p className="text-4xl font-bold text-primary">
                  {promedioGeneral.toFixed(2)} <span className="text-lg">kg/gajo</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Promedios */}
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando promedios...
            </div>
          ) : promedios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay promedios registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                No hay promedios para el año {anioSeleccionado}
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Promedio
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Lote</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead className="text-right">Kg Promedio por Gajo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promedios.map((promedio) => (
                    <TableRow key={promedio.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{nombreLote(promedio)}</TableCell>
                      <TableCell>{promedio.anio}</TableCell>
                      <TableCell className="text-right">
                        {Number(promedio.promedio).toFixed(2)}
                        <span className="text-muted-foreground text-sm ml-1">kg/gajo</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(promedio)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPromedioAEliminar(promedio)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
