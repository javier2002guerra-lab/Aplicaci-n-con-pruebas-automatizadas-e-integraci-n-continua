# Guion de narración para el video (máximo 3 minutos)

El archivo de video entregado se graba sin audio para poder adjuntarle esta narración después.

## 0:00–0:25 — Aplicación y PostgreSQL real

“Esta es una API de inventario desarrollada en TypeScript. Docker muestra la base PostgreSQL normal de la aplicación y la terminal confirma que la API está disponible. El flujo permite registrar productos, consultarlos y ajustar sus existencias.”

## 0:25–1:00 — Flujo válido y rechazo

“Registro una laptop con diez unidades y la consulta devuelve el dato realmente persistido. Después retiro dos unidades y el resultado queda en ocho. Al intentar retirar cien, la regla de negocio responde con error porque el inventario no puede quedar negativo.”

## 1:00–1:35 — Prueba unitaria

“Las pruebas unitarias ejercitan `InventoryService` sin conectarse a PostgreSQL. Por ejemplo, el caso de retiro inválido prepara tres unidades, intenta retirar cuatro y comprueba tanto el mensaje de rechazo como que la cantidad original no cambió. También se cubren valores límite, SKU inválido, duplicados y ajustes máximos.”

## 1:35–2:15 — Integración con Testcontainers

“La prueba de integración crea un PostgreSQL 16 temporal mediante Testcontainers, toma del contenedor la URI dinámica y aplica las mismas migraciones de la aplicación. Usa el repositorio PostgreSQL real para escribir y recuperar un producto, y verifica las restricciones de SKU único y cantidad no negativa. Cada prueba limpia sus datos y al final se cierran la conexión y el contenedor.”

## 2:15–2:50 — GitHub Actions

“En GitHub Actions se observan dos jobs independientes: pruebas unitarias sin infraestructura y pruebas de integración con PostgreSQL temporal. Ambos instalan con `npm ci` y se ejecutan automáticamente en cada push o pull request. La ejecución mostrada corresponde al mismo código del repositorio y ambas suites finalizaron correctamente.”

## 2:50–3:00 — Cierre

“El README documenta los comandos, las reglas y la separación entre la base normal y la base temporal de pruebas.”
