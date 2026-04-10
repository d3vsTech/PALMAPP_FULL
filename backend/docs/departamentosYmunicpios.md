### 6.1 Listar departamentos

```
GET /v1/auth/departamentos
```

**Autenticación:** Si (Bearer Token)

**Parámetros:** Ninguno

**Respuesta exitosa (200):**

```json
{
  "data": [
    {
      "codigo": "05",
      "nombre": "ANTIOQUIA"
    },
    {
      "codigo": "08",
      "nombre": "ATLANTICO"
    },
    {
      "codigo": "11",
      "nombre": "BOGOTA"
    },
    {
      "codigo": "25",
      "nombre": "CUNDINAMARCA"
    }
  ]
}
```

> **Nota:** Los departamentos se retornan ordenados alfabéticamente por nombre. El campo `codigo` corresponde al código DANE de 2 dígitos.

**Errores:**

| Código | Mensaje                              | Causa                  |
|--------|--------------------------------------|------------------------|
| 401    | Token ausente, inválido o expirado   | No autenticado         |
| 500    | Error al obtener los departamentos   | Error interno          |

---

### 6.2 Listar municipios por departamento

```
GET /v1/auth/departamentos/{codigo}/municipios
```

**Autenticación:** Si (Bearer Token)

**Parámetros URL:**

| Parámetro | Tipo   | Descripción                          | Ejemplo |
|-----------|--------|--------------------------------------|---------|
| `codigo`  | string | Código DANE del departamento (2 dígitos) | `05`    |

**Ejemplo request:**

```
GET /v1/auth/departamentos/05/municipios
```

**Respuesta exitosa (200):**

```json
{
  "data": [
    {
      "codigo": "05002",
      "nombre": "ABEJORRAL"
    },
    {
      "codigo": "05004",
      "nombre": "ABRIAQUI"
    },
    {
      "codigo": "05021",
      "nombre": "ALEJANDRIA"
    },
    {
      "codigo": "05001",
      "nombre": "MEDELLIN"
    }
  ],
  "departamento": "ANTIOQUIA"
}
```

> **Nota:** Los municipios se retornan ordenados alfabéticamente por nombre. El campo `codigo` corresponde al código DANE de 5 dígitos. Se incluye el nombre del departamento en la respuesta para facilitar su uso en el frontend.

**Errores:**

| Código | Mensaje                            | Causa                                          |
|--------|------------------------------------|-------------------------------------------------|
| 401    | Token ausente, inválido o expirado | No autenticado                                  |
| 404    | Departamento no encontrado         | El código no existe en la tabla de departamentos |
| 500    | Error al obtener los municipios    | Error interno                                   |

---

### Códigos DANE de departamentos

| Código | Departamento         | Código | Departamento         |
|--------|----------------------|--------|----------------------|
| `05`   | ANTIOQUIA            | `50`   | META                 |
| `08`   | ATLANTICO            | `52`   | NARIÑO               |
| `11`   | BOGOTA               | `54`   | NORTE DE SANTANDER   |
| `13`   | BOLIVAR              | `63`   | QUINDIO              |
| `15`   | BOYACA               | `66`   | RISARALDA            |
| `17`   | CALDAS               | `68`   | SANTANDER            |
| `18`   | CAQUETA              | `70`   | SUCRE                |
| `19`   | CAUCA                | `73`   | TOLIMA               |
| `20`   | CESAR                | `76`   | VALLE DEL CAUCA      |
| `23`   | CORDOBA              | `81`   | ARAUCA               |
| `25`   | CUNDINAMARCA         | `85`   | CASANARE             |
| `27`   | CHOCO                | `86`   | PUTUMAYO             |
| `41`   | HUILA                | `88`   | SAN ANDRES           |
| `44`   | LA GUAJIRA           | `91`   | AMAZONAS             |
| `47`   | MAGDALENA            | `94`   | GUAINIA              |
|        |                      | `95`   | GUAVIARE             |
|        |                      | `97`   | VAUPES               |
|        |                      | `99`   | VICHADA              |

---