# Spec: Ajustes de Cosecha (gajos clavijo)

Feature del módulo Viajes que permite cerrar cosechas con `gajos_pendientes_enviar` que se acumulan indefinidamente porque nunca existieron físicamente (error de conteo del trabajador). Alcance:

1. Alerta en el listado de Viajes cuando existen cosechas con pendientes por 3+ viajes.
2. Pantalla dedicada `/viajes/ajustes-cosecha` para resolver cada caso.
3. 3 acciones posibles: **CLAVIJO**, **REASIGNADO**, **MANTENIDO**.
4. Trazabilidad histórica en tabla dedicada (nada se pierde).

## Problema resuelto

Hoy `gajos_pendientes_enviar` es computado en tiempo real:

```
gajos_pendientes = COALESCE(gajos_reconteo, gajos_reportados) − SUM(gajos_en_viaje activos)
```

Si el trabajador reporta 220 gajos y en el reconteo aparecen 200, los 20 "clavijo" reaparecen en `/viajes/operaciones-disponibles` viaje tras viaje sin resolución.

## Nueva tabla `cosecha_ajuste`

Registro inmutable de decisiones sobre `gajos_pendientes`.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | bigint pk | |
| `tenant_id` | FK tenants | |
| `cosecha_id` | FK `registro_cosecha` restrictOnDelete | |
| `tipo` | enum | `CLAVIJO` / `REASIGNADO` / `MANTENIDO` |
| `gajos_ajustados` | integer | Cantidad que se ajusta (pendientes al momento del ajuste) |
| `motivo` | text | obligatorio, min 5 chars |
| `gajos_reportados_snapshot` | integer | valor de `registro_cosecha.gajos_reportados` al ajustar |
| `gajos_reconteo_previo` | integer nullable | valor de `registro_cosecha.gajos_reconteo` antes |
| `gajos_reconteo_nuevo` | integer nullable | valor tras el ajuste (solo cambia en CLAVIJO) |
| `viaje_destino_id` | FK viajes nullable | Solo para REASIGNADO |
| `viaje_detalle_creado_id` | FK viaje_detalle nullable | Solo para REASIGNADO, para trazabilidad |
| `silenciar_hasta_viajes` | integer nullable | Solo para MANTENIDO. Contador de viajes en los que la cosecha no vuelve a aparecer en la alerta. |
| `created_by` | FK users | |
| `created_at` | timestamp | |

**Índices**: `(tenant_id, cosecha_id)`, `(tenant_id, tipo, created_at)`.

**No hay soft-delete**: la tabla es historial puro. Se puede volver a ajustar una cosecha (nueva fila), pero nunca borrar registros previos.

## Semántica de cada tipo

### CLAVIJO
Los gajos nunca existieron. Efectos:

1. Insertar `cosecha_ajuste` con snapshot.
2. `UPDATE registro_cosecha SET gajos_reconteo = SUM(viaje_detalle.gajos_en_viaje activos) WHERE id = cosecha_id`.
3. La cosecha queda con `gajos_pendientes_enviar = 0` y desaparece del listado.

### REASIGNADO
Los gajos sí existían; se trasladan a un viaje ya creado (`viaje_destino_id`).

1. Validar que `viaje_destino.estado = CREADO`.
2. Insertar `cosecha_ajuste` con snapshot y `viaje_destino_id`.
3. Insertar/actualizar `viaje_detalle` en el viaje destino con `gajos_en_viaje = gajos_ajustados`.
4. Guardar el `viaje_detalle.id` resultante en `viaje_detalle_creado_id`.
5. La cosecha queda con `gajos_pendientes_enviar = 0`.

### MANTENIDO
Silencia la alerta N viajes más sin modificar cantidades.

1. Insertar `cosecha_ajuste` con `silenciar_hasta_viajes = N`.
2. La cosecha sigue con sus pendientes; solo se excluye del filtro de la lista de alerta hasta que hayan pasado N viajes más.

## Cálculo del "viajes transcurridos"

```
viajes_transcurridos = COUNT(DISTINCT viajes.id)
FROM viajes
JOIN viaje_detalle ON viaje_detalle.viaje_id = viajes.id
WHERE viaje_detalle.tenant_id = ?
  AND viajes.fecha_viaje >= registro_cosecha.fecha_reporte
  AND viajes.estado_activo = true
```

O sea, cuántos viajes activos del tenant existen desde la fecha en que se reportó la cosecha. El umbral de alerta por defecto es **3**, configurable por tenant en el futuro (por ahora hardcoded).

## Endpoints

Base: `/api/v1/tenant/viajes/ajustes-cosecha`

### `GET /viajes/ajustes-cosecha`

Lista cosechas candidatas a ajuste.

**Filtros aplicados en el query:**

- `registro_cosecha.gajos_pendientes_enviar > 0` (computado)
- `viajes_transcurridos >= 3`
- **Excluir** cosechas con un `cosecha_ajuste.tipo = MANTENIDO` cuyo `silenciar_hasta_viajes` aún no se haya consumido.
- **Excluir** cosechas ya cerradas por ajuste CLAVIJO o REASIGNADO (implícito porque su `gajos_pendientes_enviar = 0`).

