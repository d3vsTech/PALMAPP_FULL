/**
 * Lo que la planilla del día dice, sacado de lo que el backend devuelve.
 *
 * `GET /operaciones/{id}` entrega las filas crudas: un jornal por persona, una
 * cosecha por lote, una ausencia por novedad. La vista de lectura no muestra
 * eso: muestra un renglón por **trabajo** (la gente que hizo la misma labor en
 * el mismo lote con el mismo detalle), agrupados por labor. Ese resumen se arma
 * aquí, aparte de la vista, porque es la única parte que tiene reglas.
 *
 * Nada de esto consulta a la API ni toca el wizard.
 */
import type {
  Ausencia, Cosecha, HoraExtra, Jornal, PlanillaDetalle, Resumen,
} from '../../../../api/operaciones';

/** Un renglón de la tabla: quiénes, dónde y qué. */
export interface TrabajoPalma {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string[];
  detalle: string;
}

/** Una labor con todos sus renglones; la celda de la izquierda los abarca. */
export interface GrupoLaborPalma {
  clave: string;
  labor: string;
  trabajos: TrabajoPalma[];
  /** Lo que la labor sumó ese día: "535 gajos", "1.927 palmas" o vacío. */
  total: string;
}

export interface FilaHoraExtra {
  id: number;
  colaborador: string;
  tipo: string;
  horas: number;
  estado: string;
}

export interface FilaLaborFinca {
  id: number;
  colaborador: string;
  labor: string;
  /** Dónde se hizo. El wizard lo escribe aparte del nombre de la labor. */
  ubicacion: string;
}

export interface ResumenPlanilla {
  elaboradoPor: string;
  inicioLabores: string;
  lluvia: string;
  colaboradoresCosecha: number;
  palmasPlateadas: number;
  palmasPodadas: number;
  palmasFertilizadas: number;
  horasExtraSumadas: number;
  laboresPalma: GrupoLaborPalma[];
  laboresFinca: FilaLaborFinca[];
  horasExtra: FilaHoraExtra[];
  ausentes: string[];
}

/** Etiqueta de las labores fijas cuando el jornal no trae el nombre. */
const ETIQUETA_TIPO: Record<string, string> = {
  PLATEO: 'Plateo',
  PODA: 'Poda',
  FERTILIZACION: 'Fertilización',
  SANIDAD: 'Sanidad',
  OTROS: 'Otros',
};

/** El orden del papel: primero lo que más gente hace. */
const ORDEN_TIPO = ['PLATEO', 'PODA', 'FERTILIZACION', 'SANIDAD', 'OTROS'];

function numero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

