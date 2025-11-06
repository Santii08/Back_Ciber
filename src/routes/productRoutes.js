import express from "express"
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js"
import { addComment, getProductComments, updateComment, deleteComment } from "../controllers/commentController.js"
import { authenticateToken, requireAdmin, optionalAuth } from "../middleware/auth.js"
import { validateProduct, validateComment, validateId } from "../middleware/validation.js"

const router = express.Router()

// Rutas de productos
router.get("/", optionalAuth, getAllProducts)
router.get("/:id", validateId, optionalAuth, getProductById)
router.post("/", authenticateToken, requireAdmin, validateProduct, createProduct)
router.put("/:id", authenticateToken, requireAdmin, validateId, validateProduct, updateProduct)
router.delete("/:id", authenticateToken, requireAdmin, validateId, deleteProduct)

// Rutas de comentarios
router.post("/:id/comments", authenticateToken, validateId, validateComment, addComment)
router.get("/:id/comments", validateId, getProductComments)
router.put("/comments/:commentId", authenticateToken, validateId, validateComment, updateComment)
router.delete("/comments/:commentId", authenticateToken, validateId, deleteComment)

export default router
