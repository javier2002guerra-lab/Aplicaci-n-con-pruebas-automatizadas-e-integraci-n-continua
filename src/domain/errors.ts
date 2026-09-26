export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

export class ProductNotFoundError extends Error {
  constructor(sku: string) {
    super(`No existe un producto con SKU ${sku}.`);
    this.name = "ProductNotFoundError";
  }
}

export class ProductAlreadyExistsError extends Error {
  constructor(sku: string) {
    super(`Ya existe un producto con SKU ${sku}.`);
    this.name = "ProductAlreadyExistsError";
  }
}
