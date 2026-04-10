import { useState } from 'react';
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
import { Plus, Edit, Trash2, FileText, CheckCircle, X } from 'lucide-react';
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
import { Checkbox } from '../ui/checkbox';

type TipoConcepto = 'Deducción Legal' | 'Deducción Voluntaria' | 'Bonificación Fija' | 'Bonificación Variable';
type Operacion = 'SUMA' | 'RESTA';
type TipoCalculo = 'PORCENTAJE' | 'VALOR FIJO' | 'FÓRMULA';
type BaseCalculo = 'Total Devengado' | 'Salario Base' | 'SMMLV' | 'Manual';
type AplicaA = 'FIJO' | 'VARIABLE' | 'AMBOS';

interface ConceptoNomina {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  operacion: Operacion;
  calculo: TipoCalculo;
  valorReferencia: string;
  baseCalculo: BaseCalculo;
  aplicaA: AplicaA;
  obligatorio: boolean;
}

const conceptosData: ConceptoNomina[] = [
  {
    id: 'cn1',
    codigo: 'SALUD EMP',
    nombre: 'Salud Empleado',
    tipo: 'Deducción Legal',
    operacion: 'RESTA',
    calculo: 'PORCENTAJE',
    valorReferencia: '4%',
    baseCalculo: 'Total Devengado',
    aplicaA: 'AMBOS',
    obligatorio: true,
  },
  {
    id: 'cn2',
    codigo: 'PENSIÓN EMP',
    nombre: 'Pensión Empleado',
    tipo: 'Deducción Legal',
    operacion: 'RESTA',
    calculo: 'PORCENTAJE',
    valorReferencia: '4%',
    baseCalculo: 'Total Devengado',
    aplicaA: 'AMBOS',
    obligatorio: true,
  },
  {
    id: 'cn3',
    codigo: 'AUX TRANS',
    nombre: 'Auxilio de Transporte',
    tipo: 'Bonificación Fija',
    operacion: 'SUMA',
    calculo: 'VALOR FIJO',
    valorReferencia: '$200,000',
    baseCalculo: 'Manual',
    aplicaA: 'FIJO',
    obligatorio: false,
  },
];

