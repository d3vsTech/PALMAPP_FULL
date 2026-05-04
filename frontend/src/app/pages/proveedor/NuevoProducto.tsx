import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface PrecioVolumen {
  cantidad: number;
  precio: number;
}

const categorias = ['Fertilizantes', 'Agroquímicos', 'Herramientas', 'Maquinaria', 'Insumos', 'Equipos'];
const unidades = ['unidad', 'bulto 50kg', 'litro', 'galón', 'caja', 'paquete', 'kilogramo'];

export default function NuevoProducto() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    unidad: '',
    categoria: '',
    stock: '',
  });

  const [preciosVolumen, setPreciosVolumen] = useState<PrecioVolumen[]>([]);
  const [imagen, setImagen] = useState<File | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const agregarPrecioVolumen = () => {
    setPreciosVolumen([...preciosVolumen, { cantidad: 0, precio: 0 }]);
  };

  const eliminarPrecioVolumen = (index: number) => {
    setPreciosVolumen(preciosVolumen.filter((_, i) => i !== index));
  };

  const actualizarPrecioVolumen = (index: number, field: 'cantidad' | 'precio', value: number) => {
    const nuevosPrecios = [...preciosVolumen];
    nuevosPrecios[index][field] = value;
    setPreciosVolumen(nuevosPrecios);
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagen(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.unidad || !formData.categoria || !formData.stock) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Aquí iría la lógica para guardar el producto
    toast.success('Producto creado exitosamente');
    navigate('/proveedor/productos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nuevo Producto</h1>
          <p className="text-muted-foreground mt-1">Agrega un nuevo producto a tu catálogo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre del producto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Fertilizante NPK 15-15-15"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describe las características y beneficios del producto..."
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">
                      Categoría <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidad">
                      Unidad de medida <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.unidad} onValueChange={(value) => handleInputChange('unidad', value)}>
                      <SelectTrigger id="unidad">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((unidad) => (
                          <SelectItem key={unidad} value={unidad}>
                            {unidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precio e inventario */}
            <Card>
              <CardHeader>
                <CardTitle>Precio e Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="precio">
                      Precio unitario <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        id="precio"
                        type="number"
                        placeholder="0"
                        value={formData.precio}
                        onChange={(e) => handleInputChange('precio', e.target.value)}
                        className="pl-6"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">
                      Stock disponible <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precios por volumen */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Precios por Volumen</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Opcional: Ofrece descuentos por cantidad</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={agregarPrecioVolumen} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {preciosVolumen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay precios por volumen configurados
                  </p>
                ) : (
                  preciosVolumen.map((precio, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Cantidad mínima</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={precio.cantidad}
                            onChange={(e) => actualizarPrecioVolumen(index, 'cantidad', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Precio por unidad</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={precio.precio}
                              onChange={(e) => actualizarPrecioVolumen(index, 'precio', parseInt(e.target.value) || 0)}
                              className="pl-6"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminarPrecioVolumen(index)}
                        className="text-destructive hover:text-destructive mt-6"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Imagen del producto */}
            <Card>
              <CardHeader>
                <CardTitle>Imagen del Producto</CardTitle>
                <p className="text-sm text-muted-foreground">Opcional</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="imagen-upload"
                      accept="image/*"
                      onChange={handleImagenChange}
                      className="hidden"
                    />
                    <label htmlFor="imagen-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {imagen ? imagen.name : 'Haz clic para subir una imagen'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Producto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/proveedor/productos')}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>

            {/* Información */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Nota:</span> Una vez creado el producto, estará
                  disponible en el marketplace para que los clientes lo compren.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}