# Migración del wizard de colaborador al endpoint `wizard-init`

> **Para:** equipo frontend (repo `PALMAPP_FULL/frontend/`)
> **De:** equipo backend (agro-campo)
> **Fecha:** 2026-05-15

## Resumen ejecutivo

El wizard de creación/edición de colaboradores hoy dispara **8 peticiones HTTP en paralelo** al montar (`predios`, `documento-categorias`, `eps/select`, `arl/select`, `fondos-pension/select`, `entidades-bancarias/select`, `departamentos` y `colaboradores/{id}`). Cada una paga el costo completo del stack de autenticación + tenant resolution + permisos en el backend — con 8 requests en paralelo eso suma hasta 10 s de latencia total visible para el usuario.

El backend ahora expone **un endpoint bundle** que devuelve toda esa información en una sola respuesta. La migración del wizard frontend reduce 8 round-trips a 1, eliminando ~6× el overhead de middleware y aprovechando un caché aplicativo del lado del servidor.

**Latencia esperada después de la migración:** <1 s en segunda visita, <2 s en cold cache (vs. ~10 s actual).

---

## El endpoint nuevo

### Modo edición

```
GET /api/v1/tenant/colaboradores/{id}/wizard-init
Authorization: Bearer {palmapp_token}
X-Tenant-Id: {palmapp_tenant_id}
```

Permiso requerido: `colaboradores.ver`.

### Modo creación

```
GET /api/v1/tenant/colaboradores/wizard-init
```

Permiso requerido: `colaboradores.crear`. La respuesta es idéntica salvo que `data.colaborador` viene `null`.

### Forma de la respuesta

```json
{
  "data": {
    "colaborador": {
      "id": 18,
      "primer_nombre": "Juan",
      "segundo_nombre": "Carlos",
      "primer_apellido": "Pérez",
      "segundo_apellido": "López",
      "tipo_documento": "CC",
      "documento": "1098765432",
      "fecha_nacimiento": "1990-05-15",
      "fecha_expedicion_documento": "2008-06-01",
      "lugar_expedicion": "Bucaramanga",
      "cargo": "Jornalero",
      "salario_base": "1423500.00",
      "modalidad_pago": "PRODUCCION",
      "correo_electronico": "juan@email.com",
      "telefono": "3001234567",
      "direccion": "Calle 45 #12-30",
      "municipio": "Barrancabermeja",
      "departamento": "Santander",
      "eps": "Sura",
      "fondo_pension": "Porvenir",
      "arl": "Sura",
      "caja_compensacion": "Cafam",
      "talla_camisa": "M",
      "talla_pantalon": "32",
      "talla_calzado": "42",
      "tipo_cuenta": "AHORROS",
      "entidad_bancaria": "Bancolombia",
      "numero_cuenta": "04512345678",
      "contacto_emergencia_nombre": "María López",
      "contacto_emergencia_telefono": "3109876543",
      "fecha_ingreso": "2025-01-15",
      "fecha_retiro": null,
      "estado": true,
      "avatar_url": null,
      "predio": { "id": 1, "nombre": "Finca El Palmar" },
      "contrato_vigente": { "...": "..." }
    },
    "parametricas": {
      "predios":              [ { "id": 1, "nombre": "Finca El Palmar", "estado": true } ],
      "eps":                  [ { "id": 1, "nombre": "Sura" } ],
      "arl":                  [ { "id": 1, "nombre": "Positiva" } ],
      "fondos_pension":       [ { "id": 1, "nombre": "Porvenir" } ],
      "entidades_bancarias":  [ { "id": 1, "nombre": "Bancolombia" } ],
      "departamentos":        [ { "codigo": "68", "nombre": "Santander" } ],
      "documento_categorias": {
        "DATOS_BASE": {
          "label": "Datos base",
          "unico_por_tipo": true,
          "tipos": { "DOCUMENTO_DE_IDENTIDAD": "Documento de identidad", "...": "..." }
        },
        "...": "..."
      }
    }
  }
}
```

---

## Cambios a aplicar

### 1. Agregar método al cliente API

Archivo: `src/api/colaboradores.ts`

Agregar:

