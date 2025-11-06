# 🧪 Pruebas de API - Newman/Postman

Colección de pruebas automatizadas para la API de Arepabuelas.

## 📋 Archivos

- **`postman_collection.json`** - Colección completa de pruebas (25+ tests)
- **`postman_environment.json`** - Variables de entorno

## 🚀 Ejecutar Pruebas

### Requisitos

```bash
npm install -g newman newman-reporter-htmlextra
```

### Servidor debe estar corriendo

```bash
# Con Docker
docker-compose up -d

# O manualmente
npm run migrate && npm run seed && npm start
```

### Ejecutar

```bash
# Básico
newman run tests/postman_collection.json -e tests/postman_environment.json

# Con reporte HTML
newman run tests/postman_collection.json -e tests/postman_environment.json --reporters cli,htmlextra --reporter-htmlextra-export test-results/report.html

# O usando npm
npm test
```

## 📦 Usar con Postman

1. Abre Postman Desktop
2. Import → `postman_collection.json`
3. Import → `postman_environment.json`
4. Selecciona el environment "Arepabuelas API Environment"
5. Run Collection

## ✅ Lo que se prueba

- ✅ Autenticación (login, registro, tokens)
- ✅ Operaciones de admin (validar usuarios, listar usuarios)
- ✅ Productos (CRUD completo)
- ✅ Comentarios y ratings
- ✅ Cupones y descuentos
- ✅ Checkout y órdenes
- ✅ Pruebas de seguridad (acceso no autorizado)

## 🔧 Configuración

El environment usa `http://localhost:3001` por defecto.

Para cambiar la URL, edita `postman_environment.json`:

```json
{
  "key": "base_url",
  "value": "http://tu-servidor:puerto"
}
```

---

**Total:** 25+ pruebas automatizadas
