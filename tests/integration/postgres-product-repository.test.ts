import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrations.js";
import { ProductAlreadyExistsError } from "../../src/domain/errors.js";
import { PostgresProductRepository } from "../../src/infrastructure/postgres-product-repository.js";

describe("PostgresProductRepository con Testcontainers", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PostgresProductRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
    await runMigrations(pool, path.resolve(currentDirectory, "../../migrations"));
    repository = new PostgresProductRepository(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE products RESTART IDENTITY");
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("escribe un producto y luego lo recupera con el repositorio real", async () => {
    // Arrange
    const product = { sku: "SSD-001", name: "Unidad SSD", quantity: 12, reorderLevel: 3 };

    // Act
    const saved = await repository.save(product);
    const recovered = await repository.findBySku("SSD-001");

    // Assert
    expect(saved.id).toBe(1);
    expect(recovered).toMatchObject(product);
    expect(recovered?.createdAt).toBeInstanceOf(Date);
  });

  it("consulta todos los productos usando la persistencia de la aplicación", async () => {
    // Arrange
    await repository.save({ sku: "RAM-001", name: "Memoria RAM", quantity: 4, reorderLevel: 2 });
    await repository.save({ sku: "CPU-001", name: "Procesador", quantity: 2, reorderLevel: 1 });

    // Act
    const products = await repository.list();

    // Assert
    expect(products).toHaveLength(2);
    expect(products.map((product) => product.sku)).toEqual(["RAM-001", "CPU-001"]);
  });

  it("traduce la restricción UNIQUE de PostgreSQL a un error de negocio", async () => {
    // Arrange
    const product = { sku: "GPU-001", name: "Tarjeta gráfica", quantity: 2, reorderLevel: 1 };
    await repository.save(product);

    // Act
    const action = repository.save({ ...product, name: "Otra tarjeta" });

    // Assert
    await expect(action).rejects.toBeInstanceOf(ProductAlreadyExistsError);
  });

  it("la migración impide almacenar existencias negativas", async () => {
    // Arrange
    const invalidInsert = () =>
      pool.query(
        `INSERT INTO products (sku, name, quantity, reorder_level)
         VALUES ('BAD-001', 'Producto inválido', -1, 0)`,
      );

    // Act / Assert
    await expect(invalidInsert()).rejects.toMatchObject({ code: "23514" });
    expect((await pool.query("SELECT COUNT(*)::int AS count FROM products")).rows[0].count).toBe(0);
  });
});
