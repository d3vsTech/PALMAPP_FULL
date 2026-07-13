import { useState } from 'react';
import { toast } from 'sonner';
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
import { Plus, Edit, Trash2, FileText, Eye, Users, MapPin, Package } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { Checkbox } from '../ui/checkbox';

interface PlantillaLabor {
  id: string;
  nombre: string;
  tipoLabor: 'Cosecha' | 'Plateo' | 'Poda' | 'Fertilización' | 'Sanidad' | 'Otros';
  campos: {
    colaboradores: boolean;
    lote: boolean;
    sublote: boolean;
    gajos: boolean;
    kilos: boolean;
  };
  descripcion?: string;
}

const plantillasData: PlantillaLabor[] = [
  {
    id: 'p1',
    nombre: 'Cosecha Estándar',
    tipoLabor: 'Cosecha',
    campos: {
      colaboradores: true,
      lote: true,
      sublote: true,
      gajos: true,
      kilos: true,
    },
    descripcion: 'Plantilla para registro de cosecha con todos los campos',
  },
  {
    id: 'p2',
    nombre: 'Plateo Básico',
    tipoLabor: 'Plateo',
    campos: {
      colaboradores: true,
      lote: true,
      sublote: true,
      gajos: false,
      kilos: false,
    },
    descripcion: 'Plantilla para registro de plateo',
  },
];

