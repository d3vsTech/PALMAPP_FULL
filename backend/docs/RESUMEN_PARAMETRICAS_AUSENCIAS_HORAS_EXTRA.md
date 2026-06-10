# Paramétricas: MotivoAusencia y TipoHoraExtra

---

## 1. MotivoAusencia

### Tabla: `motivos_ausencia`

| Campo | Tipo | Descripción |
|---|---|---|
| `tenant_id` | FK | Aislamiento multi-tenant |
| `nombre` | string | Nombre personalizado del motivo. Ej: *"Incapacidad EPS - gripa"* |
| `tipo_base` | enum | Discriminador fijo que usa la nómina para aplicar reglas especiales |
| `es_remunerada` | boolean | Si el empleado cobra durante la ausencia |
| `afecta_nomina` | boolean | Si esta ausencia entra en el cálculo del período de nómina |
| `porcentaje_pago_default` | decimal(2) | Qué porcentaje del salario se paga. Ej: `66.67` para EPS días 3+ |
| `requiere_soporte` | boolean | Si el operario debe adjuntar un documento (epicrisis, autorización, etc.) |
| `estado` | boolean | Activo / inactivo en el catálogo |

### `tipo_base` — valores válidos

| Valor | Quién paga | Nota |
|---|---|---|
| `INCAPACIDAD_EPS` | Empresa días 1-2 al 100%, días 3+ al 66.67% | Recobro a EPS fuera de scope |
| `INCAPACIDAD_ARL` | Empresa al 100% | ARL reembolsa |
| `LICENCIA_MATERNIDAD` | Suma a `total_ausencias_remunerado` | No descuenta devengado |
| `LICENCIA_PATERNIDAD` | Suma a `total_ausencias_remunerado` | No descuenta devengado |
| `LICENCIA_LUTO` | Suma a `total_ausencias_remunerado` | No descuenta devengado |
| `PERMISO_REMUNERADO` | Empresa al 100% | Según `porcentaje_pago_default` |
| `PERMISO_NO_REMUNERADO` | Descuenta `(salario/30) × días × (1 − %pago/100)` | Solo empleado FIJO |
| `AUSENCIA_INJUSTIFICADA` | Descuenta igual que no remunerado | Solo empleado FIJO |
| `CALAMIDAD_DOMESTICA` | Según configuración del motivo | — |
| `SUSPENSION_DISCIPLINARIA` | Descuenta | — |
| `OTRO` | Libre | El admin define los flags |

### Cómo funciona el snapshot

Al crear una `Ausencia`, el hook `booted()` copia desde el motivo:

```
ausencia.tipo             ← motivo.tipo_base
ausencia.es_remunerada    ← motivo.es_remunerada
ausencia.afecta_nomina    ← motivo.afecta_nomina
ausencia.porcentaje_pago  ← motivo.porcentaje_pago_default
```

Si el admin edita el motivo después, los registros históricos no cambian.

### Patrón de uso

Un tenant puede tener **múltiples variantes** del mismo `tipo_base`:

```
tipo_base = INCAPACIDAD_EPS
  ├── "Incapacidad EPS - gripa"
  ├── "Incapacidad EPS - cirugía"
  └── "Incapacidad EPS - accidente"
```

La nómina decide el tratamiento por `tipo_base`, no por `nombre`.

### Efecto en nómina por tipo de empleado

| Tipo empleado | Tipo ausencia | Efecto |
|---|---|---|
| FIJO | No remunerada / Injustificada | Descuenta `(salario/30) × días × (1 − %pago/100)` |
| FIJO | EPS días 1-2 | Sin descuento — empresa paga al 100% |
| FIJO | EPS días 3+ | Descuenta 33.33% (paga 66.67%) |
| FIJO | ARL | Sin descuento — empresa paga al 100% |
| FIJO | Licencias remuneradas | Suma a `total_ausencias_remunerado`, no descuenta |
| VARIABLE | No remunerada | Sin descuento (no cobra fijo) — solo tracking |
| VARIABLE | EPS / ARL | Suma a `total_ausencias_remunerado` |

---

## 2. TipoHoraExtra

### Tabla: `tipos_hora_extra`

