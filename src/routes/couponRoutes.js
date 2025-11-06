import express from "express"
import {
  getAvailableCoupons,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js"
import { authenticateToken, requireAdmin, optionalAuth } from "../middleware/auth.js"
import { validateId, handleValidationErrors } from "../middleware/validation.js"
import { body } from "express-validator"

const router = express.Router()

// Rutas públicas
router.get("/available", optionalAuth, getAvailableCoupons)

// Rutas de admin
router.use(authenticateToken, requireAdmin)

router.get("/", getAllCoupons)
router.post(
  "/",
  [
    body("code")
      .trim()
      .notEmpty()
      .withMessage("Código requerido")
      .isLength({ min: 3, max: 50 })
      .withMessage("El código debe tener entre 3 y 50 caracteres"),
    body("discount")
      .notEmpty()
      .withMessage("Descuento requerido")
      .isFloat({ min: 0, max: 100 })
      .withMessage("El descuento debe estar entre 0 y 100"),
    body("max_uses").optional().isInt({ min: 1 }).withMessage("Usos máximos debe ser al menos 1"),
    handleValidationErrors,
  ],
  createCoupon,
)
router.put("/:id", validateId, updateCoupon)
router.delete("/:id", validateId, deleteCoupon)

export default router
