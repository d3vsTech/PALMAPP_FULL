/**
 * Etapa 1 del wizard de planilla — Información General.
 * Extraída de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios.
 */
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { FileText } from 'lucide-react';

interface Props {
  fecha: string;
  setFecha: (v: string) => void;
  elaboradoPor: string;
  setElaboradoPor: (v: string) => void;
  huboLluvia: 'si' | 'no' | '';
  setHuboLluvia: (v: 'si' | 'no') => void;
  lluvia: string;
  setLluvia: (v: string) => void;
  inicioLabores: string;
  setInicioLabores: (v: string) => void;
}

export function EtapaInfoGeneral({
  fecha,
  setFecha,
  elaboradoPor,
  setElaboradoPor,
  huboLluvia,
  setHuboLluvia,
  lluvia,
  setLluvia,
  inicioLabores,
  setInicioLabores,
}: Props) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Información General</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ingresa los datos básicos de la planilla
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="elaboradoPor">Elaborado por *</Label>
            <Input
              id="elaboradoPor"
              placeholder="Nombre completo"
              value={elaboradoPor}
              onChange={(e) => setElaboradoPor(e.target.value)}
              readOnly
              className="bg-muted/30 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="huboLluvia">¿Hubo lluvia?</Label>
            <Select
              value={huboLluvia}
              onValueChange={(value) => {
                setHuboLluvia(value as 'si' | 'no');
                if (value === 'no') {
                  setLluvia('');
                }
              }}
            >
              <SelectTrigger id="huboLluvia">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {huboLluvia === 'si' && (
            <div className="space-y-2">
              <Label htmlFor="lluvia">Lluvia (mm)</Label>
              <Input
                id="lluvia"
                type="number" step="0.001"
                placeholder="Ej: 15"
                value={lluvia}
                onChange={(e) => setLluvia(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inicioLabores">Inicio de Labores</Label>
            <Input
              id="inicioLabores"
              type="time"
              value={inicioLabores}
              onChange={(e) => setInicioLabores(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
