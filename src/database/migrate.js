import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "../config/database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  let connection

  try {
    console.log("🚀 Iniciando migraciones...")

    connection = await pool.getConnection()
    const [rows] = await connection.query("SELECT DATABASE();");
    console.log("📂 Base de datos actual:", rows[0]["DATABASE()"]);


    // Leer el archivo schema.sql
    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    for (const statement of statements) {
      await connection.query(statement)
    }

    console.log("✅ Migraciones completadas exitosamente")
    console.log("📊 Tablas creadas:")
    console.log("   - users")
    console.log("   - products")
    console.log("   - comments")
    console.log("   - coupons")
    console.log("   - coupon_usage")
    console.log("   - orders")
    console.log("   - order_items")
    console.log("   - payments")
  } catch (error) {
    console.error("❌ Error ejecutando migraciones:", error)
    throw error
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

// Ejecutar migraciones
runMigrations().catch((err) => {
  console.error("Error fatal:", err)
  process.exit(1)
})
