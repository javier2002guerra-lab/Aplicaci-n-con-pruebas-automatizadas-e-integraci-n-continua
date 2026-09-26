import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { InventoryService } from "./application/inventory-service.js";
import { runMigrations } from "./db/migrations.js";
import { createApi } from "./http/api.js";
import { PostgresProductRepository } from "./infrastructure/postgres-product-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Debe definir DATABASE_URL. Consulte .env.example.");
}

const port = Number(process.env.PORT ?? 3000);
const pool = new Pool({ connectionString: databaseUrl });
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../migrations");

await runMigrations(pool, migrationsDirectory);

const repository = new PostgresProductRepository(pool);
const service = new InventoryService(repository);
const server = createApi(service);

server.listen(port, () => {
  console.log(`API de inventario disponible en http://localhost:${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} recibido; cerrando conexiones...`);
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
