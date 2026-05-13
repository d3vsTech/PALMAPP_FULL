# Mejora propuesta: permitir pagar PODA (y PLATEO) por jornal fijo

> Análisis de opciones para soportar fincas que pagan ciertas Labores de Palma como jornal plano en lugar de "por palma".

---

## Estado actual

PODA está cableado en [JornalCalculationService.php:66-89](../../app/Services/JornalCalculationService.php#L66-L89) a:

```
valor_total = cantidad_palmas × precios_palma.PODA.precio_palma
```

Si `cantidad_palmas` falta, el servicio lanza `InvalidArgumentException` → **422 `CALC_ERROR`**. Además el `StoreJornalRequest` exige `cantidad_palmas` para PLATEO/PODA/FERTILIZACION. El sistema asume hoy **"una labor → un único modelo de pago"**.

Mismo razonamiento aplica a PLATEO. SANIDAD/OTROS ya son jornal plano por diseño.

---

## Las 3 opciones (de menos a más invasiva)

### Opción A — Workaround: registrarlo como Labor de Finca

Crear una labor en el catálogo `labores` llamada `"Poda (jornal)"` con `valor_base = $X` y registrarla como `categoria=FINCA`.

| Pros | Cons |
|---|---|
| Cero código nuevo, funciona hoy | Se pierde `tipo=PODA` en reportes (queda como FINCA) |
| Paga jornal plano de inmediato | Se pierde `lote_id`/`sublote_id`/`cantidad_palmas` — FINCA solo guarda `ubicacion` |
| Sirve para fincas que **siempre** pagan así | Si después la finca cambia a por-palma, hay un mix raro en reportes |

### Opción B — Hack en `precios_palma`: `cantidad_palmas=1`

Configurar `precios_palma.PODA.precio_palma = 80000` (= valor del jornal) y enviar `cantidad_palmas = 1` en cada registro.

| Pros | Cons |
|---|---|
| Mantiene `tipo=PODA` y el desglose por sublote | **Falsea el dato de palmas trabajadas** — métricas de productividad mienten |
| Cero código nuevo | Genera confusión: una finca lo verá "200 palmas podadas" cuando fueron 0 |

**No recomendada.** Solo se documenta porque alguien lo intentará y termina creando deuda de datos.

### Opción C — Rediseño correcto: `modalidad_pago` en `precios_palma`

Agregar columna `modalidad_pago ENUM('POR_PALMA','JORNAL_FIJO')` a `precios_palma`. Cambios necesarios:

1. **Migración:** nueva columna con default `POR_PALMA` (backward compat).
2. **Servicio** ([JornalCalculationService.php](../../app/Services/JornalCalculationService.php)): para PLATEO/PODA, `switch` sobre la modalidad — si es `JORNAL_FIJO`, ignora `cantidad_palmas` y devuelve precio plano (idéntico al branch que ya existe para SANIDAD/OTROS).
3. **Validación** (`StoreJornalRequest`): `cantidad_palmas` deja de ser `required` cuando la config del tenant es `JORNAL_FIJO`. La forma menos fea es validar en el servicio y rebotar 422 con un mensaje claro.
4. **UI del wizard:** el input "Número de Palmas" se oculta cuando la config es JORNAL_FIJO. Necesita que el endpoint que carga la config (o `/precios-palma`) exponga `modalidad_pago` para que el front decida.

| Pros | Cons |
|---|---|
| Modelo coherente: `tipo=PODA` se mantiene, palmas se ocultan cuando no aplica | Toca 4 capas (DB, servicio, FormRequest, UI) |
| Aplica también a PLATEO si alguna finca lo pide | Reactiva una distinción que justamente la Migración 13 eliminó — vale la pena releer [PRECIOS_PALMA.md](../PRECIOS_PALMA.md) para asegurar que esto no rompe la premisa del rediseño |
| Se documenta como decisión consciente, no como hack | Si la finca quiere cambiar la modalidad a mitad de campaña, hay que decidir si jornales históricos se recalculan |

---

## Recomendación

- Si es **una finca puntual** que paga así → **Opción A** (Labor de Finca llamada "Poda - jornal"). Es la salida pragmática y honesta.
- Si es **un caso que se repetirá en varias fincas** → **Opción C**. La razón: hoy ya tienes 2 modos de pago dentro de `precios_palma` ("multiplicar por palmas" para PLATEO/PODA, "valor plano" para SANIDAD/OTROS) — solo que el modo está implícito en el `tipo`. Hacer la modalidad explícita por config te da uniformidad para los 4 tipos.

---

## Pendientes para decidir antes de implementar la Opción C

- ¿La modalidad se configura por tenant o también puede variar por lote/predio?
- Si una finca cambia la modalidad a mitad de campaña, ¿los jornales históricos se recalculan o se respeta el snapshot del momento?
- ¿Se permite que un mismo tenant tenga PLATEO por palma y PODA por jornal, o se asume que la modalidad es la misma para todos los tipos?

---

## Referencias

- Decisión original de `precios_palma`: [docs/PRECIOS_PALMA.md](../PRECIOS_PALMA.md)
- Cálculo actual: [docs/INVESTIGACION_CALCULO_OPERACIONES.md §3](../INVESTIGACION_CALCULO_OPERACIONES.md)
- Lógica de pago por tipo: [docs/LABORES_JORNALES.md §3](../LABORES_JORNALES.md)
- Servicio afectado: [app/Services/JornalCalculationService.php](../../app/Services/JornalCalculationService.php)
