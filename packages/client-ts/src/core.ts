/**
 * The client core. Drives every call from the generated descriptor table, so
 * adding an operation to the manifest is all it takes to make it callable.
 */
import {
  AryeoConfirmationError,
  AryeoUnavailableOperationError,
} from "./errors.js";
import { buildPath, buildQuery } from "./query.js";
import { Transport, type TransportOptions } from "./transport.js";
import {
  BASE_URL,
  OPERATIONS,
  type OperationDescriptor,
  type OperationId,
} from "./generated/operations.v1.js";

export interface ClientOptions extends Omit<TransportOptions, "baseUrl"> {
  baseUrl?: string;
  /**
   * How many pages a client-side filter may walk. The API ignores a handful of
   * filters, and those are applied here instead; this bounds that work.
   */
  scanMaxPages?: number;
}

/** What the client did, stated plainly enough to act on. */
export interface ResultMeta {
  /** True when every filter was applied by the API. */
  serverSideFiltered: boolean;
  appliedInClient?: string[];
  recordsScanned?: number;
  recordsMatched?: number;
  pagesScanned?: number;
  scanLimit?: number;
  /**
   * True when the scan hit its bound before exhausting the collection. The
   * result is then incomplete and must not be presented as the whole set.
   */
  truncated?: boolean;
  note?: string;
}

export interface Result<T> {
  data: T;
  meta: ResultMeta & Record<string, unknown>;
}

interface Page {
  data?: unknown[];
  meta?: { current_page?: number; last_page?: number; total?: number };
}

export class AryeoCore {
  readonly #transport: Transport;
  readonly #scanMaxPages: number;

  constructor(options: ClientOptions) {
    const { baseUrl, scanMaxPages, ...rest } = options;
    this.#transport = new Transport({ ...rest, baseUrl: baseUrl ?? BASE_URL });
    this.#scanMaxPages = scanMaxPages ?? 20;
  }

  descriptorFor(operationId: OperationId): OperationDescriptor {
    return OPERATIONS[operationId] as OperationDescriptor;
  }

  /**
   * `params` is a plain object rather than a Record because the generated
   * parameter types are interfaces, which have no index signature. Narrowing
   * once here beats a cast at every generated call site.
   */
  async call<T = unknown>(
    operationId: OperationId,
    paramsIn: object = {},
  ): Promise<Result<T>> {
    const params = paramsIn as Record<string, unknown>;
    const descriptor = this.descriptorFor(operationId);

    if (descriptor.availability !== "available") {
      throw new AryeoUnavailableOperationError(operationId, descriptor.availability);
    }

    if (descriptor.mutates) {
      const field = descriptor.confirmField ?? "identifier";
      if (typeof params["confirm"] !== "string" || params["confirm"].length === 0) {
        throw new AryeoConfirmationError(operationId, field);
      }
    }

    const { path, used } = buildPath(descriptor.path, params);
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (!used.has(key)) rest[key] = value;
    }

    const { query, clientSide } = buildQuery(operationId, descriptor, rest);

    // A body-bearing method sends whatever the descriptor names as body.
    let body: Record<string, unknown> | undefined;
    if (descriptor.method !== "GET" && descriptor.body) {
      body = {};
      for (const key of descriptor.body) {
        if (rest[key] !== undefined) body[key] = rest[key];
      }
    }

    if (clientSide.length === 0) {
      const response = await this.#transport.request<T>({
        method: descriptor.method,
        path,
        query,
        ...(body ? { body } : {}),
        ...(used.size > 0 && descriptor.method === "GET" ? { expectExisting: true } : {}),
      });
      return {
        data: response,
        meta: { serverSideFiltered: true },
      };
    }

    return this.#scan<T>(operationId, descriptor, path, query, clientSide);
  }

  /**
   * Walk pages applying the filters the API will not, and say exactly what was
   * covered. The alternative, returning an unfiltered page as though it were
   * filtered, is the failure this whole SDK exists to prevent.
   */
  async #scan<T>(
    operationId: string,
    descriptor: OperationDescriptor,
    path: string,
    query: Record<string, string>,
    clientSide: Array<{ name: string; value: unknown }>,
  ): Promise<Result<T>> {
    const perPage = descriptor.perPageMax ?? 100;
    const matched: unknown[] = [];
    let scanned = 0;
    let pages = 0;
    let lastPage = 1;

    for (let page = 1; page <= this.#scanMaxPages; page++) {
      const response = await this.#transport.request<Page>({
        method: "GET",
        path,
        query: { ...query, page: String(page), per_page: String(perPage) },
      });

      const items = response?.data ?? [];
      scanned += items.length;
      pages = page;
      lastPage = response?.meta?.last_page ?? page;

      for (const item of items) {
        if (clientSide.every((f) => matches(item, f.name, f.value))) matched.push(item);
      }

      if (page >= lastPage || items.length === 0) break;
    }

    const truncated = lastPage > pages;
    const names = clientSide.map((f) => f.name);

    return {
      data: matched as T,
      meta: {
        serverSideFiltered: false,
        appliedInClient: names,
        recordsScanned: scanned,
        recordsMatched: matched.length,
        pagesScanned: pages,
        scanLimit: this.#scanMaxPages * perPage,
        truncated,
        note:
          `Aryeo does not filter ${operationId} by ${names.join(", ")}, so it was applied here ` +
          `over a bounded scan.` +
          (truncated
            ? " The scan reached its bound before the collection ended, so this result is INCOMPLETE."
            : ""),
      },
    };
  }
}

/** Compare a caller value against a record field, including nested ids. */
function matches(item: unknown, name: string, value: unknown): boolean {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;

  // listingId -> listing.id, orderId -> order.id, and so on.
  const relation = name.replace(/Id$/, "");
  if (name.endsWith("Id") && relation !== name) {
    const nested = record[toSnake(relation)];
    if (typeof nested === "object" && nested !== null) {
      return (nested as Record<string, unknown>)["id"] === value;
    }
  }

  const direct = record[toSnake(name)];
  if (typeof direct === "string" && typeof value === "string") {
    return direct.toLowerCase() === value.toLowerCase();
  }
  return direct === value;
}

function toSnake(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
