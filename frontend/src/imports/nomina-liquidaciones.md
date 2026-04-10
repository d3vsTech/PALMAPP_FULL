2.4. Nómina: En este apartado se verá todo lo que tiene que ver con,
Nomina y Liquidaciones.
2.4.1. Nomina:
2.4.1.1. Períodos
•
Grid de tarjetas de nómina: "Enero 2026 - Primera Quincena"
•
Estado: BORRADOR o CERRADA
•
Botón "Nueva Nómina" → modal con año, mes, quincena
•
Totales resumidos por período:
-Dias trabajados
-neto bruto
PALMAPP PANTALLAS
-incapacidades
-total neto a pagar
-subsidio transporte
•
Al crear, auto-genera un registro NominaEmpleado para cada
trabajador activo
2.4.1.1.1. Detalle de Nómina (al hacer clic en un período)
•
Tabla de empleados en ese período: nombre, salario base,
jornales, cosechas, devengado, deducciones, neto, estado
•
●
●
●
●
●
Botón "Calcular Todo": ejecuta calcularTodosEmpleados() del
motor de nómina, que:
Calcula salario proporcional (15 días para FIJO)
Suma jornales y cosechas del período
Aplica deducciones legales: Salud 4%, Pensión 4%,
Aplica Fondo Solidaridad si gana > 4 SMLV
Aplica bonificaciones activas
•
Botón "Cerrar Nómina": cambia estado a CERRADA. Editable
según el caso
Investigar: Cuando hay días de incapacidad o permisos ya sean
remunerados o no remunerados NO HA Y SUB DE TRANSPOR TE
Investigar: revisar los descuentos de salud y pensión en casos de
incapacidad y permisos
●
●
●
Préstamos: Se generarán prestamos, con fecha, hora y
valor
Permisos remunerados/no remunerados: Se generarán
permisos sean no remunerados o remunerados(valro
del jornal), con fecha y hora.
Ausencias: Se generarán ausencias de colaboradores,
con fecha y hora
PALMAPP PANTALLAS
2.4.1.1.1.1. Desprendible (al hacer clic en un empleado)
•
Documento tipo "colilla de pago", con filtro por día, mes, año
que contiene:
●
Devengados: Salario base + jornales + cosechas +
bonificaciones
●
Deducciones: Salud, pensión.
●
Tabla de jornales referenciados (fecha, labor, valor)
●
Tabla de cosechas referenciadas (cosecha, valor)
●
Resumen final: Total Devengado - Total Deducciones = Neto
a Pagar
●
Botón de imprimir
●
Botón de pago realizado: Se generará un apartado, donde al
cerrar nómina, se pueda comentar/describir en el
desprendible de pago total. información de pago y por donde
se hizo el pago.
2.4.2. Liquidaciones: Manejo de todas las prestaciones sociales de ley,
con 5 pestañas:
2.4.2.1.1. Cesantías:
•
Simulador por empleado: calcula (Salario + sub
transporte x Días trabajados) / 360
•
Fórmula visible para transparencia
2.4.2.1.2. Intereses sobre Cesantías
●
Calcula Cesantías x 12% x (Días / 360)
2.4.2.1.3. Prima de Servicios
●
Calcula (Salario + Sub transporte x Días trabajados
en semestre) / 360
2.4.2.1.4. Vacaciones
PALMAPP PANTALLAS
●
Tabla de saldos acumulados por empleado: días
generados, tomados, pagados, disponibles
●
Registro de vacaciones: modal para crear solicitud
con empleado, fechas, días hábiles
●
Estados: PENDIENTE → APROBADA → PAGADA /
CANCELADA
2.4.2.1.5. Liquidación Final
●
Para empleados que se retiran
●
Modal: seleccionar empleado, fecha de retiro, motivo
(Renuncia, Despido sin/con justa causa, Mutuo
acuerdo, etc.)
●
Al crear, calcula automáticamente todos los
conceptos: cesantías, intereses, prima, vacaciones,
indemnización (si aplica por despido sin justa causa)
●
Genera detalles línea por línea con fórmula aplicada
●
Vista detalle del documento de liquidación con totales