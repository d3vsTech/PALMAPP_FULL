# Migración del wizard de predios al endpoint `wizard-init`

> **Para:** equipo frontend (repo `PALMAPP_FULL/frontend/`)
> **De:** equipo backend (agro-campo)
> **Fecha:** 2026-05-16

## Resumen ejecutivo

El wizard de creación/edición de predios (`/plantacion/predio/nuevo?edit={id}`) sin optimización dispararía **14+ requests secuenciales al montar** para un predio mediano (3 lotes, 6 sublotes, 12 líneas), causadas por un `for await` anidado que pide sublotes uno por uno y luego líneas uno por uno.

El backend ahora expone **un endpoint bundle** que devuelve toda la estructura (predio + lotes + sublotes + líneas) junto con las paramétricas (semillas, departamentos) en una sola respuesta.

**Latencia esperada con la migración:** <300 ms en cold cache, <50 ms en segunda visita dentro del TTL del bundle.

> **Nota sobre palmas:** los sublotes pueden tener **10.000 o más palmas**. El bundle NO las incluye — solo expone los contadores (`cantidad_palmas` en sublote y línea). Las palmas se cargan en el paso 5, paginadas y de forma lazy. Ver §5.

---

## Los endpoints nuevos

### Modo edición

```
GET /api/v1/tenant/predios/{id}/wizard-init
Authorization: Bearer {palmapp_token}
X-Tenant-Id: {palmapp_tenant_id}
```

Permiso requerido: `lotes.ver`.

### Modo creación

```
GET /api/v1/tenant/predios/wizard-init
```

Permiso requerido: `lotes.crear`. La respuesta es idéntica salvo que `data.predio`, `data.lotes`, `data.sublotes` y `data.lineas` vienen vacíos / `null`.

### Forma de la respuesta

```json
{
  "data": {
    "predio": {
      "id": 6,
      "nombre": "Finca El Palmar",
      "ubicacion": "Acacías, Meta",
      "hectareas_totales": "150.00"
    },
    "lotes": [
      {
        "id": 10,
        "nombre": "Lote A",
        "hectareas_sembradas": "30.50",
        "semillas": [{ "id": 2, "nombre": "Híbrido OxG" }]
      }
    ],
    "sublotes": {
      "10": [
        {
          "id": 21,
          "nombre": "Sublote A-1",
          "cantidad_palmas": 12000,
          "cantidad_lineas": 20
        }
      ]
    },
    "lineas": {
      "21": [
        { "id": 101, "numero": 1, "cantidad_palmas": 600 },
        { "id": 102, "numero": 2, "cantidad_palmas": 600 }
      ]
    },
    "parametricas": {
      "semillas": [
        { "id": 1, "tipo": "HIBRIDO", "nombre": "Híbrido OxG" },
        { "id": 2, "tipo": "TENERA",  "nombre": "Ténera Deli" }
      ],
      "departamentos": [
        { "codigo": "50", "nombre": "Meta" },
        { "codigo": "68", "nombre": "Santander" }
      ]
    }
  }
}
```

**Puntos clave de la estructura:**
- `sublotes` es un objeto indexado por `lote_id` (string de número) para lookup directo sin `.find()`.
- `lineas` es un objeto indexado por `sublote_id`.
- Si el sublote tiene `cantidad_lineas: 0`, no habrá palmas asignadas a líneas (flujo directo por sublote).
- `departamentos` es el catálogo completo — el municipio se carga en un segundo fetch condicional (ver §4).

---

## Cambios a aplicar en el frontend

### 1. Agregar método al cliente API

**Archivo:** `src/api/predios.ts`

```ts
export const prediosApi = {
  // ... métodos existentes

  /**
   * Bundle init del wizard de predios. Reemplaza 14+ fetches por 1.
   * - id presente → modo edición
   * - id ausente  → modo creación
   */
  wizardInit: (id?: number | string) => {
    const path = id != null
      ? `/predios/${id}/wizard-init`
      : `/predios/wizard-init`;
    return requestConToken<{ data: PredioWizardInitResponse }>(path, { method: 'GET' });
  },
};

export interface PredioWizardInitResponse {
  predio: {
    id: number;
    nombre: string;
    ubicacion: string;
    hectareas_totales: string;
  } | null;
  lotes: Array<{
    id: number;
    nombre: string;
    hectareas_sembradas: string | null;
    semillas: Array<{ id: number; nombre: string }>;
  }>;
  sublotes: Record<string, Array<{
    id: number;
    nombre: string;
    cantidad_palmas: number;
    cantidad_lineas: number;
  }>>;
  lineas: Record<string, Array<{
    id: number;
    numero: number;
    cantidad_palmas: number;
  }>>;
  parametricas: {
    semillas: Array<{ id: number; tipo: string; nombre: string }>;
    departamentos: Array<{ codigo: string; nombre: string }>;
  };
}
```

Ajustar `requestConToken` al nombre real usado en el proyecto.

---

### 2. `useEffect` de inicialización en `NuevoPredioWizard.tsx`

**Reemplazar** el bloque de múltiples `useEffect` (departamentos, semillas, predio, lotes + for-await de sublotes + for-await de líneas + resumen) por **uno solo**:

