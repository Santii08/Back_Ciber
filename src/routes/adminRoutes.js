import express from "express"
import { getPendingUsers, validateUser, getAllUsers, deleteUser } from "../controllers/adminController.js"
import { authenticateToken, requireAdmin } from "../middleware/auth.js"
import { validateId } from "../middleware/validation.js"

const router = express.Router()

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken, requireAdmin)

// Gestión de usuarios
router.get("/users", getAllUsers)
router.get("/users/pending", getPendingUsers)
router.patch("/validate/:id", validateId, validateUser)
router.delete("/users/:id", validateId, deleteUser)

export default router
