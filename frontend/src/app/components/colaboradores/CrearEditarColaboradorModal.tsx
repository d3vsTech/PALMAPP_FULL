import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Users, IdCard, Briefcase, Shield, Package, Building2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface Colaborador {
  id?: string;
  // Información Personal
  nombres: string;
  apellidos: string;
  // Identificación
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  // Contratación
  cargo: string;
  modalidadPago: string;
  salarioBase: number;
  // Seguridad Social
  eps: string;
  arl: string;
  fondoPension: string;
  // Dotación
  tallaCamisa: string;
  tallaPantalon: string;
  tallaCalzado: string;
  // Bancario
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
}

interface CrearEditarColaboradorModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador?: Colaborador;
  onSave: (colaborador: Colaborador) => void;
}

const tiposDocumento = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería (CE)',
  'Permiso por Protección Temporal (PPT)',
];

const modalidadesPago = ['Fijo', 'Producción'];

const tallaCamisas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallaPantalones = ['28', '30', '32', '34', '36', '38', '40', '42'];
const tallaCalzados = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const entidadesEPS = ['Sanitas', 'Compensar', 'Sura', 'Nueva EPS', 'Salud Total', 'Famisanar'];
const entidadesARL = ['Sura', 'Positiva', 'Axisura', 'Liberty'];
const entidadesPension = ['Porvenir', 'Protección', 'Colfondos', 'Old Mutual', 'Skandia'];

const bancos = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Banco Popular', 'Nequi', 'Daviplata'];
const tiposCuenta = ['Ahorros', 'Corriente'];

