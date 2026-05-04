import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CargaMasivaProductos() {
  const navigate = useNavigate();
  const [archivoCargando, setArchivoCargando] = useState(false);
  const [productosImportados, setProductosImportados] = useState<number>(0);

  const handleArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de archivo
    if (!archivo.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    setArchivoCargando(true);

    try {
      const texto = await archivo.text();
      const lineas = texto.split('\n').filter(l => l.trim());

      // Omitir la primera línea (encabezados)
      let productosValidos = 0;

      for (let i = 1; i < lineas.length; i++) {
        const valores = lineas[i].split(',').map(v => v.trim());
        if (valores.length >= 6) {
          productosValidos++;
        }
      }

      if (productosValidos > 0) {
        setProductosImportados(productosValidos);
        toast.success(`${productosValidos} productos importados exitosamente`);

        // Simular procesamiento y redirigir después de 2 segundos
        setTimeout(() => {
          navigate('/proveedor/productos');
        }, 2000);
      } else {
        toast.error('No se encontraron productos válidos en el archivo');
      }
    } catch (error) {
      toast.error('Error al procesar el archivo');
    } finally {
      setArchivoCargando(false);
      // Limpiar el input
      e.target.value = '';
    }
  };

  const descargarPlantilla = () => {
    const csv = `Nombre,Descripción,Precio,Unidad,Categoría,Stock
Fertilizante NPK 15-15-15,Fertilizante completo para palma de aceite,95000,bulto 50kg,Fertilizantes,250
Glifosato 48% SL,Herbicida sistémico no selectivo,42000,litro,Agroquímicos,180
Machete Palero 24",Machete profesional para cosecha,35000,unidad,Herramientas,50`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carga Masiva de Productos</h1>
          <p className="text-muted-foreground mt-1">Importa múltiples productos desde un archivo CSV</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda - Instrucciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Descarga la plantilla CSV</p>
                    <p className="text-sm text-muted-foreground">Obtén el archivo base con el formato correcto</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Completa la información</p>
                    <p className="text-sm text-muted-foreground">Agrega tus productos siguiendo el formato establecido</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Sube el archivo</p>
                    <p className="text-sm text-muted-foreground">Carga el archivo completado para importar los productos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formato del Archivo CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Encabezados requeridos (en orden):</p>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs">
                  Nombre,Descripción,Precio,Unidad,Categoría,Stock
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Ejemplo de datos:</p>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <div className="whitespace-nowrap">
                    Fertilizante NPK,Fertilizante completo,95000,bulto 50kg,Fertilizantes,250
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Categorías válidas</p>
                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                      Fertilizantes, Agroquímicos, Herramientas, Maquinaria, Insumos, Equipos
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descargar Plantilla</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={descargarPlantilla} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Descargar Plantilla CSV
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                La plantilla incluye ejemplos que puedes editar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Área de carga */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Subir Archivo CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {productosImportados > 0 ? (
                <div className="rounded-lg border-2 border-success bg-success/5 p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">¡Importación Exitosa!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Se importaron {productosImportados} productos correctamente
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Redirigiendo a la lista de productos...
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="archivo-csv"
                      accept=".csv"
                      onChange={handleArchivoChange}
                      className="hidden"
                      disabled={archivoCargando}
                    />
                    <label htmlFor="archivo-csv" className="cursor-pointer">
                      <div className="mb-4 flex justify-center">
                        <div className={`p-4 rounded-full ${archivoCargando ? 'bg-muted animate-pulse' : 'bg-primary/10'}`}>
                          <Upload className={`h-10 w-10 ${archivoCargando ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">
                        {archivoCargando ? 'Procesando archivo...' : 'Haz clic para subir tu archivo'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Archivo CSV con productos
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Formato: .csv
                      </p>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Formato CSV válido requerido</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Todos los campos son obligatorios</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Los productos se agregarán automáticamente</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                onClick={() => navigate('/proveedor/productos')}
                className="w-full"
                disabled={archivoCargando}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}