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
  const client = await pool.connect()

  try {
    const { name, email, password, photo } = req.body

    // Verificar si el email ya existe
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      })
    }

    // Hash de la contraseña
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Insertar usuario (no validado por defecto)
    const result = await client.query(
      `
      INSERT INTO users (name, email, password_hash, photo, role, validated)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, photo, role, validated, created_at
    `,
      [name, email, passwordHash, photo || null, "user", false],
    )

    const user = result.rows[0]

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
    client.release()
  }
}

// Login de usuario
export const login = async (req, res) => {
  const client = await pool.connect()

  try {
    const { email, password } = req.body

    // Buscar usuario por email
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const user = result.rows[0]

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
          validated: user.validated,
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
    client.release()
  }
}

// Obtener usuario actual
export const getCurrentUser = async (req, res) => {
  try {
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