/** Lee una propiedad de texto de un subobjeto que el tipo deja abierto. */
function texto(objeto: unknown, clave: string): string {
  if (typeof objeto !== 'object' || objeto === null) return '';
  const valor = (objeto as Record<string, unknown>)[clave];
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Nombre de quien hizo el trabajo. Una fila es de un colaborador o de un
 * operario de tercero, nunca de los dos, y cada uno trae su subobjeto.
 */
function nombrePersona(fila: { empleado?: unknown; operario?: unknown }): string {
  const completo = texto(fila.operario, 'nombre_completo');
  if (completo) return completo;

  const operario = [texto(fila.operario, 'nombres'), texto(fila.operario, 'apellidos')]
    .filter(Boolean).join(' ');
  if (operario) return operario;

  // Los cuatro nombres, como los escribe el panel del wizard: en una cuadrilla
  // de hermanos el primer nombre y el primer apellido no distinguen a nadie.
  const empleado = [
    texto(fila.empleado, 'primer_nombre'),
    texto(fila.empleado, 'segundo_nombre'),
    texto(fila.empleado, 'primer_apellido'),
    texto(fila.empleado, 'segundo_apellido'),
  ].filter(Boolean).join(' ');
  return empleado || 'Sin nombre';
}

function clavePersona(fila: { empleado_id?: number | null; operario_id?: number | null }): string {
  if (fila.empleado_id) return `e${fila.empleado_id}`;
  if (fila.operario_id) return `o${fila.operario_id}`;
  return '';
}

function nombreLabor(j: Jornal): string {
  return texto(j.labor, 'nombre') || ETIQUETA_TIPO[j.tipo ?? ''] || 'Sin labor';
}

/** El detalle del renglón: lo que distingue ese trabajo de otro de la misma labor. */
function detalleJornal(j: Jornal): string {
  if (j.tipo === 'FERTILIZACION') {
    const palmas = numero(j.cantidad_palmas);
    const gramos = numero(j.gramos_por_palma);
    return [
      texto(j.insumo, 'nombre'),
      palmas ? `${palmas} palmas` : '',
      gramos ? `${gramos}g` : '',
    ].filter(Boolean).join(' · ');
  }

  const palmas = numero(j.cantidad_palmas);
  if (palmas > 0) return `${palmas} palmas`;
  return j.descripcion?.trim() || j.nombre_trabajo?.trim() || '';
}

/**
 * Qué jornales son el mismo trabajo. Cuando el backend ya los agrupó manda su
 * grupo; si no, los une lo que comparten: labor, lote y detalle.
 */
function claveTrabajo(j: Jornal): string {
  if (j.jornal_grupo_id) return `g${j.jornal_grupo_id}`;
  return [j.labor_id ?? j.tipo, j.lote_id ?? '', j.sublote_id ?? '', detalleJornal(j)].join('|');
}

function trabajoDeJornales(id: string, jornales: Jornal[]): TrabajoPalma {
  const vistos = new Set<string>();
  const colaboradores: string[] = [];
  jornales.forEach((j) => {
    const clave = clavePersona(j) || nombrePersona(j);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    colaboradores.push(nombrePersona(j));
  });

  return {
    id,
    colaboradores,
    lotes: [...new Set(jornales.map((j) => texto(j.lote, 'nombre')).filter(Boolean))],
    sublotes: [...new Set(jornales.map((j) => texto(j.sublote, 'nombre')).filter(Boolean))],
    detalle: detalleJornal(jornales[0]),
  };
}

function agrupar<T>(filas: T[], clave: (f: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  filas.forEach((f) => {
    const k = clave(f);
    mapa.set(k, [...(mapa.get(k) ?? []), f]);
  });
  return mapa;
}

/** Las labores de palma que vienen de jornales, cada una con sus renglones. */
function miles(n: number): string {
  return n.toLocaleString('es-CO');
}

/** "1.927 palmas" cuando la labor se mide en palmas; vacío cuando no. */
function totalDeLabor(jornales: Jornal[]): string {
  const palmas = jornales.reduce((s, j) => s + numero(j.cantidad_palmas), 0);
  return palmas > 0 ? `${miles(palmas)} palmas` : '';
}

function laboresDeJornales(jornales: Jornal[]): GrupoLaborPalma[] {
  const porLabor = agrupar(jornales, (j) => (j.labor_id ? `l${j.labor_id}` : `t${j.tipo ?? 'otros'}`));

  const grupos = [...porLabor.entries()].map(([clave, deLaLabor]) => ({
    clave,
    labor: nombreLabor(deLaLabor[0]),
    orden: ORDEN_TIPO.indexOf(deLaLabor[0].tipo ?? ''),
    total: totalDeLabor(deLaLabor),
    trabajos: [...agrupar(deLaLabor, claveTrabajo).entries()]
      .map(([id, delTrabajo]) => trabajoDeJornales(id, delTrabajo)),
  }));

  // Las labores sin tipo fijo (las que crea la finca) van al final.
  return grupos
    .sort((a, b) => (a.orden < 0 ? 99 : a.orden) - (b.orden < 0 ? 99 : b.orden))
    .map(({ clave, labor, trabajos, total }) => ({ clave, labor, trabajos, total }));
}

/**
 * La cosecha no es un jornal: vive en su propia tabla, con la cuadrilla que
 * cortó y el sublote. Cada registro de cosecha es un renglón.
 */
function grupoCosecha(cosechas: Cosecha[]): GrupoLaborPalma | null {
  if (cosechas.length === 0) return null;

  // El reconteo manda sobre lo que anotó el cortero: es el número que paga.
  const gajosDe = (c: Cosecha) => numero(c.gajos_reconteo ?? c.gajos_reportados);
  const total = cosechas.reduce((s, c) => s + gajosDe(c), 0);

  return {
    clave: 'cosecha',
    labor: 'Cosecha',
    total: total > 0 ? `${miles(total)} gajos` : '',
    trabajos: cosechas.map((c) => ({
      id: `cosecha-${c.id}`,
      colaboradores: (c.cuadrilla ?? []).map((m) => nombrePersona(m)),
      lotes: c.lote?.nombre ? [c.lote.nombre] : [],
      sublotes: c.sublote?.nombre ? [c.sublote.nombre] : [],
      detalle: gajosDe(c) ? `${miles(gajosDe(c))} gajos` : '',
    })),
  };
}

function palmasPorTipo(jornales: Jornal[], tipo: string): number {
  return jornales
    .filter((j) => j.tipo === tipo)
    .reduce((s, j) => s + numero(j.cantidad_palmas), 0);
}

const ESTADO_HORA_EXTRA: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  LIQUIDADA: 'Liquidada',
};

/**
 * Las horas extra de la planilla. El tipo viene como subobjeto en camelCase
 * (`tipoHoraExtra`), que es como lo serializa el backend, y con el código
 * snapshoteado en la fila por si ese subobjeto no llegó.
 */
function filaHoraExtra(h: HoraExtra): FilaHoraExtra {
  return {
    id: h.id,
    colaborador: nombrePersona(h as { empleado?: unknown }),
    tipo: h.tipoHoraExtra?.nombre || h.codigo || 'Sin tipo',
    horas: numero(h.cantidad_horas),
    estado: ESTADO_HORA_EXTRA[h.estado] ?? h.estado,
  };
}

function nombreAusente(a: Ausencia): string {
  const persona = nombrePersona(a as { empleado?: unknown });
  const motivo = texto(a.motivo_ausencia, 'nombre');
  return motivo ? `${persona} - ${motivo}` : persona;
}

function textoLluvia(planilla: PlanillaDetalle): string {
  if (!planilla.hubo_lluvia) return 'No';
  const mm = numero(planilla.cantidad_lluvia);
  return mm > 0 ? `Sí · ${mm} mm` : 'Sí';
}

/**
 * Quién la elaboró. El dato lo escribe el wizard y el backend solo lo devuelve
 * en `GET /operaciones/{id}/resumen`, no en el detalle: por eso la pantalla
 * pide los dos. Si el resumen no llegó, queda el usuario que la creó.
 */
function quienElaboro(planilla: PlanillaDetalle, resumen?: Resumen | null): string {
  return resumen?.elaborado_por?.trim()
    || texto(planilla, 'elaborado_por')
    || planilla.creado_por_rel?.name
    || 'Sin registrar';
}

/** La hora de inicio, venga del detalle o del resumen, siempre como HH:MM. */
function horaInicio(planilla: PlanillaDetalle, resumen?: Resumen | null): string {
  const hora = planilla.hora_inicio || resumen?.inicio_labores || '';
  return hora.slice(0, 5) || 'Sin registrar';
}

/** Personas distintas en las cuadrillas de cosecha del día. */
function contarCuadrilla(cosechas: Cosecha[]): number {
  const miembros = cosechas.flatMap((c) => c.cuadrilla ?? []);
  return new Set(miembros.map((m) => clavePersona(m) || nombrePersona(m))).size;
}

export function resumirPlanilla(
  planilla: PlanillaDetalle,
  resumen?: Resumen | null,
): ResumenPlanilla {
  const jornales = planilla.jornales ?? [];
  const cosechas = planilla.cosechas ?? [];
  const palma = jornales.filter((j) => j.categoria === 'PALMA');
  const finca = jornales.filter((j) => j.categoria === 'FINCA');
  const cosecha = grupoCosecha(cosechas);

  // Una rechazada no se paga ni se trabaja: se lista, pero no suma.
  const horasExtra = (planilla.horas_extra ?? []).map(filaHoraExtra);
  const extrasQueCuentan = horasExtra.filter((h) => h.estado !== 'Rechazada');

  const laboresFinca: FilaLaborFinca[] = finca.map((j) => ({
    id: j.id,
    colaborador: nombrePersona(j),
    labor: j.descripcion?.trim() || j.nombre_trabajo?.trim() || nombreLabor(j),
    ubicacion: j.ubicacion?.trim() ?? '',
  }));

  return {
    elaboradoPor: quienElaboro(planilla, resumen),
    inicioLabores: horaInicio(planilla, resumen),
    lluvia: textoLluvia(planilla),
    colaboradoresCosecha: contarCuadrilla(cosechas),
    palmasPlateadas: palmasPorTipo(palma, 'PLATEO'),
    palmasPodadas: palmasPorTipo(palma, 'PODA'),
    palmasFertilizadas: palmasPorTipo(palma, 'FERTILIZACION'),
    horasExtraSumadas: extrasQueCuentan.reduce((s, h) => s + h.horas, 0),
    laboresPalma: [...(cosecha ? [cosecha] : []), ...laboresDeJornales(palma)],
    laboresFinca,
    horasExtra,
    ausentes: (planilla.ausencias ?? []).map(nombreAusente),
  };
}