export function CrearEditarColaboradorModal({
  isOpen,
  onClose,
  colaborador,
  onSave,
}: CrearEditarColaboradorModalProps) {
  const [formData, setFormData] = useState<Colaborador>({
    nombres: '',
    apellidos: '',
    tipoDocumento: 'Cédula de Ciudadanía',
    numeroDocumento: '',
    fechaNacimiento: '',
    cargo: '',
    modalidadPago: 'Fijo',
    salarioBase: 0,
    eps: '',
    arl: '',
    fondoPension: '',
    tallaCamisa: '',
    tallaPantalon: '',
    tallaCalzado: '',
    banco: '',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '',
  });

  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (colaborador) {
      setFormData(colaborador);
    } else {
      setFormData({
        nombres: '',
        apellidos: '',
        tipoDocumento: 'Cédula de Ciudadanía',
        numeroDocumento: '',
        fechaNacimiento: '',
        cargo: '',
        modalidadPago: 'Fijo',
        salarioBase: 0,
        eps: '',
        arl: '',
        fondoPension: '',
        tallaCamisa: '',
        tallaPantalon: '',
        tallaCalzado: '',
        banco: '',
        tipoCuenta: 'Ahorros',
        numeroCuenta: '',
      });
    }
    setActiveTab('personal');
  }, [colaborador, isOpen]);

  const handleInputChange = (field: keyof Colaborador, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validaciones básicas
    if (!formData.nombres.trim()) {
      alert('El nombre es obligatorio');
      setActiveTab('personal');
      return;
    }
    if (!formData.apellidos.trim()) {
      alert('Los apellidos son obligatorios');
      setActiveTab('personal');
      return;
    }
    if (!formData.numeroDocumento.trim()) {
      alert('El número de documento es obligatorio');
      setActiveTab('identificacion');
      return;
    }
    if (!formData.cargo.trim()) {
      alert('El cargo es obligatorio');
      setActiveTab('contratacion');
      return;
    }
    if (!formData.salarioBase || formData.salarioBase <= 0) {
      alert('El salario base debe ser mayor a 0');
      setActiveTab('contratacion');
      return;
    }

    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-primary" />
            {colaborador ? 'Editar Colaborador' : 'Nuevo Colaborador'}
          </DialogTitle>
          <DialogDescription>
            {colaborador
              ? 'Modifica la información del colaborador'
              : 'Completa la ficha técnica del nuevo colaborador'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="identificacion" className="text-xs">
                <IdCard className="h-3 w-3 mr-1" />
                Identificación
              </TabsTrigger>
              <TabsTrigger value="contratacion" className="text-xs">
                <Briefcase className="h-3 w-3 mr-1" />
                Contratación
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="dotacion" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Dotación
              </TabsTrigger>
              <TabsTrigger value="bancario" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                Bancario
              </TabsTrigger>
            </TabsList>

            {/* 1. Información Personal */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombres" className="text-sm font-medium">
                    Nombres <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombres"
                    placeholder="Ej: Juan Carlos"
                    value={formData.nombres}
                    onChange={(e) => handleInputChange('nombres', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos" className="text-sm font-medium">
                    Apellidos <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apellidos"
                    placeholder="Ej: Rodríguez García"
                    value={formData.apellidos}
                    onChange={(e) => handleInputChange('apellidos', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* 2. Identificación */}
            <TabsContent value="identificacion" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento" className="text-sm font-medium">
                    Tipo de Documento <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.tipoDocumento}
                    onValueChange={(value) => handleInputChange('tipoDocumento', value)}
                  >
                    <SelectTrigger id="tipoDocumento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroDocumento" className="text-sm font-medium">
                    Número de Documento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="numeroDocumento"
                    placeholder="Ej: 1.234.567.890"
                    value={formData.numeroDocumento}
                    onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento" className="text-sm font-medium">
                    Fecha de Nacimiento
                  </Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* 3. Contratación */}
            <TabsContent value="contratacion" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo" className="text-sm font-medium">
                    Cargo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cargo"
                    placeholder="Ej: Operario de Campo"
                    value={formData.cargo}
                    onChange={(e) => handleInputChange('cargo', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modalidadPago" className="text-sm font-medium">
                    Modalidad de Pago <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.modalidadPago}
                    onValueChange={(value) => handleInputChange('modalidadPago', value)}
                  >
                    <SelectTrigger id="modalidadPago">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modalidadesPago.map((modalidad) => (
                        <SelectItem key={modalidad} value={modalidad}>
                          {modalidad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salarioBase" className="text-sm font-medium">
                    Salario Base <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="salarioBase"
                    type="number"
                    placeholder="1300000"
                    value={formData.salarioBase || ''}
                    onChange={(e) => handleInputChange('salarioBase', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* 4. Seguridad Social */}
            <TabsContent value="seguridad" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eps" className="text-sm font-medium">
                    EPS
                  </Label>
                  <Select
                    value={formData.eps}
                    onValueChange={(value) => handleInputChange('eps', value)}
                  >
                    <SelectTrigger id="eps">
                      <SelectValue placeholder="Selecciona una EPS" />
                    </SelectTrigger>
                    <SelectContent>
                      {entidadesEPS.map((eps) => (
                        <SelectItem key={eps} value={eps}>
                          {eps}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arl" className="text-sm font-medium">
                    ARL
                  </Label>
                  <Select
                    value={formData.arl}
                    onValueChange={(value) => handleInputChange('arl', value)}
                  >
                    <SelectTrigger id="arl">
                      <SelectValue placeholder="Selecciona una ARL" />
                    </SelectTrigger>
                    <SelectContent>
                      {entidadesARL.map((arl) => (
                        <SelectItem key={arl} value={arl}>
                          {arl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fondoPension" className="text-sm font-medium">
                    Fondo de Pensión
                  </Label>
                  <Select
                    value={formData.fondoPension}
                    onValueChange={(value) => handleInputChange('fondoPension', value)}
                  >
                    <SelectTrigger id="fondoPension">
                      <SelectValue placeholder="Selecciona un fondo" />
                    </SelectTrigger>
                    <SelectContent>
                      {entidadesPension.map((fondo) => (
                        <SelectItem key={fondo} value={fondo}>
                          {fondo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* 5. Dotación */}
            <TabsContent value="dotacion" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tallaCamisa" className="text-sm font-medium">
                    Talla Camisa
                  </Label>
                  <Select
                    value={formData.tallaCamisa}
                    onValueChange={(value) => handleInputChange('tallaCamisa', value)}
                  >
                    <SelectTrigger id="tallaCamisa">
                      <SelectValue placeholder="Selecciona talla" />
                    </SelectTrigger>
                    <SelectContent>
                      {tallaCamisas.map((talla) => (
                        <SelectItem key={talla} value={talla}>
                          {talla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tallaPantalon" className="text-sm font-medium">
                    Talla Pantalón
                  </Label>
                  <Select
                    value={formData.tallaPantalon}
                    onValueChange={(value) => handleInputChange('tallaPantalon', value)}
                  >
                    <SelectTrigger id="tallaPantalon">
                      <SelectValue placeholder="Selecciona talla" />
                    </SelectTrigger>
                    <SelectContent>
                      {tallaPantalones.map((talla) => (
                        <SelectItem key={talla} value={talla}>
                          {talla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tallaCalzado" className="text-sm font-medium">
                    Talla Calzado
                  </Label>
                  <Select
                    value={formData.tallaCalzado}
                    onValueChange={(value) => handleInputChange('tallaCalzado', value)}
                  >
                    <SelectTrigger id="tallaCalzado">
                      <SelectValue placeholder="Selecciona talla" />
                    </SelectTrigger>
                    <SelectContent>
                      {tallaCalzados.map((talla) => (
                        <SelectItem key={talla} value={talla}>
                          {talla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* 6. Bancario */}
            <TabsContent value="bancario" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="banco" className="text-sm font-medium">
                    Banco
                  </Label>
                  <Select
                    value={formData.banco}
                    onValueChange={(value) => handleInputChange('banco', value)}
                  >
                    <SelectTrigger id="banco">
                      <SelectValue placeholder="Selecciona un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco} value={banco}>
                          {banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoCuenta" className="text-sm font-medium">
                    Tipo de Cuenta
                  </Label>
                  <Select
                    value={formData.tipoCuenta}
                    onValueChange={(value) => handleInputChange('tipoCuenta', value)}
                  >
                    <SelectTrigger id="tipoCuenta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCuenta.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroCuenta" className="text-sm font-medium">
                    Número de Cuenta
                  </Label>
                  <Input
                    id="numeroCuenta"
                    placeholder="Ej: 123-456-789"
                    value={formData.numeroCuenta}
                    onChange={(e) => handleInputChange('numeroCuenta', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {colaborador ? 'Guardar Cambios' : 'Crear Colaborador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
