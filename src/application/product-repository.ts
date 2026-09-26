import type { Product } from "../domain/product.js";

export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findBySku(sku: string): Promise<Product | null>;
  list(): Promise<Product[]>;
  updateQuantity(sku: string, quantity: number): Promise<Product>;
}