```tsx
// ── Bundle init: 1 sola petición reemplaza 14+ ──
useEffect(() => {
  let cancelled = false;
  setCargandoInit(true);

  prediosApi.wizardInit(modoEdicion ? predioId : undefined)
    .then(({ data }) => {
      if (cancelled) return;

      const { predio, lotes, sublotes, lineas, parametricas } = data;

      // 1. Paramétricas (selects del wizard)
      setSemillas(parametricas.semillas);
      setDepartamentos(parametricas.departamentos);

      // 2. Estructura de la plantación
      setLotes(lotes);
      setSublotesPorLote(sublotes);     // objeto indexado por lote_id
      setLineasPorSublote(lineas);      // objeto indexado por sublote_id

      // 3. Modo edición: hidratar formulario del predio
      if (predio) {
        setPredioNombre(predio.nombre);
        setPredioHectareas(predio.hectareas_totales);
        parsearUbicacion(predio.ubicacion); // extrae pendingDepto y pendingMunicipio
      }

      // 4. Refrescar sessionStorage
      sessionStorage.setItem('cache_semillas',      JSON.stringify(parametricas.semillas));
      sessionStorage.setItem('cache_departamentos', JSON.stringify(parametricas.departamentos));
    })
    .catch((err) => {
      if (cancelled) return;
      console.error('Error al inicializar wizard de predio:', err);
      toast.error('No se pudo cargar el formulario. Reintenta.');
    })
    .finally(() => {
      if (!cancelled) setCargandoInit(false);
    });

  return () => { cancelled = true; };
}, [predioId, modoEdicion]);
```

**Eliminar** los `useEffect` legacy que hacían:
- `GET /auth/departamentos`
- `GET /lotes/semillas`
- `GET /predios/{id}`
- `GET /lotes?predio_id={id}&per_page=100`
- Loop `for await` de `GET /sublotes?lote_id={id}&per_page=100`
- Loop `for await` de `GET /lineas?sublote_id={id}&per_page=100`
- `GET /predios/{id}/resumen` (el resumen sigue llamándose después de mutaciones, no al montar)

**Mantener** sin cambios:
- El `useEffect` que carga **municipios** cuando se resuelve el depto (`departamentos/{codigo}/municipios`).
- El `useEffect` o handler que refresca el **resumen** del panel lateral después de mutaciones.
- El patrón de hidratación instantánea desde `sessionStorage`.

---

### 3. Estrategia stale-while-revalidate con sessionStorage

```tsx
// Hidratación instantánea de selects (si hay caché de sesión)
const [semillas, setSemillas] = useState<Semilla[]>(
  () => readSessionCache<Semilla[]>('cache_semillas') ?? []
);
const [departamentos, setDepartamentos] = useState<Depto[]>(
  () => readSessionCache<Depto[]>('cache_departamentos') ?? []
);

// El useEffect de wizardInit sobrescribe con datos frescos al responder
```

Resultado: al abrir el wizard por segunda vez en la sesión, los selects aparecen poblados **al instante** con datos de sessionStorage; en paralelo llega la respuesta fresca y actualiza el estado sin parpadeo visible.

---

### 4. Municipios: fetch condicional (no cambia)

Tras resolver el departamento de la ubicación del predio (parseando el campo `ubicacion`), hacer el fetch de municipios exactamente como antes:

```tsx
// Cuando se conoce el depto, cargar municipios
useEffect(() => {
  if (!deptoSel) return;
  ubicacionApi.municipios(deptoSel.codigo).then(({ data }) => setMunicipios(data));
}, [deptoSel]);
```

Este `useEffect` es condicional y no cambia con la migración. La diferencia es que `deptoSel` ahora se resuelve dentro del callback de `wizardInit` (cuando se parsea `predio.ubicacion`), en lugar de dentro del useEffect de departamentos.

---

### 5. Paso 5 — Palmas: carga lazy + paginada (CRÍTICO con >10.000 palmas)

**Este es el cambio más importante para predios grandes.**

El bundle del `wizard-init` **no incluye palmas** — solo los contadores:
- `sublote.cantidad_palmas` → total de palmas en el sublote
- `sublote.cantidad_lineas` → si > 0, el sublote tiene líneas organizativas
- `linea.cantidad_palmas` → palmas asignadas a cada línea

Al llegar al paso 5 ("Palmas"):

```tsx
// Al entrar al paso 5, cargar SOLO la primera página del sublote/línea activa
const cargarPalmasIniciales = async (subloteId: number, lineaId?: number) => {
  const params = lineaId
    ? { sublote_id: subloteId, linea_id: lineaId, per_page: 50, page: 1 }
    : { sublote_id: subloteId, per_page: 50, page: 1 };

  const { data, meta } = await palmasApi.listar(params);
  setPalmas(data);
  setPalmasMeta(meta); // { total, last_page, current_page }
};
```

