import express from "express"
import helmet from "helmet"
import cors from "cors"
import dotenv from "dotenv"
import { apiLimiter } from "./middleware/rateLimiter.js"
import authRoutes from "./routes/authRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import checkoutRoutes from "./routes/checkoutRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import couponRoutes from "./routes/couponRoutes.js"

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware de seguridad
app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
)

// Middleware de parseo
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Rate limiting
app.use("/api/", apiLimiter)

// Rutas
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Arepabuelas de la esquina - API Backend",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin",
      products: "/api/products",
      checkout: "/api/checkout",
      orders: "/api/orders",
      coupons: "/api/coupons",
    },
  })
})

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

// Rutas de la API
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/products", productRoutes)
app.use("/api/checkout", checkoutRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/coupons", couponRoutes)

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  })
})

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err)

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🥞 Arepabuelas de la esquina - Backend API            ║
║                                                           ║
║   Servidor corriendo en: http://localhost:${PORT}        ║
║   Ambiente: ${process.env.NODE_ENV || "development"}                      ║
║                                                           ║
║   Endpoints disponibles:                                  ║
║   - POST /api/auth/register                              ║
║   - POST /api/auth/login                                 ║
║   - GET  /api/auth/me                                    ║
║   - GET  /api/admin/users                                ║
║   - PATCH /api/admin/validate/:id                        ║
║   - GET  /api/products                                   ║
║   - POST /api/checkout                                   ║
║   - GET  /api/orders                                     ║
║   - GET  /api/coupons/available                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

export default app
