import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Plus, Trash2, Edit, Building2, User, Loader2 } from 'lucide-react';
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
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import {
  empresasTransportadorasApi,
  transportadoresApi,
  type EmpresaTransportadora,
  type Transportador,
} from '../../../api/viajes';

type EmpresaConContador = EmpresaTransportadora & { transportadores_count?: number };

const FORM_EMPRESA_VACIO = {
  tipo_persona: 'JURIDICA' as 'JURIDICA' | 'NATURAL',
  razon_social: '',
  nit: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  email: '',
  contacto_nombre: '',
  observaciones: '',
};

const FORM_CONDUCTOR_VACIO = {
  empresa_transportadora_id: '',
  nombre: '',
  tipo_documento: 'CC' as 'CC' | 'CE' | 'PPT' | 'PASAPORTE',
  numero_documento: '',
  telefono: '',
  placa_vehiculo: '',
  tipo_vehiculo: '',
  capacidad_kg: '',
  licencia_conduccion: '',
  licencia_vencimiento: '',
  observaciones: '',
};

const TIPOS_DOCUMENTO: Array<'CC' | 'CE' | 'PPT' | 'PASAPORTE'> = ['CC', 'CE', 'PPT', 'PASAPORTE'];

export function TransporteTab() {
  const [empresas, setEmpresas] = useState<EmpresaConContador[]>([]);
  const [conductores, setConductores] = useState<Transportador[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [cargandoConductores, setCargandoConductores] = useState(true);

  const [openModalEmpresa, setOpenModalEmpresa] = useState(false);
  const [openModalConductor, setOpenModalConductor] = useState(false);
  const [empresaEdit, setEmpresaEdit] = useState<EmpresaTransportadora | null>(null);
  const [conductorEdit, setConductorEdit] = useState<Transportador | null>(null);
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);
  const [guardandoConductor, setGuardandoConductor] = useState(false);

  const [empresaAEliminar, setEmpresaAEliminar] = useState<EmpresaTransportadora | null>(null);
  const [conductorAEliminar, setConductorAEliminar] = useState<Transportador | null>(null);

  const [formEmpresa, setFormEmpresa] = useState(FORM_EMPRESA_VACIO);
  const [formConductor, setFormConductor] = useState(FORM_CONDUCTOR_VACIO);

  const cargarEmpresas = () => {
    setCargandoEmpresas(true);
    empresasTransportadorasApi
      .listar({ per_page: 100, with_transportadores_count: true })
      .then((res) => setEmpresas(res.data as EmpresaConContador[]))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las empresas'))
      .finally(() => setCargandoEmpresas(false));
  };

  const cargarConductores = () => {
    setCargandoConductores(true);
    transportadoresApi
      .listar({ per_page: 100 })
      .then((res) => setConductores(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los conductores'))
      .finally(() => setCargandoConductores(false));
  };

  useEffect(() => {
    cargarEmpresas();
    cargarConductores();
  }, []);

  // ── Empresas ────────────────────────────────────────────────────────────
  const handleOpenModalEmpresa = (empresa?: EmpresaTransportadora) => {
    if (empresa) {
      setEmpresaEdit(empresa);
      setFormEmpresa({
        tipo_persona: (empresa as any).tipo_persona ?? 'JURIDICA',
        razon_social: empresa.razon_social ?? '',
        nit: empresa.nit ?? '',
        telefono: empresa.telefono ?? '',
        direccion: empresa.direccion ?? '',
        ciudad: empresa.ciudad ?? '',
        email: empresa.email ?? '',
        contacto_nombre: empresa.contacto_nombre ?? '',
        observaciones: empresa.observaciones ?? '',
      });
    } else {
      setEmpresaEdit(null);
      setFormEmpresa(FORM_EMPRESA_VACIO);
    }
    setOpenModalEmpresa(true);
  };

  const handleSaveEmpresa = async () => {
    if (!formEmpresa.razon_social.trim()) {
      toast.error('Ingresa la razón social de la empresa');
      return;
    }
    if (!formEmpresa.nit.trim()) {
      toast.error('Ingresa el NIT de la empresa');
      return;
    }

    setGuardandoEmpresa(true);
    try {
      const payload: Partial<EmpresaTransportadora> & { tipo_persona?: string } = {
        tipo_persona: formEmpresa.tipo_persona,
        razon_social: formEmpresa.razon_social.trim(),
        nit: formEmpresa.nit.trim(),
        telefono: formEmpresa.telefono.trim() || null,
        direccion: formEmpresa.direccion.trim() || null,
        ciudad: formEmpresa.ciudad.trim() || null,
        email: formEmpresa.email.trim() || null,
        contacto_nombre: formEmpresa.contacto_nombre.trim() || null,
        observaciones: formEmpresa.observaciones.trim() || null,
      };

      if (empresaEdit) {
        await empresasTransportadorasApi.editar(empresaEdit.id, payload);
        toast.success('Empresa actualizada');
      } else {
        await empresasTransportadorasApi.crear(payload);
        toast.success('Empresa agregada correctamente');
      }
      setOpenModalEmpresa(false);
      cargarEmpresas();
    } catch (e: any) {
      if (e?.errors?.nit) {
        toast.error(e.errors.nit[0] ?? 'Ya existe una empresa con este NIT');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('nit')) {
        toast.error('Ya existe una empresa con este NIT');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la empresa');
      }
    } finally {
      setGuardandoEmpresa(false);
    }
  };

  const handleDeleteEmpresa = async () => {
    if (!empresaAEliminar) return;
    try {
      await empresasTransportadorasApi.eliminar(empresaAEliminar.id);
      toast.success('Empresa eliminada correctamente');
      cargarEmpresas();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar la empresa');
    } finally {
      setEmpresaAEliminar(null);
    }
  };

  const handleToggleEstadoEmpresa = async (empresa: EmpresaTransportadora) => {
    try {
      await empresasTransportadorasApi.editar(empresa.id, { estado: !empresa.estado });
      setEmpresas((prev) =>
        prev.map((e) => (e.id === empresa.id ? { ...e, estado: !empresa.estado } : e)),
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  // ── Conductores ───────────────────────────────────────────────────────────
  const handleOpenModalConductor = (conductor?: Transportador) => {
    if (empresas.length === 0) {
      toast.error('Primero debes crear al menos una empresa de transporte');
      return;
    }

    if (conductor) {
      setConductorEdit(conductor);
      setFormConductor({
        empresa_transportadora_id: String(conductor.empresa_transportadora_id),
        nombre: `${conductor.nombres ?? ''} ${conductor.apellidos ?? ''}`.trim(),
        tipo_documento: conductor.tipo_documento ?? 'CC',
        numero_documento: conductor.numero_documento ?? '',
        telefono: conductor.telefono ?? '',
        placa_vehiculo: conductor.placa_vehiculo ?? '',
        tipo_vehiculo: conductor.tipo_vehiculo ?? '',
        capacidad_kg: conductor.capacidad_kg != null ? String(conductor.capacidad_kg) : '',
        licencia_conduccion: conductor.licencia_conduccion ?? '',
        licencia_vencimiento: conductor.licencia_vencimiento ?? '',
        observaciones: conductor.observaciones ?? '',
      });
    } else {
      setConductorEdit(null);
      setFormConductor(FORM_CONDUCTOR_VACIO);
    }
    setOpenModalConductor(true);
  };

  const handleSaveConductor = async () => {
    if (!formConductor.nombre.trim()) {
      toast.error('Ingresa el nombre del conductor');
      return;
    }
    if (!formConductor.empresa_transportadora_id) {
      toast.error('Selecciona una empresa');
      return;
    }
    if (!formConductor.placa_vehiculo.trim()) {
      toast.error('Ingresa la placa del vehículo');
      return;
    }

    // Split del nombre completo: primera palabra = nombres, resto = apellidos.
    const partes = formConductor.nombre.trim().split(/\s+/);
    const nombres = partes[0];
    const apellidos = partes.slice(1).join(' ');

    setGuardandoConductor(true);
    try {
      const payload: Partial<Transportador> = {
        empresa_transportadora_id: Number(formConductor.empresa_transportadora_id),
        nombres,
        apellidos,
        placa_vehiculo: formConductor.placa_vehiculo.trim(),
        tipo_documento: formConductor.tipo_documento,
        numero_documento: formConductor.numero_documento.trim() || null,
        telefono: formConductor.telefono.trim() || null,
        tipo_vehiculo: formConductor.tipo_vehiculo.trim() || null,
        capacidad_kg: formConductor.capacidad_kg.trim() ? Number(formConductor.capacidad_kg) : null,
        licencia_conduccion: formConductor.licencia_conduccion.trim() || null,
        licencia_vencimiento: formConductor.licencia_vencimiento.trim() || null,
        observaciones: formConductor.observaciones.trim() || null,
      };

      if (conductorEdit) {
        await transportadoresApi.editar(conductorEdit.id, payload);
        toast.success('Conductor actualizado');
      } else {
        await transportadoresApi.crear(payload);
        toast.success('Conductor agregado correctamente');
      }
      setOpenModalConductor(false);
      cargarConductores();
      cargarEmpresas();
    } catch (e: any) {
      if (e?.errors?.placa_vehiculo) {
        toast.error(e.errors.placa_vehiculo[0] ?? 'Ya existe un conductor con esta placa');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('placa')) {
        toast.error('Ya existe un conductor con esta placa');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el conductor');
      }
    } finally {
      setGuardandoConductor(false);
    }
  };

  const handleDeleteConductor = async () => {
    if (!conductorAEliminar) return;
    try {
      await transportadoresApi.eliminar(conductorAEliminar.id);
      toast.success('Conductor eliminado correctamente');
      cargarConductores();
      cargarEmpresas();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar el conductor');
    } finally {
      setConductorAEliminar(null);
    }
  };

  const handleToggleEstadoConductor = async (conductor: Transportador) => {
    try {
      await transportadoresApi.editar(conductor.id, { estado: !conductor.estado });
      setConductores((prev) =>
        prev.map((c) => (c.id === conductor.id ? { ...c, estado: !conductor.estado } : c)),
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_persona">Tipo de Persona</Label>
                <Select
                  value={formEmpresa.tipo_persona}
                  onValueChange={(value) =>
                    setFormEmpresa((prev) => ({ ...prev, tipo_persona: value as 'JURIDICA' | 'NATURAL' }))
                  }
                >
                  <SelectTrigger id="tipo_persona">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JURIDICA">Jurídica</SelectItem>
                    <SelectItem value="NATURAL">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit-empresa">
                  NIT <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nit-empresa"
                  placeholder="900.111.222-1"
                  value={formEmpresa.nit}
                  onChange={(e) =>
                    setFormEmpresa((prev) => ({ ...prev, nit: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razon_social-empresa">
                Razón Social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="razon_social-empresa"
                placeholder="Ej: Transportes del Valle S.A.S."
                value={formEmpresa.razon_social}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, razon_social: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion-empresa">Dirección</Label>
              <Input
                id="direccion-empresa"
                placeholder="Dirección"
                value={formEmpresa.direccion}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, direccion: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad-empresa">Ciudad</Label>
                <Input
                  id="ciudad-empresa"
                  placeholder="Ciudad"
                  value={formEmpresa.ciudad}
                  onChange={(e) =>
                    setFormEmpresa((prev) => ({ ...prev, ciudad: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono-empresa">Teléfono</Label>
                <Input
                  id="telefono-empresa"
                  placeholder="+57 300 444 5555"
                  value={formEmpresa.telefono}
                  onChange={(e) =>
                    setFormEmpresa((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email-empresa">Email</Label>
                <Input
                  id="email-empresa"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={formEmpresa.email}
                  onChange={(e) =>
                    setFormEmpresa((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto-empresa">Contacto</Label>
                <Input
                  id="contacto-empresa"
                  placeholder="Nombre del contacto"
                  value={formEmpresa.contacto_nombre}
                  onChange={(e) =>
                    setFormEmpresa((prev) => ({ ...prev, contacto_nombre: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones-empresa">Observaciones</Label>
              <Textarea
                id="observaciones-empresa"
                placeholder="Notas adicionales"
                value={formEmpresa.observaciones}
                onChange={(e) =>
                  setFormEmpresa((prev) => ({ ...prev, observaciones: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalEmpresa(false)} disabled={guardandoEmpresa}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa} disabled={guardandoEmpresa}>
              {guardandoEmpresa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
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
              <Label htmlFor="empresa_transportadora_id">
                Empresa de Transporte <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formConductor.empresa_transportadora_id}
                onValueChange={(value) =>
                  setFormConductor((prev) => ({ ...prev, empresa_transportadora_id: value }))
                }
              >
                <SelectTrigger id="empresa_transportadora_id">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                <Select
                  value={formConductor.tipo_documento}
                  onValueChange={(value) =>
                    setFormConductor((prev) => ({
                      ...prev,
                      tipo_documento: value as 'CC' | 'CE' | 'PPT' | 'PASAPORTE',
                    }))
                  }
                >
                  <SelectTrigger id="tipo_documento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((td) => (
                      <SelectItem key={td} value={td}>
                        {td}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_documento">Número de Documento</Label>
                <Input
                  id="numero_documento"
                  placeholder="16.123.456"
                  value={formConductor.numero_documento}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, numero_documento: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">
                  Placa del Vehículo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="placa"
                  placeholder="ABC-123"
                  value={formConductor.placa_vehiculo}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, placa_vehiculo: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono-conductor">Teléfono</Label>
                <Input
                  id="telefono-conductor"
                  placeholder="+57 300 777 8888"
                  value={formConductor.telefono}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_vehiculo">Tipo de Vehículo</Label>
                <Input
                  id="tipo_vehiculo"
                  placeholder="Ej: Volqueta"
                  value={formConductor.tipo_vehiculo}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, tipo_vehiculo: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacidad_kg">Capacidad (kg)</Label>
                <Input
                  id="capacidad_kg"
                  type="number"
                  placeholder="0"
                  value={formConductor.capacidad_kg}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, capacidad_kg: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licencia_conduccion">Licencia de Conducción</Label>
                <Input
                  id="licencia_conduccion"
                  placeholder="Número de licencia"
                  value={formConductor.licencia_conduccion}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, licencia_conduccion: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licencia_vencimiento">Vencimiento Licencia</Label>
                <Input
                  id="licencia_vencimiento"
                  type="date"
                  value={formConductor.licencia_vencimiento}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, licencia_vencimiento: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones-conductor">Observaciones</Label>
              <Textarea
                id="observaciones-conductor"
                placeholder="Notas adicionales"
                value={formConductor.observaciones}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, observaciones: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalConductor(false)} disabled={guardandoConductor}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConductor} disabled={guardandoConductor}>
              {guardandoConductor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!empresaAEliminar}
        onOpenChange={(open) => !open && setEmpresaAEliminar(null)}
        title="Eliminar empresa"
        description={`¿Estás seguro de eliminar "${empresaAEliminar?.razon_social}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteEmpresa}
      />

      <ConfirmDeleteDialog
        open={!!conductorAEliminar}
        onOpenChange={(open) => !open && setConductorAEliminar(null)}
        title="Eliminar conductor"
        description={`¿Estás seguro de eliminar a "${conductorAEliminar?.nombres} ${conductorAEliminar?.apellidos}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteConductor}
      />

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
          {cargandoEmpresas ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando empresas...
            </div>
          ) : empresas.length === 0 ? (
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
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{empresa.razon_social}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {empresa.transportadores_count ?? 0} conductores
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                      {empresa.nit && <span>NIT: {empresa.nit}</span>}
                      {empresa.ciudad && <span>Ciudad: {empresa.ciudad}</span>}
                      {empresa.telefono && <span>Tel: {empresa.telefono}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={empresa.estado ?? false}
                      onCheckedChange={() => handleToggleEstadoEmpresa(empresa)}
                    />
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
                      onClick={() => setEmpresaAEliminar(empresa)}
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
          {cargandoConductores ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando conductores...
            </div>
          ) : conductores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay conductores registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conductores.map((conductor) => {
                const empresa = empresas.find((e) => e.id === conductor.empresa_transportadora_id);
                const nombreEmpresa = empresa?.razon_social ?? conductor.empresa_transportadora?.razon_social;
                return (
                  <div
                    key={conductor.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {conductor.nombres} {conductor.apellidos}
                        </p>
                        {nombreEmpresa && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {nombreEmpresa}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                        {conductor.numero_documento && (
                          <span>
                            {conductor.tipo_documento ?? 'CC'}: {conductor.numero_documento}
                          </span>
                        )}
                        {conductor.telefono && <span>Tel: {conductor.telefono}</span>}
                        {conductor.placa_vehiculo && <span>Placa: {conductor.placa_vehiculo}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={conductor.estado ?? false}
                        onCheckedChange={() => handleToggleEstadoConductor(conductor)}
                      />
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
                        onClick={() => setConductorAEliminar(conductor)}
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
