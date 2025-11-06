#  Dockerización de Arepabuelas Backend

Este documento explica cómo ejecutar la aplicación completa (backend + base de datos MySQL) usando Docker y Docker Compose.

##  Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [Requisitos Previos](#requisitos-previos)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Configuración](#configuración)
5. [Comandos Básicos](#comandos-básicos)
6. [Modo Desarrollo vs Producción](#modo-desarrollo-vs-producción)
7. [Arquitectura](#arquitectura)
8. [Solución de Problemas](#solución-de-problemas)
9. [Seguridad en Producción](#seguridad-en-producción)

---

##  Inicio Rápido

### Para Windows (PowerShell o CMD):

```powershell
# 1. Copiar archivo de configuración
copy .env.docker .env

# 2. Levantar contenedores
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Acceder a la API
# http://localhost:3001
```

### Para Linux/Mac:

```bash
# 1. Copiar archivo de configuración
cp .env.docker .env

# 2. Levantar contenedores
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Acceder a la API
# http://localhost:3001
```

**¡Listo!** La aplicación estará disponible en `http://localhost:3001`

---

##  Requisitos Previos

- **Docker Desktop** instalado ([descargar aquí](https://www.docker.com/products/docker-desktop))
  - Incluye Docker Engine y Docker Compose
- Puertos **3001** y **3306** disponibles en tu máquina
- Al menos **2GB de RAM** disponible
- **5GB de espacio en disco**

### Verificar Instalación

```bash
docker --version
docker-compose --version
```

---

##  Estructura de Archivos Docker

```
Back_Ciber/
├── Dockerfile              # Define la imagen del backend (producción)
├── Dockerfile.dev          # Define la imagen del backend (desarrollo)
├── docker-compose.yml      # Orquesta los servicios (producción)
├── docker-compose.dev.yml  # Orquesta los servicios (desarrollo)
├── .dockerignore           # Archivos excluidos del build
└── .env.docker             # Variables de entorno de ejemplo
```

---

##  Configuración

### 1. Configurar Variables de Entorno

El archivo `.env.docker` contiene valores por defecto. Cópialo a `.env`:

**Windows:**
```powershell
copy .env.docker .env
```

**Linux/Mac:**
```bash
cp .env.docker .env
```

### 2. Editar Variables (Opcional)

Abre el archivo `.env` y ajusta los valores si lo necesitas:

```env
# Puerto del backend
PORT=3001

# Configuración de Base de Datos
DB_HOST=db
DB_PORT=3306
DB_NAME=arepabuelas_db
DB_USER=arepabuelas_user
DB_PASSWORD=root_password_123              #  CAMBIAR en producción

# JWT Secret
JWT_SECRET=tu_jwt_secret_super_seguro      #  CAMBIAR en producción

# CORS (permite todos los orígenes por defecto)
CORS_ORIGIN=*                              #  RESTRINGIR en producción

# Modo de Node
NODE_ENV=production
```

### 3. Construir y Ejecutar

```bash
docker-compose up -d
```

Este comando automáticamente:
 Descarga la imagen de MySQL 8.0
 Construye la imagen del backend Node.js
 Crea la red interna entre contenedores
 Inicia la base de datos MySQL
 Espera a que MySQL esté listo (healthcheck)
 Ejecuta las migraciones de base de datos
 Puebla la base de datos con datos de ejemplo
 Inicia el servidor Express.js

### 4. Verificar que Funciona

**Opción 1 - Navegador:**
Abre `http://localhost:3001`

**Opción 2 - Curl:**
```bash
curl http://localhost:3001
```

**Opción 3 - Ver estado:**
```bash
docker-compose ps
```

Deberías ver ambos contenedores con estado "Up":
```
NAME                   STATUS
arepabuelas_backend    Up (healthy)
arepabuelas_db         Up (healthy)
```

---

##  Comandos Básicos

### Gestión de Contenedores

```bash
# Iniciar contenedores
docker-compose up -d

# Detener contenedores (los datos persisten)
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener y eliminar contenedores + volúmenes ( borra la BD)
docker-compose down -v

# Reiniciar todos los servicios
docker-compose restart

# Reiniciar solo el backend
docker-compose restart app

# Reiniciar solo la base de datos
docker-compose restart db
```

### Ver Logs

```bash
# Ver logs de todos los servicios
docker-compose logs

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f app

# Ver logs solo de la base de datos
docker-compose logs -f db

# Ver últimas 100 líneas
docker-compose logs --tail=100
```

### Ver Estado

```bash
# Estado de los contenedores
docker-compose ps

# Uso de recursos (CPU, RAM)
docker stats arepabuelas_backend arepabuelas_db

# Estado de salud de la base de datos
docker inspect arepabuelas_db --format='{{.State.Health.Status}}'
```

### Acceder a los Contenedores

```bash
# Shell del backend
docker exec -it arepabuelas_backend sh

# MySQL shell
docker exec -it arepabuelas_db mysql -u root -p
# Contraseña por defecto: root_password_123

# Ejecutar comandos en el backend
docker exec arepabuelas_backend node -v
docker exec arepabuelas_backend npm list
```

### Reconstruir las Imágenes

Si haces cambios en el código fuente o en el Dockerfile:

```bash
# Reconstruir y reiniciar
docker-compose up -d --build

# Reconstruir sin cache
docker-compose build --no-cache
docker-compose up -d
```

### Limpiar Todo

```bash
# Eliminar contenedores y volúmenes
docker-compose down -v

# Limpiar imágenes no usadas
docker system prune -a

# Limpiar todo (contenedores, imágenes, volúmenes, redes)
docker system prune -a --volumes
```

---

##  Modo Desarrollo vs Producción

### Modo Producción (Predeterminado)

**Archivo:** `docker-compose.yml`

**Características:**
-  Solo dependencias de producción (`npm ci --only=production`)
-  Código copiado al contenedor (no se actualiza automáticamente)
-  Usuario no privilegiado (nodejs)
-  Imagen optimizada y ligera
-  Healthchecks configurados

**Uso:**
```bash
docker-compose up -d
```

### Modo Desarrollo

**Archivo:** `docker-compose.dev.yml`

**Características:**
-  Todas las dependencias incluidas devDependencies
-  Código montado como volumen (hot-reload automático)
-  Nodemon activo (reinicio automático al cambiar código)
-  Logs más verbosos
-  Ideal para desarrollo local

**Uso:**
```bash
# Iniciar en modo desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Detener
docker-compose -f docker-compose.dev.yml down
```

**Flujo de trabajo en desarrollo:**
1. Inicia los contenedores en modo dev
2. Edita tu código en tu editor favorito
3. Los cambios se reflejan automáticamente (nodemon reinicia el servidor)
4. No necesitas reconstruir la imagen

---

##  Arquitectura Docker

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                   Docker Environment                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │           arepabuelas_network (bridge)             │ │
│  │                                                     │ │
│  │  ┌──────────────────┐      ┌──────────────────┐  │ │
│  │  │ arepabuelas_     │      │ arepabuelas_db   │  │ │
│  │  │ backend          │──────│                  │  │ │
│  │  │                  │      │ MySQL 8.0        │  │ │
│  │  │ Node.js 18       │      │ Port: 3306       │  │ │
│  │  │ Express.js       │      │                  │  │ │
│  │  │ Port: 3001       │      │ Volume:          │  │ │
│  │  │                  │      │ mysql_data       │  │ │
│  │  └──────────────────┘      └──────────────────┘  │ │
│  │         ▲                          ▲             │ │
│  └─────────┼──────────────────────────┼─────────────┘ │
│            │                          │               │
│      Port 3001                   Port 3306            │
└────────────┼──────────────────────────┼───────────────┘
             │                          │
             ▼                          ▼
    http://localhost:3001      mysql://localhost:3306
```

### Servicios

#### `db` - Base de Datos MySQL

```yaml
Imagen: mysql:8.0
Contenedor: arepabuelas_db
Puerto: 3306 (expuesto al host)
Base de datos: arepabuelas_db
Usuario: arepabuelas_user
Volumen: mysql_data (persistente)
Healthcheck: mysqladmin ping cada 10s
Red: arepabuelas_network
```

#### `app` - Backend Node.js

```yaml
Imagen: Construida desde Dockerfile
Contenedor: arepabuelas_backend
Puerto: 3001 (expuesto al host)
Usuario: nodejs (UID 1001, no-root)
Depende de: db (espera healthcheck)
Red: arepabuelas_network
Comando: node src/server.js
```

### Red y Comunicación

- **Red interna:** `arepabuelas_network` (tipo bridge)
- **Hostname del backend:** `app`
- **Hostname de la base de datos:** `db`
- **Comunicación:** Backend conecta a MySQL usando `mysql://db:3306/arepabuelas_db`
- **Aislamiento:** Los contenedores solo se comunican dentro de la red Docker

### Volúmenes

```
mysql_data (volumen Docker nombrado)
├── Datos persistentes de MySQL
├── Base de datos: arepabuelas_db
├── Tablas: users, products, comments, orders, etc.
└── Sobrevive a: stop, restart, down (pero NO a down -v)
```

### Proceso de Inicio

```
1. docker-compose up -d
   ↓
2. Crear red arepabuelas_network
   ↓
3. Crear volumen mysql_data (si no existe)
   ↓
4. Iniciar contenedor MySQL
   ↓
5. Health check - Esperar MySQL ready (hasta 5 intentos)
   ↓
6. Iniciar contenedor Backend
   ↓
7. Backend espera 10 segundos adicionales
   ↓
8. Ejecutar migraciones (crear tablas)
   ↓
9. Ejecutar seed (poblar datos de ejemplo)
   ↓
10. Iniciar servidor Express.js en puerto 3001
    ↓
11. API disponible en http://localhost:3001
```

---

##  Solución de Problemas

### El backend no puede conectarse a la base de datos

**Síntomas:**
```
Error: connect ECONNREFUSED
SequelizeConnectionError: Connection refused
```

**Soluciones:**

1. **Verificar que MySQL esté healthy:**
   ```bash
   docker inspect arepabuelas_db --format='{{.State.Health.Status}}'
   ```
   Debe mostrar `healthy`. Si muestra `starting` espera un poco más.

2. **Ver logs de MySQL:**
   ```bash
   docker-compose logs db
   ```

3. **Verificar variables de entorno:**
   ```bash
   docker exec arepabuelas_backend env | grep DB_
   ```
   Verifica que `DB_HOST=db` (no localhost)

4. **Probar conectividad:**
   ```bash
   docker exec arepabuelas_backend ping -c 3 db
   ```

5. **Reiniciar servicios:**
   ```bash
   docker-compose restart
   ```

### Los datos no persisten entre reinicios

**Causa:** Usaste `docker-compose down -v` que elimina los volúmenes.

**Solución:**
- Usa `docker-compose down` (sin -v) para preservar datos
- Usa `docker-compose stop` para solo detener sin eliminar

**Recuperar datos:**
```bash
# Si tienes un backup
docker exec -i arepabuelas_db mysql -u root -proot_password_123 arepabuelas_db < backup.sql

# Si no, ejecuta el seed nuevamente
docker exec arepabuelas_backend node src/database/seed.js
```

### Puerto 3001 o 3306 ya está en uso

**Windows - Ver qué proceso usa el puerto:**
```powershell
netstat -ano | findstr :3001
netstat -ano | findstr :3306
```

**Linux/Mac:**
```bash
lsof -i :3001
lsof -i :3306
```

**Soluciones:**

1. **Detener el servicio que usa el puerto**

2. **Cambiar el puerto en .env:**
   ```env
   PORT=3002
   DB_PORT=3307
   ```
   Luego reinicia:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Contenedor se reinicia constantemente

**Ver logs para identificar el error:**
```bash
docker-compose logs -f app
```

**Causas comunes:**
- Error en migraciones (verifica schema.sql)
- Credenciales incorrectas de BD
- MySQL no está listo (aumenta el tiempo de espera)

**Solución temporal - deshabilitar auto-start del comando:**
Edita `docker-compose.yml` y comenta el `command:` para iniciar manualmente.

### Base de datos corrupta o con datos incorrectos

** CUIDADO: Esto borrará todos los datos**

```bash
# 1. Crear backup si es posible
docker exec arepabuelas_db mysqldump -u root -proot_password_123 arepabuelas_db > backup.sql

# 2. Eliminar todo y recrear
docker-compose down -v
docker-compose up -d

# 3. Verificar logs
docker-compose logs -f
```

### Imagen no se actualiza después de cambios en el código

**Reconstruir sin cache:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Error de permisos en volúmenes

**Linux/Mac:**
```bash
# Cambiar permisos del volumen
docker-compose down
sudo chown -R $USER:$USER ./logs
docker-compose up -d
```

### Limpiar todo y empezar desde cero

```bash
# Detener y eliminar todo
docker-compose down -v

# Limpiar imágenes y cache
docker system prune -a --volumes

# Reconstruir desde cero
docker-compose up -d --build
```

### Ver estado detallado de un contenedor

```bash
# Estado general
docker inspect arepabuelas_backend

# Solo el estado de salud
docker inspect arepabuelas_db --format='{{json .State.Health}}' | python -m json.tool

# Logs de inicio
docker logs arepabuelas_backend --tail 100
```

---

##  Seguridad en Producción

###  IMPORTANTE: Cambios Obligatorios para Producción

El archivo `.env.docker` contiene valores por defecto **SOLO para desarrollo/testing**. Antes de desplegar a producción:

### 1. Generar Secretos Seguros

**Windows PowerShell:**
```powershell
# Generar password aleatorio de 32 caracteres
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Generar JWT secret
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Linux/Mac:**
```bash
# Generar password aleatorio
openssl rand -base64 32

# Generar JWT secret
openssl rand -hex 64
```

### 2. Actualizar Variables de Entorno

```env
#  CAMBIAR ESTOS VALORES
DB_PASSWORD=tu_password_muy_seguro_generado_aleatoriamente
JWT_SECRET=tu_jwt_secret_muy_largo_y_aleatorio

# Restringir CORS a tu dominio
CORS_ORIGIN=https://tudominio.com

# Modo producción
NODE_ENV=production
```

### 3. No Exponer Puerto de MySQL

En producción, MySQL NO debe ser accesible desde el exterior.

**Editar `docker-compose.yml`:**
```yaml
services:
  db:
    #  COMENTAR O ELIMINAR esta línea en producción
    # ports:
    #   - "3306:3306"
```

### 4. Usar Docker Secrets (Recomendado)

Para mayor seguridad, usa Docker Secrets en lugar de variables de entorno:

```bash
# Crear directorio de secretos
mkdir secrets
echo "tu_password_seguro" > secrets/db_password.txt
echo "tu_jwt_secret" > secrets/jwt_secret.txt
chmod 600 secrets/*
```

Luego modifica `docker-compose.yml` para usar secrets.

### 5. Implementar Reverse Proxy (nginx)

Usa nginx como proxy reverso con SSL/TLS:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro
  depends_on:
    - app
```

### 6. Configurar Límites de Recursos

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 7. Backups Automáticos

**Script de backup (`backup-db.sh`):**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec arepabuelas_db mysqldump -u root -p$DB_PASSWORD arepabuelas_db | gzip > backup_$DATE.sql.gz
find . -name "backup_*.sql.gz" -mtime +30 -delete
```

**Configurar cron para backup diario:**
```bash
0 2 * * * /path/to/backup-db.sh
```

### 8. Monitoreo y Logging

- Implementar logging centralizado (ELK Stack, Loki)
- Monitoreo de recursos (Prometheus + Grafana)
- Alertas automáticas
- Health checks regulares

### Checklist Pre-Producción

- [ ] Cambiar DB_PASSWORD por valor aleatorio seguro
- [ ] Cambiar JWT_SECRET por valor aleatorio largo
- [ ] Configurar CORS_ORIGIN con tu dominio específico
- [ ] No exponer puerto 3306 de MySQL
- [ ] Implementar SSL/TLS (HTTPS)
- [ ] Usar reverse proxy (nginx)
- [ ] Configurar backups automáticos
- [ ] Implementar monitoreo
- [ ] Configurar límites de recursos
- [ ] Usar Docker Secrets para credenciales
- [ ] Habilitar logs centralizados
- [ ] Configurar firewall del servidor
- [ ] Actualizar dependencias a versiones seguras
- [ ] Implementar rate limiting adicional
- [ ] Configurar alertas de seguridad

---

##  Gestión de Base de Datos

### Crear Backup Manual

```bash
# Backup completo
docker exec arepabuelas_db mysqldump -u root -proot_password_123 arepabuelas_db > backup_$(date +%Y%m%d).sql

# Backup comprimido
docker exec arepabuelas_db mysqldump -u root -proot_password_123 arepabuelas_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restaurar Backup

```bash
# Desde archivo SQL
docker exec -i arepabuelas_db mysql -u root -proot_password_123 arepabuelas_db < backup.sql

# Desde archivo comprimido
gunzip < backup.sql.gz | docker exec -i arepabuelas_db mysql -u root -proot_password_123 arepabuelas_db
```

### Acceder a MySQL

```bash
# MySQL shell
docker exec -it arepabuelas_db mysql -u root -p
# Contraseña: root_password_123

# Ejecutar query directamente
docker exec arepabuelas_db mysql -u root -proot_password_123 -e "SHOW DATABASES;"
docker exec arepabuelas_db mysql -u root -proot_password_123 arepabuelas_db -e "SHOW TABLES;"
```

### Reiniciar Base de Datos Limpia

```bash
#  CUIDADO: Esto borra todos los datos
docker-compose down -v
docker-compose up -d
```

---

##  Credenciales por Defecto

### Usuario Administrador (Seed)

Creado automáticamente al iniciar:
- **Email:** `admin@arepabuelas.com`
- **Password:** `Admin123!Arepabuelas`
- **Rol:** admin
- **Validado:** Sí

### Base de Datos

- **Host:** `localhost` (desde tu PC) o `db` (desde el contenedor backend)
- **Puerto:** `3306`
- **Database:** `arepabuelas_db`
- **Usuario Root:** `root`
- **Usuario App:** `arepabuelas_user`
- **Password:** `root_password_123` ( cambiar en producción)

### Cupones de Ejemplo (Seed)

- **BIENVENIDO2024:** 15% descuento
- **ABUELA10:** 10% descuento

---

##  Referencias y Recursos

### Documentación Oficial

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [MySQL Docker Hub](https://hub.docker.com/_/mysql)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

### Seguridad

- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

### Herramientas Útiles

- [Portainer](https://www.portainer.io/) - GUI para Docker
- [Dive](https://github.com/wagoodman/dive) - Inspeccionar capas de imágenes
- [Trivy](https://github.com/aquasecurity/trivy) - Escanear vulnerabilidades

---

##  FAQ

### ¿Puedo usar esto con Docker Toolbox?

No recomendado. Docker Desktop es la opción moderna y mejor soportada.

### ¿Los datos persisten si reinicio mi computadora?

Sí, mientras uses `docker-compose stop` o `docker-compose down` (sin -v).

### ¿Puedo cambiar la versión de Node.js o MySQL?

Sí, edita el `Dockerfile` (para Node.js) o `docker-compose.yml` (para MySQL).

### ¿Cómo actualizo la aplicación después de cambios en el código?

**Modo Producción:**
```bash
docker-compose down
docker-compose up -d --build
```

**Modo Desarrollo:**
Los cambios se reflejan automáticamente con nodemon.

### ¿Puedo ejecutar múltiples instancias?

Sí, pero necesitas cambiar los puertos en cada instancia para evitar conflictos.

### ¿Funciona en Windows, Mac y Linux?

Sí, Docker es multiplataforma. Los comandos son los mismos excepto algunos detalles de PowerShell vs Bash.

---
