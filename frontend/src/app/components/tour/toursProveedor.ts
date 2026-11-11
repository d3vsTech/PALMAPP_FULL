import { bloqueCon, boton, botonTour, campo, indicadores, menu, pestanas, seccion, tabla, type PasoTour, type Tour } from './tourEngine';

// Guías del portal de proveedores. Lenguaje natural y profesional, sin términos técnicos.

const cierre: PasoTour = {
  donde: botonTour,
  titulo: 'Vuelve cuando quieras',
  texto: 'Cada pantalla tiene su propia guía. Ábrela desde este botón siempre que la necesites.',
};

const tour = (ruta: RegExp, id: string, nombre: string, pasos: PasoTour[]) => ({
  ruta,
  tour: { id, nombre, pasos } as Tour,
});

export const TOURS_PROVEEDOR: { ruta: RegExp; tour: Tour }[] = [
  tour(/^\/proveedor\/dashboard/, 'prov-inicio', 'Panel del proveedor', [
    {
      titulo: 'Te damos la bienvenida',
      texto: 'Desde este portal vendes tus productos a las fincas que usan PalmApp.',
    },
    {
      donde: menu,
      titulo: 'El menú',
      texto: 'Tus productos, tus pedidos, tus estadísticas y los datos de tu empresa.',
      lado: 'right',
    },
    {
      donde: indicadores,
      titulo: 'Cómo va tu negocio',
      texto: 'Tus ventas del mes, los productos publicados y los pedidos pendientes y completados.',
      lado: 'bottom',
    },
    {
      donde: seccion('Pedidos recientes'),
      titulo: 'Pedidos recientes',
      texto: 'Las últimas compras de las fincas, con su estado.',
      lado: 'top',
    },
    {
      donde: seccion('Productos más vendidos'),
      titulo: 'Lo que más se vende',
      texto: 'Tus productos con más ventas e ingresos.',
      lado: 'top',
    },
    {
      donde: boton('Nuevo producto'),
      titulo: 'Publica un producto',
      texto: 'Agrega lo que vendes para que las fincas lo encuentren.',
      lado: 'left',
    },
    cierre,
  ]),
  tour(/^\/proveedor\/productos\/nuevo/, 'prov-producto-nuevo', 'Nuevo producto', [
    {
      donde: seccion('Información básica'),
      titulo: 'Describe tu producto',
      texto: 'Nombre, categoría y una descripción clara de para qué sirve.',
      lado: 'top',
    },
    {
      donde: seccion('Precio e inventario'),
      titulo: 'Precio y cantidad',
      texto: 'Cuánto cuesta y cuántas unidades tienes disponibles.',
      lado: 'top',
    },
    {
      donde: seccion('Precios por volumen'),
      titulo: 'Descuentos por cantidad',
      texto: 'Si das mejor precio a quien compra más, indícalo aquí.',
      lado: 'top',
    },
    {
      donde: seccion('Imagen del producto'),
      titulo: 'Una buena foto',
      texto: 'Los productos con foto generan más confianza.',
      lado: 'top',
    },
    {
      donde: boton('Crear producto'),
      titulo: 'Publica',
      texto: 'Tu producto quedará en tu lista.',
      lado: 'top',
    },
  ]),
  tour(/^\/proveedor\/productos\/editar\//, 'prov-producto-editar', 'Editar producto', [
    {
      donde: seccion('Precio e inventario'),
      titulo: 'Mantén todo al día',
      texto: 'Actualiza el precio y la cantidad disponible para evitar pedidos que no puedas cumplir.',
      lado: 'top',
    },
    {
      donde: seccion('Precios por volumen'),
      titulo: 'Descuentos por cantidad',
      texto: 'Ajusta los precios para quienes compran más.',
      lado: 'top',
    },
  ]),
  tour(/^\/proveedor\/productos\/carga-masiva/, 'prov-carga-masiva', 'Carga masiva', [
    {
      titulo: 'Sube muchos productos a la vez',
      texto: 'Si tienes un catálogo grande, no necesitas crearlos uno por uno.',
    },
    {
      donde: boton('Descargar plantilla'),
      titulo: 'Descarga la plantilla',
      texto: 'Es un archivo para llenar en Excel con tus productos.',
      lado: 'bottom',
    },
    {
      donde: seccion('Límites y validaciones'),
      titulo: 'Qué debe llevar',
      texto: 'Aquí ves qué información va en cada columna.',
      lado: 'top',
    },
    {
      donde: seccion('Subir archivo'),
      titulo: 'Súbela',
      texto: 'Cuando la tengas lista, cárgala aquí.',
      lado: 'top',
    },
  ]),
  tour(/^\/proveedor\/productos\/[^/]+$/, 'prov-producto', 'Detalle del producto', [
    {
      donde: indicadores,
      titulo: 'Cómo le va',
      texto: 'El precio, la cantidad disponible, las ventas y lo que ha generado.',
      lado: 'bottom',
    },
    {
      donde: seccion('Precios por volumen'),
      titulo: 'Descuentos por cantidad',
      texto: 'Los precios para quienes compran más.',
      lado: 'top',
    },
    {
      donde: boton('Editar'),
      titulo: 'Actualiza',
      texto: 'Cambia el precio, la cantidad o la descripción.',
      lado: 'left',
    },
  ]),
  tour(/^\/proveedor\/productos$/, 'prov-productos', 'Mis productos', [
    {
      titulo: 'Mis productos',
      texto: 'Todo lo que tienes publicado para las fincas.',
    },
    {
      donde: boton('Nuevo producto'),
      titulo: 'Agrega un producto',
      texto: 'Con sus datos, precio y foto.',
      lado: 'bottom',
    },
    {
      donde: boton('Carga masiva'),
      titulo: '¿Son muchos?',
      texto: 'Súbelos todos de una vez con un archivo de Excel.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar productos'),
      titulo: 'Busca',
      texto: 'Por nombre, categoría o estado.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Tu lista',
      texto: 'Toca un producto para ver cómo le va. Con los íconos de la derecha lo editas o lo retiras.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/proveedor\/pedidos\/[^/]+$/, 'prov-pedido', 'Detalle del pedido', [
    {
      donde: seccion('Productos'),
      titulo: 'Qué pidieron',
      texto: 'Los productos, las cantidades y el valor.',
      lado: 'top',
    },
    {
      donde: seccion('Información del Cliente'),
      titulo: 'A quién y dónde',
      texto: 'Los datos de la finca y la dirección de entrega.',
      lado: 'top',
    },
    {
      donde: boton('Cambiar estado'),
      titulo: 'Avísale cómo va',
      texto: 'Actualiza el pedido a medida que avanza, para que la finca sepa por dónde va.',
      lado: 'left',
    },
    {
      donde: boton('Factura PDF'),
      titulo: 'La factura',
      texto: 'Descarga la factura del pedido en PDF.',
      lado: 'left',
    },
  ]),
  tour(/^\/proveedor\/pedidos$/, 'prov-pedidos', 'Pedidos', [
    {
      titulo: 'Pedidos',
      texto: 'Las compras que te hacen las fincas, desde que llegan hasta que las entregas.',
    },
    {
      donde: indicadores,
      titulo: 'Cómo vas',
      texto: 'Lo que falta por confirmar, lo que está en curso, lo entregado y tus ventas.',
      lado: 'bottom',
    },
    {
      donde: pestanas,
      titulo: 'Ordena tu trabajo',
      texto: 'Mira primero los pedidos por confirmar y luego los que están en curso.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por código'),
      titulo: 'Busca',
      texto: 'Por número de pedido o por cliente.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Atiende cada pedido',
      texto: 'Confírmalo o recházalo, márcalo como listo y confirma la entrega. Toca el número para ver todo el detalle.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/proveedor\/estadisticas/, 'prov-estadisticas', 'Estadísticas', [
    {
      donde: indicadores,
      titulo: 'Tus resultados',
      texto: 'Ventas, pedidos completados, productos vendidos y clientes activos.',
      lado: 'bottom',
    },
    {
      donde: seccion('Evolución de ventas'),
      titulo: 'Cómo han ido tus ventas',
      texto: 'Mira si vienen subiendo o bajando con el tiempo.',
      lado: 'top',
    },
    {
      donde: seccion('Productos más vendidos'),
      titulo: 'Lo que más se vende',
      texto: 'Te ayuda a decidir de qué tener más disponibilidad.',
      lado: 'top',
    },
    {
      donde: seccion('Mejores clientes'),
      titulo: 'Tus mejores clientes',
      texto: 'Las fincas que más te compran.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/proveedor\/configuracion/, 'prov-configuracion', 'Configuración', [
    {
      titulo: 'Los datos de tu empresa',
      texto: 'Mantenlos al día: las fincas los ven y los usamos para tus pagos y envíos.',
    },
    {
      donde: bloqueCon('Datos generales', 'Datos bancarios', 'Envíos', 'Notificaciones'),
      titulo: 'Las secciones',
      texto: 'Tu empresa, tu cuenta bancaria, cómo haces los envíos y qué avisos quieres recibir.',
      lado: 'bottom',
    },
    {
      donde: seccion('Datos generales'),
      titulo: 'Tu empresa',
      texto: 'Cuéntales a las fincas quién eres y qué ofreces.',
      lado: 'top',
    },
    {
      donde: seccion('Resumen'),
      titulo: 'Resumen',
      texto: 'Revisa aquí lo que tienes registrado.',
      lado: 'left',
    },
    cierre,
  ]),
];