export function ConceptosNominaTab() {
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>(conceptosData);
  const [openModal, setOpenModal] = useState(false);
  const [conceptoEdit, setConceptoEdit] = useState<ConceptoNomina | null>(null);
  const [formData, setFormData] = useState<ConceptoNomina>({
    id: '',
    codigo: '',
    nombre: '',
    tipo: 'Deducción Legal',
    operacion: 'RESTA',
    calculo: 'PORCENTAJE',
    valorReferencia: '',
    baseCalculo: 'Total Devengado',
    aplicaA: 'AMBOS',
    obligatorio: false,
  });

  const handleOpenModal = (concepto?: ConceptoNomina) => {
    if (concepto) {
      setConceptoEdit(concepto);
      setFormData(concepto);
    } else {
      setConceptoEdit(null);
      setFormData({
        id: '',
        codigo: '',
        nombre: '',
        tipo: 'Deducción Legal',
        operacion: 'RESTA',
        calculo: 'PORCENTAJE',
        valorReferencia: '',
        baseCalculo: 'Total Devengado',
        aplicaA: 'AMBOS',
        obligatorio: false,
      });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.codigo || !formData.nombre || !formData.valorReferencia) {
      alert('Código, nombre y valor de referencia son obligatorios');
      return;
    }

    if (conceptoEdit) {
      setConceptos((prev) =>
        prev.map((c) =>
          c.id === conceptoEdit.id ? { ...c, ...formData } : c
        )
      );
    } else {
      setConceptos((prev) => [
        ...prev,
        { ...formData, id: `cn${Date.now()}` },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este concepto?')) {
      setConceptos((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const getTipoColor = (tipo: TipoConcepto) => {
    switch (tipo) {
      case 'Deducción Legal':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'Deducción Voluntaria':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'Bonificación Fija':
        return 'bg-success/10 text-success border-success/30';
      case 'Bonificación Variable':
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {conceptoEdit ? 'Editar Concepto' : 'Nuevo Concepto de Nómina'}
            </DialogTitle>
            <DialogDescription>
              Define una deducción o bonificación para aplicar en la nómina
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codigo"
                  placeholder="SALUD EMP"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                  }
                  className="uppercase"
                />
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Salud Empleado"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: TipoConcepto) => {
                    setFormData((prev) => ({
                      ...prev,
                      tipo: value,
                      operacion: value.includes('Deducción') ? 'RESTA' : 'SUMA',
                    }));
                  }}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deducción Legal">Deducción Legal</SelectItem>
                    <SelectItem value="Deducción Voluntaria">Deducción Voluntaria</SelectItem>
                    <SelectItem value="Bonificación Fija">Bonificación Fija</SelectItem>
                    <SelectItem value="Bonificación Variable">Bonificación Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Operación */}
              <div className="space-y-2">
                <Label htmlFor="operacion">Operación</Label>
                <Select
                  value={formData.operacion}
                  onValueChange={(value: Operacion) =>
                    setFormData((prev) => ({ ...prev, operacion: value }))
                  }
                  disabled
                >
                  <SelectTrigger id="operacion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUMA">SUMA (+)</SelectItem>
                    <SelectItem value="RESTA">RESTA (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Cálculo */}
              <div className="space-y-2">
                <Label htmlFor="calculo">
                  Tipo de Cálculo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.calculo}
                  onValueChange={(value: TipoCalculo) =>
                    setFormData((prev) => ({ ...prev, calculo: value }))
                  }
                >
                  <SelectTrigger id="calculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">PORCENTAJE (%)</SelectItem>
                    <SelectItem value="VALOR FIJO">VALOR FIJO ($)</SelectItem>
                    <SelectItem value="FÓRMULA">FÓRMULA (personalizada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor Referencia */}
              <div className="space-y-2">
                <Label htmlFor="valorReferencia">
                  Valor Referencia <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valorReferencia"
                  placeholder={
                    formData.calculo === 'PORCENTAJE'
                      ? '4%'
                      : formData.calculo === 'VALOR FIJO'
                      ? '$200,000'
                      : 'salarioBase * 0.04'
                  }
                  value={formData.valorReferencia}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, valorReferencia: e.target.value }))
                  }
                />
              </div>

              {/* Base de Cálculo */}
              <div className="space-y-2">
                <Label htmlFor="baseCalculo">
                  Base de Cálculo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.baseCalculo}
                  onValueChange={(value: BaseCalculo) =>
                    setFormData((prev) => ({ ...prev, baseCalculo: value }))
                  }
                >
                  <SelectTrigger id="baseCalculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Total Devengado">Total Devengado</SelectItem>
                    <SelectItem value="Salario Base">Salario Base</SelectItem>
                    <SelectItem value="SMMLV">SMMLV</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Aplica A */}
              <div className="space-y-2">
                <Label htmlFor="aplicaA">
                  Aplica A <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.aplicaA}
                  onValueChange={(value: AplicaA) =>
                    setFormData((prev) => ({ ...prev, aplicaA: value }))
                  }
                >
                  <SelectTrigger id="aplicaA">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Empleados FIJO</SelectItem>
                    <SelectItem value="VARIABLE">Empleados VARIABLE</SelectItem>
                    <SelectItem value="AMBOS">AMBOS tipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Obligatorio */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="obligatorio"
                checked={formData.obligatorio}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, obligatorio: checked as boolean }))
                }
              />
              <label
                htmlFor="obligatorio"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Aplicar automáticamente (Obligatorio)
              </label>
            </div>

            {/* Preview */}
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <h4 className="text-sm font-semibold mb-3">Resumen del Concepto</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-semibold">{formData.codigo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge className={getTipoColor(formData.tipo)}>{formData.tipo}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Operación:</span>
                    <span className="font-semibold">
                      {formData.operacion === 'SUMA' ? '+' : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cálculo:</span>
                    <span className="font-semibold">
                      {formData.calculo} de {formData.valorReferencia}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base:</span>
                    <span className="font-semibold">{formData.baseCalculo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aplica a:</span>
                    <span className="font-semibold">{formData.aplicaA}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <FileText className="h-5 w-5 text-primary" />
                Conceptos de Nómina
              </CardTitle>
              <CardDescription>
                Deducciones y bonificaciones que se aplican en cada nómina
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Concepto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {conceptos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay conceptos registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primer concepto de nómina
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Concepto
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Op</TableHead>
                    <TableHead>Cálculo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Aplica A</TableHead>
                    <TableHead className="text-center">Auto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map((concepto) => (
                    <TableRow key={concepto.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">
                        {concepto.codigo}
                      </TableCell>
                      <TableCell className="font-medium">{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(concepto.tipo)}>
                          {concepto.tipo.split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-bold ${
                            concepto.operacion === 'SUMA' ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {concepto.operacion === 'SUMA' ? '+' : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {concepto.calculo}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{concepto.valorReferencia}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{concepto.aplicaA}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {concepto.obligatorio ? (
                          <CheckCircle className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(concepto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(concepto.id)}
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
