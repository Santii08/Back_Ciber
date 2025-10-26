import express from "express"
import { validateCoupon, processCheckout, simulateCardValidation } from "../controllers/checkoutController.js"
import { authenticateToken } from "../middleware/auth.js"
import { validateCheckout } from "../middleware/validation.js"
import { checkoutLimiter } from "../middleware/rateLimiter.js"

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// Validar cupón
router.post("/validate-coupon", validateCoupon)

// Simular validación de tarjeta (solo para testing)
router.post("/simulate-card", simulateCardValidation)

// Procesar checkout
router.post("/", checkoutLimiter, validateCheckout, processCheckout)

export default router
