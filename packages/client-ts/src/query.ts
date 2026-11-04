/**
 * Turning caller parameters into the query string Aryeo actually honours.
 *
 * Three rules, each of which was a bug before it was a rule:
 *
 *   Filters are bracketed. A flat `search=` is accepted and ignored.
 *   Filter enum values are lowercase, while response values are uppercase.
 *   List filters use indexed brackets, `filter[user_ids][0]`. The singular
 *   spelling of several of them is one of the ignored ones.
 *
 * And the exception that matters: ISO timestamps keep their case. Lowercasing
 * an enum is right; lowercasing `2026-08-01T00:00:00Z` into
 * `2026-08-01t00:00:00z` is a corrupted window.
 */
import type { FilterDescriptor, OperationDescriptor } from "./generated/operations.v1.js";
import { AryeoIgnoredFilterError } from "./errors.js";

const ISO_DATE_LIKE = /^\d{4}-\d{2}-\d{2}([T ]|$)/;
const RESERVED = new Set(["include", "sort", "page", "perPage", "confirm"]);
const MISSING_PATH_VALUES = new Set<unknown>([undefined, null, ""]);

/** Lowercase an enum value, but never a date or timestamp. */
export function filterValue(value: string | number | boolean): string {
  if (typeof value !== "string") return String(value);
  if (ISO_DATE_LIKE.test(value)) return value;
  return value.toLowerCase();
}

export interface BuiltQuery {
  query: Record<string, string>;
  /** Parameters the API will not apply, to be handled after the response. */
  clientSide: Array<{ name: string; value: unknown; descriptor: FilterDescriptor }>;
}

interface QueryContext extends BuiltQuery {
  operationId: string;
  descriptor: OperationDescriptor;
}

export function buildQuery(
  operationId: string,
  descriptor: OperationDescriptor,
  params: Record<string, unknown>,
): BuiltQuery {
  const context: QueryContext = { operationId, descriptor, query: {}, clientSide: [] };
  for (const [name, value] of Object.entries(params)) {
    if (value == null) continue;
    if (RESERVED.has(name)) continue;
    addParameter(context, name, value);
  }
  addQueryOptions(context, params);
  return { query: context.query, clientSide: context.clientSide };
}

function addParameter(context: QueryContext, name: string, value: unknown): void {
  const filter = context.descriptor.filters?.[name];
  if (filter) {
    addFilter(context, { name, value, descriptor: filter });
    return;
  }
  if (context.descriptor.params?.includes(name)) context.query[name] = String(value);
}

function addFilter(context: QueryContext, filter: BuiltQuery["clientSide"][number]): void {
  const descriptor = filter.descriptor;
  if (descriptor.state === "rejected") rejectFilter(context, filter);
  if (descriptor.state === "ignored") {
    if (descriptor.strategy !== "client-side") rejectFilter(context, filter);
    context.clientSide.push(filter);
    return;
  }
  if (descriptor.wire) writeFilter(context.query, descriptor.wire, descriptor.arrayForm, filter.value);
}

function rejectFilter(context: QueryContext, filter: BuiltQuery["clientSide"][number]): never {
  throw new AryeoIgnoredFilterError(context.operationId, filter.name, filter.descriptor.useInstead);
}

function writeFilter(query: Record<string, string>, wire: string, arrayForm: FilterDescriptor["arrayForm"], value: unknown): void {
  if (!Array.isArray(value)) {
    query[wire] = filterValue(value as string);
    return;
  }
  const values = value.map((item) => filterValue(item as string));
  if (arrayForm === "csv") {
    query[wire] = values.join(",");
    return;
  }
  // Flat query records cannot retain repeated keys; use indexed brackets.
  values.forEach((item, index) => { query[`${wire}[${index}]`] = item; });
}

function addQueryOptions(context: QueryContext, params: Record<string, unknown>): void {
  const query = context.query;
  if (Array.isArray(params["include"])) {
    if (params["include"].length > 0) query["include"] = params["include"].join(",");
  }
  if (typeof params["sort"] === "string") query["sort"] = params["sort"];
  if (typeof params["page"] === "number") query["page"] = String(params["page"]);
  if (typeof params["perPage"] === "number") {
    query["per_page"] = String(Math.min(params["perPage"], context.descriptor.perPageMax ?? 100));
  }
}

/** Fill {braces} in a path template, encoding each value. */
export function buildPath(
  template: string,
  params: Record<string, unknown>,
): { path: string; used: Set<string> } {
  const used = new Set<string>();
  const path = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (MISSING_PATH_VALUES.has(value)) {
      throw new Error(`Missing path parameter ${key} for ${template}`);
    }
    used.add(key);
    return encodeURIComponent(String(value));
  });
  return { path, used };
}
