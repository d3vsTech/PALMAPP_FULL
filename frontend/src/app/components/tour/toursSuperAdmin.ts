import { boton, botonTour, campo, indicadores, menu, seccion, tabla, type PasoTour, type Tour } from './tourEngine';

// Guías del panel del equipo de PalmApp. Lenguaje natural y profesional.

const cierre: PasoTour = {
  donde: botonTour,
  titulo: 'Vuelve cuando quieras',
  texto: 'Cada pantalla tiene su propia guía. Ábrela desde este botón siempre que la necesites.',
};

const tour = (ruta: RegExp, id: string, nombre: string, pasos: PasoTour[]) => ({
  ruta,
  tour: { id, nombre, pasos } as Tour,
});

export const TOURS_SUPER_ADMIN: { ruta: RegExp; tour: Tour }[] = [
  tour(/^\/super-admin\/dashboard/, 'sa-inicio', 'Panel general', [
    {
      titulo: 'Panel general',
      texto: 'Una vista de todas las fincas que usan PalmApp.',
    },
    {
      donde: menu,
      titulo: 'El menú',
      texto: 'Clientes (fincas, usuarios y planes) y el estado del sistema.',
      lado: 'right',
    },
    {
      donde: indicadores,
      titulo: 'Las cifras clave',
      texto: 'Fincas registradas, las que están por vencer, los usuarios y los ingresos del mes.',
      lado: 'bottom',
    },
    {
      donde: seccion('Estado de las fincas'),
      titulo: 'Cómo están las fincas',
      texto: 'Cuántas siguen activas y cuántas tienen la suscripción vencida o suspendida.',
      lado: 'top',
    },
    {
      donde: seccion('Fincas recientes'),
      titulo: 'Las últimas que entraron',
      texto: 'Las fincas registradas hace poco, con su plan y su estado.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/super-admin\/fincas$/, 'sa-fincas', 'Fincas', [
    {
      titulo: 'Fincas',
      texto: 'Todas las fincas clientes, con su plan y el estado de su suscripción.',
    },
    {
      donde: boton('Nueva finca'),
      titulo: 'Agrega una finca',
      texto: 'Registra un cliente nuevo, su administrador y su plan.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Estado de los clientes',
      texto: 'Cuántas fincas están activas, suspendidas o vencidas.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Busca',
      texto: 'Por finca, predio o administrador.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada finca',
      texto: 'Mira su plan, su fecha de vencimiento y sus usuarios. Con los íconos de la derecha la consultas, editas o suspendes.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/super-admin\/proveedores$/, 'sa-proveedores', 'Proveedores', [
    {
      titulo: 'Los proveedores de la tienda',
      texto: 'Las empresas que venden insumos a las fincas.',
    },
    {
      donde: indicadores,
      titulo: 'Cómo van',
      texto: 'Cuántos están activos y cuántos quedan por aprobar.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por empresa'),
      titulo: 'Busca',
      texto: 'Por empresa, NIT o correo.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada proveedor',
      texto: 'Con los íconos de la derecha lo consultas, lo editas o entras a sus usuarios.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/super-admin\/(fincas|proveedores)\/[^/]+\/usuarios/, 'sa-usuarios', 'Usuarios', [
    {
      titulo: 'Usuarios',
      texto: 'Las personas de todas las fincas que tienen acceso a PalmApp.',
    },
    {
      donde: boton('Nuevo usuario'),
      titulo: 'Agrega un usuario',
      texto: 'Crea el acceso de una persona y asígnale su finca y su rol.',
      lado: 'bottom',
    },
    {
      donde: indicadores,
      titulo: 'Accesos',
      texto: 'Cuántos hay, cuántos están activos y cuántos están conectados ahora.',
      lado: 'bottom',
    },
    {
      donde: campo('Buscar por nombre'),
      titulo: 'Busca',
      texto: 'Por nombre, correo o finca.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'Cada usuario',
      texto: 'Consulta y actualiza sus datos.',
      lado: 'top',
    },
    cierre,
  ]),
  tour(/^\/super-admin\/actividad/, 'sa-actividad', 'Actividad del sistema', [
    {
      titulo: 'Actividad del sistema',
      texto: 'Qué se ha hecho en la plataforma, quién lo hizo y cuándo.',
    },
    {
      donde: indicadores,
      titulo: 'Cuánto movimiento hay',
      texto: 'Las acciones de hoy, de la semana y del mes.',
      lado: 'bottom',
    },
    {
      donde: tabla,
      titulo: 'El registro',
      texto: 'Filtra por tipo y fecha para encontrar lo que buscas.',
      lado: 'top',
    },
    {
      donde: boton('Exportar'),
      titulo: 'Llévate el registro',
      texto: 'Descárgalo para revisarlo o guardarlo.',
      lado: 'bottom',
    },
  ]),
  tour(/^\/super-admin\/diagnosticos/, 'sa-diagnosticos', 'Diagnósticos', [
    {
      titulo: 'Diagnósticos',
      texto: 'Revisa si todo está funcionando bien. Si algo requiere atención, avísale al equipo técnico.',
    },
    {
      donde: seccion('Aplicación'),
      titulo: 'Estado de cada parte',
      texto: 'Cada tarjeta muestra una parte del sistema y si está bien, requiere atención o tiene un error.',
      lado: 'top',
    },
    {
      donde: boton('Actualizar'),
      titulo: 'Revisa de nuevo',
      texto: 'Vuelve a consultar el estado actual.',
      lado: 'left',
    },
  ]),
  ];
