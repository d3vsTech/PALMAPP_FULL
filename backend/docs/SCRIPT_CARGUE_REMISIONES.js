/**
 * Cargue masivo de remisiones de extractora, para cualquier mes.
 *
 * Se pega entero en la consola del navegador (F12) con PalmApp abierto y la
 * sesion iniciada. El token y el tenant salen de `localStorage`, asi que no
 * hay nada que copiar a mano.
 *
 * A diferencia del script de enero, aqui no hay tabla de datos embebida: los
 * pesos, fechas y calificaciones los lee el OCR del backend de cada foto
 * (API_VIAJES_OCR_BASCULA.md). Usted solo escoge las fotos y revisa.
 *
 * Tres pasos, y cada uno se revisa antes de pasar al siguiente:
 *
 *   1. Emparejar   fotos <-> viajes pendientes, en orden. Se puede corregir
 *                  fila por fila antes de seguir.
 *   2. Leer        por cada par: pasa el viaje a EN_VALIDACION si hace falta,
 *                  sube la foto y espera el OCR. No escribe nada en el viaje.
 *   3. Finalizar   PATCH /validar con lo que leyo el OCR + POST /finalizar.
 *                  Este es el unico paso que cierra viajes.
 *
 * Reglas de seguridad:
 *   - Los viajes FINALIZADOS nunca aparecen ni se tocan.
 *   - Una fila sin algun campo critico no se finaliza.
 *   - Una fila con placa que no coincide no se finaliza, salvo que lo marque.
 */
