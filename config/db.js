// Importamos los paquetes necesarios
const mysql = require('mysql2');
require('dotenv').config(); // Carga las variables del archivo .env

// Creamos un "pool" de conexiones a la base de datos
// Un pool es más eficiente que crear una conexión por cada consulta
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Exportamos una versión del pool que usa "promesas" para un código más limpio (async/await)
module.exports = pool.promise();