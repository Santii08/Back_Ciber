import pool from "../config/database.js"
import { v4 as uuidv4 } from "uuid"

// Validar cupón
export const validateCoupon = async (req, res) => {
  const client = await pool.connect()

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
    const couponResult = await client.query(
      `
      SELECT * FROM coupons
      WHERE code = $1 AND active = true
    `,
      [code.trim().toUpperCase()],
    )

    if (couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cupón no válido o expirado",
      })
    }

    const coupon = couponResult.rows[0]

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
    const usageCheck = await client.query(
      `
      SELECT id FROM coupon_usage
      WHERE user_id = $1 AND coupon_id = $2
    `,
      [userId, coupon.id],
    )

    if (usageCheck.rows.length > 0) {
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
    client.release()
  }
}

// Procesar checkout
export const processCheckout = async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const { items, coupon_code, payment_token, last4, expiry, card_type } = req.body
    const userId = req.user.id

    // 1. Validar que todos los productos existen y tienen stock
    let total = 0
    const validatedItems = []

    for (const item of items) {
      const productResult = await client.query(
        `
        SELECT id, name, price, stock
        FROM products
        WHERE id = $1 AND active = true
      `,
        [item.product_id],
      )

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({
          success: false,
          message: `Producto con ID ${item.product_id} no encontrado`,
        })
      }

      const product = productResult.rows[0]

      if (product.stock < item.quantity) {
        await client.query("ROLLBACK")
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
      const couponResult = await client.query(
        `
        SELECT * FROM coupons
        WHERE code = $1 AND active = true
      `,
        [coupon_code.trim().toUpperCase()],
      )

      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0]

        // Verificar validez del cupón
        const now = new Date()
        const isValid =
          (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
          (!coupon.valid_until || new Date(coupon.valid_until) >= now) &&
          coupon.times_used < coupon.max_uses

        if (isValid) {
          // Verificar si el usuario ya usó este cupón
          const usageCheck = await client.query(
            `
            SELECT id FROM coupon_usage
            WHERE user_id = $1 AND coupon_id = $2
          `,
            [userId, coupon.id],
          )

          if (usageCheck.rows.length === 0) {
            discount = (total * coupon.discount) / 100
            couponId = coupon.id
          }
        }
      }
    }

    const finalTotal = total - discount

    // 3. Crear orden
    const orderResult = await client.query(
      `
      INSERT INTO orders (user_id, total, discount, final_total, coupon_code, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [userId, total, discount, finalTotal, coupon_code || null, "pending"],
    )

    const order = orderResult.rows[0]

    // 4. Crear items de la orden
    for (const item of validatedItems) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [order.id, item.product_id, item.quantity, item.price, item.subtotal],
      )

      // Actualizar stock del producto
      await client.query(
        `
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2
      `,
        [item.quantity, item.product_id],
      )
    }

    // 5. Simular pago (NO GUARDAR DATOS REALES)
    // Solo guardamos token simulado y últimos 4 dígitos enmascarados
    const paymentResult = await client.query(
      `
      INSERT INTO payments (order_id, payment_token, last4, expiry_masked, card_type, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [order.id, payment_token || uuidv4(), last4, expiry, card_type || "unknown", "approved"],
    )

    // 6. Actualizar estado de la orden
    await client.query(
      `
      UPDATE orders
      SET status = 'completed'
      WHERE id = $1
    `,
      [order.id],
    )

    // 7. Registrar uso del cupón si se aplicó
    if (couponId) {
      await client.query(
        `
        INSERT INTO coupon_usage (user_id, coupon_id)
        VALUES ($1, $2)
      `,
        [userId, couponId],
      )

      await client.query(
        `
        UPDATE coupons
        SET times_used = times_used + 1
        WHERE id = $1
      `,
        [couponId],
      )
    }

    await client.query("COMMIT")

    res.status(201).json({
      success: true,
      message: "Compra procesada exitosamente",
      data: {
        order: {
          id: order.id,
          total,
          discount,
          final_total: finalTotal,
          coupon_code: coupon_code || null,
          status: "completed",
          created_at: order.created_at,
        },
        payment: {
          id: paymentResult.rows[0].id,
          last4,
          status: "approved",
        },
        items: validatedItems,
      },
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error procesando checkout:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la compra",
    })
  } finally {
    client.release()
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
