# Arepabuelas de la esquina - Documentación de API

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Administración](#administración)
3. [Productos](#productos)
4. [Comentarios](#comentarios)
5. [Checkout](#checkout)
6. [Órdenes](#órdenes)
7. [Cupones](#cupones)
8. [Códigos de Estado](#códigos-de-estado)

---

## Autenticación

### Registro de Usuario

**POST** `/api/auth/register`

Registra un nuevo usuario. El usuario debe ser validado por un administrador antes de poder iniciar sesión.

**Body:**
\`\`\`json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Password123!",
  "photo": "https://example.com/photo.jpg" // Opcional
}
\`\`\`

**Respuesta exitosa (201):**
\`\`\`json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Espera la validación del administrador.",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "photo": "https://example.com/photo.jpg",
      "role": "user",
      "validated": false,
      "created_at": "2024-10-30T10:00:00.000Z"
    }
  }
}
\`\`\`

---

### Inicio de Sesión

**POST** `/api/auth/login`

Inicia sesión y obtiene un token JWT.

**Body:**
\`\`\`json
{
  "email": "admin@arepabuelas.com",
  "password": "Admin123!Arepabuelas"
}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Camarón A-Panado",
      "email": "admin@arepabuelas.com",
      "photo": "/admin-avatar.png",
      "role": "admin",
      "validated": true
    }
  }
}
\`\`\`

---

### Obtener Usuario Actual

**GET** `/api/auth/me`

Obtiene información del usuario autenticado.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Camarón A-Panado",
      "email": "admin@arepabuelas.com",
      "photo": "/admin-avatar.png",
      "role": "admin",
      "validated": true
    }
  }
}
\`\`\`

---

## Administración

### Listar Usuarios Pendientes

**GET** `/api/admin/users/pending`

Lista usuarios que esperan validación (solo admin).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 2,
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "photo": null,
        "role": "user",
        "validated": false,
        "created_at": "2024-10-30T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
\`\`\`

---

### Validar Usuario

**PATCH** `/api/admin/validate/:id`

Valida un usuario para que pueda iniciar sesión (solo admin).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "message": "Usuario validado exitosamente",
  "data": {
    "user": {
      "id": 2,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "validated": true
    }
  }
}
\`\`\`

---

## Productos

### Listar Productos

**GET** `/api/products`

Lista todos los productos activos.

**Query Parameters:**
- `active` (boolean): Filtrar por productos activos
- `limit` (number): Límite de resultados
- `offset` (number): Offset para paginación

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Arepa de Queso Boyacense",
        "description": "Deliciosa arepa tradicional...",
        "price": "8500.00",
        "stock": 100,
        "image_url": "/arepa-queso-boyacense.jpg",
        "active": true,
        "comment_count": 5,
        "average_rating": "4.8",
        "created_at": "2024-10-30T10:00:00.000Z"
      }
    ],
    "total": 6
  }
}
\`\`\`

---

### Obtener Producto por ID

**GET** `/api/products/:id`

Obtiene un producto específico con sus comentarios.

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Arepa de Queso Boyacense",
      "description": "Deliciosa arepa tradicional...",
      "price": "8500.00",
      "stock": 100,
      "average_rating": "4.8",
      "comment_count": 5
    },
    "comments": [
      {
        "id": 1,
        "user_id": 1,
        "user_name": "Camarón A-Panado",
        "user_photo": "/admin-avatar.png",
        "content": "¡Deliciosas arepas!",
        "rating": 5,
        "created_at": "2024-10-30T10:00:00.000Z"
      }
    ]
  }
}
\`\`\`

---

### Crear Producto (Admin)

**POST** `/api/products`

Crea un nuevo producto (solo admin).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Body:**
\`\`\`json
{
  "name": "Arepa Nueva",
  "description": "Descripción del producto",
  "price": 10000,
  "stock": 50,
  "image_url": "https://example.com/image.jpg"
}
\`\`\`

---

## Comentarios

### Agregar Comentario

**POST** `/api/products/:id/comments`

Agrega un comentario a un producto (requiere autenticación).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Body:**
\`\`\`json
{
  "content": "Excelente producto, muy recomendado",
  "rating": 5
}
\`\`\`

---

## Checkout

### Validar Cupón

**POST** `/api/checkout/validate-coupon`

Valida un cupón de descuento.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Body:**
\`\`\`json
{
  "code": "BIENVENIDO2024"
}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "message": "Cupón válido",
  "data": {
    "coupon": {
      "code": "BIENVENIDO2024",
      "discount": 15,
      "description": "Cupón de bienvenida para nuevos usuarios"
    }
  }
}
\`\`\`

---

### Procesar Compra

**POST** `/api/checkout`

Procesa una compra completa.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Body:**
\`\`\`json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    },
    {
      "product_id": 2,
      "quantity": 1
    }
  ],
  "coupon_code": "BIENVENIDO2024",
  "payment_token": "tok_1234567890",
  "last4": "4242",
  "expiry": "12/25",
  "card_type": "visa"
}
\`\`\`

**Respuesta exitosa (201):**
\`\`\`json
{
  "success": true,
  "message": "Compra procesada exitosamente",
  "data": {
    "order": {
      "id": 1,
      "total": 24500,
      "discount": 3675,
      "final_total": 20825,
      "status": "completed"
    },
    "payment": {
      "id": 1,
      "last4": "4242",
      "status": "approved"
    }
  }
}
\`\`\`

---

## Órdenes

### Obtener Historial de Órdenes

**GET** `/api/orders`

Obtiene el historial de órdenes del usuario autenticado.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Query Parameters:**
- `status` (string): Filtrar por estado (pending, processing, completed, cancelled)
- `limit` (number): Límite de resultados
- `offset` (number): Offset para paginación

---

### Obtener Detalle de Orden

**GET** `/api/orders/:id`

Obtiene el detalle completo de una orden.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

---

### Obtener Estadísticas

**GET** `/api/orders/stats`

Obtiene estadísticas de compras del usuario.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "stats": {
      "total_orders": 5,
      "total_spent": "125000.00",
      "average_order": "25000.00",
      "completed_orders": 4,
      "pending_orders": 1,
      "cancelled_orders": 0
    },
    "top_products": [
      {
        "id": 1,
        "name": "Arepa de Queso Boyacense",
        "times_purchased": 10,
        "total_spent_on_product": "85000.00"
      }
    ],
    "coupons_used": [
      {
        "code": "BIENVENIDO2024",
        "discount": 15,
        "used_at": "2024-10-30T10:00:00.000Z"
      }
    ]
  }
}
\`\`\`

---

### Cancelar Orden

**PATCH** `/api/orders/:id/cancel`

Cancela una orden pendiente.

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

---

## Cupones

### Obtener Cupones Disponibles

**GET** `/api/coupons/available`

Lista cupones activos y disponibles.

**Respuesta exitosa (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "code": "BIENVENIDO2024",
        "discount": 15,
        "description": "Cupón de bienvenida",
        "remaining_uses": 950
      }
    ]
  }
}
\`\`\`

---

### Crear Cupón (Admin)

**POST** `/api/coupons`

Crea un nuevo cupón (solo admin).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Body:**
\`\`\`json
{
  "code": "VERANO2024",
  "discount": 20,
  "description": "Descuento de verano",
  "max_uses": 100,
  "valid_from": "2024-06-01T00:00:00Z",
  "valid_until": "2024-08-31T23:59:59Z"
}
\`\`\`

---

## Códigos de Estado

- **200**: Éxito
- **201**: Creado exitosamente
- **400**: Solicitud inválida
- **401**: No autenticado
- **403**: No autorizado
- **404**: No encontrado
- **409**: Conflicto (ej: email duplicado)
- **429**: Demasiadas peticiones
- **500**: Error del servidor

---

## Notas de Seguridad

1. Todos los endpoints protegidos requieren el header `Authorization: Bearer {token}`
2. Los tokens JWT expiran en 7 días
3. Las contraseñas deben tener al menos 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales
4. Los pagos son simulados - NUNCA usar tarjetas reales
5. Rate limiting aplicado a todos los endpoints
6. Validación de inputs en todos los endpoints
\`\`\`
