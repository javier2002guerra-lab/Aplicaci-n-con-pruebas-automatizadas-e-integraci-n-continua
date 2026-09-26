import {
  ProductAlreadyExistsError,
  ProductNotFoundError,
} from "../domain/errors.js";
import {
  calculateAdjustedQuantity,
  createProduct,
  normalizeSku,
  type Product,
  type RegisterProductInput,
} from "../domain/product.js";
import type { ProductRepository } from "./product-repository.js";

export class InventoryService {
  constructor(private readonly products: ProductRepository) {}

  async register(input: RegisterProductInput): Promise<Product> {
    const product = createProduct(input);
    const existing = await this.products.findBySku(product.sku);
    if (existing) {
      throw new ProductAlreadyExistsError(product.sku);
    }
    return this.products.save(product);
  }

  async getBySku(rawSku: string): Promise<Product> {
    const sku = normalizeSku(rawSku);
    const product = await this.products.findBySku(sku);
    if (!product) {
      throw new ProductNotFoundError(sku);
    }
    return product;
  }

  list(): Promise<Product[]> {
    return this.products.list();
  }

  async adjustStock(rawSku: string, adjustment: number): Promise<Product> {
    const product = await this.getBySku(rawSku);
    const quantity = calculateAdjustedQuantity(product.quantity, adjustment);
    return this.products.updateQuantity(product.sku, quantity);
  }
}
