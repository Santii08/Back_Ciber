import pool from "../config/database.js"

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
  const connection = await pool.getConnection()

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
      query += ` AND p.active = ?`
    }

    query += `
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    // Paginación
    if (limit) {
      params.push(Number.parseInt(limit))
      query += ` LIMIT ?`
    }

    if (offset) {
      params.push(Number.parseInt(offset))
      query += ` OFFSET ?`
    }

    const [result] = await connection.query(query, params)

    // Obtener total de productos
    const [countResult] = await connection.query("SELECT COUNT(*) as count FROM products WHERE active = true")
    const total = Number.parseInt(countResult[0].count)

    res.json({
      success: true,
      data: {
        products: result.map((p) => ({
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
    connection.release()
  }
}

// Obtener producto por ID con comentarios
export const getProductById = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    // Obtener producto
    const [productResult] = await connection.query(
      `
      SELECT 
        p.*,
        COUNT(DISTINCT c.id) as comment_count,
        COALESCE(AVG(c.rating), 0) as average_rating
      FROM products p
      LEFT JOIN comments c ON p.id = c.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `,
      [id],
    )

    if (productResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    const product = productResult[0]

    // Obtener comentarios del producto
    const [commentsResult] = await connection.query(
      `
      SELECT 
        c.*,
        u.name as user_name,
        u.photo as user_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.product_id = ?
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
        comments: commentsResult,
      },
    })
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
    })
  } finally {
    connection.release()
  }
}

// Crear producto (admin)
export const createProduct = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { name, description, price, stock, image_url } = req.body

    const [insertResult] = await connection.query(
      `
      INSERT INTO products (name, description, price, stock, image_url, active)
      VALUES (?, ?, ?, ?, ?, ?) `,
      [name, description, price, stock || 0, image_url || null, true],
    )

    // Obtener el producto insertado
    const [productRows] = await connection.query(
      "SELECT * FROM products WHERE id = ?",
      [insertResult.insertId]
    )

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      data: {
        product: productRows[0],
      },
    })
  } catch (error) {
    console.error("Error creando producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
    })
  } finally {
    connection.release()
  }
}

// Actualizar producto (admin)
export const updateProduct = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params
    const { name, description, price, stock, image_url, active } = req.body

    // Verificar que el producto existe
    const [checkResult] = await connection.query("SELECT id FROM products WHERE id = ?", [id])

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Construir query dinámicamente
    const updates = []
    const params = []

    if (name !== undefined) {
      params.push(name)
      updates.push(`name = ?`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = ?`)
    }
    if (price !== undefined) {
      params.push(price)
      updates.push(`price = ?`)
    }
    if (stock !== undefined) {
      params.push(stock)
      updates.push(`stock = ?`)
    }
    if (image_url !== undefined) {
      params.push(image_url)
      updates.push(`image_url = ?`)
    }
    if (active !== undefined) {
      params.push(active)
      updates.push(`active = ?`)
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
      WHERE id = ? `

    await connection.query(query, params)

    // Obtener el producto actualizado
    const [updatedProduct] = await connection.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    )

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: {
        product: updatedProduct[0],
      },
    })
  } catch (error) {
    console.error("Error actualizando producto:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    })
  } finally {
    connection.release()
  }
}

// Eliminar producto (admin) - soft delete
export const deleteProduct = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    // Verificar que el producto existe
    const [checkResult] = await connection.query("SELECT id FROM products WHERE id = ?", [id])

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Soft delete - marcar como inactivo
    await connection.query(
      `
      UPDATE products
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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
    connection.release()
  }
}
