import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type EmpresaTransporte = {
  id: string;
  nombre: string;
  nit: string;
  contacto: string;
};

type Conductor = {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  placa: string;
  empresaId: string;
};

export function TransporteTab() {
  const [empresas, setEmpresas] = useState<EmpresaTransporte[]>([
    { id: '1', nombre: 'Transportes del Valle S.A.S.', nit: '900.111.222-1', contacto: '+57 300 444 5555' },
    { id: '2', nombre: 'Logística Palmera', nit: '900.222.333-2', contacto: '+57 300 555 6666' }
  ]);

  const [conductores, setConductores] = useState<Conductor[]>([
    { id: '1', nombre: 'Carlos Martínez', cedula: '16.123.456', telefono: '+57 300 777 8888', placa: 'ABC-123', empresaId: '1' },
    { id: '2', nombre: 'Pedro González', cedula: '16.234.567', telefono: '+57 300 888 9999', placa: 'DEF-456', empresaId: '2' },
    { id: '3', nombre: 'Luis Rodríguez', cedula: '16.345.678', telefono: '+57 300 999 0000', placa: 'GHI-789', empresaId: '1' }
  ]);

  const [openModalEmpresa, setOpenModalEmpresa] = useState(false);
  const [openModalConductor, setOpenModalConductor] = useState(false);
  const [empresaEdit, setEmpresaEdit] = useState<EmpresaTransporte | null>(null);
  const [conductorEdit, setConductorEdit] = useState<Conductor | null>(null);

  const [formEmpresa, setFormEmpresa] = useState({
    nombre: '',
    nit: '',
    contacto: ''
  });

  const [formConductor, setFormConductor] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    placa: '',
    empresaId: ''
  });

  // Funciones para Empresas
  const handleOpenModalEmpresa = (empresa?: EmpresaTransporte) => {
    if (empresa) {
      setEmpresaEdit(empresa);
      setFormEmpresa({
        nombre: empresa.nombre,
        nit: empresa.nit,
        contacto: empresa.contacto
      });
    } else {
      setEmpresaEdit(null);
      setFormEmpresa({ nombre: '', nit: '', contacto: '' });
    }
    setOpenModalEmpresa(true);
  };

  const handleSaveEmpresa = () => {
    if (!formEmpresa.nombre.trim()) {
      toast.error('Ingresa el nombre de la empresa');
      return;
    }

    if (empresaEdit) {
      setEmpresas((prev) =>
        prev.map((e) =>
          e.id === empresaEdit.id ? { ...e, ...formEmpresa } : e
        )
      );
      toast.success('Empresa actualizada');
    } else {
      setEmpresas((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...formEmpresa
        },
      ]);
      toast.success('Empresa agregada correctamente');
    }

    setOpenModalEmpresa(false);
  };

  const eliminarEmpresa = (id: string) => {
    // Verificar si tiene conductores asociados
    const conductoresAsociados = conductores.filter(c => c.empresaId === id);
    if (conductoresAsociados.length > 0) {
      toast.error('No puedes eliminar una empresa con conductores asociados');
      return;
    }

    setEmpresas(empresas.filter(e => e.id !== id));
    toast.success('Empresa eliminada correctamente');
  };

  // Funciones para Conductores
  const handleOpenModalConductor = (conductor?: Conductor) => {
    if (empresas.length === 0) {
      toast.error('Primero debes crear al menos una empresa de transporte');
      return;
    }

    if (conductor) {
      setConductorEdit(conductor);
      setFormConductor({
        nombre: conductor.nombre,
        cedula: conductor.cedula,
        telefono: conductor.telefono,
        placa: conductor.placa,
        empresaId: conductor.empresaId
      });
    } else {
      setConductorEdit(null);
      setFormConductor({ nombre: '', cedula: '', telefono: '', placa: '', empresaId: '' });
    }
    setOpenModalConductor(true);
  };

  const handleSaveConductor = () => {
    if (!formConductor.nombre.trim()) {
      toast.error('Ingresa el nombre del conductor');
      return;
    }

    if (!formConductor.empresaId) {
      toast.error('Selecciona una empresa');
      return;
    }

    if (conductorEdit) {
      setConductores((prev) =>
        prev.map((c) =>
          c.id === conductorEdit.id ? { ...c, ...formConductor } : c
        )
      );
      toast.success('Conductor actualizado');
    } else {
      setConductores((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...formConductor
        },
      ]);
      toast.success('Conductor agregado correctamente');
    }

    setOpenModalConductor(false);
  };

  const eliminarConductor = (id: string) => {
    setConductores(conductores.filter(c => c.id !== id));
    toast.success('Conductor eliminado correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Modal Empresa */}
      <Dialog open={openModalEmpresa} onOpenChange={setOpenModalEmpresa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {empresaEdit ? 'Editar Empresa de Transporte' : 'Nueva Empresa de Transporte'}
            </DialogTitle>
            <DialogDescription>
              Compañía de transporte de carga
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-empresa">
                Nombre de la Empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre-empresa"
                placeholder="Ej: Transportes del Valle S.A.S."
                value={formEmpresa.nombre}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nit">NIT (Opcional)</Label>
              <Input
                id="nit"
                placeholder="900.111.222-1"
                value={formEmpresa.nit}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, nit: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto-empresa">Contacto (Opcional)</Label>
              <Input
                id="contacto-empresa"
                placeholder="+57 300 444 5555"
                value={formEmpresa.contacto}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, contacto: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalEmpresa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Conductor */}
      <Dialog open={openModalConductor} onOpenChange={setOpenModalConductor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conductorEdit ? 'Editar Conductor' : 'Nuevo Conductor'}
            </DialogTitle>
            <DialogDescription>
              Conductor y su vehículo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-conductor">
                Nombre Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre-conductor"
                placeholder="Ej: Carlos Martínez"
                value={formConductor.nombre}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresaId">
                Empresa de Transporte <span className="text-destructive">*</span>
              </Label>
              <Select value={formConductor.empresaId} onValueChange={(value) => setFormConductor((prev) => ({ ...prev, empresaId: value }))}>
                <SelectTrigger id="empresaId">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula (Opcional)</Label>
              <Input
                id="cedula"
                placeholder="16.123.456"
                value={formConductor.cedula}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, cedula: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono (Opcional)</Label>
              <Input
                id="telefono"
                placeholder="+57 300 777 8888"
                value={formConductor.telefono}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, telefono: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placa">Placa del Vehículo (Opcional)</Label>
              <Input
                id="placa"
                placeholder="ABC-123"
                value={formConductor.placa}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, placa: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalConductor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConductor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empresas de Transporte */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Empresas de Transporte</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Compañías de transporte de carga</p>
            </div>
            <Button onClick={() => handleOpenModalEmpresa()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {empresas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empresas de transporte registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{empresa.nombre}</p>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      {empresa.nit && <span>NIT: {empresa.nit}</span>}
                      {empresa.contacto && <span>Contacto: {empresa.contacto}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModalEmpresa(empresa)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarEmpresa(empresa.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conductores */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Conductores</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Conductores y sus vehículos</p>
            </div>
            <Button onClick={() => handleOpenModalConductor()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Conductor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {conductores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay conductores registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conductores.map((conductor) => {
                const empresa = empresas.find(e => e.id === conductor.empresaId);
                return (
                  <div
                    key={conductor.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{conductor.nombre}</p>
                        {empresa && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {empresa.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {conductor.cedula && <span>CC: {conductor.cedula}</span>}
                        {conductor.telefono && <span>Tel: {conductor.telefono}</span>}
                        {conductor.placa && <span>Placa: {conductor.placa}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModalConductor(conductor)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarConductor(conductor.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