**Response 200:**
```json
{
  "data": [
    {
      "cosecha_id": 142,
      "planilla_id": 54,
      "planilla_fecha": "2026-07-14",
      "lote": {"id": 7, "nombre": "Lote 3"},
      "sublote": {"id": 14, "nombre": "S-14"},
      "gajos_reportados": 220,
      "gajos_reconteo": 200,
      "gajos_asignados_total": 200,
      "gajos_pendientes": 20,
      "viajes_transcurridos": 3,
      "primer_viaje_fecha": "2026-07-15",
      "ultimo_viaje_fecha": "2026-07-23",
      "reportado_por": "Juan Pérez",
      "peso_promedio_gajo": 21.5
    }
  ]
}
```

Permiso: `viajes.ver`.

### `POST /viajes/ajustes-cosecha/{cosechaId}`

Aplica un ajuste. Requiere `viajes.editar`.

**Request:**
```json
{
  "tipo": "CLAVIJO",
  "motivo": "Diferencia de conteo del cortero. Verificado en el campo.",
  "viaje_destino_id": 45,
  "silenciar_por_viajes": 2
}
```

- `viaje_destino_id`: obligatorio si `tipo = REASIGNADO`, ignorado en otros tipos.
- `silenciar_por_viajes`: obligatorio si `tipo = MANTENIDO`, ignorado en otros tipos.
- `motivo`: obligatorio, min 5 chars.

**Validaciones:**

- Cosecha del tenant.
- `registro_cosecha.gajos_pendientes_enviar > 0` → si no, 422 `SIN_PENDIENTES`.
- Para REASIGNADO: `viaje_destino.estado = CREADO` → si no, 409 `VIAJE_DESTINO_NO_EDITABLE`. `viaje_destino.tenant_id = tenant_actual`.

**Response 201:**
```json
{
  "message": "Ajuste guardado correctamente",
  "data": {
    "id": 1001,
    "cosecha_id": 142,
    "tipo": "CLAVIJO",
    "gajos_ajustados": 20,
    "motivo": "…",
    "gajos_reportados_snapshot": 220,
    "gajos_reconteo_previo": 200,
    "gajos_reconteo_nuevo": 200,
    "viajes_transcurridos": 3,
    "created_by_nombre": "Camilo Tarazona",
    "created_at": "2026-07-28T14:30:00Z"
  }
}
```

**Códigos de error:**

- 422 `SIN_PENDIENTES` — la cosecha ya no tiene gajos pendientes.
- 422 `MOTIVO_MUY_CORTO` — motivo con menos de 5 caracteres.
- 422 `VIAJE_DESTINO_REQUERIDO` — REASIGNADO sin `viaje_destino_id`.
- 422 `SILENCIAR_REQUERIDO` — MANTENIDO sin `silenciar_por_viajes`.
- 409 `VIAJE_DESTINO_NO_EDITABLE` — el viaje destino no está en CREADO.
- 404 `COSECHA_NOT_FOUND`.

### `GET /viajes/ajustes-cosecha/{cosechaId}/historial`

Devuelve todos los ajustes hechos sobre una cosecha, en orden descendente por fecha.

**Response 200:**
```json
{
  "data": [
    { "id": 1002, "tipo": "CLAVIJO", "gajos_ajustados": 20, ... },
    { "id": 1001, "tipo": "MANTENIDO", "gajos_ajustados": 20, ... }
  ]
}
```

Se pinta como timeline en el detalle de la cosecha.

## Notificaciones (opcional, fase 2)

Cuando `viajes_transcurridos` alcance 5, disparar notificación al admin del tenant (`role = admin_finca`) indicando que hay N cosechas sin resolver hace mucho tiempo. Canal: bell del app + email opcional.

## Permisos

- `viajes.ver` → ve el banner y la pantalla en modo lectura.
- `viajes.editar` → puede aplicar ajustes.
- Los ajustes de tipo `CLAVIJO` podrían requerir un permiso adicional `viajes.ajustar_clavijo` para restringir a supervisores (opcional).

## Migración de datos existentes

No requiere backfill. La feature arranca con `cosecha_ajuste` vacía; el listado aparecerá poblado a partir del despliegue con las cosechas que ya tenían pendientes acumulados.

## Trazabilidad en detalle de cosecha

En el detalle de una planilla / cosecha, agregar sección "Historial de ajustes" que consuma `GET /viajes/ajustes-cosecha/{cosechaId}/historial`. Timeline con cada evento (reporte, reconteo, viajes, ajuste CLAVIJO/REASIGNADO/MANTENIDO).

## Frontend ya implementado (mock)

- `src/api/ajustesCosecha.ts` — cliente con contratos exactos de arriba, mockeado.
- `src/app/pages/viajes/AjustesCosecha.tsx` — pantalla completa.
- `src/app/components/viajes/ModalAjustarCosecha.tsx` — modal de 3 acciones.
- Banner en `Viajes.tsx` que redirige a la pantalla.
- Ruta `/viajes/ajustes-cosecha` en `routes.tsx`.

Al implementar el backend, solo hay que reemplazar el cuerpo de los 3 métodos de `ajustesCosechaApi` por `requestConToken` a las rutas reales. La UI queda intacta.
