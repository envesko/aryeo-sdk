/**
 * Aryeo SDK for TypeScript.
 *
 * The generated surface is the API as it was measured to behave, not as it is
 * documented. Where the two disagree, the manifest in this repository records
 * the measurement that settled it.
 */
export { AryeoClient, createClient } from "./generated/client.v1.js";
export { AryeoCore } from "./core.js";
export type { ClientOptions, Result, ResultMeta } from "./core.js";
export type { TransportOptions } from "./transport.js";
export {
  AryeoError,
  AryeoHttpError,
  AryeoDeletedUpstreamError,
  AryeoUnavailableOperationError,
  AryeoConfirmationError,
  AryeoIgnoredFilterError,
} from "./errors.js";
export { OPERATIONS, BASE_URL } from "./generated/operations.v1.js";
export type { OperationId, OperationDescriptor, FilterDescriptor } from "./generated/operations.v1.js";
export type * as Params from "./generated/types.v1.js";
