// ============================================================
// Raw SQL Connection Pool using mysql2/promise
// XAMPP MySQL Compatible Configuration
// ============================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance and connection management
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mediconnect',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Connection will be tested on first query
console.log('✅ MySQL connection pool created');

module.exports = pool;