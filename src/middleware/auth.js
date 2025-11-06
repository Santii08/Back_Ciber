import jwt from "jsonwebtoken"
import pool from "../config/database.js"

// Middleware para verificar token JWT
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    
    // Verificar que el header existe y no está vacío
    if (!authHeader || authHeader.trim() === "" || authHeader === "Bearer " || authHeader === "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación requerido",
      })
    }
    
    const token = authHeader.split(" ")[1] // Bearer TOKEN

    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación requerido",
      })
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Obtener usuario de la base de datos
    const [result] = await pool.query("SELECT id, name, email, role, validated, photo FROM users WHERE id = ?", [
      decoded.userId,
    ])

    if (result.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const user = result[0]

    // Verificar si el usuario está validado
    if (!user.validated) {
      return res.status(403).json({
        success: false,
        message: "Usuario no validado. Espera la aprobación del administrador.",
      })
    }

    // Agregar usuario al request
    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        success: false,
        message: "Token inválido",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        success: false,
        message: "Token expirado",
      })
    }

    console.error("Error en autenticación:", error)
    return res.status(500).json({
      success: false,
      message: "Error en autenticación",
    })
  }
}

// Middleware para verificar rol de administrador
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Autenticación requerida",
    })
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requieren permisos de administrador.",
    })
  }

  next()
}

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const [result] = await pool.query("SELECT id, name, email, role, validated, photo FROM users WHERE id = ?", [
        decoded.userId,
      ])

      if (result.length > 0 && result[0].validated) {
        req.user = result[0]
      }
    }
  } catch (error) {
    // Ignorar errores en autenticación opcional
  }

  next()
}
