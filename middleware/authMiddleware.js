const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;
    // Buscamos el token en el encabezado 'Authorization'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraemos el token (ej: "Bearer eyJhbGci...")
            token = req.headers.authorization.split(' ')[1];

            // Verificamos el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Añadimos los datos del usuario del token a la petición
            req.usuario = decoded;
            next(); // El token es válido, continuamos a la siguiente función (el controlador)
        } catch (error) {
            res.status(401).json({ message: 'No autorizado, token falló' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next(); // El usuario es admin, continuamos
    } else {
        res.status(403).json({ message: 'Acceso denegado, no eres administrador' });
    }
};

module.exports = { protect, isAdmin };