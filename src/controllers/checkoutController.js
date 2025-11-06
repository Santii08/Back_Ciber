import pool from "../config/database.js"
import { v4 as uuidv4 } from "uuid"

// Validar cupón
export const validateCoupon = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { code } = req.body
    const userId = req.user.id

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Código de cupón requerido",
      })
    }

    // Buscar cupón
    const [couponResult] = await connection.query(
      `
      SELECT * FROM coupons
      WHERE code = ? AND active = true
    `,
      [code.trim().toUpperCase()],
    )

    if (couponResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cupón no válido o expirado",
      })
    }

    const coupon = couponResult[0]

    // Verificar fecha de validez
    const now = new Date()
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({
        success: false,
        message: "Este cupón aún no está disponible",
      })
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({
        success: false,
        message: "Este cupón ha expirado",
      })
    }

    // Verificar límite de usos
    if (coupon.times_used >= coupon.max_uses) {
      return res.status(400).json({
        success: false,
        message: "Este cupón ha alcanzado su límite de usos",
      })
    }

    // Verificar si el usuario ya usó este cupón
    const [usageCheck] = await connection.query(
      `
      SELECT id FROM coupon_usage
      WHERE user_id = ? AND coupon_id = ?
    `,
      [userId, coupon.id],
    )

    if (usageCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya has usado este cupón anteriormente",
      })
    }

    res.json({
      success: true,
      message: "Cupón válido",
      data: {
        coupon: {
          code: coupon.code,
          discount: coupon.discount,
          description: coupon.description,
        },
      },
    })
  } catch (error) {
    console.error("Error validando cupón:", error)
    res.status(500).json({
      success: false,
      message: "Error al validar cupón",
    })
  } finally {
    connection.release()
  }
}

