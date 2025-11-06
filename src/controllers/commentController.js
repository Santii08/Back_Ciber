import pool from "../config/database.js"

// Agregar comentario a un producto
export const addComment = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id: productId } = req.params
    const { content, rating } = req.body
    const userId = req.user.id

    // Verificar que el producto existe
    const [productCheck] = await connection.query("SELECT id FROM products WHERE id = ? AND active = true", [productId])

    if (productCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    // Verificar si el usuario ya comentó este producto
    const [existingComment] = await connection.query("SELECT id FROM comments WHERE user_id = ? AND product_id = ?", [
      userId,
      productId,
    ])

    if (existingComment.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya has comentado este producto. Puedes editar tu comentario existente.",
      })
    }

    // Insertar comentario
    const [insertResult] = await connection.query(
      `
      INSERT INTO comments (user_id, product_id, content, rating)
      VALUES (?, ?, ?, ?) `,
      [userId, productId, content, rating || null],
    )

    // Obtener información del usuario para la respuesta
    const [commentWithUser] = await connection.query(
      `
      SELECT 
        c.*,
        u.name as user_name,
        u.photo as user_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [insertResult.insertId],
    )

    res.status(201).json({
      success: true,
      message: "Comentario agregado exitosamente",
      data: {
        comment: commentWithUser[0],
      },
    })
  } catch (error) {
    console.error("Error agregando comentario:", error)
    res.status(500).json({
      success: false,
      message: "Error al agregar comentario",
    })
  } finally {
    connection.release()
  }
}

// Obtener comentarios de un producto
export const getProductComments = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id: productId } = req.params
    const { limit, offset } = req.query

    // Verificar que el producto existe
    const productCheck = await connection.query("SELECT id FROM products WHERE id = ?", [productId])

    if (productCheck[0].length === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      })
    }

    let query = `
      SELECT 
        c.*,
        u.name as user_name,
        u.photo as user_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.product_id = ?
      ORDER BY c.created_at DESC
    `
    const params = [productId]

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

    // Obtener total de comentarios
    const [countResult] = await connection.query("SELECT COUNT(*) as count FROM comments WHERE product_id = ?", [productId])
    const total = Number.parseInt(countResult[0].count)

    res.json({
      success: true,
      data: {
        comments: result,
        total,
        limit: limit ? Number.parseInt(limit) : null,
        offset: offset ? Number.parseInt(offset) : null,
      },
    })
  } catch (error) {
    console.error("Error obteniendo comentarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener comentarios",
    })
  } finally {
    connection.release()
  }
}

// Actualizar comentario propio
export const updateComment = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { commentId } = req.params
    const { content, rating } = req.body
    const userId = req.user.id

    // Verificar que el comentario existe y pertenece al usuario
    const [commentCheck] = await connection.query("SELECT id, user_id FROM comments WHERE id = ?", [commentId])

    if (commentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comentario no encontrado",
      })
    }

    if (commentCheck[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para editar este comentario",
      })
    }

    // Actualizar comentario
    const updates = []
    const params = []

    if (content !== undefined) {
      params.push(content)
      updates.push(`content = ?`)
    }
    if (rating !== undefined) {
      params.push(rating)
      updates.push(`rating = ?`)
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay campos para actualizar",
      })
    }

    params.push(commentId)
    const query = `
      UPDATE comments
      SET ${updates.join(", ")}
      WHERE id = ? `

    await connection.query(query, params)

    // Obtener información del usuario
    const [commentWithUser] = await connection.query(
      `
      SELECT 
        c.*,
        u.name as user_name,
        u.photo as user_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [commentId],
    )

    res.json({
      success: true,
      message: "Comentario actualizado exitosamente",
      data: {
        comment: commentWithUser[0],
      },
    })
  } catch (error) {
    console.error("Error actualizando comentario:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar comentario",
    })
  } finally {
    connection.release()
  }
}

// Eliminar comentario
export const deleteComment = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { commentId } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === "admin"

    // Verificar que el comentario existe
    const [commentCheck] = await connection.query("SELECT id, user_id FROM comments WHERE id = ?", [commentId])

    if (commentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comentario no encontrado",
      })
    }
    // Solo el autor o un admin pueden eliminar
    if (commentCheck[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para eliminar este comentario",
      })
    }

    // Eliminar comentario
    await connection.query("DELETE FROM comments WHERE id = ?", [commentId])

    res.json({
      success: true,
      message: "Comentario eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando comentario:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar comentario",
    })
  } finally {
    connection.release()
  }
}
