import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import type { InventoryService } from "../application/inventory-service.js";
import {
  DomainValidationError,
  ProductAlreadyExistsError,
  ProductNotFoundError,
} from "../domain/errors.js";

export function createApi(service: InventoryService): Server {
  return createServer(async (request, response) => {
    try {
      await route(request, response, service);
    } catch (error) {
      handleError(response, error);
    }
  });
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  service: InventoryService,
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://localhost");

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (method === "GET" && url.pathname === "/products") {
    sendJson(response, 200, { products: await service.list() });
    return;
  }

  if (method === "POST" && url.pathname === "/products") {
    const body = await readJson(request);
    const product = await service.register({
      sku: requireString(body, "sku"),
      name: requireString(body, "name"),
      quantity: requireNumber(body, "quantity"),
      reorderLevel: requireNumber(body, "reorderLevel"),
    });
    sendJson(response, 201, product);
    return;
  }

  const adjustmentMatch = url.pathname.match(/^\/products\/([^/]+)\/stock-adjustments$/);
  if (method === "POST" && adjustmentMatch?.[1]) {
    const body = await readJson(request);
    const product = await service.adjustStock(
      decodeURIComponent(adjustmentMatch[1]),
      requireNumber(body, "adjustment"),
    );
    sendJson(response, 200, product);
    return;
  }

  const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
  if (method === "GET" && productMatch?.[1]) {
    sendJson(response, 200, await service.getBySku(decodeURIComponent(productMatch[1])));
    return;
  }

  sendJson(response, 404, { error: "Ruta no encontrada." });
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new DomainValidationError("El cuerpo de la solicitud es demasiado grande.");
    }
    chunks.push(buffer);
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new DomainValidationError("El cuerpo debe ser un objeto JSON válido.");
  }
}

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw new DomainValidationError(`El campo ${field} debe ser texto.`);
  }
  return value;
}

function requireNumber(body: Record<string, unknown>, field: string): number {
  const value = body[field];
  if (typeof value !== "number") {
    throw new DomainValidationError(`El campo ${field} debe ser numérico.`);
  }
  return value;
}

function handleError(response: ServerResponse, error: unknown): void {
  if (error instanceof DomainValidationError) {
    sendJson(response, 400, { error: error.message });
  } else if (error instanceof ProductNotFoundError) {
    sendJson(response, 404, { error: error.message });
  } else if (error instanceof ProductAlreadyExistsError) {
    sendJson(response, 409, { error: error.message });
  } else {
    console.error(error);
    sendJson(response, 500, { error: "Error interno del servidor." });
  }
}

function sendJson(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(data, null, 2));
}