export function PlantillasLaboresTab() {
  const [plantillas, setPlantillas] = useState<PlantillaLabor[]>(plantillasData);
  const [openModal, setOpenModal] = useState(false);
  const [openVisualizador, setOpenVisualizador] = useState(false);
  const [plantillaEdit, setPlantillaEdit] = useState<PlantillaLabor | null>(null);
  const [plantillaVer, setPlantillaVer] = useState<PlantillaLabor | null>(null);
  const [formData, setFormData] = useState<Omit<PlantillaLabor, 'id'>>({
    nombre: '',
    tipoLabor: 'Cosecha',
    campos: {
      colaboradores: true,
      lote: true,
      sublote: true,
      gajos: true,
      kilos: true,
    },
    descripcion: '',
  });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const handleOpenModal = (plantilla?: PlantillaLabor) => {
    if (plantilla) {
      setPlantillaEdit(plantilla);
      setFormData({
        nombre: plantilla.nombre,
        tipoLabor: plantilla.tipoLabor,
        campos: { ...plantilla.campos },
        descripcion: plantilla.descripcion,
      });
    } else {
      setPlantillaEdit(null);
      setFormData({
        nombre: '',
        tipoLabor: 'Cosecha',
        campos: {
          colaboradores: true,
          lote: true,
          sublote: true,
          gajos: true,
          kilos: true,
        },
        descripcion: '',
      });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (plantillaEdit) {
      setPlantillas((prev) =>
        prev.map((p) =>
          p.id === plantillaEdit.id ? { ...p, ...formData } : p
        )
      );
    } else {
      setPlantillas((prev) => [
        ...prev,
        { id: `p${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string, nombre: string) => {
    confirmDelete({
      title: '¿Eliminar plantilla?',
      description: `¿Estás seguro de que deseas eliminar la plantilla "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        setPlantillas((prev) => prev.filter((p) => p.id !== id));
      },
    });
  };

  const handleVerPlantilla = (plantilla: PlantillaLabor) => {
    setPlantillaVer(plantilla);
    setOpenVisualizador(true);
  };

  const contarCamposActivos = (campos: PlantillaLabor['campos']) => {
    return Object.values(campos).filter(Boolean).length;
  };

  // Agrupar plantillas por tipo de labor
  const plantillasPorTipo = plantillas.reduce((acc, plantilla) => {
    if (!acc[plantilla.tipoLabor]) {
      acc[plantilla.tipoLabor] = [];
    }
    acc[plantilla.tipoLabor].push(plantilla);
    return acc;
  }, {} as Record<string, PlantillaLabor[]>);

  const tiposLabor = ['Cosecha', 'Plateo', 'Poda', 'Fertilización', 'Sanidad', 'Otros'];
  const coloresTipo: Record<string, string> = {
    'Cosecha': 'bg-success/10 text-success border-success/30',
    'Plateo': 'bg-warning/10 text-warning border-warning/30',
    'Poda': 'bg-primary/10 text-primary border-primary/30',
    'Fertilización': 'bg-accent/10 text-accent border-accent/30',
    'Sanidad': 'bg-info/10 text-info border-info/30',
    'Otros': 'bg-muted text-muted-foreground border-muted-foreground/30',
  };

  return (
    <>
      {ConfirmDeleteDialog}

      {/* Modal de Creación/Edición */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {plantillaEdit ? 'Editar Plantilla' : 'Nueva Plantilla de Labor'}
            </DialogTitle>
            <DialogDescription>
              Define los campos que se registrarán para esta labor de palma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre de la Plantilla <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Cosecha Estándar"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoLabor">
                  Tipo de Labor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipoLabor}
                  onValueChange={(value: PlantillaLabor['tipoLabor']) =>
                    setFormData((prev) => ({ ...prev, tipoLabor: value }))
                  }
                >
                  <SelectTrigger id="tipoLabor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposLabor.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder="Descripción de la plantilla (opcional)"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Campos del Resumen</Label>
              <p className="text-sm text-muted-foreground">
                Selecciona los campos que aparecerán en el resumen (en este orden)
              </p>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="colaboradores"
                    checked={formData.campos.colaboradores}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        campos: { ...prev.campos, colaboradores: checked as boolean },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="colaboradores" className="cursor-pointer font-medium">
                      1. Colaboradores
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lote"
                    checked={formData.campos.lote}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        campos: { ...prev.campos, lote: checked as boolean },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="lote" className="cursor-pointer font-medium">
                      2. Lote
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="sublote"
                    checked={formData.campos.sublote}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        campos: { ...prev.campos, sublote: checked as boolean },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="sublote" className="cursor-pointer font-medium">
                      3. Sub Lote
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="gajos"
                    checked={formData.campos.gajos}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        campos: { ...prev.campos, gajos: checked as boolean },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="gajos" className="cursor-pointer font-medium">
                      4. Gajos
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="kilos"
                    checked={formData.campos.kilos}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        campos: { ...prev.campos, kilos: checked as boolean },
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="kilos" className="cursor-pointer font-medium">
                      5. Kilos
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar Plantilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizador */}
      <Dialog open={openVisualizador} onOpenChange={setOpenVisualizador}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Vista Previa de Plantilla
            </DialogTitle>
            <DialogDescription>
              {plantillaVer?.nombre}
            </DialogDescription>
          </DialogHeader>

          {plantillaVer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={coloresTipo[plantillaVer.tipoLabor]}>
                  {plantillaVer.tipoLabor}
                </Badge>
              </div>

              {plantillaVer.descripcion && (
                <p className="text-sm text-muted-foreground">{plantillaVer.descripcion}</p>
              )}

              <div className="space-y-2">
                <Label className="text-base">Campos del Resumen</Label>
                <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                  {plantillaVer.campos.colaboradores && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-success" />
                      <span>1. Colaboradores</span>
                    </div>
                  )}
                  {plantillaVer.campos.lote && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-success" />
                      <span>2. Lote</span>
                    </div>
                  )}
                  {plantillaVer.campos.sublote && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-success" />
                      <span>3. Sub Lote</span>
                    </div>
                  )}
                  {plantillaVer.campos.gajos && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-success" />
                      <span>4. Gajos</span>
                    </div>
                  )}
                  {plantillaVer.campos.kilos && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-success" />
                      <span>5. Kilos</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVisualizador(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estadísticas */}
      {plantillas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Plantillas</p>
                  <h3 className="text-2xl font-bold mt-1">{plantillas.length}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipos de Labor</p>
                  <h3 className="text-2xl font-bold mt-1">{Object.keys(plantillasPorTipo).length}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plantillas de Cosecha</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {plantillasPorTipo['Cosecha']?.length || 0}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla Principal */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Plantillas de Labores de Palma
              </CardTitle>
              <CardDescription>
                Configura plantillas para registrar cosecha, plateo, poda, fertilización, sanidad y otros trabajos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plantillas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay plantillas registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza creando tu primera plantilla de labor
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Plantilla
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Labor</TableHead>
                    <TableHead>Campos Activos</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...plantillas].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((plantilla) => (
                    <TableRow key={plantilla.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{plantilla.nombre}</TableCell>
                      <TableCell>
                        <Badge className={coloresTipo[plantilla.tipoLabor]}>
                          {plantilla.tipoLabor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{contarCamposActivos(plantilla.campos)}</span>
                          <span className="text-xs text-muted-foreground">/5 campos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {plantilla.descripcion || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerPlantilla(plantilla)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(plantilla)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(plantilla.id, plantilla.nombre)}
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
