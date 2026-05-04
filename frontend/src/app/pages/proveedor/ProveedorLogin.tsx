import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Store, Lock, Mail, Sprout, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Usuarios de prueba para proveedores
const PROVEEDORES_PRUEBA = [
  {
    email: 'proveedor@agroinsumos.com',
    password: 'proveedor123',
    nombre: 'AgroInsumos del Valle',
  },
  {
    email: 'admin@agroinsumos.com',
    password: 'admin123',
    nombre: 'AgroInsumos del Valle',
  },
];

export default function ProveedorLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar credenciales
    const proveedor = PROVEEDORES_PRUEBA.find(
      (p) => p.email === formData.email && p.password === formData.password
    );

    if (proveedor) {
      // Guardar sesión del proveedor
      localStorage.setItem('proveedorSession', JSON.stringify(proveedor));
      toast.success(`Bienvenido ${proveedor.nombre}`);
      navigate('/proveedor/dashboard');
    } else {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      toast.error('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-border">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Store className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Portal Proveedores</CardTitle>
          <CardDescription className="text-base">
            Gestiona tus productos y pedidos en AgroMarket
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Credenciales de prueba */}
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-2">Credenciales de prueba:</p>
            <div className="space-y-1 text-xs text-muted-foreground font-mono">
              <p>Email: proveedor@agroinsumos.com</p>
              <p>Contraseña: proveedor123</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="proveedor@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" size="lg">
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground"
            >
              ¿Eres un cliente? Ingresa aquí
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}