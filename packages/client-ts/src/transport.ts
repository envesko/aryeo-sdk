/**
 * The one place a request is made and the one place a credential exists.
 *
 * Redaction lives here rather than at each call site on purpose. A generic
 * error handler that logged a whole failing request, headers included, is how
 * a live API key reached a log table in the codebase this SDK came from. If
 * the token never leaves this module, no call site can leak it.
 */
import { AryeoDeletedUpstreamError, AryeoHttpError } from "./errors.js";

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  /** Defaults to globalThis.fetch. Injectable for tests and odd runtimes. */
  fetch?: typeof globalThis.fetch;
  /** Total attempts for a retryable failure, including the first. Default 4. */
  maxAttempts?: number;
  /** First backoff step in milliseconds, doubled each attempt. Default 500. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  /** Called with already-redacted detail. Never receives the token. */
  onRetry?: (info: { attempt: number; delayMs: number; status?: number; path: string }) => void;
}

export interface RequestSpec {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /** Set when the caller knows the record existed, so a 404 means deleted. */
  expectExisting?: boolean;
}

const RETRYABLE_NETWORK = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"]);

export class Transport {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #maxAttempts: number;
  readonly #baseDelayMs: number;
  readonly #maxDelayMs: number;
  readonly #timeoutMs: number;
  readonly #onRetry: TransportOptions["onRetry"];

  constructor(options: TransportOptions) {
    if (!options.apiKey) throw new Error("An Aryeo API key is required.");
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#maxAttempts = options.maxAttempts ?? 4;
    this.#baseDelayMs = options.baseDelayMs ?? 500;
    this.#maxDelayMs = options.maxDelayMs ?? 8000;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
    this.#onRetry = options.onRetry;
  }

  async request<T>(spec: RequestSpec): Promise<T> {
    const url = this.#url(spec);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.#maxAttempts; attempt++) {
      try {
        const response = await this.#send(url, spec);
        const text = await response.text();

        if (response.ok) {
          return (text.length > 0 ? JSON.parse(text) : {}) as T;
        }

        // A record known to have existed and now 404ing was deleted upstream.
        // That is a reconciliation problem, not a transient failure.
        if (response.status === 404 && spec.expectExisting) {
          throw new AryeoDeletedUpstreamError(spec.path);
        }

        const error = new AryeoHttpError({
          status: response.status,
          body: text,
          path: spec.path,
          ...(fieldErrors(text) ? { fields: fieldErrors(text)! } : {}),
        });

        if (!error.retryable || attempt === this.#maxAttempts) throw error;
        lastError = error;
        await this.#backoff(attempt, response, spec.path, response.status);
        continue;
      } catch (err) {
        if (err instanceof AryeoDeletedUpstreamError) throw err;
        if (err instanceof AryeoHttpError && !err.retryable) throw err;
        if (attempt === this.#maxAttempts) throw err;
        if (!(err instanceof AryeoHttpError) && !isRetryableNetworkError(err)) throw err;
        lastError = err;
        await this.#backoff(attempt, undefined, spec.path);
      }
    }

    throw lastError;
  }

  #url(spec: RequestSpec): string {
    const url = new URL(this.#baseUrl + spec.path);
    for (const [key, value] of Object.entries(spec.query ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  async #send(url: string, spec: RequestSpec): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.#apiKey}`,
        Accept: "application/json",
      };
      if (spec.body !== undefined) headers["Content-Type"] = "application/json";

      return await this.#fetch(url, {
        method: spec.method,
        headers,
        ...(spec.body !== undefined ? { body: JSON.stringify(spec.body) } : {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async #backoff(attempt: number, response?: Response, path = "", status?: number): Promise<void> {
    const retryAfter = response?.headers.get("retry-after");
    const fromHeader = retryAfter ? Number(retryAfter) * 1000 : Number.NaN;
    const delayMs = Number.isFinite(fromHeader)
      ? Math.min(fromHeader, this.#maxDelayMs)
      : Math.min(this.#baseDelayMs * 2 ** (attempt - 1), this.#maxDelayMs);

    this.#onRetry?.({ attempt, delayMs, path, ...(status !== undefined ? { status } : {}) });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Aryeo puts validation detail under `data` as {field: [message]}, with no
 * top-level message. Without pulling it out, every 422 reads as an
 * unexplained "unprocessable entity".
 */
function fieldErrors(body: string): Record<string, string[]> | undefined {
  try {
    const parsed = JSON.parse(body) as { data?: unknown };
    if (typeof parsed.data !== "object" || parsed.data === null || Array.isArray(parsed.data)) {
      return undefined;
    }
    const out: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(parsed.data as Record<string, unknown>)) {
      const list = (Array.isArray(messages) ? messages : [messages]).filter(
        (m): m is string => typeof m === "string",
      );
      if (list.length > 0) out[field] = list;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

function isRetryableNetworkError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  const name = (err as { name?: unknown }).name;
  return (typeof code === "string" && RETRYABLE_NETWORK.has(code)) || name === "AbortError";
}
