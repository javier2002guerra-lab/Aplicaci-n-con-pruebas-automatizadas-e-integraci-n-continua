import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { runMigrations } from "./migrations.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Debe definir DATABASE_URL para aplicar las migraciones.");
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../../migrations");
const pool = new Pool({ connectionString: databaseUrl });

try {
  await runMigrations(pool, migrationsDirectory);
  console.log("Migraciones aplicadas correctamente.");
} finally {
  await pool.end();
}
