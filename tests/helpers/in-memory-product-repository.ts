import type { ProductRepository } from "../../src/application/product-repository.js";
import { ProductNotFoundError } from "../../src/domain/errors.js";
import type { Product } from "../../src/domain/product.js";

export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();
  private nextId = 1;

  async save(product: Product): Promise<Product> {
    const now = new Date();
    const saved = { ...product, id: this.nextId++, createdAt: now, updatedAt: now };
    this.products.set(product.sku, saved);
    return { ...saved };
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = this.products.get(sku);
    return product ? { ...product } : null;
  }

  async list(): Promise<Product[]> {
    return [...this.products.values()].map((product) => ({ ...product }));
  }

  async updateQuantity(sku: string, quantity: number): Promise<Product> {
    const product = this.products.get(sku);
    if (!product) throw new ProductNotFoundError(sku);
    const updated = { ...product, quantity, updatedAt: new Date() };
    this.products.set(sku, updated);
    return { ...updated };
  }
}
