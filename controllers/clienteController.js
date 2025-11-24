const db = require('../config/db');

// Función para que un usuario obtenga su propio perfil
const getMiPerfil = async (req, res) => {
    try {
        // Gracias al middleware 'protect', ya tenemos la info del usuario en req.usuario
        const usuarioId = req.usuario.id;

        // 1. Buscamos los datos del usuario (sin la contraseña)
        const [usuarioRows] = await db.query(
            "SELECT id, nombre_completo, email, telefono FROM usuarios WHERE id = ?", 
            [usuarioId]
        );

        if (usuarioRows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // 2. Buscamos las direcciones asociadas a ese usuario
        const [direccionesRows] = await db.query("SELECT * FROM direcciones WHERE usuario_id = ?", [usuarioId]);

        // 3. Combinamos la información y la enviamos
        const perfil = {
            ...usuarioRows[0],
            direcciones: direccionesRows
        };

        res.json(perfil);

    } catch (error) {
        console.error('Error al obtener el perfil del cliente:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para que un usuario actualice su propio perfil (nombre y teléfono)
const updateMiPerfil = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { nombre_completo, telefono } = req.body;

        // Validamos que al menos uno de los campos venga en la petición
        if (!nombre_completo && !telefono) {
            return res.status(400).json({ message: 'Se requiere al menos un campo para actualizar' });
        }

        const sql = 'UPDATE usuarios SET nombre_completo = ?, telefono = ? WHERE id = ?';
        await db.query(sql, [nombre_completo, telefono, usuarioId]);

        res.json({ message: 'Perfil actualizado exitosamente' });

    } catch (error) {
        console.error('Error al actualizar el perfil del cliente:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para que un cliente cancele una de sus propias citas
const cancelarMiCita = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; // ID del usuario logueado (viene del token)
        const { id: citaId } = req.params; // ID de la cita que se quiere cancelar (viene de la URL)

        // 1. Verificación de seguridad: ¿Existe la cita Y pertenece al usuario logueado?
        const [citas] = await db.query(
            'SELECT * FROM citas WHERE id = ? AND usuario_id = ?',
            [citaId, usuarioId]
        );

        if (citas.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada o no tienes permiso para cancelarla' });
        }

        // 2. Si la cita existe y le pertenece, la actualizamos a 'cancelada'
        await db.query("UPDATE citas SET estado = 'cancelada' WHERE id = ?", [citaId]);

        res.json({ message: 'Cita cancelada exitosamente' });

    } catch (error) {
        console.error('Error al cancelar la cita:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para que un cliente añada una nueva dirección
const addMiDireccion = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; // ID del usuario logueado
        const { direccion_calle, ciudad, detalles } = req.body;

        if (!direccion_calle || !ciudad) {
            return res.status(400).json({ message: 'La calle y la ciudad son campos requeridos' });
        }

        const sql = 'INSERT INTO direcciones (usuario_id, direccion_calle, ciudad, detalles) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(sql, [usuarioId, direccion_calle, ciudad, detalles || null]);

        res.status(201).json({ id: result.insertId, message: 'Dirección añadida exitosamente' });

    } catch (error) {
        console.error('Error al añadir la dirección:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función para que un usuario obtenga SU historial de citas y citas próximas
const getMisCitas = async (req, res) => {
    try {
    const usuarioId = req.usuario.id; // ID del usuario logueado (viene del token)

    // 1. Obtenemos las citas principales y los datos de la dirección
    const queryCitas = `
        SELECT 
            c.id, 
            c.fecha_hora_cita, 
            c.precio_total, 
            c.estado, 
            d.direccion_calle, 
            d.ciudad
        FROM citas c
        JOIN direcciones d ON c.direccion_id = d.id
        WHERE c.usuario_id = ?
        ORDER BY c.fecha_hora_cita DESC;
    `;
    const [citas] = await db.query(queryCitas, [usuarioId]);

    // 2. Iteramos sobre cada cita para adjuntar sus servicios y su reseña
    for (let cita of citas) {
        
        // 2a. Obtenemos los nombres de los servicios/variaciones (la consulta corregida)
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

        // 2b. Formateamos los nombres para el frontend (ej: "Lavado Básico (Automóvil)")
        const nombresFormateados = servicios.map(s => `${s.nombre_servicio_general} (${s.nombre_variacion})`);
        cita.servicios = nombresFormateados; 

        // 2c. Obtenemos la calificación de la reseña, si existe
        const queryReseña = "SELECT calificacion FROM reseñas WHERE cita_id = ?";
        const [reseña] = await db.query(queryReseña, [cita.id]);
        
        if (reseña.length > 0) {
            cita.calificacion = reseña[0].calificacion;
        } else {
            cita.calificacion = null;
        }
    }

    // 3. Enviamos todas las citas con sus datos anidados
    res.json(citas);

    } catch (error) {
    console.error('Error al obtener las citas del cliente:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener citas' });
    }
};

const crearMiReseña = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; // ID del usuario logueado
        const { cita_id, calificacion, comentario } = req.body;

        if (!cita_id || !calificacion) {
            return res.status(400).json({ message: 'La cita y la calificación son requeridas.' });
        }

        // --- Verificación de Seguridad 1: ¿Esta cita le pertenece al usuario? ---
        const [citas] = await db.query(
            'SELECT * FROM citas WHERE id = ? AND usuario_id = ?',
            [cita_id, usuarioId]
        );
        if (citas.length === 0) {
            return res.status(404).json({ message: 'No se encontró la cita o no tienes permiso para reseñarla.' });
        }

        // --- Verificación de Seguridad 2: ¿Está la cita 'completada'? ---
        if (citas[0].estado !== 'completada') {
            return res.status(400).json({ message: 'Solo puedes reseñar citas que han sido completadas.' });
        }
        
        // --- Verificación de Seguridad 3: ¿Ya existe una reseña? ---
        // (Tu BD tiene 'cita_id' como UNIQUE, así que esto también previene duplicados)
        const [reseñasExistentes] = await db.query('SELECT id FROM reseñas WHERE cita_id = ?', [cita_id]);
        if (reseñasExistentes.length > 0) {
            return res.status(400).json({ message: 'Esta cita ya ha sido reseñada.' });
        }

        // --- Si todo está bien, insertamos la reseña ---
        const sql = 'INSERT INTO reseñas (cita_id, usuario_id, calificacion, comentario, esta_aprobada) VALUES (?, ?, ?, ?, ?)';
        // 'esta_aprobada' se guarda como 0 (FALSE) por defecto para que el admin la apruebe
        await db.query(sql, [cita_id, usuarioId, calificacion, comentario || null, 0]);

        res.status(201).json({ message: 'Reseña enviada exitosamente. Gracias por tus comentarios.' });

    } catch (error) {
        console.error('Error al crear la reseña:', error);
        res.status(500).json({ message: 'Error en el servidor al crear la reseña' });
    }
};


module.exports = {
    getMiPerfil,
    updateMiPerfil,
    cancelarMiCita,
    addMiDireccion,
    getMisCitas,
    crearMiReseña
};