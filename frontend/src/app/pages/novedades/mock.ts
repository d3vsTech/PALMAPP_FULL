/**
 * Datos de prueba del módulo de novedades.
 *
 * Provisional hasta que exista el endpoint. Al conectar el backend se borra
 * este archivo y las pantallas pasan a leer de `src/api/novedades.ts`; los
 * tipos que consumen ya viven en `tipos.ts`, así que no cambian.
 */
import type { Colaborador, Novedad } from './tipos';

export const COLABORADORES_MOCK: Colaborador[] = [
  { id: 'c1', nombre: 'Carlos Martínez', cedula: '1.012.345.678',  cargo: 'Operario de Cosecha' },
  { id: 'c2', nombre: 'Ana Gómez',       cedula: '52.341.567.890', cargo: 'Supervisora'         },
  { id: 'c3', nombre: 'Luis Pérez',      cedula: '1.098.765.432',  cargo: 'Podador'             },
  { id: 'c4', nombre: 'María Torres',    cedula: '43.765.432.100', cargo: 'Almacenista'         },
  { id: 'c5', nombre: 'Jorge Ramírez',   cedula: '1.123.456.789',  cargo: 'Operario de Poda'    },
];

export const NOVEDADES_MOCK: Novedad[] = [
  {
    id: 'n1', colaborador: 'Carlos Martínez', cedula: '1.012.345.678', cargo: 'Operario de Cosecha',
    tipo: 'INCAPACIDAD_EPS', fechaInicio: '2026-09-01', fechaFin: '2026-09-05', dias: 5,
    fechaRegistro: '2026-09-01', observaciones: 'Gastroenteritis aguda',
  },
  {
    id: 'n2', colaborador: 'Ana Gómez', cedula: '52.341.567.890', cargo: 'Supervisora',
    tipo: 'PERMISO_REMUNERADO', fechaInicio: '2026-09-10', fechaFin: '2026-09-10', dias: 1,
    fechaRegistro: '2026-09-08',
  },
  {
    id: 'n3', colaborador: 'Luis Pérez', cedula: '1.098.765.432', cargo: 'Podador',
    tipo: 'AUSENCIA_INJUSTIFICADA', fechaInicio: '2026-08-22', fechaFin: '2026-08-22', dias: 1,
    fechaRegistro: '2026-08-22',
  },
  {
    id: 'n4', colaborador: 'María Torres', cedula: '43.765.432.100', cargo: 'Almacenista',
    tipo: 'CALAMIDAD_DOMESTICA', fechaInicio: '2026-09-03', fechaFin: '2026-09-04', dias: 2,
    fechaRegistro: '2026-09-03', observaciones: 'Fallecimiento familiar',
  },
  {
    id: 'n5', colaborador: 'Jorge Ramírez', cedula: '1.123.456.789', cargo: 'Operario de Poda',
    tipo: 'INCAPACIDAD_ARL', fechaInicio: '2026-08-15', fechaFin: '2026-08-25', dias: 10,
    fechaRegistro: '2026-08-15', observaciones: 'Accidente en campo, Rad. 2026-8821',
  },
  {
    id: 'n6', colaborador: 'Carlos Martínez', cedula: '1.012.345.678', cargo: 'Operario de Cosecha',
    tipo: 'PERMISO_NO_REMUNERADO', fechaInicio: '2026-07-28', fechaFin: '2026-07-28', dias: 1,
    fechaRegistro: '2026-07-27',
  },
  {
    id: 'n7', colaborador: 'Ana Gómez', cedula: '52.341.567.890', cargo: 'Supervisora',
    tipo: 'LICENCIA_MATERNIDAD', fechaInicio: '2026-06-01', fechaFin: '2026-09-28', dias: 119,
    fechaRegistro: '2026-05-30',
  },
  {
    id: 'n8', colaborador: 'Luis Pérez', cedula: '1.098.765.432', cargo: 'Podador',
    tipo: 'SUSPENSION_DISCIPLINARIA', fechaInicio: '2026-09-12', fechaFin: '2026-09-14', dias: 3,
    fechaRegistro: '2026-09-11',
  },
  {
    id: 'n9', colaborador: 'María Torres', cedula: '43.765.432.100', cargo: 'Almacenista',
    tipo: 'RENUNCIA', fechaInicio: '2026-10-01', fechaFin: '2026-10-01', dias: 0,
    fechaRegistro: '2026-09-10', observaciones: 'Carta de renuncia radicada',
  },
  {
    id: 'n10', colaborador: 'Jorge Ramírez', cedula: '1.123.456.789', cargo: 'Operario de Poda',
    tipo: 'LICENCIA_LUTO', fechaInicio: '2026-09-05', fechaFin: '2026-09-10', dias: 5,
    fechaRegistro: '2026-09-05',
  },
];
