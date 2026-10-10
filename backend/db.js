
const mysql = require("mysql2");
require("dotenv").config();

// -----------------------------------------
// Database Configuration
// -----------------------------------------

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "TutorGo",
    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log("Database configuration:");
console.log("Host:", dbConfig.host);
console.log("User:", dbConfig.user);
console.log("Database:", dbConfig.database);
console.log("Port:", dbConfig.port);

// -----------------------------------------
// Create MySQL Connection Pool
// -----------------------------------------

const pool = mysql.createPool(dbConfig);

// -----------------------------------------
// Test Database Connection
// -----------------------------------------

pool.getConnection((error, connection) => {
    if (error) {
        console.error(
            "Database connection failed:",
            error.message
        );

        return;
    }

    console.log("Connected to MySQL database");

    connection.release();
});

// -----------------------------------------
// Promise Helper
// -----------------------------------------
// Use this for async/await and transactions:
//
// const connection = await db.promise().getConnection();
//
// -----------------------------------------

pool.getPromiseConnection = async () => {
    return await pool.promise().getConnection();
};

// -----------------------------------------
// Export Pool
// -----------------------------------------

module.exports = pool;