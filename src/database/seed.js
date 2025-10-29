import bcrypt from "bcrypt"
import pool from "../config/database.js"
import dotenv from "dotenv"

dotenv.config()

async function seedDatabase() {
  let connection

  try {
    connection = await pool.getConnection()
    console.log("🌱 Iniciando seed de la base de datos...")

    // 1. Crear usuario administrador
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!Arepabuelas", 10)

    await connection.query(
      `
      INSERT IGNORE INTO users (name, email, password_hash, role, validated, photo)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        "Camarón A-Panado",
        process.env.ADMIN_EMAIL || "admin@arepabuelas.com",
        adminPassword,
        "admin",
        true,
        "/admin-avatar.png",
      ],
    )

    console.log("✅ Usuario administrador creado")

    // 2. Crear productos (mínimo 5)
    const products = [
      {
        name: "Arepa de Queso Boyacense",
        description:
          "Deliciosa arepa tradicional rellena de queso campesino derretido. Receta de las abuelas con más de 50 años de tradición.",
        price: 8500,
        stock: 100,
        image: "/arepa-queso-boyacense.jpg",
      },
      {
        name: "Arepa de Choclo",
        description:
          "Arepa dulce hecha con maíz tierno molido, perfecta para acompañar con queso o mantequilla. Un clásico de Ventaquemada.",
        price: 7000,
        stock: 80,
        image: "/arepa-choclo-maiz.jpg",
      },
      {
        name: "Arepa con Hogao",
        description:
          "Arepa crujiente acompañada de nuestro hogao especial con tomate, cebolla y especias secretas de las abuelas.",
        price: 9500,
        stock: 60,
        image: "/arepa-hogao-colombiana.jpg",
      },
      {
        name: "Combo Familiar Arepabuelas",
        description:
          "Pack de 12 arepas variadas: 4 de queso, 4 de choclo y 4 con hogao. Ideal para compartir en familia.",
        price: 95000,
        stock: 30,
        image: "/combo-arepas-familia.jpg",
      },
      {
        name: "Arepa Especial de la Esquina",
        description:
          "La receta secreta de la abuela fundadora: arepa rellena de queso, hogao y un toque especial que solo nosotros conocemos.",
        price: 12000,
        stock: 50,
        image: "/arepa-especial-gourmet.jpg",
      },
      {
        name: "Arepa Integral con Aguacate",
        description: "Versión saludable con harina integral, acompañada de aguacate fresco y queso bajo en grasa.",
        price: 11000,
        stock: 40,
        image: "/arepa-integral-aguacate.jpg",
      },
    ]

    for (const product of products) {
      await connection.query(
        `
        INSERT INTO products (name, description, price, stock, image_url, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [product.name, product.description, product.price, product.stock, product.image, true],
      )
    }

    console.log(`✅ ${products.length} productos creados`)

    // 3. Crear cupón para nuevos usuarios
    await connection.query(
      `
      INSERT IGNORE INTO coupons (code, discount, description, max_uses, active)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        "BIENVENIDO2024",
        15,
        "Cupón de bienvenida para nuevos usuarios - 15% de descuento en tu primera compra",
        1000,
        true,
      ],
    )

    await connection.query(
      `
      INSERT IGNORE INTO coupons (code, discount, description, max_uses, active)
      VALUES (?, ?, ?, ?, ?)
    `,
      ["ABUELA10", 10, "Cupón especial de las abuelas - 10% de descuento", 500, true],
    )

    console.log("✅ Cupones creados")

    // 4. Crear algunos comentarios de ejemplo
    const [adminResult] = await connection.query("SELECT id FROM users WHERE email = ?", [
      process.env.ADMIN_EMAIL || "admin@arepabuelas.com",
    ])

    if (adminResult.length > 0) {
      const adminId = adminResult[0].id
      const [productResult] = await connection.query("SELECT id FROM products LIMIT 3")

      for (const product of productResult) {
        await connection.query(
          `
          INSERT INTO comments (user_id, product_id, content, rating)
          VALUES (?, ?, ?, ?)
        `,
          [
            adminId,
            product.id,
            "¡Deliciosas arepas! La receta de las abuelas es inigualable. Totalmente recomendadas.",
            5,
          ],
        )
      }

      console.log("✅ Comentarios de ejemplo creados")
    }

    console.log("\n🎉 Seed completado exitosamente!")
    console.log("\n📝 Credenciales de administrador:")
    console.log(`   Email: ${process.env.ADMIN_EMAIL || "admin@arepabuelas.com"}`)
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || "Admin123!Arepabuelas"}`)
  } catch (error) {
    console.error("❌ Error en seed:", error)
    throw error
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

// Ejecutar seed
seedDatabase().catch((err) => {
  console.error("Error fatal:", err)
  process.exit(1)
})