```ts
export const colaboradoresApi = {
  // ... métodos existentes

  /**
   * Bundle init del wizard. Reemplaza 8 fetches por 1.
   * - id presente → modo edición
   * - id ausente  → modo creación
   */
  wizardInit: (id?: number | string) => {
    const path = id != null
      ? `/colaboradores/${id}/wizard-init`
      : `/colaboradores/wizard-init`;
    return requestConToken<{ data: WizardInitResponse }>(path, { method: 'GET' });
  },
};

// Tipos
export interface WizardInitResponse {
  colaborador: Colaborador | null; // null en modo creación
  parametricas: {
    predios:              Array<{ id: number; nombre: string; estado: boolean }>;
    eps:                  Array<{ id: number; nombre: string }>;
    arl:                  Array<{ id: number; nombre: string }>;
    fondos_pension:       Array<{ id: number; nombre: string }>;
    entidades_bancarias:  Array<{ id: number; nombre: string }>;
    departamentos:        Array<{ codigo: string; nombre: string }>;
    documento_categorias: Record<string, DocumentoCategoria>;
  };
}
```

Ajustar los nombres exactos a las convenciones del archivo (`requestConToken` vs `fetchConToken`, `Colaborador` vs `Empleado`, etc.).

### 2. Refactor de `NuevoColaboradorWizard.tsx`

Las líneas exactas pueden haber cambiado; los anchors a buscar son los 8 `useEffect` que hoy disparan las consultas individuales (descritos en `consultas-editar-colaborador.md`).

**Reemplazar** los 8 `useEffect` actuales (líneas ~236, 252, 280, 323, 372) por **uno solo**:

```tsx
// ── Bundle init: 1 sola petición reemplaza las 8 anteriores ──
useEffect(() => {
  let cancelled = false;
  setCargandoInit(true);

  colaboradoresApi.wizardInit(modoEdicion ? id : undefined)
    .then(({ data }) => {
      if (cancelled) return;

      const { colaborador, parametricas } = data;

      // 1. Hidratar selects con paramétricas
      setPredios(parametricas.predios);
      setEpsList(parametricas.eps);
      setArlList(parametricas.arl);
      setFondosPension(parametricas.fondos_pension);
      setBancos(parametricas.entidades_bancarias);
      setDepartamentos(parametricas.departamentos);
      setDocumentoCategorias(parametricas.documento_categorias);

      // 2. Si es edición, hidratar el form con el colaborador
      if (colaborador) {
        hidratarFormulario(colaborador); // mismo flujo que hoy usa la respuesta de /colaboradores/{id}
      }

      // 3. Refrescar sessionStorage (caché de UI para próximas navegaciones)
      sessionStorage.setItem('cache_predios',            JSON.stringify(parametricas.predios));
      sessionStorage.setItem('cache_eps',                JSON.stringify(parametricas.eps));
      sessionStorage.setItem('cache_arl',                JSON.stringify(parametricas.arl));
      sessionStorage.setItem('cache_pension',            JSON.stringify(parametricas.fondos_pension));
      sessionStorage.setItem('cache_bancos',             JSON.stringify(parametricas.entidades_bancarias));
      sessionStorage.setItem('cache_departamentos',      JSON.stringify(parametricas.departamentos));
      sessionStorage.setItem('cache_categorias_docs',    JSON.stringify(parametricas.documento_categorias));
    })
    .catch((err) => {
      if (cancelled) return;
      console.error('Error al inicializar wizard:', err);
      toast.error('No se pudo cargar el formulario. Reintenta.');
    })
    .finally(() => {
      if (!cancelled) setCargandoInit(false);
    });

  return () => { cancelled = true; };
}, [id, modoEdicion]);
```

**Eliminar** los `useEffect` viejos que hacían:
- `colaboradoresApi.listarPredios({ per_page: 100 })`
- `colaboradoresApi.documentoCategorias()`
- `Promise.all([epsApi.select(), arlApi.select(), fondosPensionApi.select(), bancosApi.select()])`
- `ubicacionApi.departamentos()`
- `colaboradoresApi.ver(id)`

**Mantener** sin cambios:
- El `useEffect` que carga **municipios** cuando cambia `deptoSel`.
- El `useEffect` que carga **documentos** del colaborador al llegar al paso 7.
- El patrón de hidratación instantánea desde `sessionStorage` (úsalo como render inicial mientras llega `wizard-init`).

### 3. Estrategia stale-while-revalidate con sessionStorage

Mantener el comportamiento que ya tenías es muy fácil con el bundle:

```tsx
const [predios, setPredios] = useState(() => readSessionCache('cache_predios') ?? []);
// ... idem para los demás

useEffect(() => {
  // ... wizardInit como en el punto 2 — sobrescribe el sessionStorage al responder
}, [id]);
```

