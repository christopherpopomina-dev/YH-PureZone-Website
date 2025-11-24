const db = require('../config/db');

/**
 * @function getAllServicios
 * @description Obtiene todos los servicios activos y los devuelve en una estructura anidada
 * con sus opciones y variaciones de precio.
 */
const getAllServicios = async (req, res) => {
    try {
    // 1. Obtenemos los datos de las tres tablas relacionadas
    const [servicios] = await db.query('SELECT * FROM servicios WHERE esta_activo = TRUE');
    const [opciones] = await db.query('SELECT * FROM servicio_opciones');
    const [variaciones] = await db.query('SELECT * FROM opcion_variaciones');

    // 2. Ensamblamos la estructura de datos anidada
    const serviciosConOpciones = servicios.map(servicio => {
      // Para cada servicio, encontramos sus opciones correspondientes
        const opcionesDelServicio = opciones
        .filter(opcion => opcion.servicio_id === servicio.id)
        .map(opcion => {
          // Para cada opción, encontramos sus variaciones de precio
            const variacionesDeLaOpcion = variaciones.filter(variacion => variacion.opcion_id === opcion.id);
            return {
            ...opcion,
            variaciones: variacionesDeLaOpcion
            };
        });

        return {
        ...servicio,
        opciones: opcionesDelServicio
        };
    });

    res.json(serviciosConOpciones);

    } catch (error) {
    console.error('Error al obtener los servicios:', error);
    res.status(500).json({ message: 'Error en el servidor' });
    }
};

module.exports = {
    getAllServicios,
};