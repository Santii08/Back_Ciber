import pool from "../config/database.js"

// Obtener historial de órdenes del usuario
export const getUserOrders = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const userId = req.user.id
    const { status, limit, offset } = req.query

    let query = `
      SELECT 
        o.*,
        COUNT(oi.id) as items_count,
        p.payment_token,
        p.last4,
        p.card_type,
        p.status as payment_status
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.user_id = ?
    `
    const params = [userId]

    // Filtrar por estado si se especifica
    if (status) {
      params.push(status)
      query += ` AND o.status = ?`
    }

    query += `
      GROUP BY o.id, p.id
      ORDER BY o.created_at DESC
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

    // Obtener total de órdenes
    const [countResult] = await connection.query("SELECT COUNT(*) as count FROM orders WHERE user_id = ?", [userId])
    const total = Number.parseInt(countResult[0].count)

    res.json({
      success: true,
      data: {
        orders: result.map((order) => ({
          ...order,
          items_count: Number.parseInt(order.items_count),
        })),
        total,
        limit: limit ? Number.parseInt(limit) : null,
        offset: offset ? Number.parseInt(offset) : null,
      },
    })
  } catch (error) {
    console.error("Error obteniendo órdenes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de órdenes",
    })
  } finally {
    connection.release()
  }
}

// Obtener detalle de una orden específica
export const getOrderById = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === "admin"

    // Obtener orden
    const [orderRows] = await connection.query(
      `
      SELECT 
        o.*,
        p.payment_token,
        p.last4,
        p.expiry_masked,
        p.card_type,
        p.status as payment_status,
        p.created_at as payment_date
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ?
    `,
      [id],
    )
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    const order = orderRows[0]

    // Verificar que la orden pertenece al usuario (a menos que sea admin)
    if (order.user_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver esta orden",
      })
    }

    // Obtener items de la orden
    const [itemsResult] = await connection.query(
      `
      SELECT 
        oi.*,
        p.name as product_name,
        p.image_url as product_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `,
      [id],
    )

    // Obtener información del usuario si es admin
    let userInfo = null
    if (isAdmin) {
      const [userResult] = await connection.query(
        `
        SELECT id, name, email, photo
        FROM users
        WHERE id = ?
      `,
        [order.user_id],
      )
      userInfo = userResult[0]
    }

    res.json({
      success: true,
      data: {
        order,
        items: itemsResult,
        ...(isAdmin && { user: userInfo }),
      },
    })
  } catch (error) {
    console.error("Error obteniendo orden:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener detalle de orden",
    })
  } finally {
    connection.release()
  }
}

// Obtener estadísticas de compras del usuario
export const getUserStats = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const userId = req.user.id

    // Estadísticas generales
    const [statsRows] = await connection.query(
      `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(final_total), 0) as total_spent,
        COALESCE(AVG(final_total), 0) as average_order,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
      WHERE user_id = ?
    `,
      [userId],
    )

    // Productos más comprados
    const [topProductsRows] = await connection.query(
      `
      SELECT 
        p.id,
        p.name,
        p.image_url,
        SUM(oi.quantity) as times_purchased,
        SUM(oi.subtotal) as total_spent_on_product
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ? AND o.status = 'completed'
      GROUP BY p.id, p.name, p.image_url
      ORDER BY times_purchased DESC
      LIMIT 5
    `,
      [userId],
    )

    // Cupones usados
    const [couponsRows] = await connection.query(
      `
      SELECT 
        c.code,
        c.discount,
        c.description,
        cu.used_at
      FROM coupon_usage cu
      JOIN coupons c ON cu.coupon_id = c.id
      WHERE cu.user_id = ?
      ORDER BY cu.used_at DESC
    `,
      [userId],
    )

    res.json({
      success: true,
      data: {
        stats: {
          ...statsRows[0],
          total_orders: Number.parseInt(statsRows[0].total_orders),
          completed_orders: Number.parseInt(statsRows[0].completed_orders),
          pending_orders: Number.parseInt(statsRows[0].pending_orders),
          cancelled_orders: Number.parseInt(statsRows[0].cancelled_orders),
        },
        top_products: topProductsRows.map((p) => ({
          ...p,
          times_purchased: Number.parseInt(p.times_purchased),
        })),
        coupons_used: couponsRows,
      },
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
    })
  } finally {
    connection.release()
  }
}

// Cancelar orden (solo si está pendiente)
export const cancelOrder = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    await connection.query("BEGIN")

    const { id } = req.params
    const userId = req.user.id

    // Verificar que la orden existe y pertenece al usuario
    const [orderRows] = await connection.query(
      `
      SELECT id, user_id, status
      FROM orders
      WHERE id = ?
    `,
      [id],
    )

    if (orderRows.length === 0) {
      await connection.query("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    const order = orderRows[0]

    if (order.user_id !== userId) {
      await connection.query("ROLLBACK")
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para cancelar esta orden",
      })
    }

    if (order.status !== "pending") {
      await connection.query("ROLLBACK")
      return res.status(400).json({
        success: false,
        message: "Solo se pueden cancelar órdenes pendientes",
      })
    }

    // Obtener items de la orden para restaurar stock
    const [itemsResult] = await connection.query(
      `
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = ?
    `,
      [id],
    )

    // Restaurar stock
    for (const item of itemsResult) {
      await connection.query(
        `
        UPDATE products
        SET stock = stock + ?
        WHERE id = ?
      `,
        [item.quantity, item.product_id],
      )
    }

    // Cancelar orden
    await connection.query(
      `
      UPDATE orders
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [id],
    )

    await connection.query("COMMIT")

    res.json({
      success: true,
      message: "Orden cancelada exitosamente",
    })
  } catch (error) {
    await connection.query("ROLLBACK")
    console.error("Error cancelando orden:", error)
    res.status(500).json({
      success: false,
      message: "Error al cancelar orden",
    })
  } finally {
    connection.release()
  }
}

