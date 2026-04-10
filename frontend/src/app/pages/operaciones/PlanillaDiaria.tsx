import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Plus, 
  Trash2,
  Leaf,
  Scissors,
  Droplets,
  Shield,
  Wrench,
  CloudRain,
  Clock,
  FileText
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { colaboradores, lotes as lotesData } from '../../lib/mockData';

// Tipos de fertilizantes
const fertilizantes = [
  'NPK 15-15-15',
  'Urea',
  'KCl (Cloruro de Potasio)',
  'Sulfato de Magnesio',
  'Boro',
  'Otro'
];

// Tipos de labor para auxiliares
const laboresAuxiliares = [
  'Mantenimiento de vías',
  'Limpieza de instalaciones',
  'Reparación de cercas',
  'Mantenimiento de equipos',
  'Transporte',
  'Otro'
];

interface TrabajoCosecha {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  gajosReportados: number;
  gajosVolqueta: number;
}

interface TrabajoPlateo {
  id: string;
  colaborador: string;
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface TrabajoPoda {
  id: string;
  colaborador: string;
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface TrabajoFertilizacion {
  id: string;
  colaborador: string;
  lotes: string[];
  sublotes: string;
  palmas: number;
  tipoFertilizante: string;
  cantidadGramos: number;
}

interface TrabajoSanidad {
  id: string;
  colaborador: string;
  lotes: string[];
  sublotes: string;
  trabajoRealizado: string;
}

interface TrabajoAuxiliar {
  id: string;
  nombre: string;
  labor: string;
  lugar: string;
  total: number;
  horasExtra: number;
  tipoJornada: 'FIJO' | 'JORNAL';
}

export default function PlanillaDiaria() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNueva = id === 'nueva';

  const [estado, setEstado] = useState<'BORRADOR' | 'APROBADO'>('BORRADOR');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  // Campos globales
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('06:00');
  const [observaciones, setObservaciones] = useState('');
  const [ausentes, setAusentes] = useState('');
  
  // Estados de trabajos
  const [trabajosCosecha, setTrabajosCosecha] = useState<TrabajoCosecha[]>([]);
  const [trabajosPlateo, setTrabajosPlateo] = useState<TrabajoPlateo[]>([]);
  const [trabajosPoda, setTrabajosPoda] = useState<TrabajoPoda[]>([]);
  const [trabajosFertilizacion, setTrabajosFertilizacion] = useState<TrabajoFertilizacion[]>([]);
  const [trabajosSanidad, setTrabajosSanidad] = useState<TrabajoSanidad[]>([]);
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);

