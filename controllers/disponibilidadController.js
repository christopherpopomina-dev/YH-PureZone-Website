const db = require('../config/db');
const { startOfDay, endOfDay, addDays, addHours, format } = require('date-fns');

// ADMIN: Función para bloquear un rango de fechas/horas
const bloquearHorario = async (req, res) => {
    try {
        const { fecha_hora_inicio, fecha_hora_fin, motivo } = req.body;
        const sql = 'INSERT INTO bloqueos_disponibilidad (fecha_hora_inicio, fecha_hora_fin, motivo) VALUES (?, ?, ?)';
        await db.query(sql, [fecha_hora_inicio, fecha_hora_fin, motivo]);
        res.status(201).json({ message: 'Horario bloqueado exitosamente' });
    } catch (error) {
        console.error('Error al bloquear el horario:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};


const getDisponibilidad = async (req, res) => {
    try {
        // --- 1. Definir las reglas del negocio ---
        const hoy = new Date();
        const rangoBusquedaDias = 30;
        const duracionCitaHoras = 2;
        const horariosTrabajo = { inicio: 8, fin: 18 };

        // --- 2. Obtener todas las citas y bloqueos existentes ---
        const fechaInicioBusqueda = format(startOfDay(hoy), 'yyyy-MM-dd HH:mm:ss');
        const fechaFinBusqueda = format(endOfDay(addDays(hoy, rangoBusquedaDias)), 'yyyy-MM-dd HH:mm:ss');
        const [citas] = await db.query('SELECT fecha_hora_cita FROM citas WHERE estado = "confirmada" AND fecha_hora_cita BETWEEN ? AND ?', [fechaInicioBusqueda, fechaFinBusqueda]);
        const [bloqueos] = await db.query('SELECT fecha_hora_inicio, fecha_hora_fin FROM bloqueos_disponibilidad WHERE fecha_hora_fin >= ?', [fechaInicioBusqueda]);
        const horariosOcupados = new Set(citas.map(cita => new Date(cita.fecha_hora_cita).getTime()));

        // --- 3. Generar todos los slots posibles y filtrarlos ---
        let slotsDisponibles = [];
        for (let i = 0; i < rangoBusquedaDias; i++) {
            let diaActual = addDays(hoy, i);
            let diaSemana = diaActual.getDay();
            if (diaSemana === 0) continue;

            for (let hora = horariosTrabajo.inicio; hora < horariosTrabajo.fin; hora += duracionCitaHoras) {
                let slotActual = new Date(diaActual.getFullYear(), diaActual.getMonth(), diaActual.getDate(), hora);

                if (slotActual < hoy) continue;
                if (horariosOcupados.has(slotActual.getTime())) continue;
                let estaBloqueado = bloqueos.some(bloqueo => 
                    slotActual >= new Date(bloqueo.fecha_hora_inicio) && slotActual < new Date(bloqueo.fecha_hora_fin)
                );
                if (estaBloqueado) continue;

                slotsDisponibles.push(slotActual);
            }
        }
        
        res.json(slotsDisponibles);
    } catch (error) {
        console.error('Error al obtener la disponibilidad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ADMIN: Función para OBTENER todos los bloqueos existentes
const getAllBloqueos = async (req, res) => {
    try {
        const sql = 'SELECT * FROM bloqueos_disponibilidad ORDER BY fecha_hora_inicio DESC';
        const [bloqueos] = await db.query(sql);
        res.json(bloqueos);
    } catch (error) {
        console.error('Error al obtener los bloqueos:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ADMIN: Función para ELIMINAR un bloqueo
const deleteBloqueo = async (req, res) => {
    try {
        const { id } = req.params; // ID del bloqueo a eliminar
        const sql = 'DELETE FROM bloqueos_disponibilidad WHERE id = ?';
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Bloqueo no encontrado.' });
        }
        res.json({ message: 'Bloqueo eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar el bloqueo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

module.exports = {
    bloquearHorario,
    getDisponibilidad,
    getAllBloqueos,
    deleteBloqueo
};