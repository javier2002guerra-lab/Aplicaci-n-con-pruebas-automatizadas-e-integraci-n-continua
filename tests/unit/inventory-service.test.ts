import { beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../../src/application/inventory-service.js";
import {
  DomainValidationError,
  ProductAlreadyExistsError,
  ProductNotFoundError,
} from "../../src/domain/errors.js";
import { InMemoryProductRepository } from "../helpers/in-memory-product-repository.js";

describe("InventoryService (pruebas unitarias sin PostgreSQL)", () => {
  let repository: InMemoryProductRepository;
  let service: InventoryService;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    service = new InventoryService(repository);
  });

  it("registra un producto válido y normaliza su SKU", async () => {
    // Arrange
    const input = { sku: " lap-001 ", name: "Laptop", quantity: 8, reorderLevel: 2 };

    // Act
    const result = await service.register(input);

    // Assert
    expect(result).toMatchObject({ sku: "LAP-001", name: "Laptop", quantity: 8 });
    expect(await repository.findBySku("LAP-001")).toEqual(result);
  });

  it("acepta los límites de cantidad cero y nivel de reposición 10000", async () => {
    // Arrange
    const boundaryInput = {
      sku: "LIM-001",
      name: "Producto límite",
      quantity: 0,
      reorderLevel: 10_000,
    };

    // Act
    const result = await service.register(boundaryInput);

    // Assert
    expect(result.quantity).toBe(0);
    expect(result.reorderLevel).toBe(10_000);
  });

  it("rechaza un SKU con formato inválido", async () => {
    // Arrange
    const invalidInput = { sku: "??", name: "Teclado", quantity: 4, reorderLevel: 1 };

    // Act
    const action = service.register(invalidInput);

    // Assert
    await expect(action).rejects.toThrow(DomainValidationError);
  });

  it("rechaza un SKU duplicado", async () => {
    // Arrange
    const input = { sku: "MON-001", name: "Monitor", quantity: 5, reorderLevel: 1 };
    await service.register(input);

    // Act
    const action = service.register({ ...input, name: "Otro monitor" });

    // Assert
    await expect(action).rejects.toThrow(ProductAlreadyExistsError);
  });

  it("permite retirar exactamente todas las existencias", async () => {
    // Arrange
    await service.register({ sku: "MOU-001", name: "Mouse", quantity: 10, reorderLevel: 2 });

    // Act
    const result = await service.adjustStock("MOU-001", -10);

    // Assert
    expect(result.quantity).toBe(0);
  });

  it("rechaza un retiro que dejaría existencias negativas", async () => {
    // Arrange
    await service.register({ sku: "KEY-001", name: "Teclado", quantity: 3, reorderLevel: 1 });

    // Act
    const action = service.adjustStock("KEY-001", -4);

    // Assert
    await expect(action).rejects.toThrow("existencias negativas");
    expect((await service.getBySku("KEY-001")).quantity).toBe(3);
  });

  it("rechaza ajustes de más de 1000 unidades", async () => {
    // Arrange
    await service.register({ sku: "CAB-001", name: "Cable", quantity: 1, reorderLevel: 0 });

    // Act
    const action = service.adjustStock("CAB-001", 1_001);

    // Assert
    await expect(action).rejects.toThrow("1000 unidades");
  });

  it("informa cuando se consulta un producto inexistente", async () => {
    // Arrange
    const unknownSku = "NO-EXISTE";

    // Act
    const action = service.getBySku(unknownSku);

    // Assert
    await expect(action).rejects.toThrow(ProductNotFoundError);
  });
});