  // Agregar nueva fila de cosecha
  const agregarCosecha = () => {
    setTrabajosCosecha([...trabajosCosecha, {
      id: `cosecha-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: '',
      gajosReportados: 0,
      gajosVolqueta: 0
    }]);
  };

  const agregarPlateo = () => {
    setTrabajosPlateo([...trabajosPlateo, {
      id: `plateo-${Date.now()}`,
      colaborador: '',
      lotes: [],
      sublotes: '',
      numeroPalmas: 0
    }]);
  };

  const agregarPoda = () => {
    setTrabajosPoda([...trabajosPoda, {
      id: `poda-${Date.now()}`,
      colaborador: '',
      lotes: [],
      sublotes: '',
      numeroPalmas: 0
    }]);
  };

  const agregarFertilizacion = () => {
    setTrabajosFertilizacion([...trabajosFertilizacion, {
      id: `fertilizacion-${Date.now()}`,
      colaborador: '',
      lotes: [],
      sublotes: '',
      palmas: 0,
      tipoFertilizante: '',
      cantidadGramos: 0
    }]);
  };

  const agregarSanidad = () => {
    setTrabajosSanidad([...trabajosSanidad, {
      id: `sanidad-${Date.now()}`,
      colaborador: '',
      lotes: [],
      sublotes: '',
      trabajoRealizado: ''
    }]);
  };

  const agregarAuxiliar = () => {
    setTrabajosAuxiliares([...trabajosAuxiliares, {
      id: `auxiliar-${Date.now()}`,
      nombre: '',
      labor: '',
      lugar: '',
      total: 0,
      horasExtra: 0,
      tipoJornada: 'FIJO'
    }]);
  };

  // Eliminar trabajos
  const eliminarCosecha = (id: string) => {
    setTrabajosCosecha(trabajosCosecha.filter(t => t.id !== id));
  };

  const eliminarPlateo = (id: string) => {
    setTrabajosPlateo(trabajosPlateo.filter(t => t.id !== id));
  };

  const eliminarPoda = (id: string) => {
    setTrabajosPoda(trabajosPoda.filter(t => t.id !== id));
  };

  const eliminarFertilizacion = (id: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.filter(t => t.id !== id));
  };

  const eliminarSanidad = (id: string) => {
    setTrabajosSanidad(trabajosSanidad.filter(t => t.id !== id));
  };

  const eliminarAuxiliar = (id: string) => {
    setTrabajosAuxiliares(trabajosAuxiliares.filter(t => t.id !== id));
  };

  const handleGuardarBorrador = () => {
    console.log('Guardando borrador...');
    navigate('/operaciones');
  };

  const handleAprobarPlanilla = () => {
    setEstado('APROBADO');
    console.log('Aprobando planilla...');
    setTimeout(() => {
      navigate('/operaciones');
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/operaciones')}
            className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              {isNueva ? 'Nueva Planilla Diaria' : 'Planilla Diaria'}
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant={estado === 'APROBADO' ? 'default' : 'secondary'} className={estado === 'APROBADO' ? 'bg-success' : 'bg-amber-500'}>
                {estado}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(fecha).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleGuardarBorrador}
            className="gap-2"
            disabled={estado === 'APROBADO'}
          >
            <Save className="h-4 w-4" />
            Guardar Borrador
          </Button>
          {estado === 'BORRADOR' && (
            <Button
              onClick={handleAprobarPlanilla}
              className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
            >
              <CheckCircle className="h-4 w-4" />
              Aprobar Planilla
            </Button>
          )}
        </div>
      </div>

      {/* Campos Globales */}
      <Card className="glass-subtle border-border shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos generales de la jornada</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fecha" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Fecha
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={estado === 'APROBADO'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lluvia" className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-muted-foreground" />
                Lluvia (mm)
              </Label>
              <Input
                id="lluvia"
                type="number"
                placeholder="Ej: 15"
                value={lluvia}
                onChange={(e) => setLluvia(e.target.value)}
                disabled={estado === 'APROBADO'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inicioLabores" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Inicio de Labores
              </Label>
              <Input
                id="inicioLabores"
                type="time"
                value={inicioLabores}
                onChange={(e) => setInicioLabores(e.target.value)}
                disabled={estado === 'APROBADO'}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas o comentarios sobre la jornada..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                disabled={estado === 'APROBADO'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ausentes">Ausentes</Label>
              <Textarea
                id="ausentes"
                placeholder="Colaboradores ausentes hoy..."
                value={ausentes}
                onChange={(e) => setAusentes(e.target.value)}
                rows={3}
                disabled={estado === 'APROBADO'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion de Trabajos */}
      <Accordion type="multiple" className="space-y-4" defaultValue={['cosecha', 'plateo', 'poda', 'fertilizacion', 'sanidad', 'auxiliares']}>
        
        {/* COSECHA */}
        <AccordionItem value="cosecha" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-success/20 to-success/10 border border-success/20">
                <Leaf className="h-5 w-5 text-success" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Cosecha</h3>
                <p className="text-sm text-muted-foreground">{trabajosCosecha.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosCosecha.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarCosecha(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colaboradores</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar colaboradores" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.filter(c => c.estado === 'Activo').map(col => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.nombres} {col.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Puede seleccionar múltiples</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Lotes</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {lotesData.map(lote => (
                            <div key={lote.id} className="flex items-center space-x-2">
                              <Checkbox id={`cosecha-lote-${trabajo.id}-${lote.id}`} disabled={estado === 'APROBADO'} />
                              <label
                                htmlFor={`cosecha-lote-${trabajo.id}-${lote.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {lote.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Sublotes</Label>
                        <Input placeholder="Ej: SL1, SL2" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Gajos Reportados</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Gajos Volqueta</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarCosecha}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Registro de Cosecha
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* PLATEO */}
        <AccordionItem value="plateo" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-tierra/20 to-tierra/10 border border-tierra/20">
                <Wrench className="h-5 w-5 text-tierra" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Plateo</h3>
                <p className="text-sm text-muted-foreground">{trabajosPlateo.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosPlateo.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarPlateo(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colaborador</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.filter(c => c.estado === 'Activo').map(col => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.nombres} {col.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lotes</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {lotesData.map(lote => (
                            <div key={lote.id} className="flex items-center space-x-2">
                              <Checkbox id={`plateo-lote-${trabajo.id}-${lote.id}`} disabled={estado === 'APROBADO'} />
                              <label
                                htmlFor={`plateo-lote-${trabajo.id}-${lote.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {lote.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Sublotes</Label>
                        <Input placeholder="Ej: SL1, SL2" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Número de Palmas</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarPlateo}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Registro de Plateo
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* PODA */}
        <AccordionItem value="poda" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/20">
                <Scissors className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Poda</h3>
                <p className="text-sm text-muted-foreground">{trabajosPoda.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosPoda.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarPoda(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colaborador</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.filter(c => c.estado === 'Activo').map(col => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.nombres} {col.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lotes</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {lotesData.map(lote => (
                            <div key={lote.id} className="flex items-center space-x-2">
                              <Checkbox id={`poda-lote-${trabajo.id}-${lote.id}`} disabled={estado === 'APROBADO'} />
                              <label
                                htmlFor={`poda-lote-${trabajo.id}-${lote.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {lote.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Sublotes</Label>
                        <Input placeholder="Ej: SL1, SL2" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Número de Palmas</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarPoda}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Registro de Poda
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* FERTILIZACIÓN */}
        <AccordionItem value="fertilizacion" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Droplets className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Fertilización</h3>
                <p className="text-sm text-muted-foreground">{trabajosFertilizacion.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosFertilizacion.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarFertilizacion(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colaborador</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.filter(c => c.estado === 'Activo').map(col => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.nombres} {col.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lotes</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {lotesData.map(lote => (
                            <div key={lote.id} className="flex items-center space-x-2">
                              <Checkbox id={`fertilizacion-lote-${trabajo.id}-${lote.id}`} disabled={estado === 'APROBADO'} />
                              <label
                                htmlFor={`fertilizacion-lote-${trabajo.id}-${lote.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {lote.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Sublotes</Label>
                        <Input placeholder="Ej: SL1, SL2" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Palmas</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Fertilizante</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {fertilizantes.map(fert => (
                              <SelectItem key={fert} value={fert}>
                                {fert}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cantidad (gramos) por Palma</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarFertilizacion}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Registro de Fertilización
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SANIDAD */}
        <AccordionItem value="sanidad" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-success/20 to-success/10 border border-success/20">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Sanidad</h3>
                <p className="text-sm text-muted-foreground">{trabajosSanidad.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosSanidad.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarSanidad(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colaborador</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.filter(c => c.estado === 'Activo').map(col => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.nombres} {col.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lotes</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {lotesData.map(lote => (
                            <div key={lote.id} className="flex items-center space-x-2">
                              <Checkbox id={`sanidad-lote-${trabajo.id}-${lote.id}`} disabled={estado === 'APROBADO'} />
                              <label
                                htmlFor={`sanidad-lote-${trabajo.id}-${lote.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {lote.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Sublotes</Label>
                        <Input placeholder="Ej: SL1, SL2" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Trabajo Realizado</Label>
                        <Textarea
                          placeholder="Describe el trabajo de sanidad realizado..."
                          rows={2}
                          disabled={estado === 'APROBADO'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarSanidad}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Registro de Sanidad
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* AUXILIARES (Trabajos Finca) */}
        <AccordionItem value="auxiliares" className="glass-subtle border-border shadow-lg rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-tierra/20 to-tierra/10 border border-tierra/20">
                <Wrench className="h-5 w-5 text-tierra" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Trabajos Finca - Auxiliares</h3>
                <p className="text-sm text-muted-foreground">{trabajosAuxiliares.length} registros</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {trabajosAuxiliares.map((trabajo, index) => (
                <Card key={trabajo.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Registro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarAuxiliar(trabajo.id)}
                        disabled={estado === 'APROBADO'}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input placeholder="Nombre del trabajador" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Labor</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar labor" />
                          </SelectTrigger>
                          <SelectContent>
                            {laboresAuxiliares.map(labor => (
                              <SelectItem key={labor} value={labor}>
                                {labor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lugar</Label>
                        <Input placeholder="Ubicación del trabajo" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Total</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Horas Extra</Label>
                        <Input type="number" placeholder="0" disabled={estado === 'APROBADO'} />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Jornada</Label>
                        <Select disabled={estado === 'APROBADO'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIJO">FIJO</SelectItem>
                            <SelectItem value="JORNAL">JORNAL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={agregarAuxiliar}
                className="w-full gap-2"
                disabled={estado === 'APROBADO'}
              >
                <Plus className="h-4 w-4" />
                Agregar Trabajo Auxiliar
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Botones finales */}
      <div className="flex gap-3 justify-end pb-8">
        <Button
          variant="outline"
          onClick={() => navigate('/operaciones')}
          className="min-w-32"
        >
          Cancelar
        </Button>
        <Button
          variant="outline"
          onClick={handleGuardarBorrador}
          className="min-w-32 gap-2"
          disabled={estado === 'APROBADO'}
        >
          <Save className="h-4 w-4" />
          Guardar Borrador
        </Button>
        {estado === 'BORRADOR' && (
          <Button
            onClick={handleAprobarPlanilla}
            className="min-w-32 gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
          >
            <CheckCircle className="h-4 w-4" />
            Aprobar Planilla
          </Button>
        )}
      </div>
    </div>
  );
}