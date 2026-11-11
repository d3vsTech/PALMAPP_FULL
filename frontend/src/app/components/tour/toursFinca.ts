import {
  bloqueCon,
  boton,
  botonTour,
  buscadorRapido,
  campo,
  en,
  indicadores,
  menu,
  pestanas,
  seccion,
  tabla,
  type PasoTour,
  type Tour,
} from './tourEngine';

// Guías de la app de la finca. Lenguaje natural y profesional, sin términos técnicos.

const cierre: PasoTour = {
  donde: botonTour,
  titulo: 'Vuelve cuando quieras',
  texto: 'Cada pantalla tiene su propia guía. Ábrela desde este botón siempre que la necesites.',
};

const tour = (ruta: RegExp, id: string, nombre: string, pasos: PasoTour[]) => ({
  ruta,
  tour: { id, nombre, pasos } as Tour,
});

// Las tres prestaciones por período comparten pantallas muy parecidas.
const nuevaPrestacion = (id: string, nombre: string, ruta: RegExp, que: string) =>
  tour(ruta, id, nombre, [
    {
      titulo: nombre,
      texto: `Aquí abres el período para liquidar ${que}.`,
    },
    {
      donde: seccion('Información del período'),
      titulo: 'Datos del período',
      texto: 'Indica el año, la descripción y las fechas. Puedes agregar observaciones si lo necesitas.',
      lado: 'top',
    },
    {
      donde: boton('Crear período'),
      titulo: 'Crea el período',
      texto: 'Quedará en la lista listo para que selecciones a los colaboradores y hagas la liquidación.',
      lado: 'top',
    },
  ]);

const detallePrestacion = (id: string, nombre: string, ruta: RegExp, que: string) =>
  tour(ruta, id, nombre, [
    {
      titulo: nombre,
      texto: `Aquí ves ${que} del período. Si aún no se ha liquidado, la pantalla te guía paso a paso.`,
    },
    {
      donde: seccion('Período'),
      titulo: 'Datos del período',
      texto: 'Las fechas y la información general de esta liquidación.',
      lado: 'bottom',
    },
    {
      donde: seccion('Detalle por colaborador'),
      titulo: 'Lo que recibe cada persona',
      texto: 'El detalle de lo que le corresponde a cada colaborador, con el total al final.',
      lado: 'top',
    },
    {
      donde: boton('Descargar soporte'),
      titulo: 'Descarga el soporte',
      texto: 'Guarda o imprime el documento para tus archivos.',
      lado: 'bottom',
    },
  ]);

const tabPrestacion = (
  id: string,
  nombre: string,
  ruta: RegExp,
  que: string,
  resumen: string,
  nueva: string,
  historial: string
) =>
  tour(ruta, id, nombre, [
    { titulo: nombre, texto: que },
    {
      donde: pestanas,
      titulo: 'Cada prestación en su pestaña',
      texto: 'Cesantías, intereses, prima, vacaciones y liquidación final. Cada una tiene su propia guía.',
      lado: 'bottom',
    },
    {
      donde: boton('Marco legal'),
      titulo: 'Qué dice la ley',
      texto: 'Consulta aquí la norma en la que se basa cada cálculo.',
      lado: 'bottom',
    },
    { donde: indicadores, titulo: 'Cómo vas', texto: resumen, lado: 'bottom' },
    {
      donde: boton(nueva),
      titulo: 'Abre un período',
      texto: 'Crea el período, elige a los colaboradores y PalmApp hace las cuentas según la ley.',
      lado: 'left',
    },
    { donde: tabla, titulo: 'Períodos registrados', texto: historial, lado: 'top' },
    cierre,
  ]);

const metrica = (ruta: RegExp, id: string, nombre: string, pasos: PasoTour[]) =>
  tour(ruta, id, nombre, [
    ...pasos,
    {
      donde: boton('Exportar'),
      titulo: 'Llévate el informe',
      texto: 'Descarga esta información para compartirla o guardarla.',
      lado: 'bottom',
    },
  ]);

