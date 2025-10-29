# Arepabuelas de la Esquina - Backend API

Backend seguro para el e-commerce de Arepabuelas de la esquina. Proyecto académico de ciberseguridad - Antipinzas Group.

## Características

- Autenticación JWT con validación de admin
- Sistema de roles (admin/user)
- Registro de usuarios con validación por administrador
- CRUD completo de productos
- Sistema de comentarios y ratings
- Simulación segura de pagos (NO usa tarjetas reales)
- Sistema de cupones para nuevos usuarios
- Historial de compras
- Rate limiting y sanitización de inputs
- Hash de contraseñas con bcrypt

## Requisitos

### Opción 1: Con Docker (Recomendado)
- Docker Desktop instalado
- Docker Compose incluido

### Opción 2: Instalación Manual
- Node.js 18+
- MySQL 8.0+ (o MariaDB 10.5+)
- npm o yarn

## 🐳 Instalación con Docker (Recomendado)

La forma más rápida de ejecutar la aplicación es usando Docker. Todo está preconfigurado.

### Inicio Rápido

1. **Clonar el repositorio**
   ```bash
   cd backend
   ```

2. **Configurar variables de entorno** (opcional)
   ```bash
   cp .env.docker .env
   ```
   Edita `.env` si necesitas cambiar puertos, contraseñas, etc.

3. **Levantar los contenedores**
   ```bash
   docker-compose up -d
   ```

4. **¡Listo!** La aplicación estará disponible en `http://localhost:3001`

El comando anterior:
- ✅ Descarga e instala MySQL 8.0
- ✅ Construye la imagen del backend
- ✅ Crea la base de datos automáticamente
- ✅ Ejecuta las migraciones
- ✅ Puebla la base de datos con datos de ejemplo
- ✅ Inicia el servidor

### Comandos Docker Útiles

```bash
# Ver logs
docker-compose logs -f

# Detener contenedores
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Reconstruir después de cambios
docker-compose up -d --build
```

📖 **Documentación completa de Docker**: Ver [README.Docker.md](./README.Docker.md)

---

## 🔧 Instalación Manual

### 1. Clonar el repositorio

\`\`\`bash
cd backend
\`\`\`

### 2. Instalar dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus credenciales:

\`\`\`bash
cp .env.example .env
\`\`\`

Edita el archivo `.env` con tus datos de MySQL:

\`\`\`env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=arepabuelas_db
DB_USER=root
DB_PASSWORD=tu_password_mysql
\`\`\`

### 4. Crear la base de datos

En MySQL, crea la base de datos:

**Opción 1: Desde la terminal**
\`\`\`bash
mysql -u root -p
\`\`\`

Luego ejecuta:
\`\`\`sql
CREATE DATABASE arepabuelas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
\`\`\`

**Opción 2: Con phpMyAdmin (XAMPP/WAMP)**
- Abre phpMyAdmin en `http://localhost/phpmyadmin`
- Crea una nueva base de datos llamada `arepabuelas_db`
- Selecciona cotejamiento: `utf8mb4_unicode_ci`

### 5. Ejecutar migraciones

\`\`\`bash
npm run migrate
\`\`\`

### 6. Poblar la base de datos (seed)

\`\`\`bash
npm run seed
\`\`\`

Esto creará:
- Usuario administrador (admin@arepabuelas.com)
- 6 productos de ejemplo
- 2 cupones de descuento
- Comentarios de ejemplo

## Uso

### Desarrollo

\`\`\`bash
npm run dev
\`\`\`

El servidor se ejecutará en `http://localhost:3001`

### Producción

