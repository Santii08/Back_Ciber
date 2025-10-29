import pool from "../config/database.js"

// Obtener cupones disponibles (públicos)
export const getAvailableCoupons = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query(
      `
      SELECT 
        code,
        discount,
        description,
        valid_from,
        valid_until,
        max_uses,
        times_used,
        (max_uses - times_used) as remaining_uses
      FROM coupons
      WHERE active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
        AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
        AND times_used < max_uses
      ORDER BY discount DESC
    `,
    )

    res.json({
      success: true,
      data: {
        coupons: rows,
      },
    })
  } catch (error) {
    console.error("Error obteniendo cupones:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener cupones",
    })
  } finally {
    connection.release()
  }
}

// Admin: Crear cupón
export const createCoupon = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { code, discount, description, valid_from, valid_until, max_uses } = req.body

    // Verificar que el código no exista
    const [existingCoupon] = await connection.query("SELECT id FROM coupons WHERE code = ?", [code.toUpperCase()])

    if (existingCoupon.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un cupón con ese código",
      })
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO coupons (code, discount, description, valid_from, valid_until, max_uses, active)
      VALUES (?, ?, ?, ?, ?, ?, ?) `,
      [code.toUpperCase(), discount, description || null, valid_from || null, valid_until || null, max_uses || 1, true],
    )

    // Obtener el cupón insertado
    const [couponRows] = await connection.query("SELECT * FROM coupons WHERE id = ?", [insertResult.insertId])

    res.status(201).json({
      success: true,
      message: "Cupón creado exitosamente",
      data: {
        coupon: couponRows[0],
      },
    })
  } catch (error) {
    console.error("Error creando cupón:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear cupón",
    })
  } finally {
    connection.release()
  }
}

// Admin: Obtener todos los cupones
export const getAllCoupons = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { active } = req.query

    let query = `
      SELECT 
        c.*,
        (c.max_uses - c.times_used) as remaining_uses,
        COUNT(cu.id) as unique_users
      FROM coupons c
      LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
      WHERE 1=1
    `
    const params = []

    if (active !== undefined) {
      params.push(active === "true")
      query += ` AND c.active = ?`
    }

    query += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `

    const [result] = await connection.query(query, params)

    res.json({
      success: true,
      data: {
        coupons: result.map((c) => ({
          ...c,
          unique_users: Number.parseInt(c.unique_users),
        })),
      },
    })
  } catch (error) {
    console.error("Error obteniendo cupones:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener cupones",
    })
  } finally {
    connection.release()
  }
}

// Admin: Actualizar cupón
export const updateCoupon = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params
    const { discount, description, valid_from, valid_until, max_uses, active } = req.body

    const updates = []
    const params = []

    if (discount !== undefined) {
      params.push(discount)
      updates.push(`discount = ?`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = ?`)
    }
    if (valid_from !== undefined) {
      params.push(valid_from)
      updates.push(`valid_from = ?`)
    }
    if (valid_until !== undefined) {
      params.push(valid_until)
      updates.push(`valid_until = ?`)
    }
    if (max_uses !== undefined) {
      params.push(max_uses)
      updates.push(`max_uses = ?`)
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
      UPDATE coupons
      SET ${updates.join(", ")}
      WHERE id = ? `

    const [updateResult] = await connection.query(query, params)

    if (!updateResult || updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Cupón no encontrado",
      })
    }

    // Obtener el cupón actualizado
    const [couponRows] = await connection.query(
      "SELECT * FROM coupons WHERE id = ?",
      [id]
    )

    res.json({
      success: true,
      message: "Cupón actualizado exitosamente",
      data: {
        coupon: couponRows[0],
      },
    })
  } catch (error) {
    console.error("Error actualizando cupón:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar cupón",
    })
  } finally {
    connection.release()
  }
}

// Admin: Eliminar cupón
export const deleteCoupon = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    // Soft delete - marcar como inactivo
    const [updateResult] = await connection.query(
      `
      UPDATE coupons
      SET active = false
      WHERE id = ? `,
      [id],
    )

    if (!updateResult || updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Cupón no encontrado",
      })
    }

    res.json({
      success: true,
      message: "Cupón desactivado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando cupón:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar cupón",
    })
  } finally {
    connection.release()
  }
}
