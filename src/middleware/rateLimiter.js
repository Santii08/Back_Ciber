import rateLimit from "express-rate-limit"

// Rate limiter general para la API
export const apiLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: "Demasiadas peticiones desde esta IP, por favor intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter estricto para autenticación (prevenir fuerza bruta)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Demasiados intentos de inicio de sesión. Por favor intenta en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para registro
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: {
    success: false,
    message: "Demasiados registros desde esta IP. Por favor intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para checkout
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 compras por minuto
  message: {
    success: false,
    message: "Demasiadas transacciones. Por favor espera un momento.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})
