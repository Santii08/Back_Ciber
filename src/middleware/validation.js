import { body, param, validationResult } from "express-validator"

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Errores de validación",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    })
  }

  next()
}

// Validaciones para registro
export const validateRegister = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 255 })
    .withMessage("El nombre debe tener entre 2 y 255 caracteres")
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage("El nombre solo puede contener letras y espacios"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es requerido")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es requerida")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage("La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales"),

  body("photo").optional().trim().isURL().withMessage("La URL de la foto debe ser válida"),

  handleValidationErrors,
]

// Validaciones para login
export const validateLogin = [
  body("email").trim().notEmpty().withMessage("El email es requerido").isEmail().withMessage("Email inválido"),

  body("password").notEmpty().withMessage("La contraseña es requerida"),

  handleValidationErrors,
]

// Validaciones para productos
export const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto es requerido")
    .isLength({ min: 3, max: 255 })
    .withMessage("El nombre debe tener entre 3 y 255 caracteres"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("La descripción es requerida")
    .isLength({ min: 10 })
    .withMessage("La descripción debe tener al menos 10 caracteres"),

  body("price")
    .notEmpty()
    .withMessage("El precio es requerido")
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),

  body("stock").optional().isInt({ min: 0 }).withMessage("El stock debe ser un número entero positivo"),

  body("image_url").optional().trim().isURL().withMessage("La URL de la imagen debe ser válida"),

  handleValidationErrors,
]

// Validaciones para comentarios
export const validateComment = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("El contenido del comentario es requerido")
    .isLength({ min: 5, max: 1000 })
    .withMessage("El comentario debe tener entre 5 y 1000 caracteres"),

  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("La calificación debe ser un número entre 1 y 5"),

  handleValidationErrors,
]

// Validaciones para checkout
export const validateCheckout = [
  body("items").isArray({ min: 1 }).withMessage("Debe incluir al menos un producto"),

  body("items.*.product_id").isInt({ min: 1 }).withMessage("ID de producto inválido"),

  body("items.*.quantity").isInt({ min: 1 }).withMessage("La cantidad debe ser al menos 1"),

  body("coupon_code").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Código de cupón inválido"),

  body("payment_token").trim().notEmpty().withMessage("Token de pago requerido"),

  body("last4")
    .trim()
    .matches(/^\d{4}$/)
    .withMessage("Últimos 4 dígitos inválidos"),

  body("expiry")
    .trim()
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage("Fecha de expiración inválida (formato: MM/YY)"),

  body("card_type")
    .optional()
    .trim()
    .isIn(["visa", "mastercard", "amex", "discover"])
    .withMessage("Tipo de tarjeta inválido"),

  handleValidationErrors,
]

// Validación de parámetros ID
export const validateId = [param("id").isInt({ min: 1 }).withMessage("ID inválido"), handleValidationErrors]
