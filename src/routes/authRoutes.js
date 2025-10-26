import express from "express"
import { register, login, getCurrentUser } from "../controllers/authController.js"
import { validateRegister, validateLogin } from "../middleware/validation.js"
import { authenticateToken } from "../middleware/auth.js"
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js"

const router = express.Router()

// Rutas públicas
router.post("/register", registerLimiter, validateRegister, register)
router.post("/login", authLimiter, validateLogin, login)

// Rutas protegidas
router.get("/me", authenticateToken, getCurrentUser)

export default router
