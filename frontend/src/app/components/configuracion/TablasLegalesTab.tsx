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
import { Plus, Edit, Trash2, Scale } from 'lucide-react';
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
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  type TablaLegal,
  type TablaLegalConcepto,
} from '../../../api/configuracion';

const FORM_VACIO = {
  conceptoId: '',
  porcentajeEmpleado: '',
  porcentajeEmpresa: '',
  vigenteDesde: '',
  vigenteHasta: '',
};

type FormState = typeof FORM_VACIO;

export function TablasLegalesTab() {
  const [tablas, setTablas] = useState<TablaLegal[]>([]);
  const [conceptos, setConceptos] = useState<TablaLegalConcepto[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [tablaEdit, setTablaEdit] = useState<TablaLegal | null>(null);
  const [formData, setFormData] = useState<FormState>(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      configuracionApi.tablasLegales.listar(),
      configuracionApi.tablasLegales.conceptosSelect(),
    ])
      .then(([resTablas, resConceptos]) => {
        if (cancelado) return;
        setTablas(resTablas.data);
        setConceptos(resConceptos.data);
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las tablas legales');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const nombreConcepto = (tabla: TablaLegal) =>
    tabla.concepto?.nombre ??
    conceptos.find((c) => c.id === tabla.concepto_id)?.nombre ??
    `Concepto ${tabla.concepto_id}`;

  const handleOpenModal = (tabla?: TablaLegal) => {
    if (tabla) {
      setTablaEdit(tabla);
      setFormData({
        conceptoId: String(tabla.concepto_id),
        porcentajeEmpleado: String(tabla.porcentaje_empleado),
        porcentajeEmpresa: String(tabla.porcentaje_empresa),
        vigenteDesde: tabla.vigente_desde,
        vigenteHasta: tabla.vigente_hasta ?? '',
      });
    } else {
      setTablaEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.conceptoId || !formData.vigenteDesde.trim()) {
      toast.error('Concepto y fecha de inicio son obligatorios');
      return;
    }

    try {
      const payload = {
        concepto_id: Number(formData.conceptoId),
        porcentaje_empleado: Number(formData.porcentajeEmpleado) || 0,
        porcentaje_empresa: Number(formData.porcentajeEmpresa) || 0,
        vigente_desde: formData.vigenteDesde.trim(),
        vigente_hasta: formData.vigenteHasta.trim() || null,
      };
      if (tablaEdit) {
        const res = await configuracionApi.tablasLegales.editar(tablaEdit.id, payload);
        setTablas((prev) => prev.map((t) => (t.id === tablaEdit.id ? res.data : t)));
        toast.success('Aporte actualizado');
      } else {
        const res = await configuracionApi.tablasLegales.crear(payload);
        setTablas((prev) => [...prev, res.data]);
        toast.success('Aporte creado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el aporte');
      }
    }
  };

  const handleDelete = (tabla: TablaLegal) => {
    confirmDelete({
      title: '¿Eliminar aporte?',
      description: `¿Estás seguro de que deseas eliminar "${nombreConcepto(tabla)}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.tablasLegales.eliminar(tabla.id);
          setTablas((prev) => prev.filter((t) => t.id !== tabla.id));
          toast.success('Aporte eliminado');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar el aporte');
        }
      },
    });
  };

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {tablaEdit ? 'Editar Aporte' : 'Nuevo Aporte'}
            </DialogTitle>
            <DialogDescription>
              Define porcentajes de aportes legales y su vigencia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="concepto">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.conceptoId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, conceptoId: value }))
                }
              >
                <SelectTrigger id="concepto">
                  <SelectValue placeholder="Seleccionar concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptos.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="porcEmpleado">% Empleado</Label>
                <Input
                  id="porcEmpleado"
                  type="number"
                  step="0.01"
                  placeholder="4"
                  value={formData.porcentajeEmpleado}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, porcentajeEmpleado: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="porcEmpresa">% Empresa</Label>
                <Input
                  id="porcEmpresa"
                  type="number"
                  step="0.01"
                  placeholder="8.5"
                  value={formData.porcentajeEmpresa}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, porcentajeEmpresa: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vigDesde">
                  Vigencia Desde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vigDesde"
                  placeholder="dd/mm/yyyy"
                  value={formData.vigenteDesde}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenteDesde: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vigHasta">Vigencia Hasta (opcional)</Label>
                <Input
                  id="vigHasta"
                  placeholder="dd/mm/yyyy"
                  value={formData.vigenteHasta}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenteHasta: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Aportes
              </CardTitle>
              <CardDescription>
                Historial de porcentajes de aportes legales
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Aporte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tablas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay aportes registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Agrega los porcentajes de aportes legales vigentes
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Aporte
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Concepto</TableHead>
                    <TableHead>% Empleado</TableHead>
                    <TableHead>% Empresa</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tablas.map((tabla) => (
                    <TableRow key={tabla.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{nombreConcepto(tabla)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {tabla.porcentaje_empleado}%
                      </TableCell>
                      <TableCell className="font-semibold text-accent">
                        {tabla.porcentaje_empresa}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tabla.vigente_desde}
                        {tabla.vigente_hasta ? (
                          <> → {tabla.vigente_hasta}</>
                        ) : (
                          <> → Vigente</>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(tabla)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tabla)}
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
