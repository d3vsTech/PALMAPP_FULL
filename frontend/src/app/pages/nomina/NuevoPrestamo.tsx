import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Save, DollarSign, Search, X } from 'lucide-react';
import { colaboradores } from '../../lib/mockData';

export default function NuevoPrestamo() {
  console.log('✅ NuevoPrestamo component rendered');
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [colaboradorId, setColaboradorId] = useState('');
  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState<any>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar colaboradores según la búsqueda
  const colaboradoresFiltrados = colaboradores
    .filter((c) => c.estado === 'Activo')
    .filter((c) => {
      const searchTerm = busquedaColaborador.toLowerCase();
      return (
        c.nombres.toLowerCase().includes(searchTerm) ||
        c.apellidos.toLowerCase().includes(searchTerm) ||
        c.cedula.toLowerCase().includes(searchTerm) ||
        c.cargo?.toLowerCase().includes(searchTerm)
      );
    })
    .slice(0, 5); // Mostrar máximo 5 sugerencias

  const seleccionarColaborador = (colaborador: any) => {
    setColaboradorId(colaborador.id);
    setColaboradorSeleccionado(colaborador);
    setBusquedaColaborador(`${colaborador.nombres} ${colaborador.apellidos}`);
    setMostrarSugerencias(false);
  };

  const limpiarSeleccion = () => {
    setColaboradorId('');
    setColaboradorSeleccionado(null);
    setBusquedaColaborador('');
    setMostrarSugerencias(false);
  };

  const handleSave = () => {
    if (!colaboradorId || !colaboradorSeleccionado) {
      alert('Debes buscar y seleccionar un colaborador');
      return;
    }
    if (!fechaDesde) {
      alert('La fecha desde es obligatoria');
      return;
    }
    if (!fechaHasta) {
      alert('La fecha hasta es obligatoria');
      return;
    }
    if (!concepto.trim()) {
      alert('El concepto es obligatorio');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    // Validar que fecha hasta sea mayor o igual a fecha desde
    if (new Date(fechaHasta) < new Date(fechaDesde)) {
      alert('La fecha hasta debe ser mayor o igual a la fecha desde');
      return;
    }

    const colaboradorNombre = colaboradorSeleccionado
      ? `${colaboradorSeleccionado.nombres} ${colaboradorSeleccionado.apellidos}`
      : '';

    const nuevoPrestamo = {
      id: `prestamo-${Date.now()}`,
      colaboradorId,
      colaboradorNombre,
      fechaDesde,
      fechaHasta,
      concepto: concepto.trim(),
      monto: parseFloat(monto),
      fechaCreacion: new Date().toISOString(),
    };

    console.log('Préstamo guardado:', nuevoPrestamo);
    // Aquí iría la lógica para guardar en el backend

    navigate('/nomina');
  };

  const handleCancel = () => {
    navigate('/nomina');
  };

  // Debug: verificar renderizado
  console.log('NuevoPrestamo: Renderizando página completa');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 shadow-lg">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Nuevo Préstamo</h1>
            <p className="text-muted-foreground mt-1">
              Registra un descuento de préstamo que se aplicará automáticamente en las liquidaciones
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-2xl">Información del Préstamo</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Buscar Colaborador */}
            <div className="space-y-3">
              <Label htmlFor="colaborador" className="text-base font-semibold">
                Buscar Colaborador <span className="text-destructive">*</span>
              </Label>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="colaborador"
                  type="text"
                  placeholder="Buscar por nombre, documento o cargo..."
                  value={busquedaColaborador}
                  onChange={(e) => {
                    setBusquedaColaborador(e.target.value);
                    setMostrarSugerencias(true);
                    if (!e.target.value) {
                      limpiarSeleccion();
                    }
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  className="pl-12 pr-12 h-12 text-base"
                />
                {colaboradorSeleccionado && (
                  <button
                    type="button"
                    onClick={limpiarSeleccion}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                {/* Sugerencias */}
                {mostrarSugerencias && busquedaColaborador && colaboradoresFiltrados.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {colaboradoresFiltrados.map((colaborador) => (
                      <button
                        key={colaborador.id}
                        type="button"
                        onClick={() => seleccionarColaborador(colaborador)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                          <span className="text-sm font-bold">
                            {colaborador.nombres.charAt(0)}{colaborador.apellidos.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {colaborador.nombres} {colaborador.apellidos}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {colaborador.cedula} • {colaborador.cargo}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Colaborador seleccionado */}
              {colaboradorSeleccionado && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="text-base font-bold">
                      {colaboradorSeleccionado.nombres.charAt(0)}{colaboradorSeleccionado.apellidos.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {colaboradorSeleccionado.nombres} {colaboradorSeleccionado.apellidos}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {colaboradorSeleccionado.cedula} • {colaboradorSeleccionado.cargo}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="fechaDesde" className="text-base font-semibold">
                  Fecha Desde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="fechaHasta" className="text-base font-semibold">
                  Fecha Hasta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  min={fechaDesde}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-3">
              <Label htmlFor="concepto" className="text-base font-semibold">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="concepto"
                placeholder="Ej: Préstamo de vivienda, Préstamo personal, Anticipo de nómina, etc."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                rows={4}
                className="resize-none text-base"
              />
            </div>

            {/* Monto */}
            <div className="space-y-3">
              <Label htmlFor="monto" className="text-base font-semibold">
                Monto a Descontar <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <Input
                  id="monto"
                  type="number"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="0"
                  step="1000"
                  className="pl-8 h-12 text-base"
                />
              </div>
              <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                💡 <strong>Nota:</strong> Este monto se descontará automáticamente en cada período de nómina dentro del rango de fechas especificado.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center gap-4 pt-8 mt-8 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-12 px-6 text-base"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="h-12 px-8 text-base gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Save className="h-5 w-5" />
              Guardar Préstamo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