// Procesar checkout
export const processCheckout = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    await connection.query("BEGIN")

    const { items, coupon_code, payment_token, last4, expiry, card_type } = req.body
    const userId = req.user.id

    // 1. Validar que todos los productos existen y tienen stock
    let total = 0
    const validatedItems = []

    for (const item of items) {
      const [productResult] = await connection.query(
        `
        SELECT id, name, price, stock
        FROM products
        WHERE id = ? AND active = true
      `,
        [item.product_id],
      )

      if (productResult.length === 0) {
        await connection.query("ROLLBACK")
        return res.status(404).json({
          success: false,
          message: `Producto con ID ${item.product_id} no encontrado`,
        })
      }

      const product = productResult[0]

      if (product.stock < item.quantity) {
        await connection.query("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
        })
      }

      const subtotal = product.price * item.quantity
      total += subtotal

      validatedItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      })
    }

    // 2. Aplicar cupón si existe
    let discount = 0
    let couponId = null

    if (coupon_code) {
      const [couponResult] = await connection.query(
        `
        SELECT * FROM coupons
        WHERE code = ? AND active = true
      `,
        [coupon_code.trim().toUpperCase()],
      )

      if (couponResult.length > 0) {
        const coupon = couponResult[0]

        // Verificar validez del cupón
        const now = new Date()
        const isValid =
          (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
          (!coupon.valid_until || new Date(coupon.valid_until) >= now) &&
          coupon.times_used < coupon.max_uses

        if (isValid) {
          // Verificar si el usuario ya usó este cupón
          const [usageCheck] = await connection.query(
            `
            SELECT id FROM coupon_usage
            WHERE user_id = ? AND coupon_id = ?
          `,
            [userId, coupon.id],
          )

          if (usageCheck.length === 0) {
            discount = (total * coupon.discount) / 100
            couponId = coupon.id
          }
        }
      }
    }

    const finalTotal = total - discount

    // 3. Crear orden
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (user_id, total, discount, final_total, coupon_code, status)
      VALUES (?, ?, ?, ?, ?, ?) `,
      [userId, total, discount, finalTotal, coupon_code || null, "pending"],
    )

    const orderId = orderResult.insertId

    // 4. Crear items de la orden
    for (const item of validatedItems) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `,
        [orderId, item.product_id, item.quantity, item.price, item.subtotal],
      )

      // Actualizar stock del producto
      await connection.query(
        `
        UPDATE products
        SET stock = stock - ?
        WHERE id = ?
      `,
        [item.quantity, item.product_id],
      )
    }

    // 5. Simular pago (NO GUARDAR DATOS REALES)
    // Solo guardamos token simulado y últimos 4 dígitos enmascarados
    const [paymentResult] = await connection.query(
      `
      INSERT INTO payments (order_id, payment_token, last4, expiry_masked, card_type, status)
      VALUES (?, ?, ?, ?, ?, ?) `,
      [orderId, payment_token || uuidv4(), last4, expiry, card_type || "unknown", "approved"],
    )

    // 6. Actualizar estado de la orden
    await connection.query(
      `
      UPDATE orders
      SET status = 'completed'
      WHERE id = ?
    `,
      [orderId],
    )

    // 7. Registrar uso del cupón si se aplicó
    if (couponId) {
      await connection.query(
        `
        INSERT INTO coupon_usage (user_id, coupon_id)
        VALUES (?, ?)
      `,
        [userId, couponId],
      )

      await connection.query(
        `
        UPDATE coupons
        SET times_used = times_used + 1
        WHERE id = ?
      `,
        [couponId],
      )
    }

    await connection.query("COMMIT")

    // Obtener la orden completa
    const [orderDetails] = await connection.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    )

    res.status(201).json({
      success: true,
      message: "Compra procesada exitosamente",
      data: {
        order: {
          id: orderId,
          total,
          discount,
          final_total: finalTotal,
          coupon_code: coupon_code || null,
          status: "completed",
          created_at: orderDetails[0].created_at,
        },
        payment: {
          id: paymentResult.insertId,
          last4,
          status: "approved",
        },
        items: validatedItems,
      },
    })
  } catch (error) {
    await connection.query("ROLLBACK")
    console.error("Error procesando checkout:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la compra",
    })
  } finally {
    connection.release()
  }
}

// Simular validación de tarjeta (para testing)
export const simulateCardValidation = async (req, res) => {
  try {
    const { card_number, expiry, cvv, name } = req.body

    // IMPORTANTE: Esto es solo para simulación
    // NUNCA guardar números de tarjeta reales

    if (!card_number || !expiry || !cvv || !name) {
      return res.status(400).json({
        success: false,
        message: "Datos de tarjeta incompletos",
      })
    }

    // Validar formato básico
    const cardNumberClean = card_number.replace(/\s/g, "")

    if (!/^\d{13,19}$/.test(cardNumberClean)) {
      return res.status(400).json({
        success: false,
        message: "Número de tarjeta inválido",
      })
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return res.status(400).json({
        success: false,
        message: "Fecha de expiración inválida (formato: MM/YY)",
      })
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({
        success: false,
        message: "CVV inválido",
      })
    }

    // Determinar tipo de tarjeta
    let cardType = "unknown"
    if (cardNumberClean.startsWith("4")) cardType = "visa"
    else if (/^5[1-5]/.test(cardNumberClean)) cardType = "mastercard"
    else if (/^3[47]/.test(cardNumberClean)) cardType = "amex"
    else if (cardNumberClean.startsWith("6")) cardType = "discover"

    // Generar token simulado (NO guardar número real)
    const token = uuidv4()
    const last4 = cardNumberClean.slice(-4)

    res.json({
      success: true,
      message: "Tarjeta validada (simulación)",
      data: {
        payment_token: token,
        last4,
        card_type: cardType,
        expiry,
      },
    })
  } catch (error) {
    console.error("Error simulando validación de tarjeta:", error)
    res.status(500).json({
      success: false,
      message: "Error al validar tarjeta",
    })
  }
}
