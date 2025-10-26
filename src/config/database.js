import * as mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Configuración del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || "arepabuelas_db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "jaaa_estoy_viendociber_no_iba_a_cometer_ese_error",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test de conexión (async/await)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado a MySQL");

    const [rows] = await connection.query(
      "SELECT DATABASE() AS db, @@port AS port, @@hostname AS host"
    );
    console.log("📡 Base de datos:", rows[0].db);
    console.log("🔌 Puerto:", rows[0].port);
    console.log("🖥️ Servidor:", rows[0].host);

    connection.release();
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    process.exit(-1);
  }
})();

export default pool;