Resultado: si el usuario abre la pantalla por segunda vez en la misma sesión, los selects aparecen poblados al instante con los datos cacheados; en paralelo llega la respuesta fresca y se sustituyen sin parpadear (si los datos no cambiaron, el setState es no-op por igualdad de referencia… o no — depende de cómo manejes la equivalencia. La pérdida es despreciable).

### 4. Overlay "Cargando datos del colaborador..."

Hoy el overlay bloquea la UI hasta que llega la respuesta de `colaboradores/{id}`. Con el bundle, el colaborador llega en el mismo response que las paramétricas, así que el flag se mantiene igual:

```tsx
const [cargandoInit, setCargandoInit] = useState(modoEdicion);
// ...
{cargandoInit && <OverlayCargandoColaborador />}
```

En modo creación, `cargandoInit` arranca en `false` (no hay colaborador que esperar) y la UI se monta inmediatamente con las paramétricas. Si querés mostrar un mini-spinner mientras llegan las paramétricas, hacelo a nivel de cada select (`disabled` + skeleton).

---

## Endpoints legacy que siguen vivos (no migrar)

Después de la migración, estos endpoints **siguen siendo necesarios** porque los usan otras pantallas:

| Endpoint | Quién lo usa |
|----------|--------------|
| `GET /predios` | Panel de Plantación, gestión de predios |
| `GET /eps/select`, `/arl/select`, `/fondos-pension/select`, `/entidades-bancarias/select` | Vistas de configuración del tenant |
| `GET /auth/departamentos`, `/auth/departamentos/{codigo}/municipios` | Otros formularios con campo de ubicación |
| `GET /colaboradores/documento-categorias` | (Nadie debería seguir usándolo solo, pero queda como fallback) |
| `GET /colaboradores/{id}` | Vista de detalle (no wizard), historial, etc. |

**No los rompas.** El endpoint `wizard-init` es aditivo, no reemplaza nada.

---

## Verificación

Después de aplicar los cambios, validar:

1. **Tiempo de carga**: abrir `/colaboradores/editar/18` en pestaña nueva de incógnito. En DevTools → Network, debe haber **1 GET** principal a `wizard-init` (en lugar de 8). Tiempo total <2 s en cold cache, <1 s en segunda visita.
2. **Modo creación**: abrir `/colaboradores/nuevo`. Debe hacer 1 GET a `colaboradores/wizard-init` (sin id). Los selects se pueblan; el form arranca vacío.
3. **Selects**: confirmar que predios, EPS, ARL, fondos pensión, bancos, departamentos y categorías de documentos aparecen correctos en cada paso.
4. **Hidratación**: en modo edición, abrir un colaborador. Todos los campos deben pre-cargarse correctamente.
5. **Municipios condicionales**: cambiar el departamento → debe pegarle a `/departamentos/{codigo}/municipios` (no cambia).
6. **Documentos paso 7**: al llegar al paso 7, debe pegarle a `/colaboradores/{id}/documentos` (no cambia).
7. **Sessión**: navegar `Editar A → Listado → Editar B`. La segunda edición debe pintar selects al instante desde sessionStorage; el bundle llega en background.

---

## Riesgos y rollback

- Si `wizard-init` falla, el wizard entero falla. En desarrollo se vio que envolviendo cada paramétrica en su propio `Cache::remember` con try/catch interno, una paramétrica caída no tumba el resto — pero el frontend igual debería mostrar un mensaje claro si la respuesta no llega.
- Rollback: si hay que volver atrás, basta con revertir el commit del refactor del wizard. Los endpoints legacy nunca se tocaron y siguen sirviendo la data.
- Compatibilidad: el endpoint nuevo requiere que el backend tenga la rama de Fase 2 desplegada. Coordinar el deploy: backend primero (los endpoints viejos siguen funcionando), luego frontend.

---

## Recomendación follow-up (no bloqueante)

El cliente HTTP actual (`src/api/request.ts`) no implementa request deduplication. Una vez estabilizada esta migración, vale la pena evaluar adoptar **TanStack Query (React Query)** con `staleTime: 5 * 60 * 1000` para el wizard:

- Reemplaza la caché manual de sessionStorage con caché en memoria controlada.
- Dedup automática si dos componentes piden el mismo endpoint.
- `useQuery({ queryKey: ['colaborador-wizard', id], queryFn: () => colaboradoresApi.wizardInit(id) })` cubre todo.
- Beneficio extra: invalidación quirúrgica desde mutaciones (al guardar el colaborador, invalida la query para que recargue datos frescos).

Esto NO es parte de esta migración — es una mejora estructural posterior.