| Campo | Tipo | Descripción |
|---|---|---|
| `tenant_id` | FK | Aislamiento multi-tenant |
| `codigo` | string | Código legal con CHECK constraint (ver valores abajo) |
| `nombre` | string | Descripción legible. Ej: *"Hora Extra Diurna"* |
| `porcentaje_recargo` | decimal(2) | % que se suma o multiplica al valor hora base |
| `franja_horaria` | enum | `DIURNO` / `NOCTURNO` / `MIXTO` |
| `aplica_festivo` | boolean | Si aplica en dominicales o festivos |
| `es_extra` | boolean | `true` = tiempo por encima de jornada. `false` = recargo sobre jornada ordinaria |
| `paga_hora_completa` | boolean | Determina cuál fórmula de cálculo aplica |
| `estado` | boolean | Activo / inactivo |

### Los 7 tipos legales colombianos (CST arts. 168/179 + Ley 789/2002)

| Código | Nombre | % recargo | `es_extra` | `paga_hora_completa` |
|---|---|---|---|---|
| `HED`  | Hora Extra Diurna (6am–9pm)           | 25%  | ✅ | ✅ |
| `HEN`  | Hora Extra Nocturna (9pm–6am)         | 75%  | ✅ | ✅ |
| `RN`   | Recargo Nocturno (solo recargo)       | 35%  | ❌ | ❌ |
| `HRD`  | Hora Ordinaria Dominical/Festivo      | 75%  | ❌ | ✅ |
| `HEDF` | Hora Extra Diurna Dominical/Festivo   | 100% | ✅ | ✅ |
| `HENF` | Hora Extra Nocturna Dominical/Festivo | 150% | ✅ | ✅ |
| `RND`  | Recargo Nocturno Dominical/Festivo    | 110% | ❌ | ❌ |

### Fórmula de cálculo

```
valor_hora_base = empleado.salario_base / tenant_config.divisor_jornada_mensual
                                          └── 240  (CST tradicional, 48h/sem)
                                          └── 210  (Ley 2101/2021, 42h/sem)

// paga_hora_completa = true  → hora ordinaria + recargo
valor_calculado = cantidad_horas × valor_hora_base × (1 + porcentaje_recargo / 100)

// paga_hora_completa = false → solo el recargo (la hora ordinaria ya está pagada)
valor_calculado = cantidad_horas × valor_hora_base × (porcentaje_recargo / 100)
```

> **Fallback de salario:** si el empleado es `PRODUCCION` sin `salario_base`, se usa `tenant_config.salario_minimo_vigente`. Si ambos son `null` → 422 `CALC_ERROR`.

### Por qué `es_extra` y `paga_hora_completa` son campos separados

| Tipo | `es_extra` | `paga_hora_completa` | Razón |
|---|---|---|---|
| `RN` / `RND` | ❌ | ❌ | Recargo sobre jornada ordinaria — la hora ya está pagada como salario base |
| `HRD` | ❌ | ✅ | El empleado trabaja en día de descanso — debe cobrar la hora completa aunque no sea "extra" |
| Todos los `HE*` | ✅ | ✅ | Tiempo adicional a la jornada — paga hora + recargo |

> La separación `total_horas_extra` / `total_recargos` en `nomina_empleado` importa para
> el cálculo de prestaciones sociales (cesantías, prima y vacaciones se tratan distinto).

### Snapshot al registrar

Al crear una `HoraExtra` se copian a la fila:

```
hora_extra.codigo              ← tipo.codigo
hora_extra.porcentaje_recargo  ← tipo.porcentaje_recargo
hora_extra.paga_hora_completa  ← tipo.paga_hora_completa
hora_extra.valor_hora_base     ← calculado al momento del registro
```

Si el admin cambia el tipo paramétrico después, los registros históricos no se afectan.

### Relación con nómina

Al cerrar una nómina:
- `nomina_empleado.total_horas_extra` = suma de `valor_calculado` donde `es_extra = true`
- `nomina_empleado.total_recargos` = suma de `valor_calculado` donde `es_extra = false`
- Los registros APROBADOS del período pasan a estado `LIQUIDADA` y se vinculan con `nomina_id`
- Los snapshots se persisten en `nomina_hora_extra_ref`
