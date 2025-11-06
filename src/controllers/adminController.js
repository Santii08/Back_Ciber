import pool from "../config/database.js"

// Listar usuarios no validados
export const getPendingUsers = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const [result] = await connection.query(
      `
      SELECT id, name, email, photo, role, validated, created_at
      FROM users
      WHERE validated = false AND role = 'user'
      ORDER BY created_at DESC
    `,
    )

    res.json({
      success: true,
      data: {
        users: result.map(u => ({ ...u, validated: Boolean(u.validated) })),
        count: result.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios pendientes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios pendientes",
    })
  } finally {
    connection.release()
  }
}

// Validar usuario
export const validateUser = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    // Verificar que el usuario existe y no está validado
    const [userCheck] = await connection.query("SELECT id, validated, role FROM users WHERE id = ?", [id])

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const user = userCheck[0]

    if (user.validated) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya está validado",
      })
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "No se puede validar un administrador",
      })
    }

    // Validar usuario
    await connection.query(
      `
      UPDATE users
      SET validated = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? `,
      [id],
    )

    // Obtener usuario actualizado
    const [updatedUser] = await connection.query(
      "SELECT id, name, email, photo, role, validated, updated_at FROM users WHERE id = ?",
      [id]
    )

    const up = updatedUser[0]

    res.json({
      success: true,
      message: "Usuario validado exitosamente",
      data: {
        user: { ...up, validated: Boolean(up.validated) },
      },
    })
  } catch (error) {
    console.error("Error validando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al validar usuario",
    })
  } finally {
    connection.release()
  }
}

// Listar todos los usuarios (admin)
export const getAllUsers = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { validated, role } = req.query

    let query = `
      SELECT id, name, email, photo, role, validated, created_at, updated_at
      FROM users
      WHERE 1=1
    `
    const params = []

    if (validated !== undefined) {
      params.push(validated === "true")
      query += ` AND validated = ?`
    }

    if (role) {
      params.push(role)
      query += ` AND role = ?`
    }

    query += " ORDER BY created_at DESC"

    const [result] = await connection.query(query, params)

    res.json({
      success: true,
      data: {
        users: result.map(u => ({ ...u, validated: Boolean(u.validated) })),
        count: result.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    })
  } finally {
    connection.release()
  }
}

// Eliminar usuario (admin)
export const deleteUser = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    // Verificar que no sea el mismo admin
    if (Number.parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propia cuenta",
      })
    }

    // Verificar que el usuario existe
    const [userCheck] = await connection.query("SELECT id, role FROM users WHERE id = ?", [id])

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Eliminar usuario (cascade eliminará sus comentarios, órdenes, etc.)
    await connection.query("DELETE FROM users WHERE id = ?", [id])

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
    })
  } finally {
    connection.release()
  }
}
