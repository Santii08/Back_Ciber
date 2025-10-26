import pool from "../config/database.js"

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
  const client = await pool.connect()

  try {
    const { active, limit, offset } = req.query

    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT c.id) as comment_count,
        COALESCE(AVG(c.rating), 0) as average_rating
      FROM products p
      LEFT JOIN comments c ON p.id = c.product_id
      WHERE 1=1
    `
    const params = []

    // Filtrar por activos si se especifica
    if (active !== undefined) {
      params.push(active === "true")
      query += ` AND p.active = $${params.length}`
    }

    query += `
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    // Paginación
    if (limit) {
      params.push(Number.parseInt(limit))
      query += ` LIMIT $${params.length}`
    }

    if (offset) {
      params.push(Number.parseInt(offset))
      query += ` OFFSET $${params.length}`
    }

    const result = await client.query(query, params)

    // Obtener total de productos
    const countResult = await client.query("SELECT COUNT(*) FROM products WHERE active = true")
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      success: true,
      data: {
        products: result.rows.map((p) => ({
          ...p,
          average_rating: Number.parseFloat(p.average_rating).toFixed(1),
          comment_count: Number.parseInt(p.comment_count),
        })),
        total,
        limit: limit ? Number.parseInt(limit) : null,
        offset: offset ? Number.parseInt(offset) : null,
      },
    })
  } catch (error) {
    console.error("Error obteniendo productos:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener productos",
    })
  } finally {
    client.release()
  }
}

// Obtener producto por ID con comentarios
export const getProductById = async (req, res) => {
  const client = await pool.connect()

  try {
    const { id } = req.params

    // Obtener producto
    const productResult = await client.query(
      `
      SELECT 
        p.*,
        COUNT(DISTINCT c.id) as comment_count,
        COALESCE(AVG(c.rating), 0) as average_rating
      FROM products p
      LEFT JOIN comments c ON p.id = c.product_id
      WHERE p.id = $1
      GROUP BY p.id
    `,
      [id],
    )

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    const product = productResult.rows[0]

    // Obtener comentarios del producto
    const commentsResult = await client.query(
      `
      SELECT 
        c.*,
        u.name as user_name,
        u.photo as user_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.product_id = $1
      ORDER BY c.created_at DESC
    `,
      [id],
    )

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          average_rating: Number.parseFloat(product.average_rating).toFixed(1),
          comment_count: Number.parseInt(product.comment_count),
        },
        comments: commentsResult.rows,
      },
    })
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
    })
  } finally {
    client.release()
  }
}

// Crear producto (admin)
export const createProduct = async (req, res) => {
  const client = await pool.connect()

  try {
    const { name, description, price, stock, image_url } = req.body

    const result = await client.query(
      `
      INSERT INTO products (name, description, price, stock, image_url, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [name, description, price, stock || 0, image_url || null, true],
    )

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      data: {
        product: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Error creando producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
    })
  } finally {
    client.release()
  }
}

// Actualizar producto (admin)
export const updateProduct = async (req, res) => {
  const client = await pool.connect()

  try {
    const { id } = req.params
    const { name, description, price, stock, image_url, active } = req.body

    // Verificar que el producto existe
    const checkResult = await client.query("SELECT id FROM products WHERE id = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Construir query dinámicamente
    const updates = []
    const params = []
    let paramCount = 1

    if (name !== undefined) {
      params.push(name)
      updates.push(`name = $${paramCount++}`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = $${paramCount++}`)
    }
    if (price !== undefined) {
      params.push(price)
      updates.push(`price = $${paramCount++}`)
    }
    if (stock !== undefined) {
      params.push(stock)
      updates.push(`stock = $${paramCount++}`)
    }
    if (image_url !== undefined) {
      params.push(image_url)
      updates.push(`image_url = $${paramCount++}`)
    }
    if (active !== undefined) {
      params.push(active)
      updates.push(`active = $${paramCount++}`)
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay campos para actualizar",
      })
    }

    params.push(id)
    const query = `
      UPDATE products
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await client.query(query, params)

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: {
        product: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Error actualizando producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    })
  } finally {
    client.release()
  }
}

// Eliminar producto (admin) - soft delete
export const deleteProduct = async (req, res) => {
  const client = await pool.connect()

  try {
    const { id } = req.params

    // Verificar que el producto existe
    const checkResult = await client.query("SELECT id FROM products WHERE id = $1", [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Soft delete - marcar como inactivo
    await client.query(
      `
      UPDATE products
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [id],
    )

    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
    })
  } finally {
    client.release()
  }
}
