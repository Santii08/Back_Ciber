import express from "express"
import {
  getUserOrders,
  getOrderById,
  getUserStats,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js"
import { authenticateToken, requireAdmin } from "../middleware/auth.js"
import { validateId } from "../middleware/validation.js"
import { body } from "express-validator"
import { handleValidationErrors } from "../middleware/validation.js"

const router = express.Router()

// Rutas de usuario
router.get("/", authenticateToken, getUserOrders)
router.get("/stats", authenticateToken, getUserStats)
router.get("/:id", authenticateToken, validateId, getOrderById)
router.patch("/:id/cancel", authenticateToken, validateId, cancelOrder)

// Rutas de admin
router.get("/admin/all", authenticateToken, requireAdmin, getAllOrders)
router.patch(
  "/admin/:id/status",
  authenticateToken,
  requireAdmin,
  validateId,
  [body("status").notEmpty().withMessage("Estado requerido"), handleValidationErrors],
  updateOrderStatus,
)

export default router
