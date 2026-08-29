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

export function buildQuery(
  operationId: string,
  descriptor: OperationDescriptor,
  params: Record<string, unknown>,
): BuiltQuery {
  const query: Record<string, string> = {};
  const clientSide: BuiltQuery["clientSide"] = [];
  const filters = (descriptor.filters ?? {}) as Record<string, FilterDescriptor>;

  for (const [name, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    if (name === "include" || name === "sort" || name === "page" || name === "perPage") continue;
    if (name === "confirm") continue;

    const filter = filters[name];

    if (filter) {
      if (filter.state === "rejected") {
        throw new AryeoIgnoredFilterError(operationId, name, filter.useInstead);
      }
      if (filter.state === "ignored") {
        // Never send it. The API would take it and return everything.
        if (filter.strategy === "client-side") {
          clientSide.push({ name, value: raw, descriptor: filter });
          continue;
        }
        throw new AryeoIgnoredFilterError(operationId, name, filter.useInstead);
      }
      if (!filter.wire) continue;

      if (Array.isArray(raw)) {
        if (filter.arrayForm === "csv") {
          query[filter.wire] = raw.map((v) => filterValue(v as string)).join(",");
        } else if (filter.arrayForm === "repeated") {
          // A repeated key cannot be expressed in a flat record; the transport
          // sets each in turn, so the last would win. Indexed is used instead,
          // which every list filter measured so far accepts.
          raw.forEach((v, i) => {
            query[`${filter.wire}[${i}]`] = filterValue(v as string);
          });
        } else {
          raw.forEach((v, i) => {
            query[`${filter.wire}[${i}]`] = filterValue(v as string);
          });
        }
      } else {
        query[filter.wire] = filterValue(raw as string);
      }
      continue;
    }

    // Not a filter: a plain query parameter such as timezone or interval.
    if (descriptor.params?.includes(name)) {
      query[name] = String(raw);
    }
  }

  if (Array.isArray(params["include"]) && params["include"].length > 0) {
    query["include"] = (params["include"] as string[]).join(",");
  }
  if (typeof params["sort"] === "string") query["sort"] = params["sort"];
  if (typeof params["page"] === "number") query["page"] = String(params["page"]);
  if (typeof params["perPage"] === "number") {
    const max = descriptor.perPageMax ?? 100;
    // Asking for more is accepted and silently capped, so promising the
    // caller a larger page would be a lie the API tells quietly.
    query["per_page"] = String(Math.min(params["perPage"], max));
  }

  return { query, clientSide };
}

/** Fill {braces} in a path template, encoding each value. */
export function buildPath(
  template: string,
  params: Record<string, unknown>,
): { path: string; used: Set<string> } {
  const used = new Set<string>();
  const path = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter ${key} for ${template}`);
    }
    used.add(key);
    return encodeURIComponent(String(value));
  });
  return { path, used };
}