(() => {
  'use strict';

  const API = 'https://back.palmapp.com.co/api';
  const ESPERA_OCR = 2500;   // ms entre consultas del estado del OCR
  const INTENTOS_OCR = 24;   // tope por foto, ~60 s
  const MAX_PAGINAS = 25;

  /** Los 10 campos que `PATCH /validar` persiste en el viaje. */
  const CAMPOS_VALIDAR = [
    'peso_viaje', 'numero_remision_extractora', 'fecha_llegada', 'hora_llegada',
    'fruto_verde', 'sobre_maduro', 'podrido', 'pedunculo_largo', 'mal_formado',
    'observaciones_extractora',
  ];
  /** Sin estos cuatro el viaje no se puede cerrar bien. */
  const CRITICOS = ['peso_viaje', 'numero_remision_extractora', 'fecha_llegada', 'hora_llegada'];

  // ── Sesion ────────────────────────────────────────────────────────────────

  const token = localStorage.getItem('palmapp_token');
  const tenant = localStorage.getItem('palmapp_tenant_id');
  if (!token || !tenant) {
    alert('No hay sesion de PalmApp en esta pestana. Entre a la app y vuelva a pegar el script.');
    return;
  }

  // ── Cliente HTTP ──────────────────────────────────────────────────────────

  async function pedir(metodo, ruta, opciones = {}) {
    const cabeceras = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'X-Tenant-Id': String(tenant),
    };
    const init = { method: metodo, headers: cabeceras };
    if (opciones.json) {
      cabeceras['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opciones.json);
    }
    // Con FormData no se toca Content-Type: lo pone el browser con su boundary.
    if (opciones.form) init.body = opciones.form;

    const res = await fetch(API + ruta, init);
    const texto = await res.text();
    let cuerpo = {};
    if (texto) {
      try {
        cuerpo = JSON.parse(texto);
      } catch (e) {
        cuerpo = { crudo: texto.slice(0, 300) };
      }
    }
    if (!res.ok) {
      const detalle = cuerpo.message || cuerpo.crudo || res.statusText;
      throw new Error(res.status + ' ' + detalle);
    }
    return cuerpo;
  }

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── Utilidades ────────────────────────────────────────────────────────────

  /** `REM-2026-015` -> 15. Sirve para ordenar y para filtrar por rango. */
  function consecutivo(remision) {
    const m = String(remision || '').match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /** `19-36`, `19`, o vacio para no filtrar. */
  function parseRango(texto) {
    const limpio = String(texto || '').trim();
    if (!limpio) return null;
    const m = limpio.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return null;
    const desde = parseInt(m[1], 10);
    return { desde, hasta: m[2] ? parseInt(m[2], 10) : desde };
  }

  const fmt = (n, dec = 0) =>
    Number(n).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  function faltantes(datos) {
    if (!datos) return CRITICOS.slice();
    return CRITICOS.filter((c) => datos[c] === null || datos[c] === undefined || datos[c] === '');
  }

  function cuerpoValidar(datos) {
    const salida = {};
    for (const campo of CAMPOS_VALIDAR) {
      const valor = datos[campo];
      if (valor !== null && valor !== undefined && valor !== '') salida[campo] = valor;
    }
    return salida;
  }

  // ── Datos del tenant ──────────────────────────────────────────────────────

  /** Viajes que todavia se pueden cerrar, ordenados por consecutivo. */
  async function traerPendientes() {
    const todos = [];
    let pagina = 1;
    while (pagina <= MAX_PAGINAS) {
      const res = await pedir('GET', `/v1/tenant/viajes?per_page=200&page=${pagina}`);
      todos.push(...(res.data || []));
      const meta = res.meta || {};
      if (pagina >= (meta.last_page || 1)) break;
      pagina += 1;
    }
    return todos
      .filter((v) => v.estado !== 'FINALIZADO')
      .sort((a, b) => consecutivo(a.remision) - consecutivo(b.remision));
  }

  // ── Estado de la corrida ──────────────────────────────────────────────────

  const estado = {
    pendientes: [],   // viajes que se pueden cerrar
    candidatos: [],   // pendientes ya filtrados por rango
    fotos: [],        // File[]
    pares: [],        // { foto, viajeId, lectura, resultado }
  };

  // ── Paso 1: emparejar ─────────────────────────────────────────────────────

  async function emparejar() {
    const rango = parseRango(campoRango.value);
    if (campoRango.value.trim() && !rango) {
      return avisar('El rango no se entiende. Use algo como 19-36.');
    }
    if (!estado.fotos.length) return avisar('Primero escoja las fotos.');

    avisar('Trayendo los viajes...');
    estado.pendientes = await traerPendientes();
    estado.candidatos = rango
      ? estado.pendientes.filter((v) => {
          const n = consecutivo(v.remision);
          return n >= rango.desde && n <= rango.hasta;
        })
      : estado.pendientes;

    estado.pares = estado.fotos.map((foto, i) => ({
      foto,
      viajeId: estado.candidatos[i] ? estado.candidatos[i].id : null,
      lectura: null,
      resultado: null,
    }));

    pintarEmparejamiento();
  }

  function viajePorId(id) {
    return estado.pendientes.find((v) => v.id === id) || null;
  }

  function duplicados() {
    const vistos = new Set();
    const repetidos = new Set();
    for (const par of estado.pares) {
      if (par.viajeId === null) continue;
      if (vistos.has(par.viajeId)) repetidos.add(par.viajeId);
      vistos.add(par.viajeId);
    }
    return repetidos;
  }

  function pintarEmparejamiento() {
    const repetidos = duplicados();
    const opciones = (sel) =>
      ['<option value="">— no cargar —</option>']
        .concat(
          estado.candidatos.map(
            (v) =>
              `<option value="${v.id}"${v.id === sel ? ' selected' : ''}>` +
              `${v.remision} · ${v.fecha_viaje} · ${v.placa_vehiculo} · ${v.estado}</option>`,
          ),
        )
        .join('');

    const filas = estado.pares
      .map(
        (par, i) => `
      <tr${repetidos.has(par.viajeId) ? ' style="background:#fee2e2"' : ''}>
        <td style="padding:4px 6px;white-space:nowrap">${par.foto.name}</td>
        <td style="padding:4px 6px"><select data-par="${i}" style="width:100%;font-size:11px">${opciones(par.viajeId)}</select></td>
      </tr>`,
      )
      .join('');

    salida.innerHTML = `
      <p style="margin:0 0 6px">${estado.fotos.length} fotos · ${estado.candidatos.length} viajes pendientes en el rango.</p>
      ${repetidos.size ? '<p style="margin:0 0 6px;color:#b91c1c">Hay viajes repetidos. Corrijalos antes de seguir.</p>' : ''}
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="text-align:left;border-bottom:1px solid #ddd">
          <th style="padding:4px 6px">Foto</th><th style="padding:4px 6px">Viaje</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>`;

    salida.querySelectorAll('select[data-par]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const i = Number(sel.dataset.par);
        estado.pares[i].viajeId = sel.value ? Number(sel.value) : null;
        pintarEmparejamiento();
      });
    });
  }

  // ── Paso 2: leer con el OCR ───────────────────────────────────────────────

  /** El upload exige EN_VALIDACION. Un viaje en CREADO se adelanta aqui. */
  async function asegurarValidacion(viaje) {
    if (viaje.estado !== 'CREADO') return;
    await pedir('POST', `/v1/tenant/viajes/${viaje.id}/saltar-validacion`, { json: {} });
    viaje.estado = 'EN_VALIDACION';
  }

  async function esperarOcr(viajeId, docId) {
    const ruta = `/v1/tenant/viajes/${viajeId}/documento-bascula/${docId}`;
    for (let i = 0; i < INTENTOS_OCR; i += 1) {
      const doc = (await pedir('GET', ruta)).data || {};
      if (['COMPLETADO', 'REVISION_MANUAL', 'FALLIDO'].includes(doc.estado_ocr)) return doc;
      await dormir(ESPERA_OCR);
    }
    return { estado_ocr: 'PENDIENTE', datos_extraidos: null };
  }

  async function leerUno(par) {
    const viaje = viajePorId(par.viajeId);
    if (!viaje) throw new Error('viaje no encontrado');
    await asegurarValidacion(viaje);

    const form = new FormData();
    form.append('documento', par.foto, par.foto.name);
    const subida = await pedir('POST', `/v1/tenant/viajes/${viaje.id}/documento-bascula`, { form });
    const docId = (subida.data || {}).documento_id;
    if (!docId) throw new Error('el backend no devolvio documento_id');

    par.lectura = await esperarOcr(viaje.id, docId);
  }

  async function leer() {
    if (duplicados().size) return avisar('Hay viajes repetidos. Corrijalos antes de leer.');
    const activos = estado.pares.filter((p) => p.viajeId !== null);
    if (!activos.length) return avisar('No hay ninguna foto asignada a un viaje.');

    bloquear(true);
    for (let i = 0; i < activos.length; i += 1) {
      const par = activos[i];
      const viaje = viajePorId(par.viajeId);
      avisar(`Leyendo ${i + 1} de ${activos.length}: ${viaje.remision}...`);
      try {
        await leerUno(par);
      } catch (e) {
        par.lectura = { estado_ocr: 'ERROR_SUBIDA', error_mensaje: String(e.message || e) };
      }
      pintarLectura();
    }
    bloquear(false);
    avisar('Lectura terminada. Revise la tabla antes de finalizar.');
  }

  // ── Revision ──────────────────────────────────────────────────────────────

  function diagnostico(par) {
    const doc = par.lectura;
    if (!doc) return { clase: 'espera', texto: 'sin leer', listo: false };
    if (!doc.datos_extraidos) {
      return { clase: 'malo', texto: doc.estado_ocr + (doc.error_mensaje ? ': ' + doc.error_mensaje : ''), listo: false };
    }
    const falta = faltantes(doc.datos_extraidos);
    if (falta.length) return { clase: 'malo', texto: 'falta ' + falta.join(', '), listo: false };
    // Un peso en cero pasa el chequeo de "campo presente" pero cierra mal el
    // viaje: el promedio kg/gajo del lote quedaria en cero.
    if (Number(doc.datos_extraidos.peso_viaje) <= 0) {
      return { clase: 'malo', texto: 'peso en cero', listo: false };
    }

    const placa = (doc.validaciones_cruzadas || {}).placa || {};
    if (placa.coincide === false) {
      return { clase: 'duda', texto: `placa leida ${placa.extraido} ≠ ${placa.esperado}`, listo: ignorarPlaca.checked };
    }
    if (doc.estado_ocr === 'REVISION_MANUAL') {
      return { clase: 'duda', texto: 'confianza baja, revise', listo: true };
    }
    return { clase: 'bueno', texto: 'ok', listo: true };
  }

  const COLOR = { bueno: '#dcfce7', duda: '#fef9c3', malo: '#fee2e2', espera: '#f3f4f6' };

  function pintarLectura() {
    const activos = estado.pares.filter((p) => p.viajeId !== null);
    const filas = activos
      .map((par) => {
        const viaje = viajePorId(par.viajeId);
        const d = (par.lectura || {}).datos_extraidos || {};
        const diag = diagnostico(par);
        return `
      <tr style="background:${COLOR[diag.clase]}">
        <td style="padding:4px 6px;white-space:nowrap">${viaje.remision}</td>
        <td style="padding:4px 6px;text-align:right">${d.peso_viaje != null ? fmt(d.peso_viaje) : '—'}</td>
        <td style="padding:4px 6px">${d.numero_remision_extractora || '—'}</td>
        <td style="padding:4px 6px;white-space:nowrap">${d.fecha_llegada || '—'} ${d.hora_llegada || ''}</td>
        <td style="padding:4px 6px">${(par.lectura || {}).confianza || '—'}</td>
        <td style="padding:4px 6px">${par.resultado || diag.texto}</td>
      </tr>`;
      })
      .join('');

    const listos = activos.filter((p) => diagnostico(p).listo).length;
    const kilos = activos.reduce(
      (s, p) => s + Number((((p.lectura || {}).datos_extraidos) || {}).peso_viaje || 0),
      0,
    );
    salida.innerHTML = `
      <p style="margin:0 0 6px">${listos} de ${activos.length} listos para finalizar · ${fmt(kilos)} kg leidos.</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="text-align:left;border-bottom:1px solid #ddd">
          <th style="padding:4px 6px">Viaje</th><th style="padding:4px 6px;text-align:right">Peso</th>
          <th style="padding:4px 6px">Rem.extr.</th><th style="padding:4px 6px">Llegada</th>
          <th style="padding:4px 6px">Conf.</th><th style="padding:4px 6px">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>`;
  }

  // ── Paso 3: finalizar ─────────────────────────────────────────────────────

  async function finalizarUno(par) {
    const viaje = viajePorId(par.viajeId);
    const datos = par.lectura.datos_extraidos;
    await pedir('PATCH', `/v1/tenant/viajes/${viaje.id}/validar`, { json: cuerpoValidar(datos) });
    const res = await pedir('POST', `/v1/tenant/viajes/${viaje.id}/finalizar`, { json: {} });
    const avisos = (res.advertencias || []).map((a) => a.message || a.code).filter(Boolean);
    par.resultado = 'FINALIZADO' + (avisos.length ? ' · ' + avisos.join(' · ') : '');
  }

  async function finalizar() {
    const listos = estado.pares.filter((p) => p.viajeId !== null && diagnostico(p).listo);
    if (!listos.length) return avisar('No hay ninguna fila lista para finalizar.');
    if (!confirm(`Se van a cerrar ${listos.length} viajes. ¿Sigo?`)) return;

    bloquear(true);
    for (let i = 0; i < listos.length; i += 1) {
      avisar(`Finalizando ${i + 1} de ${listos.length}...`);
      try {
        await finalizarUno(listos[i]);
      } catch (e) {
        listos[i].resultado = 'ERROR ' + String(e.message || e);
      }
      pintarLectura();
    }
    bloquear(false);
    avisar('Listo. Recargue la pantalla de viajes para verlos cerrados.');
  }

  // ── Panel ─────────────────────────────────────────────────────────────────

  document.getElementById('panel-remisiones')?.remove();

  const panel = document.createElement('div');
  panel.id = 'panel-remisiones';
  panel.style.cssText = [
    'position:fixed', 'right:16px', 'bottom:16px', 'width:600px', 'max-height:78vh',
    'overflow:auto', 'z-index:2147483647', 'background:#fff', 'color:#111',
    'border:1px solid #cbd5e1', 'border-radius:10px', 'padding:14px',
    'box-shadow:0 10px 30px rgba(0,0,0,.25)', 'font:12px/1.45 system-ui,sans-serif',
  ].join(';');
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:13px">Cargue de remisiones</strong>
      <button id="rem-cerrar" style="border:0;background:transparent;cursor:pointer;font-size:16px">×</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <label>Remisiones <input id="rem-rango" placeholder="ej. 19-36" style="width:90px;padding:3px 6px"></label>
      <input id="rem-fotos" type="file" accept="image/*,application/pdf" multiple style="flex:1">
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button id="rem-emparejar" style="padding:5px 10px;cursor:pointer">1. Emparejar</button>
      <button id="rem-leer" style="padding:5px 10px;cursor:pointer">2. Leer remisiones</button>
      <button id="rem-finalizar" style="padding:5px 10px;cursor:pointer">3. Finalizar</button>
      <label style="margin-left:auto"><input id="rem-placa" type="checkbox"> finalizar aunque la placa no cuadre</label>
    </div>
    <div id="rem-aviso" style="margin-bottom:8px;color:#334155;min-height:16px"></div>
    <div id="rem-salida"></div>`;
  document.body.appendChild(panel);

  const campoRango = panel.querySelector('#rem-rango');
  const campoFotos = panel.querySelector('#rem-fotos');
  const ignorarPlaca = panel.querySelector('#rem-placa');
  const salida = panel.querySelector('#rem-salida');
  const aviso = panel.querySelector('#rem-aviso');
  const botones = ['#rem-emparejar', '#rem-leer', '#rem-finalizar'].map((s) => panel.querySelector(s));

  function avisar(texto) {
    aviso.textContent = texto;
    console.log('[remisiones]', texto);
  }
  function bloquear(si) {
    botones.forEach((b) => { b.disabled = si; });
  }
  function correr(fn) {
    return () => {
      Promise.resolve(fn()).catch((e) => {
        bloquear(false);
        avisar('Error: ' + String(e.message || e));
        console.error(e);
      });
    };
  }

  campoFotos.addEventListener('change', () => {
    estado.fotos = Array.from(campoFotos.files).sort((a, b) => a.name.localeCompare(b.name));
    avisar(`${estado.fotos.length} fotos escogidas. Dele a "1. Emparejar".`);
  });
  ignorarPlaca.addEventListener('change', () => { if (estado.pares.length) pintarLectura(); });
  panel.querySelector('#rem-cerrar').addEventListener('click', () => panel.remove());
  panel.querySelector('#rem-emparejar').addEventListener('click', correr(emparejar));
  panel.querySelector('#rem-leer').addEventListener('click', correr(leer));
  panel.querySelector('#rem-finalizar').addEventListener('click', correr(finalizar));

  window.remisiones = { estado, emparejar, leer, finalizar };
  avisar('Escoja las fotos del mes y dele a "1. Emparejar".');
})();