export const TOURS_FINCA: { ruta: RegExp; tour: Tour }[] = [
  // ---------- Calendario de festivos ----------
  tour(/^\/configuracion\/festivos/, 'festivos', 'Calendario de festivos', [
    {
      titulo: 'Los días festivos del año',
      texto: 'De aquí salen los recargos de la nómina, así que vale la pena revisarlo.',
    },
    {
      donde: boton('Agregar festivo'),
      titulo: 'Los festivos de tu zona',
      texto: 'Los nacionales ya vienen puestos. Aquí agregas los de tu municipio.',
      lado: 'left',
    },
    {
      donde: tabla,
      titulo: 'El año completo',
      texto: 'Cambia el año arriba para revisar o ajustar otro calendario.',
      lado: 'top',
    },
    cierre,
  ]),

  // ---------- Mi perfil ----------
  tour(/\/perfil$/, 'perfil', 'Mi perfil', [
    {
      titulo: 'Tus datos',
      texto: 'Desde aquí cambias tu información y tu contraseña.',
    },
    {
      donde: seccion('Datos personales'),
      titulo: 'Nombre y correo',
      texto: 'El correo es con el que entras a PalmApp.',
      lado: 'top',
    },
    {
      donde: seccion('Cambiar contraseña'),
      titulo: 'Tu contraseña',
      texto: 'Necesitas la actual para poner una nueva.',
      lado: 'top',
    },
    cierre,
  ]),

  // ---------- Carga de históricos ----------
  tour(/(carga-historico|\/importar)/, 'historicos', 'Cargar información anterior', [
    {
      titulo: 'Trae tu información anterior',
      texto: 'Si ya llevabas estos registros en Excel, súbelos para tenerlos en PalmApp.',
    },
    {
      donde: seccion('Descarga la plantilla'),
      titulo: 'Descarga la plantilla',
      texto: 'Es un archivo de Excel con las columnas que necesitas llenar.',
      lado: 'bottom',
    },
    {
      donde: [seccion('Carga tu archivo'), seccion('Sube el archivo'), seccion('Sube tu archivo')],
      titulo: 'Súbelo',
      texto: 'Antes de guardar, podrás revisar lo que se va a cargar.',
      lado: 'top',
    },
  ]),

  // ---------- Panel de inicio ----------
  tour(/^\/$/, 'inicio', 'Panel de inicio', [
    {
      titulo: 'Te damos la bienvenida a PalmApp',
      texto: 'En un minuto te mostramos lo más importante de esta pantalla. Puedes cerrar esta guía cuando quieras con la X.',
    },
    {
      donde: menu,
      titulo: 'El menú',
      texto: 'Aquí está todo lo que puedes hacer, organizado en Finca, Personal y pagos, y Herramientas.',
      lado: 'right',
    },
    {
      donde: [en('[role="group"][aria-label="Período"]'), en('.acciones-pagina')],
      titulo: 'Elige qué fechas ver',
      texto: 'Cambia entre semana, quincena o mes, o escoge las fechas exactas. Las cifras del panel se ajustan a lo que elijas.',
      lado: 'bottom',
    },
    {
      donde: [seccion('Diagnóstico de tu finca'), seccion('Hallazgos de tu finca')],
      titulo: 'Diagnóstico de tu finca',
      texto: 'Este es un análisis de tu finca hecho con inteligencia artificial: revisa tu información y te avisa lo que necesita atención. Toca una tarjeta para ir directo a resolverlo.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Tus cifras principales',
      texto: 'Producción, peso promedio por gajo, viajes y lluvia del período. La primera tarjeta es la más importante.',
      lado: 'bottom',
    },
    {
      donde: [seccion('Registro de viajes'), seccion('Kilos despachados')],
      titulo: 'Kilos por viaje',
      texto: 'Compara cuánto fruto salió en cada viaje hacia la extractora.',
      lado: 'top',
    },
    {
      donde: seccion('Promedio por lote'),
      titulo: 'Rendimiento por lote',
      texto: 'Los kilos por gajo de cada lote y cómo van frente al mes anterior. Así notas a tiempo si un lote está bajando.',
      lado: 'left',
    },
    {
      donde: seccion('Lluvias'),
      titulo: 'La lluvia de la finca',
      texto: 'Lo que llovió esta semana, la pasada y en el mes, frente al promedio histórico. La lluvia explica muchas subidas y bajadas de la cosecha.',
      lado: 'top',
    },
    {
      donde: buscadorRapido,
      titulo: 'Búsqueda rápida',
      texto: 'Escribe el nombre de un colaborador, un lote o una sección y llega directo.',
      lado: 'bottom',
    },
    cierre,
  ]),

  // ---------- Mi plantación ----------
  tour(/^\/plantacion$/, 'plantacion', 'Mi plantación', [
    {
      titulo: 'Mi plantación',
      texto: 'Aquí organizas tu finca de lo general a lo particular: predios, lotes, sublotes, líneas y palmas.',
    },
    {
      donde: indicadores,
      titulo: 'Tu finca en cifras',
      texto: 'Cuántos predios, lotes, palmas y sublotes tienes, con las hectáreas y las palmas por hectárea.',
      lado: 'bottom',
    },
    {
      donde: boton('Nuevo predio'),
      titulo: 'Agrega un predio',
      texto: 'Un predio es cada terreno de tu finca. PalmApp te guía para registrar sus lotes, sublotes, líneas y palmas.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada predio con sus lotes',
      texto: 'Mira la variedad, el año de siembra, las hectáreas y las palmas de cada lote. Desde la tarjeta del predio agregas un lote nuevo.',
      lado: 'top',
    },
    {
      donde: en('table a[href^="/plantacion/lote/"]'),
      titulo: 'Entra a un lote',
      texto: 'Toca el nombre para ver sus sublotes, sus líneas y cada palma.',
      lado: 'right',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Encuentra rápido',
      texto: 'Escribe el nombre de un predio o de un lote.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/plantacion\/predio\/nuevo/, 'predio-nuevo', 'Nueva plantación', [
    {
      titulo: 'Registra tu plantación',
      texto: 'Vas a registrar el predio paso a paso, desde el terreno hasta las palmas. Puedes volver atrás en cualquier momento.',
    },
    {
      donde: bloqueCon('Predio', 'Lotes', 'Sublotes', 'Líneas', 'Palmas'),
      titulo: 'Los pasos',
      texto: 'Aquí ves en qué paso vas y cuántos te faltan.',
      lado: 'bottom',
    },
    {
      donde: seccion('Información del Predio'),
      titulo: 'Datos del predio',
      texto: 'Empieza con el nombre, la ubicación y las hectáreas del terreno.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'A medida que avanzas, aquí se va armando lo que llevas registrado.',
      lado: 'left',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Cuando completes los datos, sigue al próximo paso.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/predio\/[^/]+$/, 'predio-editar', 'Datos del predio', [
    {
      titulo: 'Datos del predio',
      texto: 'Actualiza el nombre, la ubicación o las hectáreas de este terreno.',
    },
    {
      donde: [boton('Guardar Cambios'), boton('Crear Predio')],
      titulo: 'Guarda los cambios',
      texto: 'Se actualizarán en Mi plantación.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/lote\/nuevo/, 'lote-nuevo', 'Nuevo lote', [
    {
      titulo: 'Agrega un lote',
      texto: 'Un lote es una parte del predio que manejas por separado.',
    },
    {
      donde: seccion('Información del Lote'),
      titulo: 'Datos del lote',
      texto: 'Indica el nombre, las hectáreas, la fecha de siembra y las semillas que se usaron.',
      lado: 'top',
    },
    {
      donde: boton('Crear Lote'),
      titulo: 'Guarda el lote',
      texto: 'Quedará dentro del predio y luego podrás agregarle sublotes.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/sublote\/nuevo/, 'sublote-nuevo', 'Nuevo sublote', [
    {
      donde: seccion('Información del Sublote'),
      titulo: 'Agrega un sublote',
      texto: 'Es una división del lote, por ejemplo un sector. Solo necesitas darle un nombre.',
      lado: 'bottom',
    },
    {
      donde: boton('Crear Sublote'),
      titulo: 'Guarda el sublote',
      texto: 'Después podrás agregarle líneas y palmas.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/linea\/nuevo/, 'linea-nueva', 'Nueva línea', [
    {
      donde: seccion('Información de la Línea'),
      titulo: 'Agrega una línea',
      texto: 'Una línea es cada hilera de palmas. Indica su número y cuántas palmas tiene.',
      lado: 'bottom',
    },
    {
      donde: boton('Crear Línea'),
      titulo: 'Guarda la línea',
      texto: 'Quedará dentro del sublote con sus palmas registradas.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/palmas\/nuevo/, 'palmas-nuevas', 'Agregar palmas', [
    {
      donde: seccion('Cantidad de Palmas'),
      titulo: 'Agrega palmas',
      texto: 'Indica cuántas palmas quieres sumar a esta línea. PalmApp les asigna un código a cada una.',
      lado: 'bottom',
    },
    {
      donde: boton('Agregar Palmas'),
      titulo: 'Guarda',
      texto: 'Las palmas aparecerán en la línea.',
      lado: 'top',
    },
  ]),
  tour(/^\/plantacion\/lote\/[^/]+$/, 'lote-detalle', 'Detalle del lote', [
    {
      titulo: 'Todo sobre este lote',
      texto: 'Sus datos de siembra y la organización de sublotes, líneas y palmas.',
    },
    {
      donde: seccion('Información del lote'),
      titulo: 'Datos del lote',
      texto: 'Fecha de siembra, hectáreas, palmas por hectárea y semillas usadas.',
      lado: 'bottom',
    },
    {
      donde: boton('Editar lote'),
      titulo: 'Corrige los datos',
      texto: 'Si algo cambió, actualízalo desde aquí.',
      lado: 'left',
    },
    {
      donde: boton('Nuevo sublote'),
      titulo: 'Agrega un sublote',
      texto: 'Divide el lote en sectores para llevar un mejor control.',
      lado: 'left',
    },
    {
      donde: bloqueCon('Sublote A'),
      titulo: 'Abre cada sublote',
      texto: 'Toca un sublote para ver sus líneas. Dentro de cada línea encuentras sus palmas, con cuáles están activas.',
      lado: 'top',
    },
  ]),

  // ---------- Operaciones ----------
  tour(/^\/operaciones$/, 'operaciones', 'Operaciones', [
    {
      titulo: 'Operaciones',
      texto: 'Aquí registras el trabajo diario del campo: quién trabajó, en qué labor, en qué lote y cuánto hizo.',
    },
    {
      donde: boton('Nueva planilla'),
      titulo: 'La planilla del día',
      texto: 'Anota los colaboradores, las labores y las cantidades del día. Se guarda como borrador hasta que la apruebes.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Estado de las planillas',
      texto: 'Cuántas hay en el período, cuántas faltan por aprobar y cuántas ya están aprobadas.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Planillas recientes',
      texto: 'Cada fila muestra la fecha, el estado, los colaboradores y el total de jornales. Toca la fecha para revisarla o aprobarla.',
      lado: 'top',
    },
    {
      donde: boton('Importar'),
      titulo: 'Carga desde Excel',
      texto: 'Si ya llevabas el registro en Excel, súbelo de una sola vez.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/operaciones\/planilla\/(nueva|editar)/, 'planilla-nueva', 'Nueva planilla', [
    {
      titulo: 'Registra el día de trabajo',
      texto: 'Vas por pasos: primero los datos generales y luego las labores de cada persona.',
    },
    {
      donde: bloqueCon('Información general', 'Labores de palma', 'Finalización'),
      titulo: 'Los pasos',
      texto: 'Datos generales, labores de palma, labores de finca, horas extras y cierre.',
      lado: 'bottom',
    },
    {
      donde: seccion('Información general'),
      titulo: 'Datos del día',
      texto: 'Indica la fecha y quién es el responsable de la planilla.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'Aquí se va sumando lo que registras, para que revises antes de terminar.',
      lado: 'left',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Pasa a registrar las labores.',
      lado: 'top',
    },
  ]),
  tour(/^\/operaciones\/planilla\/[^/]+$/, 'planilla-ver', 'Ver planilla', [
    {
      titulo: 'Revisa la planilla',
      texto: 'Mira lo que se registró ese día antes de aprobarla.',
    },
    {
      donde: bloqueCon('Información general', 'Labores de palma', 'Finalización'),
      titulo: 'Recorre cada parte',
      texto: 'Toca cada paso para ver las labores de palma, las de finca y el cierre.',
      lado: 'bottom',
    },
    {
      donde: boton('Editar'),
      titulo: 'Corrige',
      texto: 'Si encuentras un error, ajústalo antes de aprobar.',
      lado: 'left',
    },
    {
      donde: boton('Aprobar planilla'),
      titulo: 'Aprueba',
      texto: 'Al aprobarla, el trabajo de ese día queda listo para tenerse en cuenta en los pagos.',
      lado: 'left',
    },
  ]),
  tour(/^\/labores-palma/, 'labores', 'Labores de palma', [
    {
      titulo: 'Labores de palma',
      texto: 'El registro de los trabajos hechos en las palmas.',
    },
    {
      donde: pestanas,
      titulo: 'Una pestaña por labor',
      texto: 'Cosecha, plateo, poda, fertilización, sanidad y otros.',
      lado: 'bottom',
    },
    {
      donde: boton('Agregar'),
      titulo: 'Agrega un registro',
      texto: 'Anota el trabajo hecho en la labor que tienes abierta.',
      lado: 'left',
    },
    {
      donde: tabla,
      titulo: 'Lo registrado',
      texto: 'Aquí ves todos los trabajos de esa labor.',
      lado: 'top',
    },
  ]),

  // ---------- Viajes ----------
  tour(/^\/(viajes|remisiones)$/, 'viajes', 'Viajes', [
    {
      titulo: 'Viajes',
      texto: 'Cada despacho de fruto a la extractora, desde que sale de la finca hasta que se confirma el peso.',
    },
    {
      donde: boton('Nuevo viaje'),
      titulo: 'Registra un viaje',
      texto: 'Indica la fecha, el transportador, el vehículo y la extractora a la que va el fruto.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Resumen de viajes',
      texto: 'Los viajes del período, los que faltan por validar, los finalizados y los kilos despachados.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Viajes registrados',
      texto: 'Busca por remisión, fecha, estado, placa, conductor o extractora. Toca la remisión para ver el detalle y la cosecha.',
      lado: 'top',
    },
    {
      donde: boton('Importar'),
      titulo: 'Carga desde Excel',
      texto: 'Sube varios viajes de una sola vez.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/viajes\/nuevo/, 'viaje-nuevo', 'Nuevo viaje', [
    {
      donde: seccion('Información general'),
      titulo: 'Datos del despacho',
      texto: 'Elige primero el transportador: así aparecen sus conductores y vehículos. Luego la extractora y la hora de salida.',
      lado: 'bottom',
    },
    {
      donde: boton('Crear viaje'),
      titulo: 'Crea el viaje',
      texto: 'Quedará en la lista para registrar su cosecha y confirmar el peso.',
      lado: 'top',
    },
  ]),
  tour(/^\/viajes\/[^/]+\/conteo/, 'viaje-conteo', 'Conteo de cosecha', [
    {
      titulo: 'Conteo de cosecha',
      texto: 'Aquí registras lo que se cargó en este viaje: de qué lotes salió y cuántos gajos lleva.',
    },
    {
      donde: bloqueCon('Información del viaje', 'Cosecha'),
      titulo: 'Dos pasos',
      texto: 'Primero revisas los datos del viaje y luego agregas las cosechas.',
      lado: 'bottom',
    },
    {
      donde: seccion('Información del viaje'),
      titulo: 'Revisa el viaje',
      texto: 'Son los datos con los que se creó. Confirma que sean los de este despacho.',
      lado: 'bottom',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Sigue con la cosecha',
      texto: 'En el siguiente paso agregas cada cosecha, con su planilla, su lote y los gajos que van en el viaje.',
      lado: 'top',
    },
    {
      donde: bloqueCon('gajos pendientes', 'Revisar'),
      titulo: 'Gajos pendientes',
      texto: 'Este aviso muestra las cosechas con gajos sin enviar desde hace varios viajes, porque podrían ser clavijos.',
      lado: 'bottom',
    },
    {
      donde: boton('Agregar cosecha'),
      titulo: 'Agrega cada cosecha',
      texto: 'Elige la planilla y la cuadrilla de reconteo, e indica los gajos que van en este viaje. Los que no suban quedan pendientes.',
      lado: 'bottom',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'Mira cómo va el conteo y cuántas cosechas llevas registradas.',
      lado: 'left',
    },
    {
      donde: boton('Finalizar conteo'),
      titulo: 'Finaliza',
      texto: 'Cuando termines, el viaje queda en camino hacia la extractora.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/(viajes|remisiones)\/[^/]+$/, 'viaje-detalle', 'Detalle del viaje', [
    {
      titulo: 'Detalle del viaje',
      texto: 'Toda la información de este despacho en un solo lugar.',
    },
    {
      donde: seccion('Información del viaje'),
      titulo: 'Datos del despacho',
      texto: 'Fecha, hora de salida, vehículo, conductor, transportador y extractora.',
      lado: 'bottom',
    },
    {
      donde: seccion('Resumen de cosecha'),
      titulo: 'Qué llevó',
      texto: 'Los gajos y kilos del viaje, separados por lote.',
      lado: 'top',
    },
    {
      donde: seccion('Formulario de Extractora'),
      titulo: 'El formulario de la planta',
      texto: 'Aquí cargas el documento que manda la extractora. PalmApp le lee el peso, la hora y la calidad, y usted confirma antes de cerrar el viaje.',
      lado: 'top',
    },
    {
      donde: boton('Gestionar viaje'),
      titulo: 'Actualiza el viaje',
      texto: 'Corrige o completa los datos de este despacho.',
      lado: 'bottom',
    },
    {
      donde: boton('Enviar por WhatsApp'),
      titulo: 'Compártelo',
      texto: 'Envía la información del viaje por WhatsApp o descarga el documento.',
      lado: 'bottom',
    },
  ]),

  // ---------- Colaboradores ----------
  tour(/^\/colaboradores$/, 'colaboradores', 'Colaboradores', [
    {
      titulo: 'Colaboradores',
      texto: 'La información de tu personal: datos, contrato, seguridad social, dotación y cuenta bancaria.',
    },
    {
      donde: boton('Nuevo colaborador'),
      titulo: 'Vincula a alguien',
      texto: 'PalmApp te pide paso a paso los datos personales, el contrato y los documentos.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Tu equipo',
      texto: 'Cuántas personas tienes registradas, cuántas están activas y cuántas no.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Encuentra a alguien',
      texto: 'Busca por nombre, cédula o cargo.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'La ficha de cada persona',
      texto: 'Toca el nombre para ver su ficha completa. Con los íconos de la derecha editas sus datos, cambias su estado o la retiras de la lista.',
      lado: 'top',
    },
    {
      donde: boton('Importar'),
      titulo: 'Carga desde Excel',
      texto: 'Si ya tienes la lista en Excel, súbela de una sola vez.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/colaboradores\/(nuevo|editar\/[^/]+)$/, 'colaborador-form', 'Datos del colaborador', [
    {
      titulo: 'Datos del colaborador',
      texto: 'Vas por pasos. Lo que llenes se guarda al terminar.',
    },
    {
      donde: bloqueCon('Personal', 'Identificación', 'Contratación', 'Bancario'),
      titulo: 'Los pasos',
      texto: 'Datos personales, identificación, contrato, seguridad social, dotación y cuenta bancaria.',
      lado: 'bottom',
    },
    {
      donde: seccion('Información personal'),
      titulo: 'Empieza por lo básico',
      texto: 'Nombre, foto, datos de contacto y a quién llamar en caso de emergencia.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'Aquí ves lo que llevas diligenciado antes de guardar.',
      lado: 'left',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Pasa al siguiente paso cuando termines este.',
      lado: 'top',
    },
  ]),
  tour(/^\/colaboradores\/[^/]+$/, 'colaborador-detalle', 'Ficha del colaborador', [
    {
      titulo: 'Ficha del colaborador',
      texto: 'Toda la información de esta persona reunida en un solo lugar.',
    },
    {
      donde: seccion('Información laboral'),
      titulo: 'Datos de trabajo',
      texto: 'Fecha de ingreso, modalidad de pago y salario. Más abajo encuentras seguridad social, dotación y banco.',
      lado: 'top',
    },
    {
      donde: [seccion('Repositorio de Documentos'), seccion('Documentos')],
      titulo: 'Sus documentos',
      texto: 'Contratos, permisos, incapacidades y desprendibles, organizados por tipo.',
      lado: 'top',
    },
    {
      donde: boton('Editar'),
      titulo: 'Actualiza los datos',
      texto: 'Cambia aquí lo que sea necesario.',
      lado: 'left',
    },
  ]),

  // ---------- Pagos ----------
  tour(/^\/nomina$/, 'pagos', 'Pagos', [
    {
      titulo: 'Pagos',
      texto: 'Aquí liquidas la nómina de cada quincena, pagas a los contratistas y generas los desprendibles.',
    },
    {
      donde: boton('Nuevo período de pago'),
      titulo: 'Abre una quincena',
      texto: 'Eliges las fechas y los colaboradores y revisas la cosecha. PalmApp calcula lo que le corresponde a cada uno.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Resumen de pagos',
      texto: 'Lo pagado a colaboradores y a contratistas, lo que falta por pagar y lo pendiente. Cambia el período con el selector de arriba.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Períodos de pago',
      texto: 'Cada quincena con su estado. Las cerradas se consultan con Ver y las que siguen abiertas se liquidan.',
      lado: 'top',
    },
    {
      donde: boton('Planilla diaria'),
      titulo: 'Planilla diaria',
      texto: 'Revisa lo que ganó cada colaborador por día y por labor.',
      lado: 'bottom',
    },
    {
      donde: boton('Préstamos'),
      titulo: 'Préstamos y adelantos',
      texto: 'Registra los préstamos y lleva las cuotas que se descuentan en cada pago.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/nomina\/nueva$/, 'pago-nuevo', 'Nuevo período de pago', [
    {
      titulo: 'Abre una quincena',
      texto: 'En cuatro pasos dejas lista la nómina del período.',
    },
    {
      donde: seccion('Información del período'),
      titulo: 'Las fechas',
      texto: 'Elige el mes, si pagas por quincena o por mes, y las fechas exactas.',
      lado: 'top',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Después seleccionas a los colaboradores, revisas la cosecha y confirmas.',
      lado: 'top',
    },
  ]),
  tour(/^\/nomina\/liquidacion\/nueva$/, 'liquidacion-nueva', 'Nueva liquidación', [
    {
      donde: seccion('Tipo de liquidación'),
      titulo: 'Qué vas a liquidar',
      texto: 'Elige el tipo de liquidación y sigue los pasos.',
      lado: 'top',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Sigue al próximo paso cuando hayas elegido.',
      lado: 'top',
    },
  ]),
  tour(/^\/nomina\/prestamos$/, 'prestamos', 'Préstamos', [
    {
      titulo: 'Préstamos',
      texto: 'Los adelantos y préstamos que has hecho a tus colaboradores.',
    },
    {
      donde: boton('Nuevo préstamo'),
      titulo: 'Registra un préstamo',
      texto: 'Indica a quién, por cuánto y en cuántas cuotas se va a descontar.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Cuánto falta por cobrar',
      texto: 'El saldo pendiente y los préstamos que siguen vigentes.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada préstamo',
      texto: 'Mira el saldo, la cuota y cuántas cuotas van. Puedes descargar el comprobante.',
      lado: 'top',
    },
    {
      donde: boton('Abonos'),
      titulo: 'Abonos',
      texto: 'Entra aquí para ver y registrar los pagos de un préstamo.',
      lado: 'left',
    },
  ]),
  tour(/^\/nomina\/nuevo-prestamo$/, 'prestamo-nuevo', 'Nuevo préstamo', [
    {
      donde: seccion('Colaborador'),
      titulo: 'A quién',
      texto: 'Busca al colaborador por su nombre o su cédula.',
      lado: 'bottom',
    },
    {
      donde: seccion('Préstamo'),
      titulo: 'Por cuánto',
      texto: 'Indica el motivo y el valor del préstamo.',
      lado: 'top',
    },
    {
      donde: bloqueCon('Cuota', 'Total descontado'),
      titulo: 'Cómo se descuenta',
      texto: 'Elige si se descuenta cada quincena o cada mes, en cuántas cuotas y desde cuándo.',
      lado: 'top',
    },
    {
      donde: boton('Guardar préstamo'),
      titulo: 'Guarda',
      texto: 'Las cuotas se tendrán en cuenta en los pagos.',
      lado: 'top',
    },
  ]),
  tour(/^\/nomina\/prestamos\/[^/]+\/abonos$/, 'abonos', 'Abonos del préstamo', [
    {
      donde: indicadores,
      titulo: 'Cómo va el préstamo',
      texto: 'El valor total, lo abonado, lo que falta y el valor de la cuota.',
      lado: 'bottom',
    },
    {
      donde: boton('Registrar pago'),
      titulo: 'Registra un abono',
      texto: 'Anota un pago hecho por fuera de la nómina.',
      lado: 'left',
    },
    {
      donde: seccion('Historial de pagos'),
      titulo: 'Historial',
      texto: 'Todos los pagos hechos a este préstamo.',
      lado: 'top',
    },
  ]),
  tour(/^\/nomina\/planilla-diaria$/, 'planilla-diaria', 'Planilla diaria', [
    {
      titulo: 'Planilla diaria de trabajo',
      texto: 'Lo que hizo y ganó cada colaborador en el período, separado por labor.',
    },
    {
      donde: indicadores,
      titulo: 'Totales',
      texto: 'Lo que reciben los colaboradores, el valor antes de descuentos y los kilos del período.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar colaborador'),
      titulo: 'Busca a alguien',
      texto: 'También puedes ver un solo lote.',
      lado: 'bottom',
    },
    {
      donde: seccion('Cosecha'),
      titulo: 'Una sección por labor',
      texto: 'Cosecha, plateo, poda, fertilización, sanidad y auxiliares.',
      lado: 'top',
    },
    {
      donde: boton('Exportar'),
      titulo: 'Llévate la planilla',
      texto: 'Descárgala para revisarla o guardarla.',
      lado: 'bottom',
    },
  ]),
  tour(/^\/nomina\/[^/]+\/liquidar\/[^/]+$/, 'liquidar-colaborador', 'Liquidar colaborador', [
    {
      titulo: 'Liquida a este colaborador',
      texto: 'Revisa lo que ganó y lo que se le descuenta antes de confirmar.',
    },
    {
      donde: seccion('Devengado'),
      titulo: 'Lo que ganó',
      texto: 'El salario y los demás pagos del período.',
      lado: 'top',
    },
    {
      donde: seccion('Deducciones'),
      titulo: 'Lo que se descuenta',
      texto: 'Salud, pensión, préstamos y otros descuentos. Puedes agregar los que falten.',
      lado: 'top',
    },
    {
      donde: seccion('Bonificación'),
      titulo: 'Bonificaciones',
      texto: 'Agrega aquí cualquier pago adicional.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Lo que recibe',
      texto: 'El valor final que se le va a pagar.',
      lado: 'left',
    },
    {
      donde: boton('Confirmar y guardar'),
      titulo: 'Confirma',
      texto: 'Se guarda la liquidación y queda listo su desprendible.',
      lado: 'top',
    },
  ]),
  tour(/^\/nomina\/[^/]+\/ver\/[^/]+$/, 'ver-liquidacion', 'Ver liquidación', [
    {
      donde: seccion('Resumen de trabajo'),
      titulo: 'Lo trabajado',
      texto: 'Los días y labores de esta persona en el período.',
      lado: 'bottom',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Lo que recibió',
      texto: 'El valor final, después de descuentos y bonificaciones.',
      lado: 'left',
    },
    {
      donde: boton('Enviar por WhatsApp'),
      titulo: 'Compártelo',
      texto: 'Envíale el comprobante por WhatsApp, imprímelo o descárgalo.',
      lado: 'bottom',
    },
  ]),
  tour(/^\/nomina\/[^/]+\/desprendible\/[^/]+$/, 'desprendible', 'Desprendible de pago', [
    {
      titulo: 'Desprendible de pago',
      texto: 'El comprobante que recibe el colaborador con el detalle de su pago.',
    },
    {
      donde: tabla,
      titulo: 'El detalle',
      texto: 'Cada concepto pagado y descontado, con el total a recibir.',
      lado: 'top',
    },
    {
      donde: boton('Enviar por WhatsApp'),
      titulo: 'Entrégalo',
      texto: 'Envíalo por WhatsApp, imprímelo o descárgalo.',
      lado: 'bottom',
    },
  ]),
  tour(/^\/nomina\/[^/]+\/liquidar-terceros$/, 'liquidar-terceros', 'Liquidación de contratistas', [
    {
      titulo: 'Pago a contratistas',
      texto: 'Las empresas que te prestan servicios, con sus trabajadores y lo que les corresponde en este período.',
    },
    {
      donde: bloqueCon('Servicios Agro'),
      titulo: 'Cada empresa',
      texto: 'Abre una empresa para ver a sus trabajadores y agregar descuentos si aplica.',
      lado: 'top',
    },
    {
      donde: boton('Liquidar'),
      titulo: 'Liquida',
      texto: 'Confirma el pago y genera el comprobante.',
      lado: 'left',
    },
  ]),
  tour(/^\/nomina\/[^/]+(\/editar)?$/, 'pago-detalle', 'Detalle de la quincena', [
    {
      titulo: 'Detalle de la quincena',
      texto: 'Quién se ha liquidado, cuánto se ha pagado y cuánto falta.',
    },
    {
      donde: pestanas,
      titulo: 'Colaboradores y contratistas',
      texto: 'Cambia entre tu personal y las empresas contratistas.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Totales del período',
      texto: 'Lo ganado, lo descontado, lo que se paga y cuántas personas ya están liquidadas.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Persona por persona',
      texto: 'Toca el nombre para revisar su pago. Si aún no está liquidada, usa el botón Liquidar.',
      lado: 'top',
    },
    {
      donde: boton('Exportar'),
      titulo: 'Llévate el informe',
      texto: 'Descarga el resumen de la quincena.',
      lado: 'bottom',
    },
  ]),

  // ---------- Novedades ----------
  tour(/^\/novedades$/, 'novedades', 'Novedades', [
    {
      titulo: 'Novedades',
      texto: 'Todo lo que cambia la nómina fuera del trabajo normal: permisos, incapacidades, ausencias, suspensiones y retiros.',
    },
    {
      donde: boton('Nueva novedad'),
      titulo: 'Registra una novedad',
      texto: 'Eliges al colaborador, el tipo y las fechas. Se tiene en cuenta al liquidar el pago.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar colaborador'),
      titulo: 'Busca en el historial',
      texto: 'Por colaborador, por tipo de novedad o por fechas.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Historial de novedades',
      texto: 'Cada novedad con su tipo, sus fechas y los días. Toca el ojo para ver el detalle.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/novedades\/nueva/, 'novedad-nueva', 'Registrar novedad', [
    {
      titulo: 'Registra una novedad',
      texto: 'Primero el tipo y luego los detalles.',
    },
    {
      donde: bloqueCon('Permisos y licencias', 'Incapacidades', 'Vacaciones'),
      titulo: 'Elige la categoría',
      texto: 'Permisos, incapacidades, ausencias, vacaciones o terminación de contrato.',
      lado: 'right',
    },
    {
      donde: tabla,
      titulo: 'Elige el tipo',
      texto: 'Cada tipo indica si es remunerado y qué efecto tiene en el pago.',
      lado: 'top',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Después indicas el colaborador, las fechas y el soporte.',
      lado: 'top',
    },
  ]),

  // ---------- Liquidaciones ----------
  tabPrestacion(
    'liq-intereses',
    'Intereses de cesantías',
    /^\/liquidaciones\?.*tab=intereses/,
    'Los intereses que se le pagan a cada colaborador sobre sus cesantías.',
    'El total de intereses, lo ya pagado y lo que falta por liquidar.',
    'Nuevo período',
    'Cada año con su estado y sus valores. Toca el nombre para ver el detalle.'
  ),
  tabPrestacion(
    'liq-prima',
    'Prima de servicios',
    /^\/liquidaciones\?.*tab=prima/,
    'La prima que se paga cada semestre a los colaboradores.',
    'El total de prima, lo ya pagado y lo que falta por liquidar.',
    'Nuevo período',
    'Cada semestre con su estado y sus valores. Toca el nombre para ver el detalle.'
  ),
  tour(/^\/liquidaciones\?.*tab=vacaciones/, 'liq-vacaciones', 'Vacaciones', [
    {
      titulo: 'Vacaciones',
      texto: 'Los días de vacaciones que tiene acumulados cada colaborador y su liquidación.',
    },
    {
      donde: pestanas,
      titulo: 'Cada prestación en su pestaña',
      texto: 'Cesantías, intereses, prima, vacaciones y liquidación final. Cada una tiene su propia guía.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar colaborador'),
      titulo: 'Busca a alguien',
      texto: 'Por nombre o por cédula.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Vacaciones pendientes',
      texto: 'Quién tiene días por disfrutar. El color te indica a quién conviene darle prioridad.',
      lado: 'top',
    },
    {
      donde: boton('Liquidar'),
      titulo: 'Liquida las vacaciones',
      texto: 'PalmApp calcula el valor según los días que se van a tomar.',
      lado: 'left',
    },
    {
      donde: boton('Histórico'),
      titulo: 'Histórico',
      texto: 'Consulta las vacaciones que ya se liquidaron.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/liquidaciones\?.*tab=liquidacion-final/, 'liq-final', 'Liquidación final', [
    {
      titulo: 'Liquidación final',
      texto: 'Lo que se le paga a una persona cuando termina su contrato.',
    },
    {
      donde: pestanas,
      titulo: 'Cada prestación en su pestaña',
      texto: 'Cesantías, intereses, prima, vacaciones y liquidación final. Cada una tiene su propia guía.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Cómo vas',
      texto: 'Lo que falta por pagar y cuántas liquidaciones están en borrador, aprobadas o pagadas.',
      lado: 'bottom',
    },
    {
      donde: boton('Nueva liquidación'),
      titulo: 'Liquida un contrato',
      texto: 'Elige al colaborador y el motivo del retiro. PalmApp calcula lo que le corresponde.',
      lado: 'left',
    },
    {
      donde: tabla,
      titulo: 'Liquidaciones registradas',
      texto: 'Toca el nombre del colaborador para ver el detalle.',
      lado: 'top',
    },
    cierre,
  ]),
  tabPrestacion(
    'liquidaciones',
    'Cesantías',
    /^\/liquidaciones(\?.*)?$/,
    'Liquidaciones reúne las prestaciones de ley. Aquí estás en cesantías: lo que se consigna cada año al fondo de cada colaborador.',
    'El total de cesantías, lo ya consignado y lo que falta por liquidar.',
    'Nuevo período',
    'Cada año con su estado, sus valores y la fecha límite. Toca el nombre para ver el detalle.'
  ),
  nuevaPrestacion('cesantia-nueva', 'Nuevo período de cesantías', /^\/liquidaciones\/cesantias\/nueva/, 'las cesantías del año'),
  nuevaPrestacion('intereses-nuevo', 'Nuevo período de intereses', /^\/liquidaciones\/intereses\/nueva/, 'los intereses sobre las cesantías'),
  nuevaPrestacion('prima-nueva', 'Nuevo período de prima', /^\/liquidaciones\/prima\/nueva/, 'la prima del semestre'),
  detallePrestacion('cesantia-detalle', 'Cesantías del período', /^\/liquidaciones\/cesantias\/[^/]+$/, 'las cesantías'),
  detallePrestacion('intereses-detalle', 'Intereses del período', /^\/liquidaciones\/intereses\/[^/]+$/, 'los intereses'),
  detallePrestacion('prima-detalle', 'Prima del período', /^\/liquidaciones\/prima\/[^/]+$/, 'la prima'),
  tour(/^\/liquidaciones\/vacaciones\/nueva/, 'vacaciones-nueva', 'Nueva liquidación de vacaciones', [
    {
      donde: seccion('Información del período'),
      titulo: 'Datos del período',
      texto: 'Ponle un nombre y elige las fechas.',
      lado: 'top',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Después eliges a los colaboradores y revisas el valor de cada uno.',
      lado: 'top',
    },
  ]),
  tour(/^\/liquidaciones\/vacaciones\/historico/, 'vacaciones-historico', 'Histórico de vacaciones', [
    {
      titulo: 'Histórico de vacaciones',
      texto: 'Las vacaciones que ya se liquidaron.',
    },
    {
      donde: campo('Buscar colaborador'),
      titulo: 'Busca',
      texto: 'Por colaborador, estado o fechas.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada liquidación',
      texto: 'Con el ícono de la derecha descargas su comprobante.',
      lado: 'top',
    },
  ]),
  tour(/^\/liquidaciones\/vacaciones\/[^/]+$/, 'vacaciones-detalle', 'Vacaciones del colaborador', [
    {
      titulo: 'Vacaciones del colaborador',
      texto: 'Los días acumulados, los disfrutados y lo que le corresponde.',
    },
    {
      donde: indicadores,
      titulo: 'Sus días',
      texto: 'Cuántos ha ganado, cuántos ha tomado y cuántos le quedan.',
      lado: 'bottom',
    },
  ]),
  tour(/^\/liquidaciones\/liquidacion-final\/nueva/, 'final-nueva', 'Nueva liquidación final', [
    {
      titulo: 'Liquida un contrato',
      texto: 'Te guiamos para calcular lo que le corresponde a la persona que se retira.',
    },
    {
      donde: seccion('Tipo de liquidación'),
      titulo: 'Elige cómo hacerlo',
      texto: 'Selecciona el tipo de liquidación para empezar.',
      lado: 'top',
    },
  ]),
  tour(/^\/liquidaciones\/liquidacion-final\/[^/]+$/, 'final-detalle', 'Liquidación final de contrato', [
    {
      titulo: 'Liquidación final de contrato',
      texto: 'El cálculo completo de lo que recibe la persona al terminar su contrato.',
    },
  ]),

  // ---------- Agente IA ----------
  tour(/^\/agente-ia/, 'agente-ia', 'Agente IA', [
    {
      titulo: 'Tu asistente',
      texto: 'Pregúntale con tus propias palabras sobre la finca: producción, colaboradores, pagos o el estado de la plantación.',
    },
    {
      donde: () => [...(document.querySelector('main')?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').startsWith('Estado de la plantación'))?.parentElement,
      titulo: 'Empieza con una sugerencia',
      texto: 'Toca una de estas preguntas para ver cómo responde.',
      lado: 'top',
    },
    {
      donde: [campo('Escribe'), campo('Pregunta'), en('textarea'), en('input[type="text"]')],
      titulo: 'Escribe tu pregunta',
      texto: 'Por ejemplo: ¿cuántos kilos sacó el Lote Norte este mes?',
      lado: 'top',
    },
    {
      titulo: 'Revisa las cifras',
      texto: 'Antes de tomar una decisión importante, confirma los datos en la sección correspondiente.',
    },
    cierre,
  ]),

  // ---------- Tienda ----------
  tour(/^\/market$/, 'tienda', 'Tienda de insumos', [
    {
      titulo: 'Tienda de insumos',
      texto: 'Compra fertilizantes, agroquímicos, herramientas y equipos sin salir de PalmApp.',
    },
    {
      donde: pestanas,
      titulo: 'Categorías',
      texto: 'Mira solo el tipo de producto que necesitas.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Busca y ordena',
      texto: 'Por nombre o descripción. A la derecha puedes ordenar por precio.',
      lado: 'bottom',
    },
    {
      donde: boton('Agregar'),
      titulo: 'Agrega al carrito',
      texto: 'Elige la cantidad. Si el proveedor da mejor precio por volumen, se aplica solo.',
      lado: 'top',
    },
    {
      donde: boton('Carrito'),
      titulo: 'Carrito y pago',
      texto: 'Revisa tu compra, indica dónde entregarla y paga.',
      lado: 'bottom',
    },
    {
      donde: boton('Mis pedidos'),
      titulo: 'Sigue tus pedidos',
      texto: 'Consulta cómo va cada compra hasta que la recibes.',
      lado: 'bottom',
    },
    {
      donde: boton('Proveedores'),
      titulo: 'Conoce a los proveedores',
      texto: 'Mira quién vende, dónde está y cómo lo califican otras fincas.',
      lado: 'bottom',
    },
    cierre,
  ]),
  tour(/^\/market\/productos?\//, 'tienda-producto', 'Detalle del producto', [
    {
      donde: seccion('Descripción'),
      titulo: 'Conoce el producto',
      texto: 'Para qué sirve y sus características.',
      lado: 'top',
    },
    {
      donde: seccion('Precios por volumen'),
      titulo: 'Mejor precio por cantidad',
      texto: 'Mientras más compras, mejor puede ser el precio. Aquí ves cada nivel.',
      lado: 'top',
    },
    {
      donde: boton('Agregar al carrito'),
      titulo: 'Compra',
      texto: 'Agrégalo al carrito o cómpralo de una vez.',
      lado: 'left',
    },
  ]),
  tour(/^\/market\/carrito/, 'tienda-carrito', 'Carrito', [
    {
      titulo: 'Tu carrito',
      texto: 'Lo que llevas hasta ahora. Puedes cambiar cantidades o quitar productos.',
    },
    {
      donde: seccion('Resumen de compra'),
      titulo: 'Cuánto vas a pagar',
      texto: 'El total de tu compra con el envío.',
      lado: 'left',
    },
    {
      donde: boton('Proceder al pago'),
      titulo: 'Sigue con el pago',
      texto: 'Después indicas la dirección de entrega y cómo vas a pagar.',
      lado: 'left',
    },
  ]),
  tour(/^\/market\/checkout/, 'tienda-pago', 'Finalizar compra', [
    {
      donde: seccion('Dirección de entrega'),
      titulo: 'Dónde entregar',
      texto: 'Indica quién recibe, un teléfono y la dirección. Agrega señas para que el transportador llegue fácil.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen del pedido'),
      titulo: 'Tu pedido',
      texto: 'Revisa los productos y el total antes de confirmar.',
      lado: 'left',
    },
    {
      donde: boton('Continuar'),
      titulo: 'Continúa',
      texto: 'Luego eliges cómo pagar y confirmas tu compra.',
      lado: 'top',
    },
  ]),
  tour(/^\/market\/pedidos/, 'tienda-pedidos', 'Mis pedidos', [
    {
      donde: indicadores,
      titulo: 'Tus compras',
      texto: 'Los pedidos en curso, los entregados y el total comprado.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada pedido',
      texto: 'Toca el número para ver por dónde va.',
      lado: 'top',
    },
  ]),
  tour(/^\/market\/pedido\//, 'tienda-pedido', 'Detalle del pedido', [
    {
      donde: seccion('Productos'),
      titulo: 'Qué compraste',
      texto: 'Los productos de este pedido.',
      lado: 'top',
    },
    {
      donde: seccion('Seguimiento'),
      titulo: 'Por dónde va',
      texto: 'Cada etapa, desde la confirmación hasta la entrega.',
      lado: 'top',
    },
  ]),
  tour(/^\/market\/proveedores/, 'tienda-proveedores', 'Proveedores', [
    {
      donde: indicadores,
      titulo: 'Proveedores',
      texto: 'Cuántos hay disponibles, cómo los califican y cuántos productos ofrecen.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Busca',
      texto: 'Por nombre, descripción o ubicación.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada proveedor',
      texto: 'Toca el nombre para ver sus productos y lo que opinan otras fincas.',
      lado: 'top',
    },
  ]),
  tour(/^\/market\/proveedor\//, 'tienda-proveedor', 'Detalle del proveedor', [
    {
      donde: indicadores,
      titulo: 'Sobre este proveedor',
      texto: 'Dónde está, cuántos productos ofrece, sus ventas y el tiempo de entrega.',
      lado: 'bottom',
    },
    {
      donde: pestanas,
      titulo: 'Conócelo mejor',
      texto: 'Sus productos, su información y las opiniones de otros clientes.',
      lado: 'bottom',
    },
  ]),

  // ---------- Usuarios ----------
  tour(/^\/usuarios$/, 'usuarios', 'Usuarios', [
    {
      titulo: 'Usuarios',
      texto: 'Quién puede entrar a PalmApp y qué puede hacer cada persona.',
    },
    {
      donde: boton('Nuevo usuario'),
      titulo: 'Da acceso a alguien',
      texto: 'Crea su cuenta con el correo y elige su rol: dueño, administrador o jefe de campo.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Accesos',
      texto: 'Cuántos usuarios hay, cuántos están activos y cuántos no.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Qué puede hacer cada uno',
      texto: 'Con el ícono del escudo decides a qué secciones entra cada persona y qué puede cambiar.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/usuarios\/(nuevo|editar\/[^/]+)$/, 'usuario-form', 'Datos del usuario', [
    {
      donde: seccion('Datos del usuario'),
      titulo: 'Sus datos',
      texto: 'Nombre, correo y el rol que tendrá en PalmApp.',
      lado: 'bottom',
    },
    {
      donde: seccion('Acceso'),
      titulo: 'Su contraseña',
      texto: 'Define con qué contraseña va a entrar.',
      lado: 'top',
    },
    {
      donde: [boton('Crear usuario'), boton('Guardar')],
      titulo: 'Guarda',
      texto: 'La persona ya podrá entrar con su correo y su contraseña.',
      lado: 'top',
    },
  ]),
  tour(/^\/usuarios\/permisos\//, 'usuario-permisos', 'Permisos', [
    {
      titulo: 'Permisos',
      texto: 'Marca lo que esta persona puede hacer en cada sección.',
    },
    {
      donde: boton('Seleccionar todos'),
      titulo: 'Atajo',
      texto: 'Marca o quita todos los permisos de una vez.',
      lado: 'bottom',
    },
    {
      donde: seccion('Nómina'),
      titulo: 'Sección por sección',
      texto: 'Marca cada acción permitida. Lo que no marques, esta persona no lo podrá hacer.',
      lado: 'top',
    },
    {
      donde: boton('Guardar permisos'),
      titulo: 'Guarda',
      texto: 'Los cambios aplican para este usuario.',
      lado: 'top',
    },
  ]),
  tour(/^\/usuarios\/[^/]+$/, 'usuario-detalle', 'Detalle del usuario', [
    {
      donde: seccion('Información de contacto'),
      titulo: 'Sus datos',
      texto: 'La información de esta persona en PalmApp.',
      lado: 'bottom',
    },
    {
      donde: boton('Gestionar permisos'),
      titulo: 'Qué puede hacer',
      texto: 'Cambia a qué secciones entra esta persona.',
      lado: 'bottom',
    },
    {
      donde: boton('Editar'),
      titulo: 'Actualiza',
      texto: 'Corrige sus datos o su rol.',
      lado: 'bottom',
    },
  ]),

  // ---------- Configuración ----------
  tour(/^\/configuracion$/, 'configuracion', 'Configuración', [
    {
      titulo: 'Configuración',
      texto: 'Los datos básicos que usa toda la aplicación. Te recomendamos completarlos antes de empezar a registrar.',
    },
    {
      donde: bloqueCon('Información de la empresa', 'Legal', 'Terceros', 'Pagos y liquidaciones'),
      titulo: 'Secciones',
      texto: 'Empresa, datos legales, plantación, operaciones, colaboradores, viajes, contratistas, y pagos y liquidaciones.',
      lado: 'right',
    },
    {
      donde: boton('Subir logo'),
      titulo: 'Tu logo',
      texto: 'Aparece en los desprendibles, las liquidaciones y los demás documentos que descargas.',
      lado: 'bottom',
    },
    {
      donde: seccion('Información legal'),
      titulo: 'Datos de tu empresa',
      texto: 'Nombre, NIT y representante legal. Salen en los documentos oficiales.',
      lado: 'top',
    },
    {
      donde: boton('Guardar'),
      titulo: 'Guarda los cambios',
      texto: 'Recuerda guardar antes de cambiar de sección.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/configuracion\/terceros\//, 'config-tercero', 'Nuevo contratista', [
    {
      donde: seccion('Datos del tercero'),
      titulo: 'Datos del contratista',
      texto: 'Indica si es empresa o persona natural, su documento y cómo contactarlo.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'Lo que llevas registrado.',
      lado: 'left',
    },
    {
      donde: boton('Siguiente'),
      titulo: 'Continúa',
      texto: 'Después agregas a sus trabajadores y los precios acordados.',
      lado: 'top',
    },
  ]),
  tour(/^\/configuracion\/conceptos\//, 'config-concepto', 'Concepto de nómina', [
    {
      titulo: 'Concepto de nómina',
      texto: 'Cada pago o descuento que aparece en la nómina, por ejemplo salud o pensión.',
    },
    {
      donde: seccion('Información básica'),
      titulo: 'Qué es',
      texto: 'Su nombre y de qué tipo es.',
      lado: 'bottom',
    },
    {
      donde: seccion('Porcentajes'),
      titulo: 'Cuánto corresponde',
      texto: 'La parte que asume el colaborador y la que asume la empresa.',
      lado: 'top',
    },
    {
      donde: seccion('Vigencia'),
      titulo: 'Desde cuándo aplica',
      texto: 'Las fechas en las que este valor es válido.',
      lado: 'top',
    },
  ]),
  tour(/^\/configuracion\/extractoras\//, 'config-extractora', 'Extractora', [
    {
      donde: seccion('Datos de la empresa'),
      titulo: 'Datos de la extractora',
      texto: 'El nombre, el NIT y la ubicación de la planta a la que llevas el fruto.',
      lado: 'bottom',
    },
    {
      donde: seccion('Contacto'),
      titulo: 'Con quién hablar',
      texto: 'El nombre y el teléfono de tu contacto en la extractora.',
      lado: 'top',
    },
    {
      donde: boton('Guardar'),
      titulo: 'Guarda',
      texto: 'Quedará disponible al registrar un viaje.',
      lado: 'top',
    },
  ]),

  // ---------- Métricas ----------
  metrica(/^\/metricas\/estadisticas-generales/, 'metricas-generales', 'Estadísticas generales', [
    {
      donde: indicadores,
      titulo: 'Tus cifras generales',
      texto: 'Producción total, rendimiento promedio, lluvia acumulada y lotes activos.',
      lado: 'bottom',
    },
    {
      donde: seccion('Producción por lote'),
      titulo: 'Qué aporta cada lote',
      texto: 'La parte de la producción que viene de cada lote.',
      lado: 'top',
    },
    {
      donde: seccion('Productividad por labor'),
      titulo: 'Rendimiento por labor',
      texto: 'Compara cómo rinde cada tipo de trabajo.',
      lado: 'top',
    },
  ]),
  metrica(/^\/metricas\/productividad-colaboradores/, 'metricas-productividad', 'Productividad de colaboradores', [
    {
      donde: seccion('Rendimiento por colaborador'),
      titulo: 'Quién rinde más',
      texto: 'Compara lo que produce cada persona.',
      lado: 'top',
    },
    {
      donde: campo('Buscar colaborador'),
      titulo: 'Busca a alguien',
      texto: 'Encuentra a una persona en el detalle.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'El detalle',
      texto: 'Las cifras de cada colaborador.',
      lado: 'top',
    },
  ]),
  metrica(/^\/metricas\/precios-cosecha/, 'metricas-precios', 'Precios y productividad de cosecha', [
    {
      donde: seccion('Evolución de Precios'),
      titulo: 'Precio y producción',
      texto: 'Mira cómo se han movido el precio y la producción a lo largo del tiempo.',
      lado: 'top',
    },
    {
      donde: tabla,
      titulo: 'Precios por lote',
      texto: 'El detalle de cada lote, con el total al final.',
      lado: 'top',
    },
  ]),
  metrica(/^\/metricas\/promedios-lote/, 'metricas-promedios', 'Promedios por lote', [
    {
      donde: seccion('Kg promedio por gajo'),
      titulo: 'Peso promedio',
      texto: 'Cuánto pesa en promedio un gajo en cada lote.',
      lado: 'top',
    },
    {
      donde: tabla,
      titulo: 'El detalle',
      texto: 'Las cifras de cada lote y si van subiendo o bajando.',
      lado: 'top',
    },
  ]),
  metrica(/^\/metricas\/comparativos-historicos/, 'metricas-comparativos', 'Comparativos históricos', [
    {
      donde: seccion('Producción mensual'),
      titulo: 'Este año frente al anterior',
      texto: 'Compara la producción de cada mes con la del año pasado.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen comparativo'),
      titulo: 'Resumen',
      texto: 'Las cifras principales de cada año, lado a lado.',
      lado: 'top',
    },
  ]),
];
