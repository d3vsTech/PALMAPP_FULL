# Estructura del Excel — Carga masiva de productos del Market

Archivo: **`productos.xlsx`** (nombre obligatorio, debe ir en la raíz del ZIP).

## Resumen

- **13 columnas** (A → M).
- **Fila 1:** cabeceras (no se procesa).
- **Fila 2 en adelante:** datos de productos (una fila = un producto).
- **Máximo 500 filas** de datos por importación.
- Las filas completamente vacías se ignoran automáticamente.

## Columnas

| Col | Campo              | Obligatorio | Tipo / Reglas                                                                 |
|-----|--------------------|-------------|-------------------------------------------------------------------------------|
| A   | `NOMBRE`           | Sí          | string, máx. 150 caracteres                                                   |
| B   | `DESCRIPCION`      | Sí          | text (sin límite estricto)                                                    |
| C   | `CATEGORIA_ID`     | Sí          | integer, debe existir en `market_categorias`                                  |
| D   | `UNIDAD_MEDIDA_ID` | Sí          | integer, debe existir en `market_unidades_medida`                             |
| E   | `PRECIO_UNITARIO`  | Sí          | numérico, min: 0, max: 9.999.999.999,99                                       |
| F   | `STOCK_DISPONIBLE` | Sí          | integer, min: 0                                                               |
| G   | `STOCK_MINIMO`     | No          | integer, min: 0                                                               |
| H   | `SKU`              | No          | string, máx. 50, único en `market_productos` (se autogenera si va vacío)      |
| I   | `ESTADO`           | No          | `activo` \| `inactivo` \| `agotado` (default: `activo`)                       |
| J   | `DESTACADO`        | No          | boolean: `1`/`0`, `true`/`false`, `si`/`no`                                   |
| K   | `ESPECIFICACIONES` | No          | formato `clave1:valor1\|clave2:valor2` → se convierte a JSON                  |
| L   | `IMAGEN_PRINCIPAL` | No          | nombre de archivo dentro de `imagenes/` del ZIP (ej: `tomate1.jpg`)           |
| M   | `IMAGENES_GALERIA` | No          | lista separada por `\|` (ej: `tomate1b.jpg\|tomate1c.jpg`)                    |

## Detalle por columna

### A — `NOMBRE`
Nombre comercial del producto que verá el cliente.
- Ejemplo: `Tomate cherry orgánico 500g`

### B — `DESCRIPCION`
Texto largo descriptivo. Acepta saltos de línea dentro de la celda.
- Ejemplo: `Tomate cherry cultivado sin pesticidas. Empaque biodegradable.`

### C — `CATEGORIA_ID`
ID numérico de la categoría. El proveedor debe consultar previamente las categorías disponibles vía `GET /api/v1/market/categorias`.
- Ejemplo: `5`

### D — `UNIDAD_MEDIDA_ID`
ID numérico de la unidad de medida (kg, libra, unidad, etc.). Consultar vía `GET /api/v1/market/unidades-medida`.
- Ejemplo: `2`

### E — `PRECIO_UNITARIO`
Precio en COP (o la moneda configurada). Usar **punto** como separador decimal, **no** coma.
- Correcto: `12500.50`
- Incorrecto: `12.500,50`

### F — `STOCK_DISPONIBLE`
Cantidad disponible para la venta. Entero ≥ 0.
- Ejemplo: `100`

### G — `STOCK_MINIMO` (opcional)
Umbral para alertas de stock bajo. Si va vacío se guarda como `null`.
- Ejemplo: `10`

### H — `SKU` (opcional)
Código único interno del proveedor.
- Si va vacío → el sistema lo autogenera con el patrón del helper `generarSku()`.
- Si va con valor → debe ser **único en toda la tabla** `market_productos`. Si ya existe, la fila se rechaza.
- Ejemplo: `TOM-CHE-001`

### I — `ESTADO` (opcional)
Solo acepta uno de estos tres valores literales:
- `activo` (default si va vacío)
- `inactivo`
- `agotado`

### J — `DESTACADO` (opcional)
Marca el producto como destacado en el catálogo. Valores aceptados:
- Verdadero: `1`, `true`, `si`, `sí`
- Falso: `0`, `false`, `no` (default si va vacío)

### K — `ESPECIFICACIONES` (opcional)
Pares clave-valor separados por `|`. Cada par usa `:` para separar clave y valor.

**Formato:**
```
peso:500g|origen:Boyacá|organico:si
```

Se convierte internamente a JSON:
```json
{ "peso": "500g", "origen": "Boyacá", "organico": "si" }
```

### L — `IMAGEN_PRINCIPAL` (opcional)
Nombre del archivo (con extensión) que está dentro de la carpeta `imagenes/` del ZIP. **No** es ruta ni URL — solo el nombre del archivo.

- Correcto: `tomate-cherry-001.jpg`
- Incorrecto: `imagenes/tomate-cherry-001.jpg`
- Incorrecto: `C:\fotos\tomate.jpg`
- Incorrecto: `https://misitio.com/tomate.jpg`

**Formatos permitidos:** `jpg`, `jpeg`, `png`, `webp`.
**Tamaño máx. por imagen:** 3 MB.

### M — `IMAGENES_GALERIA` (opcional)
Lista de nombres de archivo separados por `|` (pipe). Cada uno debe existir en `imagenes/`.

**Ejemplo:**
```
tomate-cherry-001-b.jpg|tomate-cherry-001-c.jpg|tomate-cherry-001-d.png
```

Se crearán N registros en `market_producto_imagenes` con `orden` ascendente (1, 2, 3...).

## Ejemplo completo de fila

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Tomate cherry orgánico 500g | Tomate cherry cultivado sin pesticidas en Boyacá. | 5 | 2 | 12500.00 | 100 | 10 | TOM-CHE-001 | activo | 1 | peso:500g\|origen:Boyacá\|organico:si | tomate-cherry-001.jpg | tomate-cherry-001-b.jpg\|tomate-cherry-001-c.jpg |

## Errores comunes a evitar

| Error | Mensaje que verá el proveedor |
|-------|-------------------------------|
| SKU repetido entre filas o con uno ya existente en BD | `SKU 'TOMATE-001' ya existe en el catálogo` |
| Nombre de imagen no coincide con archivo en `imagenes/` | `La imagen 'tomate1.jpg' no se encuentra en la carpeta imagenes/ del ZIP` |
| Imagen con extensión no permitida | `La imagen 'foto.bmp' tiene un formato inválido. Permitidos: jpg, jpeg, png, webp` |
| Imagen mayor a 3 MB | `La imagen 'producto.jpg' excede los 3 MB` |
| Categoría inexistente | `La categoría con ID 99 no existe` |
| Precio con coma decimal | El validador `numeric` rechaza el valor |
| Estado con valor distinto a los tres permitidos | El validador `in:activo,inactivo,agotado` rechaza el valor |

## Recomendación

Antes de armar el Excel manualmente, descargar la plantilla oficial vacía:

```
GET /api/v1/market/proveedor/productos/importar/plantilla
```

Esto entrega un `.xlsx` con las cabeceras correctas y una fila de ejemplo, evitando errores de tipeo en los nombres de columna.
