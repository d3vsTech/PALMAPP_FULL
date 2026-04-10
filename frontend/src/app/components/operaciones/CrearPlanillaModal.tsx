import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar, CheckCircle, Plus, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent } from '../ui/card';

interface FilaCosecha {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  gajosReportados: number;
  gajosVolqueta: number;
}

interface FilaPlateo {
  id: string;
  colaboradorId: string;
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface FilaPoda {
  id: string;
  colaboradorId: string;
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface FilaFertilizacion {
  id: string;
  colaboradorId: string;
  lotes: string[];
  sublotes: string;
  palmas: number;
  tipoFertilizante: string;
  cantidadGramos: number;
}

interface FilaSanidad {
  id: string;
  colaboradorId: string;
  lotes: string[];
  sublotes: string;
  trabajoRealizado: string;
}

interface FilaAuxiliares {
  id: string;
  nombre: string;
  labor: string;
  lugar: string;
  total: number;
  horasExtra: number;
  tipo: 'FIJO' | 'JORNAL';
}

interface PlanillaData {
  fecha: string;
  // Trabajos Palma - Cosecha
  cosechas: FilaCosecha[];
  // Trabajos Palma - Otros
  plateos: FilaPlateo[];
  podas: FilaPoda[];
  fertilizaciones: FilaFertilizacion[];
  sanidades: FilaSanidad[];
  // Jornales
  valorJornal: number;
  // Trabajos Finca
  auxiliares: FilaAuxiliares[];
  // Campos Globales
  lluvia: number;
  inicioLabores: string;
  observaciones: string;
  ausentes: string[];
}

interface CrearPlanillaModalProps {
  isOpen: boolean;
  onClose: () => void;
  planilla?: PlanillaData;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string }>;
  lotes: Array<{ id: string; nombre: string }>;
  onSave: (planilla: PlanillaData) => void;
}

export function CrearPlanillaModal({
  isOpen,
  onClose,
  planilla,
  colaboradores,
  lotes,
  onSave,
}: CrearPlanillaModalProps) {
  const [formData, setFormData] = useState<PlanillaData>({
    fecha: new Date().toISOString().split('T')[0],
    cosechas: [],
    plateos: [],
    podas: [],
    fertilizaciones: [],
    sanidades: [],
    valorJornal: 86666,
    auxiliares: [],
    lluvia: 0,
    inicioLabores: '06:00',
    observaciones: '',
    ausentes: [],
  });

  useEffect(() => {
    if (planilla) {
      setFormData(planilla);
    } else {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        cosechas: [],
        plateos: [],
        podas: [],
        fertilizaciones: [],
        sanidades: [],
        valorJornal: 86666,
        auxiliares: [],
        lluvia: 0,
        inicioLabores: '06:00',
        observaciones: '',
        ausentes: [],
      });
    }
  }, [planilla, isOpen]);

  // COSECHA
  const agregarFilaCosecha = () => {
    setFormData((prev) => ({
      ...prev,
      cosechas: [
        ...prev.cosechas,
        {
          id: `cosecha-${Date.now()}`,
          colaboradores: [],
          lotes: [],
          sublotes: '',
          gajosReportados: 0,
          gajosVolqueta: 0,
        },
      ],
    }));
  };

  const eliminarFilaCosecha = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      cosechas: prev.cosechas.filter((c) => c.id !== id),
    }));
  };

  const actualizarCosecha = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      cosechas: prev.cosechas.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  // PLATEO
  const agregarFilaPlateo = () => {
    setFormData((prev) => ({
      ...prev,
      plateos: [
        ...prev.plateos,
        {
          id: `plateo-${Date.now()}`,
          colaboradorId: '',
          lotes: [],
          sublotes: '',
          numeroPalmas: 0,
        },
      ],
    }));
  };

  const eliminarFilaPlateo = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      plateos: prev.plateos.filter((p) => p.id !== id),
    }));
  };

  const actualizarPlateo = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      plateos: prev.plateos.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  // PODA
  const agregarFilaPoda = () => {
    setFormData((prev) => ({
      ...prev,
      podas: [
        ...prev.podas,
        {
          id: `poda-${Date.now()}`,
          colaboradorId: '',
          lotes: [],
          sublotes: '',
          numeroPalmas: 0,
        },
      ],
    }));
  };

  const eliminarFilaPoda = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      podas: prev.podas.filter((p) => p.id !== id),
    }));
  };

  const actualizarPoda = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      podas: prev.podas.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  // FERTILIZACIÓN
  const agregarFilaFertilizacion = () => {
    setFormData((prev) => ({
      ...prev,
      fertilizaciones: [
        ...prev.fertilizaciones,
        {
          id: `fertilizacion-${Date.now()}`,
          colaboradorId: '',
          lotes: [],
          sublotes: '',
          palmas: 0,
          tipoFertilizante: '',
          cantidadGramos: 0,
        },
      ],
    }));
  };

  const eliminarFilaFertilizacion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      fertilizaciones: prev.fertilizaciones.filter((f) => f.id !== id),
    }));
  };

  const actualizarFertilizacion = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      fertilizaciones: prev.fertilizaciones.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    }));
  };

  // SANIDAD
  const agregarFilaSanidad = () => {
    setFormData((prev) => ({
      ...prev,
      sanidades: [
        ...prev.sanidades,
        {
          id: `sanidad-${Date.now()}`,
          colaboradorId: '',
          lotes: [],
          sublotes: '',
          trabajoRealizado: '',
        },
      ],
    }));
  };

  const eliminarFilaSanidad = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      sanidades: prev.sanidades.filter((s) => s.id !== id),
    }));
  };

  const actualizarSanidad = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      sanidades: prev.sanidades.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  // AUXILIARES
  const agregarFilaAuxiliar = () => {
    setFormData((prev) => ({
      ...prev,
      auxiliares: [
        ...prev.auxiliares,
        {
          id: `auxiliar-${Date.now()}`,
          nombre: '',
          labor: '',
          lugar: '',
          total: 0,
          horasExtra: 0,
          tipo: 'JORNAL',
        },
      ],
    }));
  };

  const eliminarFilaAuxiliar = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      auxiliares: prev.auxiliares.filter((a) => a.id !== id),
    }));
  };

  const actualizarAuxiliar = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      auxiliares: prev.auxiliares.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleSave = () => {
    if (!formData.fecha) {
      alert('La fecha es obligatoria');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {planilla ? 'Editar Planilla Diaria' : 'Nueva Planilla Diaria'}
          </DialogTitle>
          <DialogDescription>
            Registro completo de operaciones del día
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-sm font-medium">
              Fecha <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fecha: e.target.value }))
              }
            />
          </div>

          <Tabs defaultValue="cosecha" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6 bg-muted/50">
              <TabsTrigger value="cosecha">Cosecha</TabsTrigger>
              <TabsTrigger value="plateo">Plateo</TabsTrigger>
              <TabsTrigger value="poda">Poda</TabsTrigger>
              <TabsTrigger value="fertilizacion">Fertilización</TabsTrigger>
              <TabsTrigger value="sanidad">Sanidad</TabsTrigger>
              <TabsTrigger value="finca">Finca</TabsTrigger>
            </TabsList>

            {/* TAB COSECHA */}
            <TabsContent value="cosecha" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cosecha</h3>
                <Button onClick={agregarFilaCosecha} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Fila
                </Button>
              </div>

              {formData.cosechas.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay filas de cosecha. Agrega una fila para comenzar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.cosechas.map((cosecha, index) => (
                    <Card key={cosecha.id} className="bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Fila {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarFilaCosecha(cosecha.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Colaboradores (múltiples) */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs">Colaboradores (hasta 3)</Label>
                            <div className="grid gap-2 md:grid-cols-3">
                              {[0, 1, 2].map((colIndex) => (
                                <Select
                                  key={colIndex}
                                  value={cosecha.colaboradores[colIndex] || ''}
                                  onValueChange={(value) => {
                                    const newColaboradores = [...cosecha.colaboradores];
                                    newColaboradores[colIndex] = value;
                                    actualizarCosecha(
                                      cosecha.id,
                                      'colaboradores',
                                      newColaboradores.filter((c) => c)
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Colaborador ${colIndex + 1}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Ninguno</SelectItem>
                                    {colaboradores.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.nombres} {c.apellidos}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ))}
                            </div>
                          </div>

                          {/* Lotes (checkboxes) */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs">Lotes</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {lotes.map((lote) => (
                                <div key={lote.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`cosecha-${cosecha.id}-lote-${lote.id}`}
                                    checked={cosecha.lotes.includes(lote.id)}
                                    onCheckedChange={(checked) => {
                                      const newLotes = checked
                                        ? [...cosecha.lotes, lote.id]
                                        : cosecha.lotes.filter((l) => l !== lote.id);
                                      actualizarCosecha(cosecha.id, 'lotes', newLotes);
                                    }}
                                  />
                                  <label
                                    htmlFor={`cosecha-${cosecha.id}-lote-${lote.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {lote.nombre}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sublotes */}
                          <div className="space-y-2">
                            <Label className="text-xs">Sublotes</Label>
                            <Input
                              placeholder="Ej: A, B, C"
                              value={cosecha.sublotes}
                              onChange={(e) =>
                                actualizarCosecha(cosecha.id, 'sublotes', e.target.value)
                              }
                            />
                          </div>

                          {/* Gajos Reportados */}
                          <div className="space-y-2">
                            <Label className="text-xs">Gajos Reportados</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={cosecha.gajosReportados || ''}
                              onChange={(e) =>
                                actualizarCosecha(
                                  cosecha.id,
                                  'gajosReportados',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Gajos Volqueta */}
                          <div className="space-y-2">
                            <Label className="text-xs">Gajos Volqueta</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={cosecha.gajosVolqueta || ''}
                              onChange={(e) =>
                                actualizarCosecha(
                                  cosecha.id,
                                  'gajosVolqueta',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB PLATEO */}
            <TabsContent value="plateo" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Plateo</h3>
                <Button onClick={agregarFilaPlateo} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Fila
                </Button>
              </div>

              {formData.plateos.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay filas de plateo. Agrega una fila para comenzar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Lotes</TableHead>
                        <TableHead>Sublotes</TableHead>
                        <TableHead>Nº Palmas</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.plateos.map((plateo) => (
                        <TableRow key={plateo.id}>
                          <TableCell>
                            <Select
                              value={plateo.colaboradorId}
                              onValueChange={(value) =>
                                actualizarPlateo(plateo.id, 'colaboradorId', value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {colaboradores.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombres} {c.apellidos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {lotes.map((lote) => (
                                <div key={lote.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`plateo-${plateo.id}-lote-${lote.id}`}
                                    checked={plateo.lotes.includes(lote.id)}
                                    onCheckedChange={(checked) => {
                                      const newLotes = checked
                                        ? [...plateo.lotes, lote.id]
                                        : plateo.lotes.filter((l) => l !== lote.id);
                                      actualizarPlateo(plateo.id, 'lotes', newLotes);
                                    }}
                                  />
                                  <label
                                    htmlFor={`plateo-${plateo.id}-lote-${lote.id}`}
                                    className="text-xs"
                                  >
                                    {lote.nombre}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="A, B, C"
                              value={plateo.sublotes}
                              onChange={(e) =>
                                actualizarPlateo(plateo.id, 'sublotes', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={plateo.numeroPalmas || ''}
                              onChange={(e) =>
                                actualizarPlateo(
                                  plateo.id,
                                  'numeroPalmas',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarFilaPlateo(plateo.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB PODA */}
            <TabsContent value="poda" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Poda</h3>
                <Button onClick={agregarFilaPoda} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Fila
                </Button>
              </div>

              {formData.podas.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay filas de poda. Agrega una fila para comenzar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Lotes</TableHead>
                        <TableHead>Sublotes</TableHead>
                        <TableHead>Nº Palmas</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.podas.map((poda) => (
                        <TableRow key={poda.id}>
                          <TableCell>
                            <Select
                              value={poda.colaboradorId}
                              onValueChange={(value) =>
                                actualizarPoda(poda.id, 'colaboradorId', value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {colaboradores.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombres} {c.apellidos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {lotes.map((lote) => (
                                <div key={lote.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`poda-${poda.id}-lote-${lote.id}`}
                                    checked={poda.lotes.includes(lote.id)}
                                    onCheckedChange={(checked) => {
                                      const newLotes = checked
                                        ? [...poda.lotes, lote.id]
                                        : poda.lotes.filter((l) => l !== lote.id);
                                      actualizarPoda(poda.id, 'lotes', newLotes);
                                    }}
                                  />
                                  <label
                                    htmlFor={`poda-${poda.id}-lote-${lote.id}`}
                                    className="text-xs"
                                  >
                                    {lote.nombre}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="A, B, C"
                              value={poda.sublotes}
                              onChange={(e) =>
                                actualizarPoda(poda.id, 'sublotes', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={poda.numeroPalmas || ''}
                              onChange={(e) =>
                                actualizarPoda(
                                  poda.id,
                                  'numeroPalmas',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarFilaPoda(poda.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB FERTILIZACIÓN */}
            <TabsContent value="fertilizacion" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fertilización</h3>
                <Button onClick={agregarFilaFertilizacion} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Fila
                </Button>
              </div>

              {formData.fertilizaciones.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay filas de fertilización. Agrega una fila para comenzar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.fertilizaciones.map((fert, index) => (
                    <Card key={fert.id} className="bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Fila {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarFilaFertilizacion(fert.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Colaborador */}
                          <div className="space-y-2">
                            <Label className="text-xs">Colaborador</Label>
                            <Select
                              value={fert.colaboradorId}
                              onValueChange={(value) =>
                                actualizarFertilizacion(fert.id, 'colaboradorId', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {colaboradores.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombres} {c.apellidos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Tipo Fertilizante */}
                          <div className="space-y-2">
                            <Label className="text-xs">Tipo de Fertilizante</Label>
                            <Select
                              value={fert.tipoFertilizante}
                              onValueChange={(value) =>
                                actualizarFertilizacion(fert.id, 'tipoFertilizante', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Urea">Urea</SelectItem>
                                <SelectItem value="NPK">NPK</SelectItem>
                                <SelectItem value="Potasio">Potasio</SelectItem>
                                <SelectItem value="Magnesio">Magnesio</SelectItem>
                                <SelectItem value="Boro">Boro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Lotes */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs">Lotes</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {lotes.map((lote) => (
                                <div key={lote.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`fert-${fert.id}-lote-${lote.id}`}
                                    checked={fert.lotes.includes(lote.id)}
                                    onCheckedChange={(checked) => {
                                      const newLotes = checked
                                        ? [...fert.lotes, lote.id]
                                        : fert.lotes.filter((l) => l !== lote.id);
                                      actualizarFertilizacion(fert.id, 'lotes', newLotes);
                                    }}
                                  />
                                  <label
                                    htmlFor={`fert-${fert.id}-lote-${lote.id}`}
                                    className="text-sm"
                                  >
                                    {lote.nombre}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sublotes */}
                          <div className="space-y-2">
                            <Label className="text-xs">Sublotes</Label>
                            <Input
                              placeholder="A, B, C"
                              value={fert.sublotes}
                              onChange={(e) =>
                                actualizarFertilizacion(fert.id, 'sublotes', e.target.value)
                              }
                            />
                          </div>

                          {/* Palmas */}
                          <div className="space-y-2">
                            <Label className="text-xs">Nº Palmas</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={fert.palmas || ''}
                              onChange={(e) =>
                                actualizarFertilizacion(
                                  fert.id,
                                  'palmas',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Cantidad Gramos */}
                          <div className="space-y-2">
                            <Label className="text-xs">Cantidad por Palma (gr)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={fert.cantidadGramos || ''}
                              onChange={(e) =>
                                actualizarFertilizacion(
                                  fert.id,
                                  'cantidadGramos',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Total Aplicado */}
                          {fert.palmas > 0 && fert.cantidadGramos > 0 && (
                            <div className="md:col-span-2">
                              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
                                <p className="text-sm text-muted-foreground">
                                  Total aplicado:{' '}
                                  <span className="font-bold text-primary">
                                    {(fert.palmas * fert.cantidadGramos).toLocaleString()} gr
                                  </span>{' '}
                                  ({((fert.palmas * fert.cantidadGramos) / 1000).toFixed(2)} kg)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB SANIDAD */}
            <TabsContent value="sanidad" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sanidad</h3>
                <Button onClick={agregarFilaSanidad} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Fila
                </Button>
              </div>

              {formData.sanidades.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay filas de sanidad. Agrega una fila para comenzar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.sanidades.map((sanidad, index) => (
                    <Card key={sanidad.id} className="bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Fila {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarFilaSanidad(sanidad.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Colaborador */}
                          <div className="space-y-2">
                            <Label className="text-xs">Colaborador</Label>
                            <Select
                              value={sanidad.colaboradorId}
                              onValueChange={(value) =>
                                actualizarSanidad(sanidad.id, 'colaboradorId', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {colaboradores.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombres} {c.apellidos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Trabajo Realizado */}
                          <div className="space-y-2">
                            <Label className="text-xs">Trabajo Realizado</Label>
                            <Input
                              placeholder="Control de plagas, fumigación, etc."
                              value={sanidad.trabajoRealizado}
                              onChange={(e) =>
                                actualizarSanidad(
                                  sanidad.id,
                                  'trabajoRealizado',
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {/* Lotes */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs">Lotes</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {lotes.map((lote) => (
                                <div key={lote.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`sanidad-${sanidad.id}-lote-${lote.id}`}
                                    checked={sanidad.lotes.includes(lote.id)}
                                    onCheckedChange={(checked) => {
                                      const newLotes = checked
                                        ? [...sanidad.lotes, lote.id]
                                        : sanidad.lotes.filter((l) => l !== lote.id);
                                      actualizarSanidad(sanidad.id, 'lotes', newLotes);
                                    }}
                                  />
                                  <label
                                    htmlFor={`sanidad-${sanidad.id}-lote-${lote.id}`}
                                    className="text-sm"
                                  >
                                    {lote.nombre}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sublotes */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs">Sublotes</Label>
                            <Input
                              placeholder="A, B, C"
                              value={sanidad.sublotes}
                              onChange={(e) =>
                                actualizarSanidad(sanidad.id, 'sublotes', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB FINCA (Auxiliares + Globales) */}
            <TabsContent value="finca" className="space-y-6">
              {/* Auxiliares */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Trabajos de Finca - Auxiliares</h3>
                  <Button onClick={agregarFilaAuxiliar} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Auxiliar
                  </Button>
                </div>

                {formData.auxiliares.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No hay auxiliares registrados.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Nombre</TableHead>
                          <TableHead>Labor</TableHead>
                          <TableHead>Lugar</TableHead>
                          <TableHead>Total (hrs)</TableHead>
                          <TableHead>Hrs Extra</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.auxiliares.map((aux) => (
                          <TableRow key={aux.id}>
                            <TableCell>
                              <Input
                                placeholder="Nombre"
                                value={aux.nombre}
                                onChange={(e) =>
                                  actualizarAuxiliar(aux.id, 'nombre', e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Labor"
                                value={aux.labor}
                                onChange={(e) =>
                                  actualizarAuxiliar(aux.id, 'labor', e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Lugar"
                                value={aux.lugar}
                                onChange={(e) =>
                                  actualizarAuxiliar(aux.id, 'lugar', e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="8"
                                value={aux.total || ''}
                                onChange={(e) =>
                                  actualizarAuxiliar(
                                    aux.id,
                                    'total',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="0"
                                value={aux.horasExtra || ''}
                                onChange={(e) =>
                                  actualizarAuxiliar(
                                    aux.id,
                                    'horasExtra',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={aux.tipo}
                                onValueChange={(value: 'FIJO' | 'JORNAL') =>
                                  actualizarAuxiliar(aux.id, 'tipo', value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="JORNAL">JORNAL</SelectItem>
                                  <SelectItem value="FIJO">FIJO</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarFilaAuxiliar(aux.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Jornales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Valor Jornal del Día</h3>
                <div className="space-y-2">
                  <Label>Valor Jornal (directamente palma)</Label>
                  <Input
                    type="number"
                    placeholder="86666"
                    value={formData.valorJornal || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        valorJornal: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                  {formData.valorJornal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${formData.valorJornal.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              </div>

              {/* Campos Globales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Campos Globales</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Lluvia */}
                  <div className="space-y-2">
                    <Label>Lluvia (mm)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.lluvia || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lluvia: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  {/* Inicio de Labores */}
                  <div className="space-y-2">
                    <Label>Inicio de Labores</Label>
                    <Input
                      type="time"
                      value={formData.inicioLabores}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          inicioLabores: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Ausentes */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Colaboradores Ausentes</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                      {colaboradores.map((colaborador) => (
                        <div key={colaborador.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ausente-${colaborador.id}`}
                            checked={formData.ausentes.includes(colaborador.id)}
                            onCheckedChange={(checked) => {
                              const newAusentes = checked
                                ? [...formData.ausentes, colaborador.id]
                                : formData.ausentes.filter((a) => a !== colaborador.id);
                              setFormData((prev) => ({ ...prev, ausentes: newAusentes }));
                            }}
                          />
                          <label
                            htmlFor={`ausente-${colaborador.id}`}
                            className="text-sm font-medium leading-none"
                          >
                            {colaborador.nombres} {colaborador.apellidos}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Observaciones del Día</Label>
                    <Textarea
                      placeholder="Novedades, eventos importantes del día..."
                      value={formData.observaciones}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          observaciones: e.target.value,
                        }))
                      }
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <CheckCircle className="mr-2 h-4 w-4" />
            Guardar Planilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
