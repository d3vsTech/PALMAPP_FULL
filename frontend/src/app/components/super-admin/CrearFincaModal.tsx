import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { fetchConToken } from '../../../api/request';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';

interface Departamento {
  codigo: string;
  nombre: string;
}

interface Municipio {
  codigo: string;
  nombre: string;
}

export interface FincaFormData {
  tipo_persona: 'NATURAL' | 'JURIDICA';
  nombre: string;
  nit: string;
  razon_social: string;
  correo_contacto: string;
  telefono: string;
  direccion: string;
  departamento: string;
  municipio: string;
  fecha_activacion: string;
  fecha_suspension: string;
}

interface CrearFincaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: FincaFormData) => Promise<void> | void;
  fincaData?: Partial<FincaFormData> | null;
  isEdit?: boolean;
  isSaving?: boolean;
}

const FORM_VACIO: FincaFormData = {
  tipo_persona: 'NATURAL',
  nombre: '',
  nit: '',
  razon_social: '',
  correo_contacto: '',
  telefono: '',
  direccion: '',
  departamento: '',
  municipio: '',
  fecha_activacion: '',
  fecha_suspension: '',
};

function armarFormulario(fincaData?: Partial<FincaFormData> | null): FincaFormData {
  return { ...FORM_VACIO, ...fincaData };
}

/**
 * Buscador con lista desplegable.
 *
 * Departamento y municipio no caben en un `Select`: son 33 y cientos de
 * opciones. El campo filtra mientras se escribe y la lista propone.
 */