\`\`\`bash
npm start
\`\`\`

## Endpoints API

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual (requiere token)

### Administración de Usuarios

- `GET /api/admin/users` - Listar usuarios no validados (admin)
- `PATCH /api/admin/validate/:id` - Validar usuario (admin)
- `GET /api/admin/users/all` - Listar todos los usuarios (admin)

### Productos

- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener producto con comentarios
- `POST /api/products` - Crear producto (admin)
- `PUT /api/products/:id` - Actualizar producto (admin)
- `DELETE /api/products/:id` - Eliminar producto (admin)

### Comentarios

- `POST /api/products/:id/comments` - Agregar comentario (requiere auth)
- `GET /api/products/:id/comments` - Obtener comentarios de un producto

### Checkout y Pagos

- `POST /api/checkout` - Procesar compra (requiere auth)
- `POST /api/checkout/validate-coupon` - Validar cupón

### Órdenes

- `GET /api/orders` - Historial de compras del usuario (requiere auth)
- `GET /api/orders/:id` - Detalle de una orden (requiere auth)

📖 **Documentación completa de la API**: Ver [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🧪 Pruebas de API

Este proyecto incluye pruebas automatizadas con Newman/Postman en la carpeta `tests/`.

### Ejecutar Pruebas

```bash
# 1. Instalar Newman (solo primera vez)
npm install -g newman newman-reporter-htmlextra

# 2. Asegurarse de que el servidor esté corriendo
npm start
# o con Docker: docker-compose up -d

# 3. Ejecutar pruebas
npm test

# Con reporte HTML detallado
npm run test:report
```

El reporte se genera en `test-results/report.html`.

**Lo que se prueba:**
- ✅ Autenticación y autorización
- ✅ CRUD de productos
- ✅ Sistema de comentarios
- ✅ Cupones y descuentos
- ✅ Checkout y órdenes
- ✅ Seguridad (tokens, permisos)

📖 **Más información**: Ver [tests/README.md](./tests/README.md)

---

## Seguridad Implementada

1. **Autenticación JWT**: Tokens seguros con expiración
2. **Hash de contraseñas**: bcrypt con salt rounds
3. **Validación de inputs**: express-validator en todos los endpoints
4. **Rate limiting**: Límite de peticiones por IP
5. **Helmet**: Headers de seguridad HTTP
6. **CORS**: Configuración restrictiva
7. **Roles y permisos**: Middleware de autorización
8. **Sanitización**: Prevención de SQL injection y XSS
9. **Pagos simulados**: NO se guardan datos reales de tarjetas

## Credenciales por Defecto

**Administrador:**
- Email: `admin@arepabuelas.com`
- Password: `Admin123!Arepabuelas`

**Cupones disponibles:**
- `BIENVENIDO2024` - 15% descuento (nuevos usuarios)
- `ABUELA10` - 10% descuento

## Scripts Disponibles

- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor en desarrollo con nodemon
- `npm run migrate` - Ejecutar migraciones de base de datos
- `npm run seed` - Poblar base de datos con datos de ejemplo
- `npm run reset-db` - Limpiar completamente la base de datos

## Estructura del Proyecto

\`\`\`
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   ├── schema.sql
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   └── reset.js
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   └── server.js
├── tests/
│   ├── postman_collection.json
│   ├── postman_environment.json
│   └── README.md
├── uploads/
├── .env.docker
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
\`\`\`

## Instalación Rápida con XAMPP (Windows)

Si usas XAMPP:

1. Instala XAMPP desde [apachefriends.org](https://www.apachefriends.org/)
2. Inicia Apache y MySQL desde el panel de control de XAMPP
3. Abre phpMyAdmin: `http://localhost/phpmyadmin`
4. Crea la base de datos `arepabuelas_db`
5. Configura tu `.env`:
   \`\`\`env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=arepabuelas_db
   DB_USER=root
   DB_PASSWORD=
   \`\`\`
6. Ejecuta las migraciones: `npm run migrate`
7. Ejecuta el seed: `npm run seed`
8. Inicia el servidor: `npm run dev`

## Notas de Seguridad

⚠️ **IMPORTANTE**: Este es un proyecto académico. En producción:

1. Cambiar JWT_SECRET a un valor aleatorio fuerte
2. Usar HTTPS en producción
3. Configurar CORS apropiadamente
4. Implementar logging y monitoreo
5. Usar variables de entorno seguras
6. Implementar backup de base de datos
7. Revisar y actualizar dependencias regularmente

## Autor

Antipinzas Group - Proyecto de Ciberseguridad 2024
