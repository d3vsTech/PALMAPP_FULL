/**
 * Banco de pruebas de los PDF que se arman en el navegador.
 *
 * Existe porque esos documentos solo se podían ver llegando a la pantalla que
 * los descarga, y para llegar hay que iniciar sesión: con el backend caído no
 * se podía revisar ni corregir ninguno.
 *
 * Llama a las **mismas funciones** que usan las pantallas reales, con datos de
 * ejemplo. Lo que salga aquí es exactamente lo que sale en producción, salvo el
 * logo de la finca: `asegurarLogoEmpresa()` lo pide a la API y, sin backend,
 * cae al logo de Palmapp sin romper nada.
 *
 * La ruta es `/pdf-lab`, pública y solo en desarrollo (ver `routes.tsx`).
 *
 * Quedan dos documentos. El 2026-10-27 el backend se llevó el comprobante de
 * préstamo y el soporte de novedad, que ahora salen con el membrete de la
 * empresa desde la API y no se pueden probar sin sesión. El comprobante de pago
 * a tercero tampoco está: vive dentro de `NominaDetalle`.
 */
import { useState } from 'react';
import { FileText, Receipt, Truck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { descargarComprobanteAbono } from '../nomina/prestamoPdf';
import { descargarRemision } from '../viajes/remisionPdf';
import type { AbonoPrestamo, Prestamo } from '../../../api/prestamos';
import type { DatosRemisionEmpresa, DatosRemisionViaje } from '../viajes/remisionPdf';

// ── Datos de ejemplo ─────────────────────────────────────────────────────────

const COLABORADOR = {
  id: 7,
  nombre_completo: 'Carlos Martínez Ardila',
  documento: '1012345678',
  cargo: 'Cosechero',
};

const PRESTAMO: Prestamo = {
  id: 31,
  empleado: COLABORADOR,
  concepto: 'Calamidad doméstica',
  frecuencia: 'QUINCENAL',
  valor_total: 600000,
  saldo_pendiente: 300000,
  cuota_valor: 100000,
  cuotas_pagadas: 3,
  num_cuotas: 6,
  avance: '3/6',
  fecha_fin: '2026-05-31',
  estado: 'VIGENTE',
  inicio_anio: 2026,
  inicio_mes: 3,
  inicio_quincena: 1,
  observaciones:
    'Autorizado por gerencia el 20 de febrero. El descuento arranca en la primera quincena '
    + 'de marzo y se suspende si el colaborador entra en incapacidad.',
  cuotas: [
    { id: 1, numero_cuota: 1, anio: 2026, mes: 3, quincena: 1, monto: 100000, estado: 'APLICADA', aplicada_at: '2026-03-15T10:00:00-05:00' },
    { id: 2, numero_cuota: 2, anio: 2026, mes: 3, quincena: 2, monto: 100000, estado: 'APLICADA', aplicada_at: '2026-03-31T10:00:00-05:00' },
    { id: 3, numero_cuota: 3, anio: 2026, mes: 4, quincena: 1, monto: 100000, estado: 'APLICADA', aplicada_at: '2026-04-15T10:00:00-05:00' },
    { id: 4, numero_cuota: 4, anio: 2026, mes: 4, quincena: 2, monto: 100000, estado: 'PENDIENTE', aplicada_at: null },
    { id: 5, numero_cuota: 5, anio: 2026, mes: 5, quincena: 1, monto: 100000, estado: 'PENDIENTE', aplicada_at: null },
    { id: 6, numero_cuota: 6, anio: 2026, mes: 5, quincena: 2, monto: 100000, estado: 'PENDIENTE', aplicada_at: null },
  ],
};

const ABONO: AbonoPrestamo = {
  id: 90,
  numero_cuota: 3,
  fecha: '2026-04-15',
  valor: 100000,
  medio_pago: 'DESCUENTO_NOMINA',
  medio_pago_label: 'Descuento por nómina',
  referencia: 'NOM-412',
  nota: null,
  saldo_tras_abono: 300000,
  tipo: 'NOMINA',
  registrado_por: 'Esteban Bohórquez',
};

const VIAJE: DatosRemisionViaje = {
  remision: 'V-0458',
  fecha: '2026-03-05',
  horaSalida: '05:45',
  extractora: 'AGROINDUSTRIAS DEL SUR DEL CESAR S.A.S.',
  extractoraUbicacion: 'Km 32 vía San Alberto',
  transportador: 'Transportes del Llano',
  conductor: 'Jordan Miguel Blanco Toloza',
  placaVehiculo: 'JFF319',
  gajosEstimados: 600,
  observaciones: 'Fruto de los lotes Marsella y Siembra 2012.',
};

const EMPRESA: DatosRemisionEmpresa = {
  nombre: 'Palmas del Llano',
  razonSocial: 'Palmas del Llano S.A.S.',
  nombreComercial: 'Palmas del Llano',
  tipoPersona: 'JURIDICA',
  nit: '900.123.456-7',
  direccion: 'Km 12 vía Acacías',
  municipio: 'Villavicencio',
  departamento: 'Meta',
  telefono: '310 555 0101',
  telefonoFijo: '8 672 4410',
  representante: 'Javier Bohórquez Peña',
  logoUrl: null,
};

// ── Catálogo de la pantalla ──────────────────────────────────────────────────

interface Documento {
  id: string;
  titulo: string;
  archivo: string;
  pantalla: string;
  descripcion: string;
  icono: typeof FileText;
  generar: () => Promise<void>;
}

const DOCUMENTOS: Documento[] = [
  {
    id: 'abono',
    titulo: 'Comprobante de pago de cuota',
    archivo: 'pages/nomina/prestamoPdf.ts',
    pantalla: 'Pagos → Préstamos → detalle → lista de abonos · "Recibo"',
    descripcion: 'El recibo de una cuota, con el saldo que queda después de ella.',
    icono: Receipt,
    generar: () => descargarComprobanteAbono(PRESTAMO, ABONO),
  },
  {
    id: 'remision',
    titulo: 'Remisión de entrega',
    archivo: 'pages/viajes/remisionPdf.ts',
    pantalla: 'Viajes → detalle en estado CREADO · "Descargar Remisión"',
    descripcion:
      'El papel que lleva el conductor. Reproduce la rejilla del talonario, con las casillas '
      + 'que se llenan a mano en blanco.',
    icono: Truck,
    generar: () => descargarRemision(VIAJE, EMPRESA),
  },
];

// ── Pantalla ─────────────────────────────────────────────────────────────────

export default function LaboratorioPdf() {
  const [generando, setGenerando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generar = async (doc: Documento) => {
    setGenerando(doc.id);
    setError(null);
    try {
      await doc.generar();
    } catch (e) {
      // Sin esto un fallo de jsPDF se perdía en la consola y el botón quedaba
      // girando para siempre.
      setError(`${doc.titulo}: ${e instanceof Error ? e.message : 'no se pudo generar'}`);
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Banco de pruebas de PDF</h1>
        <p className="mt-1 text-muted-foreground">
          Los documentos que arma el navegador, con datos de ejemplo y sin backend
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Cada botón llama a la misma función que usa la pantalla real, así que el archivo que baja
        es el de producción. Lo único que cambia es el logo de la finca: se pide a la API y, sin
        backend, sale el de Palmapp.
      </p>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {DOCUMENTOS.map((doc) => {
          const Icono = doc.icono;
          return (
            <div
              key={doc.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex min-w-0 gap-3">
                <Icono className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{doc.titulo}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{doc.descripcion}</p>
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground/70">{doc.archivo}</p>
                  <p className="text-xs text-muted-foreground/70">{doc.pantalla}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void generar(doc)}
                disabled={generando !== null}
                className="shrink-0"
              >
                {generando === doc.id ? 'Generando...' : 'Descargar'}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Falta el comprobante de pago a tercero: hoy vive dentro de NominaDetalle y hay que
        extraerlo a su propio módulo para poder llamarlo desde aquí.
      </p>
    </div>
  );
}
