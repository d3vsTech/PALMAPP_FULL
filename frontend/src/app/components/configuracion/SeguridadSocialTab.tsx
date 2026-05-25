import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type EntidadSeguridad = {
  id: string;
  nombre: string;
};

export function SeguridadSocialTab() {
  const [entidadesEPS, setEntidadesEPS] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Sanitas' },
    { id: '2', nombre: 'Compensar' },
    { id: '3', nombre: 'Sura' },
    { id: '4', nombre: 'Nueva EPS' },
    { id: '5', nombre: 'Salud Total' },
    { id: '6', nombre: 'Famisanar' }
  ]);

  const [entidadesARL, setEntidadesARL] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Sura' },
    { id: '2', nombre: 'Positiva' },
    { id: '3', nombre: 'Axisura' },
    { id: '4', nombre: 'Liberty' }
  ]);

  const [entidadesPension, setEntidadesPension] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Porvenir' },
    { id: '2', nombre: 'Protección' },
    { id: '3', nombre: 'Colfondos' },
    { id: '4', nombre: 'Old Mutual' },
    { id: '5', nombre: 'Skandia' }
  ]);

  const [entidadesCesantias, setEntidadesCesantias] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Porvenir' },
    { id: '2', nombre: 'Protección' },
    { id: '3', nombre: 'Colfondos' },
    { id: '4', nombre: 'Old Mutual' }
  ]);

  const [bancos, setBancos] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Bancolombia' },
    { id: '2', nombre: 'Davivienda' },
    { id: '3', nombre: 'BBVA' },
    { id: '4', nombre: 'Banco de Bogotá' },
    { id: '5', nombre: 'Banco Popular' },
    { id: '6', nombre: 'Nequi' },
    { id: '7', nombre: 'Daviplata' }
  ]);

  const [nuevoNombre, setNuevoNombre] = useState('');

  const agregarEntidad = (lista: EntidadSeguridad[], setLista: Function, tipo: string) => {
    if (!nuevoNombre.trim()) {
      toast.error('Ingresa el nombre de la entidad');
      return;
    }

    const nuevaEntidad: EntidadSeguridad = {
      id: Date.now().toString(),
      nombre: nuevoNombre.trim()
    };

    setLista([...lista, nuevaEntidad]);
    setNuevoNombre('');
    toast.success(`${tipo} agregado correctamente`);
  };

  const eliminarEntidad = (id: string, lista: EntidadSeguridad[], setLista: Function, tipo: string) => {
    setLista(lista.filter(e => e.id !== id));
    toast.success(`${tipo} eliminado correctamente`);
  };

  const renderSeccion = (
    titulo: string,
    descripcion: string,
    lista: EntidadSeguridad[],
    setLista: Function,
    tipo: string
  ) => {
    return (
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>{titulo}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{descripcion}</p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Lista de entidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {lista.map((entidad) => (
              <div
                key={entidad.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
              >
                <span className="font-medium">{entidad.nombre}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminarEntidad(entidad.id, lista, setLista, tipo)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Agregar nueva entidad */}
          <div className="flex gap-2">
            <Input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder={`Nombre del ${tipo.toLowerCase()}`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  agregarEntidad(lista, setLista, tipo);
                }
              }}
            />
            <Button onClick={() => agregarEntidad(lista, setLista, tipo)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const [fondosCombinados, setFondosCombinados] = useState<EntidadSeguridad[]>([
    { id: '1', nombre: 'Porvenir' },
    { id: '2', nombre: 'Protección' },
    { id: '3', nombre: 'Colfondos' },
    { id: '4', nombre: 'Old Mutual' },
    { id: '5', nombre: 'Skandia' }
  ]);

  return (
    <div className="space-y-6">
      {renderSeccion(
        'Entidades Promotoras de Salud (EPS)',
        'Administradoras de salud disponibles para los colaboradores',
        entidadesEPS,
        setEntidadesEPS,
        'EPS'
      )}

      {renderSeccion(
        'Administradoras de Riesgos Laborales (ARL)',
        'Entidades de riesgos laborales',
        entidadesARL,
        setEntidadesARL,
        'ARL'
      )}

      {renderSeccion(
        'Fondos de Pensiones y Cesantías',
        'Administradoras de fondos pensionales y cesantías',
        fondosCombinados,
        setFondosCombinados,
        'Fondo'
      )}

      {renderSeccion(
        'Entidades Bancarias',
        'Bancos disponibles para pagos de nómina',
        bancos,
        setBancos,
        'Banco'
      )}
    </div>
  );
}
