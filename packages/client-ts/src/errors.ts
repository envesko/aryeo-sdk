/**
 * Errors the client raises.
 *
 * The distinctions here are not decoration. Each one exists because callers
 * were observed doing the wrong thing when the failure arrived as a generic
 * HTTP error: retrying something that will never succeed, or treating an
 * unfiltered collection as a filtered one.
 */

export class AryeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A non-success response from the API. */
export class AryeoHttpError extends AryeoError {
  readonly status: number;
  readonly body: string;
  readonly path: string;
  /** Field errors, when the API returned its `data` map of them. */
  readonly fields: Record<string, string[]> | undefined;

  constructor(args: {
    status: number;
    body: string;
    path: string;
    fields?: Record<string, string[]>;
  }) {
    super(`Aryeo ${args.status} on ${args.path}: ${summarise(args.body, args.fields)}`);
    this.status = args.status;
    this.body = args.body;
    this.path = args.path;
    this.fields = args.fields;
  }

  /**
   * Whether retrying could plausibly help. True only when the API is talking
   * about its own problems. A 404 is never retryable: a record deleted
   * upstream returns one forever, and a checker that retried them in a loop is
   * how this rule was learned.
   */
  get retryable(): boolean {
    return this.status === 429 || (this.status >= 500 && this.status < 600);
  }
}

/**
 * A record that was known to exist and no longer does. Callers should
 * reconcile their own copy rather than retry.
 */
export class AryeoDeletedUpstreamError extends AryeoError {
  readonly path: string;
  constructor(path: string) {
    super(
      `The record at ${path} no longer exists upstream. It was deleted in Aryeo. ` +
        `Reconcile your local copy; retrying will return 404 forever.`,
    );
    this.path = path;
  }
}

/** An operation the manifest records as not usable on this generation. */
export class AryeoUnavailableOperationError extends AryeoError {
  constructor(operationId: string, state: string, note?: string, alternative?: string) {
    const why =
      state === "absent"
        ? "does not exist on this API"
        : state === "unauthorised"
          ? "is refused for a standard API key"
          : "has not been verified and is not callable";
    super(
      `${operationId} ${why}.${note ? ` ${note}` : ""}` +
        (alternative ? ` Use ${alternative} instead.` : ""),
    );
  }
}

/**
 * A mutating call that did not carry its confirmation, or carried the wrong
 * one. The value has to be read off the target record, which means the caller
 * has to have fetched it.
 */
export class AryeoConfirmationError extends AryeoError {
  constructor(operationId: string, field: string, warns?: string) {
    super(
      `${operationId} changes data in Aryeo and needs confirmation. ` +
        `Pass confirm set to the target's ${field}.` +
        (warns ? ` ${warns}` : ""),
    );
  }
}

/**
 * A parameter the API accepts and then ignores, returning everything. Raised
 * rather than silently dropped, because a caller who passes one believes their
 * result is narrowed.
 */
export class AryeoIgnoredFilterError extends AryeoError {
  constructor(operationId: string, filter: string, useInstead?: string) {
    super(
      `${filter} is not supported on ${operationId}. Aryeo accepts it and returns the ` +
        `complete unfiltered collection, so passing it would give you results that look ` +
        `filtered and are not.` + (useInstead ? ` Use ${useInstead} instead.` : ""),
    );
  }
}

function summarise(body: string, fields?: Record<string, string[]>): string {
  if (fields) {
    const parts = Object.entries(fields).map(([k, v]) => `${k}: ${v.join(" ")}`);
    if (parts.length > 0) return parts.join("; ");
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) return "no response body";
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}...` : trimmed;
}
