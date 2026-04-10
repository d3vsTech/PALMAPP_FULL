2.7. Configuración:
Es el módulo de catálogos y precios base del sistema. Es donde se
administran todas las "tablas de referencia" que alimentan al resto de la
aplicación:
●
Panel de configuración:
Cosecha
Abonada
Poda
Plateo
Labores
Auxiliares
Promedios anuales.
○
○
○
○
○
○
○
●
6 pestañas de catálogos base - Semillas, Insumos, Cargos, Labores,
Conceptos Nómina, Tablas Legales.
2.7.1. Semillas
Variedades de palma que se siembran. Cada semilla tiene:
●
Tipo: Africana, Híbrido, Compacta...
●
Nombre: Elaeis Guineensis, Híbrido OxG, Deli x AVROS...
PALMAPP PANTALLAS
2.7.2. Insumos
Productos químicos/fertilizantes. Cada insumo tiene:
●
●
Nombre: KCl, Borax, Glifosato, Urea
Unidad de medida: gramo
2.7.3. Cargos
Puestos de trabajo. Cada cargo tiene:
●
●
●
●
Nombre: (se crea a consideración del usuario)
Tipo salario: FIJO (sueldo mensual) o VARIABLE (pago por
producción)
Salario base: el monto si es FIJO, 0 si es VARIABLE
Se asignan a cada empleado y determinan cómo se calcula su
nómina.
2.7.4. Labores
Tipos de trabajo de campo. Cada labor tiene:
●
●
●
Tipo de pago: JORNAL FIJO (valor diario fijo) o POR PALMA
(valor por cada palma trabajada)
Valor base: precio unitario (ej: $1,200/palma, $50,000/jornal)
Unidad: PALMAS o JORNAL
2.7.5. Conceptos Nómina
Las deducciones y bonificaciones que se aplican en cada nómina. Se
muestra como tabla. Cada concepto tiene:
●
●
●
●
●
●
●
Código: SALUD EMP, PENSIÓN EMP, AUX TRANS...
Tipo: Deducción Legal, Deducción Voluntaria, Bonificación Fija,
Bonificación Variable
Operación: SUMA (+) o RESTA (-)
Cálculo: PORCENTAJE, VALOR FIJO, o FÓRMULA
Valor referencia: 4% (salud), $200,000 (transporte)...
Base de cálculo: sobre qué se aplica (Total Devengado, Salario
Base, SMMLV, Manual)
Aplica a: empleados FIJO, VARIABLE, o AMBOS
PALMAPP PANTALLAS
●
●
Obligatorio: si se aplica automáticamente
Estos conceptos los consumen los cálculos de nómina para
calcular el desprendible de cada empleado.
2.7.6. Tablas Legales
Historial de porcentajes legales colombianos. Cada registro tiene:
●
●
●
Concepto vinculado (solo los de tipo DEDUCCIÓN LEGAL)
% Empleado y % Empresa (lo que paga cada parte)
Vigencia: desde/hasta qué fecha aplica
2.7.7. Panel de configuración de precios y promedio: 4 pestañas de
parámetros operativos.
2.7.7.1. Precio Cosecha
•
Tabla por lote y año: precio por kg de fruto cosechado
•
Editable con botón guardar
2.7.7.2. Labores Fijas
•
Precios fijos por tipo de labor (Poda, Plateo, Sanidad, etc.)
•
Valor por palma o por jornal
2.7.7.3. Escala Abonada
•
Selector de insumo (vinculado al catálogo Maestros/Insumos)
•
Tabla de rangos: gramos mín → gramos máx → precio por
palma Ejemplo: 0-500g → $80/palma, 501-1000g →
$120/palma
2.7.7.4. Promedios
•
Historial de promedios por lote y año
•
Kg promedio por gajo para cada lote