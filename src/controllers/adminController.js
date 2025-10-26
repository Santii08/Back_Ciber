import pool from "../config/database.js"

// Listar usuarios no validados
export const getPendingUsers = async (req, res) => {
  const client = await pool.connect()

  try {
    const result = await client.query(
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
        users: result.rows,
        count: result.rows.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios pendientes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios pendientes",
    })
  } finally {
    client.release()
  }
}

// Validar usuario
export const validateUser = async (req, res) => {
  const client = await pool.connect()

  try {
    const { id } = req.params

    // Verificar que el usuario existe y no está validado
    const userCheck = await client.query("SELECT id, validated, role FROM users WHERE id = $1", [id])

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const user = userCheck.rows[0]

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
    const result = await client.query(
      `
      UPDATE users
      SET validated = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, photo, role, validated, updated_at
    `,
      [id],
    )

    res.json({
      success: true,
      message: "Usuario validado exitosamente",
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Error validando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al validar usuario",
    })
  } finally {
    client.release()
  }
}

// Listar todos los usuarios (admin)
export const getAllUsers = async (req, res) => {
  const client = await pool.connect()

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
      query += ` AND validated = $${params.length}`
    }

    if (role) {
      params.push(role)
      query += ` AND role = $${params.length}`
    }

    query += " ORDER BY created_at DESC"

    const result = await client.query(query, params)

    res.json({
      success: true,
      data: {
        users: result.rows,
        count: result.rows.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    })
  } finally {
    client.release()
  }
}

// Eliminar usuario (admin)
export const deleteUser = async (req, res) => {
  const client = await pool.connect()

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
    const userCheck = await client.query("SELECT id, role FROM users WHERE id = $1", [id])

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Eliminar usuario (cascade eliminará sus comentarios, órdenes, etc.)
    await client.query("DELETE FROM users WHERE id = $1", [id])

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
    client.release()
  }
}
