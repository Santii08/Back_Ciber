import pool from "../config/database.js"

async function resetDatabase() {
  const client = await pool.connect()

  try {
    console.log("🗑️  Eliminando todas las tablas...")

    await client.query(`
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS coupon_usage CASCADE;
      DROP TABLE IF EXISTS coupons CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
    `)

    console.log("✅ Base de datos limpiada")
    console.log('💡 Ejecuta "npm run migrate" y luego "npm run seed" para recrear las tablas')
  } catch (error) {
    console.error("❌ Error reseteando base de datos:", error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

resetDatabase().catch((err) => {
  console.error("Error fatal:", err)
  process.exit(1)
})