// Admin: Obtener todas las órdenes
export const getAllOrders = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { status, user_id, limit, offset } = req.query

    let query = `
      SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(oi.id) as items_count,
        p.last4,
        p.card_type,
        p.status as payment_status
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1
    `
    const params = []

    if (status) {
      params.push(status)
      query += ` AND o.status = $${params.length}`
    }

    if (user_id) {
      params.push(Number.parseInt(user_id))
      query += ` AND o.user_id = $${params.length}`
    }

    query += `
      GROUP BY o.id, u.id, p.id
      ORDER BY o.created_at DESC
    `

    if (limit) {
      params.push(Number.parseInt(limit))
      query += ` LIMIT $${params.length}`
    }

    if (offset) {
      params.push(Number.parseInt(offset))
      query += ` OFFSET $${params.length}`
    }

    const result = await connection.query(query, params)

    const countQuery = `SELECT COUNT(*) FROM orders WHERE 1=1${status ? " AND status = ?" : ""}`
    const countParams = status ? [status] : []
    const countResult = await connection.query(countQuery, countParams)
    const total = Number.parseInt(countResult[0][0].count)

    res.json({
      success: true,
      data: {
        orders: result[0].map((order) => ({
          ...order,
          items_count: Number.parseInt(order.items_count),
        })),
        total,
        limit: limit ? Number.parseInt(limit) : null,
        offset: offset ? Number.parseInt(offset) : null,
      },
    })
  } catch (error) {
    console.error("Error obteniendo todas las órdenes:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
    })
  } finally {
    connection.release()
  }
}

// Admin: Actualizar estado de orden
export const updateOrderStatus = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ["pending", "processing", "completed", "cancelled"]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${validStatuses.join(", ")}`,
      })
    }

    const result = await connection.query(
      `
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? `,
      [status, id],
    )

    if (result[0].length === 0) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    res.json({
      success: true,
      message: "Estado de orden actualizado",
      data: {
        order: result[0][0],
      },
    })
  } catch (error) {
    console.error("Error actualizando estado de orden:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar estado de orden",
    })
  } finally {
    connection.release()
  }
}
