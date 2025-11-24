const db = require('../config/db');

// CREATE: Función para crear una nueva cita
const createCita = async (req, res) => {
  // Obtenemos una conexión del pool para poder usar transacciones
    const connection = await db.getConnection(); 
    try {
    const { usuario_id, direccion_id, fecha_hora_cita, precio_total, servicios } = req.body;

    // --- Iniciamos una transacción ---
    // Esto asegura que si algo falla, todos los cambios se revierten.
    // O se guardan los datos en AMBAS tablas, o no se guarda nada.
    await connection.beginTransaction();

    // 1. Insertar la cita principal en la tabla `citas`
    const citaSql = 'INSERT INTO citas (usuario_id, direccion_id, fecha_hora_cita, precio_total) VALUES (?, ?, ?, ?)';
    const [citaResult] = await connection.query(citaSql, [usuario_id, direccion_id, fecha_hora_cita, precio_total]);
    const nuevaCitaId = citaResult.insertId;

    // 2. Insertar cada servicio de la cita en la tabla `citas_servicios`
    const serviciosPromises = servicios.map(servicio => {
        const servicioSql = 'INSERT INTO citas_servicios (cita_id, opcion_variacion_id, cantidad, precio_reserva) VALUES (?, ?, ?, ?)';
        return connection.query(servicioSql, [nuevaCitaId, servicio.id, servicio.cantidad, servicio.precio]);
    });
    
    await Promise.all(serviciosPromises); // Esperamos que todos los servicios se inserten

    // --- Confirmamos la transacción ---
    // Si llegamos aquí sin errores, guardamos todos los cambios permanentemente.
    await connection.commit();

    res.status(201).json({ citaId: nuevaCitaId, message: 'Cita creada exitosamente' });

    } catch (error) {
    // --- Revertimos la transacción ---
    // Si hubo cualquier error, deshacemos todos los cambios.
    await connection.rollback();
    console.error('Error al crear la cita:', error);
    res.status(500).json({ message: 'Error en el servidor al crear la cita' });
    } finally {
    // Liberamos la conexión para que pueda ser usada por otros
    connection.release();
    }
};

// READ (Admin): Función para obtener TODAS las citas
// REEMPLAZA tu función 'getAllCitasAdmin' existente por esta:

const getAllCitasAdmin = async (req, res) => {
    try {
        // 1. Consulta principal 
        const sql = `
            SELECT 
                c.id, c.fecha_hora_cita, c.precio_total, c.estado,
                u.nombre_completo AS cliente_nombre,
                d.direccion_calle AS direccion
            FROM citas c
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN direcciones d ON c.direccion_id = d.id
            ORDER BY c.fecha_hora_cita DESC;
        `;
        const [citas] = await db.query(sql);

        // 2. Iteramos sobre cada cita para adjuntar los nombres de los servicios
        for (let cita of citas) {
            
            // 2a. Obtenemos los nombres correctos usando el JOIN complejo
            const queryServicios = `
                SELECT 
                    ov.nombre AS nombre_variacion,
                    s.nombre AS nombre_servicio_general
                FROM citas_servicios cs
                JOIN opcion_variaciones ov ON cs.opcion_variacion_id = ov.id
                JOIN servicio_opciones so ON ov.opcion_id = so.id
                JOIN servicios s ON so.servicio_id = s.id
                WHERE cs.cita_id = ?;
            `;
            const [servicios] = await db.query(queryServicios, [cita.id]);

            // 2b. Formateamos los nombres (ej: "Lavado Básico (Automóvil)")
            const nombresFormateados = servicios.map(s => `${s.nombre_servicio_general} (${s.nombre_variacion})`);
            
            // 2c. Adjuntamos el array de nombres a la cita
            cita.servicios = nombresFormateados; 
        }

        // 3. Enviamos el JSON completo al frontend
        res.json(citas);

    } catch (error) {
        console.error('Error al obtener las citas para admin:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// READ (Cliente): Función para obtener las citas de UN solo usuario
const getCitasByUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.params; // Obtenemos el ID del usuario de la URL
        const sql = 'SELECT * FROM citas WHERE usuario_id = ? ORDER BY fecha_hora_cita DESC';
        const [citas] = await db.query(sql, [usuarioId]);
        res.json(citas);
    } catch (error) {
        console.error('Error al obtener las citas del usuario:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// UPDATE (Admin): Función para actualizar el estado de una cita

const updateCitaStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        if (!['completada', 'cancelada', 'confirmada'].includes(estado)) {
            return res.status(400).json({ message: 'Estado no válido' });
        }
        const sql = 'UPDATE citas SET estado = ? WHERE id = ?';
        const [result] = await db.query(sql, [estado, id]);

        // Si no se encontró la fila para actualizar
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada.' });
        }
        
        // Si la fila se encontró pero no cambió (porque el estado ya era ese)
        if (result.changedRows === 0) {
            return res.json({ message: 'El estado de la cita ya era ese, no se realizaron cambios.' });
        }
        
        // Si todo salió bien y hubo un cambio
        res.json({ message: `Cita marcada como ${estado}` });

    } catch (error) {
        console.error('Error al actualizar el estado de la cita:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener los Datos de una sola Cita

const getCitaById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id; 

        // 1. Consulta principal (está bien)
        const sql = `
            SELECT 
                c.id, c.fecha_hora_cita, c.precio_total, c.estado,
                u.nombre_completo as cliente_nombre, u.email as cliente_email, u.telefono as cliente_telefono,
                d.direccion_calle
            FROM citas c
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN direcciones d ON c.direccion_id = d.id
            WHERE c.id = ? AND c.usuario_id = ?
        `;
        const [citas] = await db.query(sql, [id, usuarioId]);

        if (citas.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada o no tienes permiso para verla.' });
        }
        const cita = citas[0];

        // 2. Consulta de servicios (CORREGIDA)
        const serviciosSql = `
            SELECT 
                ov.nombre AS nombre_variacion,
                s.nombre AS nombre_servicio_general
            FROM citas_servicios cs
            JOIN opcion_variaciones ov ON cs.opcion_variacion_id = ov.id
            JOIN servicio_opciones so ON ov.opcion_id = so.id
            JOIN servicios s ON so.servicio_id = s.id
            WHERE cs.cita_id = ?;
        `;
        const [servicios] = await db.query(serviciosSql, [id]);
        
        // Formateamos los nombres
        cita.servicios = servicios.map(s => `${s.nombre_servicio_general} (${s.nombre_variacion})`);

        res.json(cita);
    } catch (error) {
        console.error('Error al obtener la cita por ID:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Exportamos todas las funciones
module.exports = {
    createCita,
    getAllCitasAdmin,
    getCitasByUsuario,
    updateCitaStatus,
    getCitaById
};