function BuscadorLista({
  id,
  label,
  valor,
  opciones,
  placeholder,
  disabled,
  onEscribir,
  onElegir,
}: {
  id: string;
  label: string;
  valor: string;
  opciones: { codigo: string; nombre: string }[];
  placeholder: string;
  disabled?: boolean;
  onEscribir: (texto: string) => void;
  onElegir: (nombre: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const filtradas = opciones.filter((o) => o.nombre.toLowerCase().includes(valor.toLowerCase()));

  return (
    <div className="relative space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={valor}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setAbierta(true)}
        // El clic en una opción llega antes que el blur gracias al retraso.
        onBlur={() => window.setTimeout(() => setAbierta(false), 120)}
        onChange={(e) => { onEscribir(e.target.value); setAbierta(true); }}
      />
      {abierta && filtradas.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto custom-scrollbar rounded-[10px] border border-border bg-popover shadow-md">
          {filtradas.map((opcion) => (
            <button
              key={opcion.codigo}
              type="button"
              onClick={() => { onElegir(opcion.nombre); setAbierta(false); }}
              className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {opcion.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrearFincaModal({
  isOpen,
  onClose,
  onSave,
  fincaData,
  isEdit = false,
  isSaving = false,
}: CrearFincaModalProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<FincaFormData>(() => armarFormulario(fincaData));
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [cargandoDeptos, setCargandoDeptos] = useState(false);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;

    const cargar = async () => {
      setCargandoDeptos(true);
      try {
        const respuesta = await fetchConToken('/api/v1/auth/departamentos', token);
        const resultado = await respuesta.json();
        if (respuesta.ok) setDepartamentos(resultado.data || []);
      } catch (error) {
        console.error('Error al cargar departamentos:', error);
      } finally {
        setCargandoDeptos(false);
      }
    };

    void cargar();
  }, [isOpen, token]);

  // Los municipios dependen del departamento elegido.
  useEffect(() => {
    if (!formData.departamento || !token) {
      setMunicipios([]);
      return;
    }

    const depto = departamentos.find((d) => d.nombre === formData.departamento);
    if (!depto) return;

    const cargar = async () => {
      setCargandoMunicipios(true);
      try {
        const respuesta = await fetchConToken(
          `/api/v1/auth/departamentos/${depto.codigo}/municipios`,
          token,
        );
        const resultado = await respuesta.json();
        if (respuesta.ok) setMunicipios(resultado.data || []);
      } catch (error) {
        console.error('Error al cargar municipios:', error);
      } finally {
        setCargandoMunicipios(false);
      }
    };

    void cargar();
  }, [formData.departamento, token, departamentos]);

  useEffect(() => {
    if (isOpen) setFormData(armarFormulario(fincaData));
  }, [isOpen, fincaData]);

  const actualizar = <K extends keyof FincaFormData>(campo: K, valor: FincaFormData[K]) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.departamento) {
      toast.error('Selecciona un departamento');
      return;
    }
    if (!formData.municipio) {
      toast.error('Selecciona un municipio');
      return;
    }

    await onSave?.(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => { if (!abierto && !isSaving) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar finca' : 'Nueva finca'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos de la finca cliente.'
              : 'Registra una finca cliente en la plataforma.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-5">
          <div className="max-h-[60vh] space-y-5 overflow-y-auto custom-scrollbar pr-1">
            <section className="space-y-4">
              <h3>Información general</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="finca-tipo-persona">Tipo de persona</Label>
                  <Select
                    value={formData.tipo_persona}
                    onValueChange={(v) => actualizar('tipo_persona', v as 'NATURAL' | 'JURIDICA')}
                  >
                    <SelectTrigger id="finca-tipo-persona"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NATURAL">Natural</SelectItem>
                      <SelectItem value="JURIDICA">Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-nombre">Nombre de la finca</Label>
                  <Input
                    id="finca-nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => actualizar('nombre', e.target.value)}
                    placeholder="Finca La Victoria"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-nit">NIT</Label>
                  <Input
                    id="finca-nit"
                    value={formData.nit}
                    onChange={(e) => actualizar('nit', e.target.value)}
                    placeholder="900123456-7"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-razon-social">Razón social</Label>
                  <Input
                    id="finca-razon-social"
                    value={formData.razon_social}
                    onChange={(e) => actualizar('razon_social', e.target.value)}
                    placeholder="Nombre registrado en cámara de comercio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-correo">Correo de contacto</Label>
                  <Input
                    id="finca-correo"
                    type="email"
                    value={formData.correo_contacto}
                    onChange={(e) => actualizar('correo_contacto', e.target.value)}
                    placeholder="contacto@finca.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-telefono">Teléfono</Label>
                  <Input
                    id="finca-telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => actualizar('telefono', e.target.value)}
                    placeholder="3157890123"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3>Ubicación</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="finca-direccion">Dirección</Label>
                  <Input
                    id="finca-direccion"
                    value={formData.direccion}
                    onChange={(e) => actualizar('direccion', e.target.value)}
                    placeholder="Vereda, kilómetro o dirección"
                  />
                </div>

                <BuscadorLista
                  id="finca-departamento"
                  label="Departamento"
                  valor={formData.departamento}
                  opciones={departamentos}
                  placeholder={cargandoDeptos ? 'Cargando…' : 'Escribe para buscar'}
                  onEscribir={(texto) => {
                    actualizar('departamento', texto);
                    actualizar('municipio', '');
                  }}
                  onElegir={(nombre) => {
                    actualizar('departamento', nombre);
                    actualizar('municipio', '');
                  }}
                />

                <BuscadorLista
                  id="finca-municipio"
                  label="Municipio"
                  valor={formData.municipio}
                  opciones={municipios}
                  disabled={!formData.departamento || cargandoMunicipios}
                  placeholder={cargandoMunicipios ? 'Cargando…' : 'Escribe para buscar'}
                  onEscribir={(texto) => actualizar('municipio', texto)}
                  onElegir={(nombre) => actualizar('municipio', nombre)}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3>Vigencia</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="finca-fecha-activacion">Fecha de activación</Label>
                  <Input
                    id="finca-fecha-activacion"
                    type="date"
                    value={formData.fecha_activacion}
                    onChange={(e) => actualizar('fecha_activacion', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca-fecha-suspension">Fecha de suspensión</Label>
                  <Input
                    id="finca-fecha-suspension"
                    type="date"
                    value={formData.fecha_suspension}
                    onChange={(e) => actualizar('fecha_suspension', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear finca'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
