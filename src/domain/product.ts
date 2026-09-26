import { DomainValidationError } from "./errors.js";

export interface Product {
  id?: number;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegisterProductInput {
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
}

export const MAX_STOCK_ADJUSTMENT = 1_000;
export const MAX_REORDER_LEVEL = 10_000;

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

export function createProduct(input: RegisterProductInput): Product {
  const sku = normalizeSku(input.sku);
  const name = input.name.trim();

  if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(sku)) {
    throw new DomainValidationError(
      "El SKU debe tener entre 3 y 20 caracteres: letras, números o guiones.",
    );
  }
  if (name.length < 2 || name.length > 100) {
    throw new DomainValidationError("El nombre debe tener entre 2 y 100 caracteres.");
  }
  assertIntegerInRange(input.quantity, 0, Number.MAX_SAFE_INTEGER, "La cantidad");
  assertIntegerInRange(input.reorderLevel, 0, MAX_REORDER_LEVEL, "El nivel de reposición");

  return { sku, name, quantity: input.quantity, reorderLevel: input.reorderLevel };
}

export function calculateAdjustedQuantity(current: number, adjustment: number): number {
  if (!Number.isInteger(adjustment) || adjustment === 0) {
    throw new DomainValidationError("El ajuste debe ser un entero distinto de cero.");
  }
  if (Math.abs(adjustment) > MAX_STOCK_ADJUSTMENT) {
    throw new DomainValidationError(
      `El ajuste no puede superar ${MAX_STOCK_ADJUSTMENT} unidades por operación.`,
    );
  }

  const result = current + adjustment;
  if (result < 0) {
    throw new DomainValidationError("El ajuste no puede dejar existencias negativas.");
  }
  return result;
}

function assertIntegerInRange(value: number, min: number, max: number, field: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new DomainValidationError(`${field} debe ser un entero entre ${min} y ${max}.`);
  }
}
