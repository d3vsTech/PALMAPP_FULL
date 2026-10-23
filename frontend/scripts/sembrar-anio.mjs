#!/usr/bin/env node
/**
 * Siembra un año de planillas y viajes para probar con datos parecidos a los
 * de una finca real.
 *
 * Escribe contra la API como lo haría la aplicación: mismo token, mismo
 * `X-Tenant-Id`, mismos endpoints. No toca la base de datos por debajo, así
 * que lo que quede sembrado pasó por las mismas validaciones que un usuario.
 *
 * Por día hábil crea una planilla con cosecha y una labor rotativa, la
 * aprueba, y cada cierto número de días despacha un viaje con las cosechas
 * acumuladas y lo deja finalizado.
 *
 * ── Cómo se usa ──────────────────────────────────────────────────────────
 *
 *   # Ver qué haría, sin escribir nada (es lo que hace por defecto):
 *   node scripts/sembrar-anio.mjs --token "eyJ..." --tenant 5 --anio 2025
 *
 *   # Escribir de verdad:
 *   node scripts/sembrar-anio.mjs --token "eyJ..." --tenant 5 --anio 2025 --ejecutar
 *
 *   # Un mes, para tantear primero:
 *   node scripts/sembrar-anio.mjs --token "..." --tenant 5 \
 *     --desde 2025-01-01 --hasta 2025-01-31 --ejecutar
 *
 * El token sale de la aplicación con la sesión abierta: en la consola del
 * navegador, `localStorage.palmapp_token`. El tenant, de
 * `localStorage.palmapp_tenant_id`.
 *
 * ── Opciones ─────────────────────────────────────────────────────────────
 *
 *   --token       JWT de la sesión. Obligatorio.
 *   --tenant      Id de la finca. Obligatorio.
 *   --api         URL del backend. Por defecto la de .env.
 *   --anio        Año completo. Atajo de --desde/--hasta.
 *   --desde       YYYY-MM-DD.
 *   --hasta       YYYY-MM-DD.
 *   --colabs      Cédulas o ids separados por coma. Por defecto, los 3
 *                 primeros colaboradores activos de la finca.
 *   --viaje-cada  Días entre viajes. Por defecto 3.
 *   --pausa       Milisegundos entre llamadas. Por defecto 250, para no
 *                 chocar con el límite de intentos del backend.
 *   --ejecutar    Sin esto no escribe nada.
 *
 * ── Antes de correrlo contra una finca con datos reales ──────────────────
 *
 * Esto crea cientos de registros que después hay que borrar a mano, uno por
 * uno, desde la aplicación. Córralo primero sin `--ejecutar`, mire el
 * resumen, y después pruebe con un mes antes de soltar el año entero.
 */

// ── Argumentos ───────────────────────────────────────────────────────────────

function leerArgumentos(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const clave = a.slice(2);
    const siguiente = argv[i + 1];
    if (!siguiente || siguiente.startsWith('--')) {
      args[clave] = true;
    } else {
      args[clave] = siguiente;
      i++;
    }
  }
  return args;
}

const args = leerArgumentos(process.argv.slice(2));

const API = (args.api ?? 'https://back.palmapp.com.co/api').replace(/\/+$/, '');
const TOKEN = args.token;
const TENANT = args.tenant;
const EJECUTAR = args.ejecutar === true;
const PAUSA = Number(args.pausa ?? 250);
const VIAJE_CADA = Number(args['viaje-cada'] ?? 3);

if (!TOKEN || !TENANT) {
  console.error('Faltan --token y --tenant. Vea el encabezado del archivo.');
  process.exit(1);
}

const { desde, hasta } = (() => {
  if (args.anio) return { desde: `${args.anio}-01-01`, hasta: `${args.anio}-12-31` };
  if (args.desde && args.hasta) return { desde: args.desde, hasta: args.hasta };
  const anio = new Date().getFullYear() - 1;
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
})();

// ── Llamadas a la API ────────────────────────────────────────────────────────

let llamadas = 0;

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Una llamada a la API con los mismos encabezados que manda la aplicación.
 * En modo de prueba los GET sí se hacen, porque hay que leer los catálogos;
 * lo que no se manda es nada que escriba.
 */
async function api(metodo, ruta, cuerpo) {
  if (EJECUTAR === false && metodo !== 'GET') {
    return { simulado: true };
  }

  llamadas++;
  if (llamadas > 1) await esperar(PAUSA);

  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Tenant-Id': String(TENANT),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });

  const texto = await res.text();
  let datos;
  try {
    datos = texto ? JSON.parse(texto) : {};
  } catch {
    datos = { message: texto.slice(0, 200) };
  }

  if (!res.ok) {
    const detalle = datos.errors
      ? Object.values(datos.errors).flat().join(' · ')
      : datos.message ?? res.statusText;
    throw new Error(`${metodo} ${ruta} → ${res.status}: ${detalle}`);
  }
  return datos;
}

// ── Fechas ───────────────────────────────────────────────────────────────────

