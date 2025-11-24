const db = require('../config/db');

// Función para obtener todos los usuarios con el rol 'cliente'
const getAllClientes = async (req, res) => {
    try {
        
        const sql = "SELECT id, nombre_completo, email, telefono, fecha_creacion FROM usuarios WHERE rol = 'cliente' ORDER BY fecha_creacion DESC";
        
        const [clientes] = await db.query(sql);
        
        res.json(clientes);
    } catch (error) {
        console.error('Error al obtener los clientes:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para que el admin cree una cita para un cliente
const createCitaAdmin = async (req, res) => {
    const connection = await db.getConnection(); 
    try {
    const { usuario_id, direccion_id, fecha_hora_cita, precio_total, servicios } = req.body;

    await connection.beginTransaction();

    // 1. Insertar la cita principal
    const citaSql = 'INSERT INTO citas (usuario_id, direccion_id, fecha_hora_cita, precio_total) VALUES (?, ?, ?, ?)';
    const [citaResult] = await connection.query(citaSql, [usuario_id, direccion_id, fecha_hora_cita, precio_total]);
    const nuevaCitaId = citaResult.insertId;

    // 2. Insertar los servicios asociados a la cita
    const serviciosPromises = servicios.map(servicio => {
        const servicioSql = 'INSERT INTO citas_servicios (cita_id, opcion_variacion_id, cantidad, precio_reserva) VALUES (?, ?, ?, ?)';
        return connection.query(servicioSql, [nuevaCitaId, servicio.id, servicio.cantidad, servicio.precio]);
    });
    await Promise.all(serviciosPromises);

    await connection.commit();
    res.status(201).json({ id: nuevaCitaId, message: 'Cita creada exitosamente por el administrador' });

    } catch (error) {
    await connection.rollback();
    console.error('Error al crear la cita por admin:', error);
    res.status(500).json({ message: 'Error en el servidor al crear la cita' });
    } finally {
    connection.release();
    }
};

// FUNCIONES CREATE, UPDATE AND DELETE

// CREATE: Función para crear un nuevo servicio
const createServicio = async (req, res) => {
    try {
    // 1. Obtenemos los campos correctos que envía el nuevo formulario
    const { nombre, descripcion, categoria } = req.body;

    // 2. La consulta SQL ahora solo inserta en las columnas que existen
    const sql = 'INSERT INTO servicios (nombre, descripcion, categoria) VALUES (?, ?, ?)';
    
    // 3. Pasamos los valores correctos a la consulta
    const [result] = await db.query(sql, [nombre, descripcion, categoria]);

    res.status(201).json({ id: result.insertId, message: 'Servicio creado exitosamente' });
    } catch (error) {
    console.error('Error al crear el servicio:', error);
    res.status(500).json({ message: 'Error en el servidor' });
    }
};

// UPDATE: Función para actualizar un servicio existente
const updateServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldsToUpdate = req.body; // Obtenemos los campos a actualizar desde el body

        // Verificamos si hay algo que actualizar
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ message: 'No hay campos para actualizar.' });
        }

        const sql = 'UPDATE servicios SET ? WHERE id = ?';
        const [result] = await db.query(sql, [fieldsToUpdate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }

        res.json({ message: 'Servicio actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar el servicio:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// DELETE: Función para "eliminar" un servicio (lo marcaremos como inactivo)
const deleteServicio = async (req, res) => {
    try {
    const { id } = req.params; // Obtenemos el ID de la URL
    // Buena práctica: en lugar de borrar, inactivamos el servicio.
    const sql = 'UPDATE servicios SET esta_activo = FALSE WHERE id = ?';
    await db.query(sql, [id]);
    res.json({ message: 'Servicio desactivado exitosamente' });
    } catch (error) {
    console.error('Error al desactivar el servicio:', error);
    res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para eliminar un cliente
const deleteCliente = async (req, res) => {
    try {
        const { id } = req.params; // ID del cliente a eliminar
        const sql = "DELETE FROM usuarios WHERE id = ? AND rol = 'cliente'";
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado o no tienes permiso para eliminarlo.' });
        }

        res.json({ message: 'Cliente eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar el cliente:', error);
        // Manejar errores de llave foránea (si el cliente tiene citas)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'No se puede eliminar el cliente porque tiene citas asociadas. Primero debes eliminar sus citas.' });
        }
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// Función para eliminar un servicio permanentemente
const deleteServicioPermanente = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM servicios WHERE id = ?";
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }
        res.json({ message: 'Servicio eliminado permanentemente.' });
    } catch (error) {
        console.error('Error al eliminar el servicio:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'No se puede eliminar el servicio porque está asociado a citas existentes.' });
        }
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// Obtiene TODOS los servicios (activos e inactivos) para el panel de admin
const getAllServiciosAdmin = async (req, res) => {
    try {
        // 1. Obtenemos los datos de las tres tablas relacionadas
        const [servicios] = await db.query('SELECT * FROM servicios ORDER BY categoria, nombre');
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
                    return { ...opcion, variaciones: variacionesDeLaOpcion };
                });
            return { ...servicio, opciones: opcionesDelServicio };
        });

        res.json(serviciosConOpciones);

    } catch (error) {
        console.error('Error al obtener los servicios para admin:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// --- FUNCIÓN PARA OPCIONES Y EDICION DE SERVICIOS ---
// Permite añadir una nueva opción de precio (ej: "Tamaño") a un servicio existente.
const addServicioOpcion = async (req, res) => {
    try {
        const { servicio_id } = req.params; // ID del servicio al que pertenece la opción
        const { nombre } = req.body; // Datos de la nueva opción

        if (!nombre) {
            return res.status(400).json({ message: 'El nombre es requerido.' });
        }

        const sql = 'INSERT INTO servicio_opciones (servicio_id, nombre) VALUES (?, ?)';
        const [result] = await db.query(sql, [servicio_id, nombre]);

        res.status(201).json({ id: result.insertId, message: 'Opción añadida exitosamente.' });
    } catch (error) {
        console.error('Error al añadir la opción de servicio:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// --- FUNCIÓN AÑADIR PRECIOS Y VARIACIONES---
// Permite añadir una nueva variación de precio (ej: "Grande: $50.000") a una opción existente.
const addOpcionVariacion = async (req, res) => {
    try {
        const { opcion_id } = req.params; // ID de la opción a la que pertenece la variación
        const { nombre, precio } = req.body; // Datos de la nueva variación

        if (!nombre || !precio) {
            return res.status(400).json({ message: 'El nombre y el precio son requeridos.' });
        }

        const sql = 'INSERT INTO opcion_variaciones (opcion_id, nombre, precio) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [opcion_id, nombre, precio]);

        res.status(201).json({ id: result.insertId, message: 'Variación de precio añadida exitosamente.' });
    } catch (error) {
        console.error('Error al añadir la variación de opción:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

module.exports = {
    getAllClientes,
    createCitaAdmin,
    createServicio,
    updateServicio,
    deleteServicio,
    deleteCliente,
    deleteServicioPermanente,
    getAllServiciosAdmin,
    addServicioOpcion,
    addOpcionVariacion
}; 