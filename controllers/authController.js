const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// REGISTRO DE UN NUEVO USUARIO
const register = async (req, res) => {
    try {
    const { nombre_completo, email, telefono, contraseña } = req.body;

    // 1. Hashear la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const contraseña_hash = await bcrypt.hash(contraseña, salt);

    // 2. Guardar el nuevo usuario en la base de datos
    const sql = 'INSERT INTO usuarios (nombre_completo, email, telefono, contraseña_hash, rol) VALUES (?, ?, ?, ?, ?)';
    const [result] = await db.query(sql, [nombre_completo, email, telefono, contraseña_hash, 'cliente']);

    res.status(201).json({ id: result.insertId, message: 'Usuario registrado exitosamente' });
    } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
    }
};

// LOGIN DE UN USUARIO EXISTENTE
const login = async (req, res) => {
    try {
    const { email, contraseña } = req.body;
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const usuario = rows[0];
    const isMatch = await bcrypt.compare(contraseña, usuario.contraseña_hash);
    if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // --- LÓGICA DEL TOKEN ---
    // 1. Prepara los datos que irán dentro del token
    const payload = {
        id: usuario.id,
        rol: usuario.rol
    };

    // 2. Firma el token con una clave secreta (la guardaremos en .env)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h' // El token expira en 1 hora
    });

    // 3. Envía el token al cliente
    res.json({ message: 'Inicio de sesión exitoso', token: token, rol: usuario.rol });

    } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
    }
};

module.exports = {
    register,
    login,
};