/** Los días del rango, sin domingos: en la finca no se levanta planilla. */
function diasHabiles(desdeIso, hastaIso) {
  const dias = [];
  const fin = new Date(`${hastaIso}T12:00:00`);
  const cursor = new Date(`${desdeIso}T12:00:00`);

  while (cursor <= fin) {
    if (cursor.getDay() !== 0) {
      dias.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// ── Datos de la finca ────────────────────────────────────────────────────────

/**
 * Los catálogos salen del mismo bundle que usa el wizard, así que el script
 * trabaja con las labores, los lotes y la gente que la finca tiene de verdad.
 */
async function leerCatalogos() {
  const bundle = await api('GET', '/v1/tenant/operaciones/wizard-init');
  const p = bundle.data?.parametricas ?? {};

  const transportadores = await api('GET', '/v1/tenant/transportadores?per_page=5&estado=true');
  const extractoras = await api('GET', '/v1/tenant/extractoras/select');

  return {
    colaboradores: p.colaboradores ?? [],
    lotes: p.lotes ?? [],
    sublotes: p.sublotes ?? [],
    insumos: p.insumos ?? [],
    laboresPalma: p.labores_palma ?? [],
    laboresFinca: p.labores_finca ?? [],
    transportadores: transportadores.data ?? [],
    extractoras: extractoras.data ?? [],
  };
}

/** Los colaboradores con los que se va a sembrar: los pedidos o los 3 primeros. */
function escogerColaboradores(todos) {
  if (!args.colabs) return todos.slice(0, 3);

  const pedidos = String(args.colabs).split(',').map((s) => s.trim());
  return todos.filter((c) =>
    pedidos.includes(String(c.id)) || pedidos.includes(String(c.documento)));
}

function laborPorTipo(labores, tipo) {
  return labores.find((l) => l.tipo === tipo) ?? null;
}

// ── Un día de trabajo ────────────────────────────────────────────────────────

/** Los gajos de un día: varían con la fecha para que no salgan todos iguales. */
function gajosDelDia(fecha) {
  const dia = Number(fecha.slice(8, 10));
  const mes = Number(fecha.slice(5, 7));
  // Más fruto entre marzo y mayo, como en una cosecha de verdad.
  const temporada = mes >= 3 && mes <= 5 ? 1.4 : 1;
  return Math.round((140 + ((dia * 37) % 120)) * temporada);
}

/**
 * La labor que toca ese día. Se rota para que el año tenga de todo y no
 * trescientas planillas idénticas.
 */
function laborDelDia(cat, indice) {
  const rotacion = ['PLATEO', 'PODA', 'FERTILIZACION', 'SANIDAD'];
  const tipo = rotacion[indice % rotacion.length];
  return laborPorTipo(cat.laboresPalma, tipo);
}

function armarJornal(cat, labor, colaborador, lote) {
  const base = {
    labor_id: labor.id,
    empleado_id: colaborador.id,
    lote_id: lote.id,
  };

  if (labor.tipo === 'FERTILIZACION') {
    const insumo = cat.insumos[0];
    return {
      ...base,
      cantidad_palmas: 80 + (colaborador.id % 40),
      ...(insumo ? { insumo_id: insumo.id, gramos_por_palma: 250 } : {}),
    };
  }

  if (labor.tipo === 'SANIDAD') {
    return { ...base, descripcion: 'Control de plagas y fumigación' };
  }

  return { ...base, cantidad_palmas: 90 + (colaborador.id % 60) };
}

/**
 * Crea la planilla del día con su cosecha y su labor, y la aprueba.
 * Devuelve los ids de las cosechas, que son los que después se despachan.
 */
async function sembrarDia(cat, colaboradores, fecha, indice) {
  const planilla = await api('POST', '/v1/tenant/operaciones', {
    fecha,
    elaborado_por: 'Datos de prueba',
    hora_inicio: '06:00',
    hubo_lluvia: indice % 7 === 0,
    cantidad_lluvia: indice % 7 === 0 ? 12 : null,
    observaciones: 'Planilla generada para pruebas',
  });

  const operacionId = planilla.data?.id;
  if (!operacionId) return { cosechas: [] };

  // Cosecha: toda la cuadrilla en un lote, que es como se corta.
  const lote = cat.lotes[indice % cat.lotes.length];
  const sublote = cat.sublotes.find((s) => s.lote_id === lote.id) ?? null;

  const cosecha = await api('POST', `/v1/tenant/operaciones/${operacionId}/cosechas`, {
    lote_id: lote.id,
    sublote_id: sublote?.id ?? null,
    gajos_reportados: gajosDelDia(fecha),
    cuadrilla: colaboradores.map((c) => ({ empleado_id: c.id })),
  });

  // Labor de palma: una persona distinta cada día, para repartir el trabajo.
  const labor = laborDelDia(cat, indice);
  if (labor) {
    const quien = colaboradores[indice % colaboradores.length];
    const loteLabor = cat.lotes[(indice + 1) % cat.lotes.length];
    await api(
      'POST',
      `/v1/tenant/operaciones/${operacionId}/jornales`,
      armarJornal(cat, labor, quien, loteLabor),
    );
  }

  await api('POST', `/v1/tenant/operaciones/${operacionId}/aprobar`);

  return { operacionId, cosechas: cosecha.data?.id ? [cosecha.data.id] : [] };
}

// ── Un viaje ─────────────────────────────────────────────────────────────────

/**
 * Despacha las cosechas acumuladas y deja el viaje finalizado, que es el
 * estado donde ya tiene peso de báscula y promedio kg/gajo.
 */
async function sembrarViaje(cat, fecha, cosechaIds) {
  if (cosechaIds.length === 0) return false;

  const transportador = cat.transportadores[0];
  const extractora = cat.extractoras[0];
  if (!transportador || !extractora) return false;

  const viaje = await api('POST', '/v1/tenant/viajes', {
    fecha_viaje: fecha,
    hora_salida: '05:45',
    transportador_id: transportador.id,
    extractora_id: extractora.id,
    observaciones: 'Viaje generado para pruebas',
  });

  const viajeId = viaje.data?.id;
  if (!viajeId) return false;

  for (const cosechaId of cosechaIds) {
    await api('POST', `/v1/tenant/viajes/${viajeId}/detalles`, { cosecha_id: cosechaId });
  }

  // Sin reconteo: cada cosecha va completa, como cuando el camión se lleva
  // todo lo cortado.
  await api('POST', `/v1/tenant/viajes/${viajeId}/saltar-validacion`, {
    observaciones: 'Despacho directo',
  });

  // El peso de la báscula: unos 14 kg por gajo, que es un promedio normal.
  await api('PATCH', `/v1/tenant/viajes/${viajeId}/validar`, {
    peso_viaje: cosechaIds.length * 2400,
    numero_remision_extractora: `TQ-${fecha.replace(/-/g, '')}`,
    fecha_llegada: fecha,
    hora_llegada: '09:30',
    fruto_verde: 2,
    sobre_maduro: 1,
  });

  await api('POST', `/v1/tenant/viajes/${viajeId}/finalizar`);
  return true;
}

// ── Programa ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(`  Backend  ${API}`);
  console.log(`  Finca    ${TENANT}`);
  console.log(`  Rango    ${desde} a ${hasta}`);
  console.log(`  Modo     ${EJECUTAR ? 'ESCRIBIENDO DE VERDAD' : 'simulación, no escribe nada'}`);
  console.log('');

  const cat = await leerCatalogos();
  const colaboradores = escogerColaboradores(cat.colaboradores);

  if (colaboradores.length === 0) {
    console.error('  No hay colaboradores para sembrar. Revise --colabs.');
    process.exit(1);
  }
  if (cat.lotes.length === 0) {
    console.error('  La finca no tiene lotes: sin eso no se puede cosechar.');
    process.exit(1);
  }

  console.log('  Cuadrilla:');
  colaboradores.forEach((c) => console.log(`    ${c.id}  ${c.nombre_completo ?? c.documento}`));
  console.log(`  Lotes: ${cat.lotes.length} · Labores de palma: ${cat.laboresPalma.length}`);
  console.log(`  Transportadores: ${cat.transportadores.length} · Extractoras: ${cat.extractoras.length}`);
  console.log('');

  const dias = diasHabiles(desde, hasta);
  const resumen = { planillas: 0, viajes: 0, fallos: [] };
  let pendientes = [];

  for (const [indice, fecha] of dias.entries()) {
    try {
      const { cosechas } = await sembrarDia(cat, colaboradores, fecha, indice);
      resumen.planillas++;
      pendientes.push(...cosechas);

      if ((indice + 1) % VIAJE_CADA === 0 && pendientes.length > 0) {
        if (await sembrarViaje(cat, fecha, pendientes)) resumen.viajes++;
        pendientes = [];
      }
    } catch (e) {
      resumen.fallos.push(`${fecha}: ${e.message}`);
    }

    if ((indice + 1) % 25 === 0) {
      console.log(`  ${indice + 1} de ${dias.length} días · ${resumen.fallos.length} con problema`);
    }
  }

  console.log('');
  console.log(`  Días recorridos  ${dias.length}`);
  console.log(`  Planillas        ${resumen.planillas}`);
  console.log(`  Viajes           ${resumen.viajes}`);
  console.log(`  Con problema     ${resumen.fallos.length}`);

  if (resumen.fallos.length > 0) {
    console.log('');
    console.log('  Los primeros problemas:');
    resumen.fallos.slice(0, 10).forEach((f) => console.log(`    ${f}`));
  }

  if (!EJECUTAR) {
    console.log('');
    console.log('  Nada de esto se escribió. Agregue --ejecutar cuando quiera hacerlo.');
  }
  console.log('');
}

main().catch((e) => {
  console.error(`\n  Se detuvo: ${e.message}\n`);
  process.exit(1);
});
