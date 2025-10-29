import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import pool from "../config/database.js"

// Generar token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token válido por 7 días
  })
}

// Registro de usuario
export const register = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { name, email, password, photo } = req.body

    // Verificar si el email ya existe
    const [existingUser] = await connection.query("SELECT id FROM users WHERE email = ?", [email])

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      })
    }

    // Hash de la contraseña
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Insertar usuario (no validado por defecto)
    const [insertResult] = await connection.query(
      `
      INSERT INTO users (name, email, password_hash, photo, role, validated)
      VALUES (?, ?, ?, ?, ?, ?) `,
      [name, email, passwordHash, photo || null, "user", false],
    )

    // Obtener el usuario insertado
    const [userRows] = await connection.query(
      "SELECT id, name, email, photo, role, validated, created_at FROM users WHERE id = ?",
      [insertResult.insertId]
    )
    const user = userRows[0]
    user.validated = Boolean(user.validated)
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente. Espera la validación del administrador.",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          photo: user.photo,
          role: user.role,
          validated: user.validated,
          created_at: user.created_at,
        },
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({
      success: false,
      message: "Error al registrar usuario",
    })
  } finally {
    connection.release()
  }
}

// Login de usuario
export const login = async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const { email, password } = req.body

    // Buscar usuario por email
    const [rows] = await connection.query("SELECT * FROM users WHERE email = ?", [email])

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const user = rows[0]

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Verificar si el usuario está validado
    if (!user.validated) {
      return res.status(403).json({
        success: false,
        message: "Tu cuenta aún no ha sido validada por un administrador. Por favor espera la aprobación.",
      })
    }

    // Generar token
    const token = generateToken(user.id)

    const outUser = { ...user, validated: Boolean(user.validated) }

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          photo: user.photo,
          role: user.role,
          validated: outUser.validated,
        },
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
    })
  } finally {
    connection.release()
  }
}

// Obtener usuario actual
export const getCurrentUser = async (req, res) => {
  try {
    if (req.user && req.user.validated !== undefined) req.user.validated = Boolean(req.user.validated)
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
    })
  }
}