**Reglas de UX:**
- Mostrar el **total** (`sublote.cantidad_palmas`) en el encabezado, no la cantidad cargada.
- "Cargar más" o infinite scroll para páginas adicionales — no cargar todo automáticamente.
- Para sublotes SIN líneas: paginación directa por `sublote_id`.
- Para sublotes CON líneas: paginar por línea activa (`sublote_id + linea_id`). Cambiar de línea carga la primera página de esa línea.
- Si el usuario necesita buscar una palma específica: usar el parámetro `search` del endpoint (`GET /palmas?sublote_id={id}&search={codigo}`).

**No hacer:**
```tsx
// ❌ NUNCA cargar todas las palmas en memoria
for (const sublote of sublotes) {
  const palmas = await palmasApi.listar({ sublote_id: sublote.id, per_page: 99999 });
}
// Para un predio con 5 sublotes de 10.000 palmas = 50.000 registros en memoria
```

---

### 6. Overlay de carga

```tsx
// En modo edición: bloquear la UI hasta que llegue el wizard-init
const [cargandoInit, setCargandoInit] = useState(modoEdicion);

// En modo creación: los selects cargan mientras el usuario interactúa
// → mostrar un skeleton/disabled en cada select individualmente
```

---

### 7. Refrescar resumen del panel lateral

El endpoint `GET /predios/{id}/resumen` ya está cacheado en el backend (TTL 60 s con invalidación en mutaciones). Seguir llamándolo después de cada mutación exitosa:

```tsx
const refrescarResumen = useCallback(async () => {
  if (!predioId) return;
  const { data } = await prediosApi.resumen(predioId);
  setResumen(data);
}, [predioId]);

// Después de crear/editar/eliminar lote, sublote o línea:
await lotesApi.crear(payload);
await refrescarResumen();
```

El backend sirve el resumen desde caché en la segunda llamada (~0 ms). La invalidación de caché ocurre automáticamente cuando el backend procesa la mutación.

---

## Endpoints legacy que siguen vivos (no eliminar)

| Endpoint | Quién lo usa |
|----------|--------------|
| `GET /predios` | Listado de plantación (admin) |
| `GET /lotes/semillas` | Sigue funcionando (ahora cacheado en backend) |
| `GET /predios/{id}/resumen` | Panel lateral del wizard (llamada post-mutación) |
| `GET /lotes`, `GET /sublotes`, `GET /lineas` | Vistas de gestión individual |
| `GET /auth/departamentos` | Otros formularios con campo ubicación |
| `GET /auth/departamentos/{codigo}/municipios` | Municipios (igual que antes) |
| `GET /palmas` | Paso 5 — palmas paginadas |

**No romper ninguno.** El `wizard-init` es aditivo.

---

## Verificación post-migración

1. **Tiempo de carga:** abrir `/plantacion/predio/nuevo?edit={id}` en pestaña de incógnito. DevTools → Network: debe haber **1 GET** a `wizard-init` + (opcionalmente) 1 GET a `municipios`. Tiempo total < 500 ms en local.
2. **Modo creación:** abrir `/plantacion/predio/nuevo`. Debe hacer 1 GET a `predios/wizard-init` (sin ID). Los selects de semillas y departamentos se pueblan; la estructura (lotes, sublotes, líneas) está vacía.
3. **Sublotes:** para cada lote, `data.sublotes[lote.id]` debe tener el array de sublotes con `cantidad_palmas` correcto.
4. **Líneas:** para cada sublote, `data.lineas[sublote.id]` debe tener el array de líneas.
5. **Hidratación:** en modo edición, el nombre del predio y las hectáreas deben pre-cargarse.
6. **Municipios:** cambiar el departamento en el paso 1 → debe disparar 1 GET a `/departamentos/{codigo}/municipios`.
7. **Mutación → resumen actualizado:** crear un lote → llamar al wizard-init de nuevo → el nuevo lote aparece; el resumen del panel refleja los nuevos datos.
8. **Palmas:** entrar al paso 5 con un sublote de 10.000 palmas → solo se cargan 50 (primera página). El encabezado muestra "12.000 palmas" (del contador), no "50".

---

## Riesgos y rollback

- Si `wizard-init` falla, el wizard entero falla. Envolver en un `.catch()` que muestre un toast y permita reintentar.
- **Rollback:** revertir el commit del refactor del wizard en el frontend. Los endpoints legacy nunca se tocaron.
- **Compatibilidad:** el endpoint `wizard-init` requiere que el backend tenga los cambios del 2026-05-16 desplegados. Deploy orden: **backend primero** (los endpoints legacy siguen funcionando), luego frontend.

---

## Recomendación follow-up (no bloqueante)

Una vez estabilizada esta migración, evaluar **TanStack Query (React Query)**:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['predio-wizard', predioId],
  queryFn: () => prediosApi.wizardInit(predioId),
  staleTime: 60_000, // 60 s (mismo TTL que el bundle del backend)
});
```

Beneficios:
- Reemplaza `sessionStorage` manual con caché en memoria controlada.
- Dedup automática si dos componentes piden el mismo wizard-init.
- Invalidación quirúrgica desde mutaciones: después de crear un lote, `queryClient.invalidateQueries(['predio-wizard', predioId])` recarga el bundle automáticamente.

Esto NO es parte de esta migración — es una mejora estructural posterior.
