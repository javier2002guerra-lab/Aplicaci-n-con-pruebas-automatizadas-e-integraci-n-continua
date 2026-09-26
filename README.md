# API de inventario con pruebas automatizadas

Aplicación backend en TypeScript para registrar productos, consultar el inventario y ajustar existencias. Usa PostgreSQL durante su ejecución normal, Vitest para las reglas de negocio y Testcontainers para probar la persistencia real en una base temporal e independiente.

## Flujo y reglas de negocio

Cada producto tiene SKU, nombre, existencias y nivel de reposición.

- El SKU se normaliza a mayúsculas, admite letras, números y guiones, y mide entre 3 y 20 caracteres.
- El nombre debe medir entre 2 y 100 caracteres.
- Las existencias iniciales son un entero mayor o igual que cero.
- El nivel de reposición es un entero entre 0 y 10 000.
- No pueden existir dos productos con el mismo SKU.
- Cada ajuste debe ser un entero distinto de cero y no puede superar 1 000 unidades en valor absoluto.
- Un retiro se rechaza si dejaría existencias negativas.
- Las restricciones importantes también existen en PostgreSQL para proteger la integridad de los datos.

## Arquitectura

```text
src/domain/          Reglas y errores de negocio puros
src/application/     Casos de uso y contrato del repositorio
src/infrastructure/  Implementación real del repositorio PostgreSQL
src/db/              Ejecutor de migraciones
src/http/            Rutas y traducción HTTP
migrations/          Esquema PostgreSQL versionado
tests/unit/           Reglas sin PostgreSQL ni servicios externos
tests/integration/    Persistencia real con PostgreSQL temporal
```

`InventoryService` depende de la interfaz `ProductRepository`, no de PostgreSQL. Las pruebas unitarias usan una implementación en memoria únicamente como doble de la dependencia. Las pruebas de integración instancian `PostgresProductRepository`, la misma clase de la aplicación real, sin simular consultas.

## Requisitos

- Node.js 22.22 o superior
- Docker Desktop o Docker Engine activo
- npm

## Ejecutar la aplicación

1. Instalar exactamente las dependencias bloqueadas:

   ```bash
   npm ci
   ```

2. Iniciar la base normal de desarrollo:

   ```bash
   docker compose up -d postgres
   ```

3. Definir la conexión y ejecutar la API.

   PowerShell:

   ```powershell
   $env:DATABASE_URL="postgresql://inventory:inventory@localhost:55432/inventory"
   npm run db:migrate
   npm run dev
   ```

   Bash:

   ```bash
   export DATABASE_URL=postgresql://inventory:inventory@localhost:55432/inventory
   npm run db:migrate
   npm run dev
   ```

La API queda disponible en `http://localhost:3000`. Al iniciar también aplica cualquier migración pendiente de forma idempotente.

## Probar el flujo HTTP

Registrar un producto:

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"sku":"LAP-001","name":"Laptop profesional","quantity":10,"reorderLevel":3}'
```

Consultar el inventario:

```bash
curl http://localhost:3000/products
curl http://localhost:3000/products/LAP-001
```

Retirar dos unidades:

```bash
curl -X POST http://localhost:3000/products/LAP-001/stock-adjustments \
  -H "Content-Type: application/json" \
  -d '{"adjustment":-2}'
```

Intentar un retiro inválido (devuelve HTTP 400):

```bash
curl -X POST http://localhost:3000/products/LAP-001/stock-adjustments \
  -H "Content-Type: application/json" \
  -d '{"adjustment":-100}'
```

## Pruebas y validaciones

```bash
npm run typecheck          # revisión estática de TypeScript
npm run build              # compilación de producción
npm run test:unit          # reglas de negocio, sin infraestructura
npm run test:integration   # PostgreSQL temporal mediante Testcontainers
npm test                   # ambas suites, en orden
```

La suite unitaria verifica casos exitosos, duplicados, límites y rechazos. La suite de integración inicia `postgres:16-alpine`, obtiene su URI dinámica, aplica las migraciones, prueba escritura/lectura con el repositorio real y comprueba restricciones `UNIQUE` y `CHECK`. Antes de cada caso vacía la tabla y al finalizar cierra el pool y elimina el contenedor.

## Separación de bases de datos

- **Ejecución normal:** usa exclusivamente `DATABASE_URL`; el ejemplo apunta al servicio persistente de `docker-compose.yml`.
- **Integración:** ignora `DATABASE_URL`. Testcontainers crea otra instancia de PostgreSQL con puerto y credenciales efímeros, entrega la conexión al test y destruye el contenedor al terminar.

Por tanto, las pruebas nunca preparan, limpian ni modifican la base normal.

## Integración continua

El workflow [`.github/workflows/tests.yml`](.github/workflows/tests.yml) se ejecuta en cada `push` y `pull_request`. Contiene dos jobs claramente separados:

1. **Pruebas unitarias (sin PostgreSQL)**.
2. **Pruebas de integración (PostgreSQL Testcontainers)**, usando el Docker disponible en el runner de GitHub.

Cualquiera de los dos jobs hace fallar el workflow si su suite falla. No se configura una base externa ni un servicio PostgreSQL en YAML.

## Evidencias

- Repositorio: <https://github.com/javier2002guerra-lab/Aplicaci-n-con-pruebas-automatizadas-e-integraci-n-continua>
- Actions: <https://github.com/javier2002guerra-lab/Aplicaci-n-con-pruebas-automatizadas-e-integraci-n-continua/actions>
- Guion para narrar el video: [`docs/guion-video.md`](docs/guion-video.md)

No se incluyen secretos. Las credenciales de `docker-compose.yml` son únicamente locales y de demostración.
