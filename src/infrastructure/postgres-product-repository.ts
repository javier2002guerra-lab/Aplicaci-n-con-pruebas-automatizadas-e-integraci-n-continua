import type { Pool } from "pg";
import type { ProductRepository } from "../application/product-repository.js";
import { ProductAlreadyExistsError, ProductNotFoundError } from "../domain/errors.js";
import type { Product } from "../domain/product.js";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorder_level: number;
  created_at: Date;
  updated_at: Date;
}

const PRODUCT_COLUMNS =
  "id, sku, name, quantity, reorder_level, created_at, updated_at";

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  async save(product: Product): Promise<Product> {
    try {
      const result = await this.pool.query<ProductRow>(
        `INSERT INTO products (sku, name, quantity, reorder_level)
         VALUES ($1, $2, $3, $4)
         RETURNING ${PRODUCT_COLUMNS}`,
        [product.sku, product.name, product.quantity, product.reorderLevel],
      );
      return mapRow(requireRow(result.rows[0]));
    } catch (error) {
      if (isPostgresError(error, "23505")) {
        throw new ProductAlreadyExistsError(product.sku);
      }
      throw error;
    }
  }

  async findBySku(sku: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE sku = $1`,
      [sku],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async list(): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY created_at, id`,
    );
    return result.rows.map(mapRow);
  }

  async updateQuantity(sku: string, quantity: number): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `UPDATE products
       SET quantity = $2, updated_at = NOW()
       WHERE sku = $1
       RETURNING ${PRODUCT_COLUMNS}`,
      [sku, quantity],
    );
    if (!result.rows[0]) {
      throw new ProductNotFoundError(sku);
    }
    return mapRow(result.rows[0]);
  }
}

function mapRow(row: ProductRow): Product {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    quantity: row.quantity,
    reorderLevel: row.reorder_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireRow(row: ProductRow | undefined): ProductRow {
  if (!row) throw new Error("PostgreSQL no devolvió la fila esperada.");
  return row;
}

function isPostgresError(error: unknown, code: string): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
