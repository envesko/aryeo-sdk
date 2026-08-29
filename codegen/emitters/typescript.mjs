/**
 * TypeScript emitter.
 *
 * Turns the manifest into two generated files: a runtime descriptor table the
 * client drives itself from, and the types a caller sees.
 *
 * The rules that shape the output, all of them consequences of how the API
 * actually behaves:
 *
 *   honoured   becomes an ordinary typed parameter and is sent upstream.
 *   ignored    is NEVER sent. The API would accept it and return everything,
 *              which is the failure this whole project exists to prevent. A
 *              client-side one becomes a parameter the runtime applies itself
 *              and reports; an unsupported one is not emitted at all, and the
 *              descriptor keeps it so the runtime can reject it by name with
 *              something better than "unknown option".
 *   rejected   is not emitted. The API refuses it outright.
 *
 * Includes and sorts become string unions from the allowlist, so a wrong one
 * fails in the editor rather than as a 400 at runtime. An endpoint that does
 * not validate includes gets no include parameter, because its real
 * expansions cannot be discovered and offering a free-text field would invite
 * a guess.
 *
 * Operations that are absent, unauthorised or unverified emit no method. An
 * unverified mutating operation is described in the descriptor and marked, so
 * the surface is documented without being callable by accident.
 */

export const name = "typescript";
export const outDir = "packages/client-ts/src/generated";

const HEADER = `// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate
`;

/** orders.list -> OrdersList, orders.paymentInfo.get -> OrdersPaymentInfoGet */
function pascal(operationId) {
  return operationId
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** A TS string-literal union, or never when the list is empty. */
function union(values) {
  if (!values || values.length === 0) return "never";
  return values.map((v) => JSON.stringify(v)).join(" | ");
}

const TS_TYPE = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  uuid: "string",
  date: "string",
  datetime: "string",
  money: "number",
  array: "string[]",
  object: "Record<string, unknown>",
};

function filterType(filter) {
  if (filter.enum && filter.enum.length > 0) return union(filter.enum);
  return TS_TYPE[filter.type] ?? "string";
}

/** Filters a caller may pass: honoured, plus the ones we apply ourselves. */
function callableFilters(op) {
  return Object.entries(op.filters ?? {}).filter(
    ([, f]) => f.state === "honoured" || (f.state === "ignored" && f.strategy === "client-side"),
  );
}

function docFor(op, id) {
  const lines = [];
  if (op.summary) lines.push(op.summary);
  const availability = op.availability?.state;
  if (availability && availability !== "available") {
    lines.push("");
    lines.push(`@remarks Availability: ${availability}.${op.availability.note ? " " + op.availability.note : ""}`);
  }
  for (const quirk of op.quirks ?? []) {
    lines.push("");
    lines.push(quirk);
  }
  // Tell the caller about the parameters that exist upstream and do nothing,
  // because otherwise they will find them in Aryeo's docs and wonder.
  const dead = Object.entries(op.filters ?? {}).filter(
    ([, f]) => (f.state === "ignored" && f.strategy !== "client-side") || f.state === "rejected",
  );
  for (const [fname, f] of dead) {
    const advice = f.useInstead ? ` Use ${f.useInstead} instead.` : "";
    const how = f.state === "rejected" ? `is rejected${f.http ? ` with a ${f.http}` : ""}` : "is accepted and ignored, returning everything";
    lines.push("");
    lines.push(`@remarks ${fname} ${how}, so it is not offered here.${advice}`);
  }
  if (lines.length === 0) return "";
  return `/**\n${lines.map((l) => (l ? ` * ${l}` : " *")).join("\n")}\n */\n`;
}

function emitTypes(manifest) {
  const out = [HEADER];
  out.push(`export type Generation = ${JSON.stringify(manifest.generation)};\n`);

  for (const [id, op] of Object.entries(manifest.operations)) {
    if (op.availability?.state !== "available") continue;
    const T = pascal(id);

    if (op.includes && op.includes.length > 0) {
      out.push(`export type ${T}Include = ${union(op.includes)};\n`);
    }
    if (op.sorts && op.sorts.length > 0) {
      out.push(`export type ${T}Sort = ${union(op.sorts)};\n`);
    }

    const fields = [];
    for (const [pname, p] of Object.entries(op.pathParams ?? {})) {
      fields.push(`  ${pname}: ${TS_TYPE[p.type] ?? "string"};`);
    }
    for (const [fname, f] of callableFilters(op)) {
      const optional = "?";
      const clientSide = f.state === "ignored" ? "  /** Applied by the client; the API does not filter on this. */\n" : "";
      fields.push(`${clientSide}  ${fname}${optional}: ${filterType(f)};`);
    }
    for (const [pname, p] of Object.entries(op.params ?? {})) {
      fields.push(`  ${pname}${p.required ? "" : "?"}: ${p.enum ? union(p.enum) : TS_TYPE[p.type] ?? "string"};`);
    }
    for (const [bname, b] of Object.entries(op.body ?? {})) {
      fields.push(`  ${bname}${b.required ? "" : "?"}: ${b.enum ? union(b.enum) : TS_TYPE[b.type] ?? "string"};`);
    }
    if (op.includes && op.includes.length > 0) fields.push(`  include?: ${T}Include[];`);
    if (op.sorts && op.sorts.length > 0) fields.push(`  sort?: ${T}Sort;`);
    if (op.paginated) {
      fields.push("  page?: number;");
      fields.push(`  perPage?: number;`);
    }
    if (op.mutates && op.confirmation) {
      fields.push(
        `  /** Echo the target's ${op.confirmation.field} to confirm. ${op.confirmation.warns ?? ""} */\n  confirm: string;`,
      );
    }

    out.push(`${docFor(op, id)}export interface ${T}Params {\n${fields.join("\n")}\n}\n`);
  }

  return out.join("\n");
}

function emitOperations(manifest) {
  const entries = [];

  for (const [id, op] of Object.entries(manifest.operations)) {
    const filters = {};
    for (const [fname, f] of Object.entries(op.filters ?? {})) {
      filters[fname] = {
        state: f.state,
        ...(f.wire ? { wire: f.wire } : {}),
        ...(f.arrayForm ? { arrayForm: f.arrayForm } : {}),
        ...(f.strategy ? { strategy: f.strategy } : {}),
        ...(f.useInstead ? { useInstead: f.useInstead } : {}),
      };
    }

    entries.push(
      `  ${JSON.stringify(id)}: ${JSON.stringify(
        {
          path: op.path,
          method: op.method,
          availability: op.availability?.state,
          ...(op.mutates ? { mutates: true, confirmField: op.confirmation?.field } : {}),
          ...(op.exercisedHere === false ? { exercisedHere: false } : {}),
          ...(op.paginated ? { paginated: true } : {}),
          ...(op.perPageMax ? { perPageMax: op.perPageMax } : {}),
          ...(Object.keys(filters).length > 0 ? { filters } : {}),
          ...(op.params ? { params: Object.keys(op.params) } : {}),
          ...(op.body ? { body: Object.keys(op.body) } : {}),
          ...(op.includes ? { includes: op.includes } : {}),
          ...(op.includesUnvalidated ? { includesUnvalidated: true } : {}),
          ...(op.sorts ? { sorts: op.sorts } : {}),
        },
        null,
        2,
      )
        .split("\n")
        .join("\n  ")},`,
    );
  }

  return `${HEADER}
export interface FilterDescriptor {
  state: "honoured" | "ignored" | "rejected" | "unverified";
  wire?: string;
  arrayForm?: "indexed" | "repeated" | "csv";
  strategy?: "client-side" | "unsupported";
  useInstead?: string;
}

export interface OperationDescriptor {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  availability: "available" | "unauthorised" | "absent" | "unverified";
  mutates?: boolean;
  confirmField?: string;
  /** False when the contract comes from production usage rather than a request fired here. */
  exercisedHere?: boolean;
  paginated?: boolean;
  perPageMax?: number;
  filters?: Record<string, FilterDescriptor>;
  params?: string[];
  body?: string[];
  includes?: string[];
  includesUnvalidated?: boolean;
  sorts?: string[];
}

export const BASE_URL = ${JSON.stringify(manifest.baseUrl)};
export const PER_PAGE_MAX = ${manifest.defaults?.perPageMax ?? 100};

/**
 * Every operation the manifest describes, including the ones that are not
 * callable. Keeping the unavailable ones here is deliberate: the runtime can
 * then explain why something is missing instead of failing as an unknown name.
 */
export const OPERATIONS = {
${entries.join("\n")}
} as const satisfies Record<string, OperationDescriptor>;

export type OperationId = keyof typeof OPERATIONS;
`;
}


/**
 * The typed facade: a nested object per operation namespace, so a caller
 * writes aryeo.orders.list(...) with full types, while every call is still
 * driven by the descriptor table underneath.
 *
 * Only available operations get a method. The others stay reachable through
 * core.call(), which explains why they cannot be used.
 */
function emitClient(manifest) {
  const available = Object.entries(manifest.operations).filter(
    ([, op]) => op.availability?.state === "available",
  );

  // Build a tree from the dotted ids: orders.paymentInfo.get nests two deep.
  const tree = {};
  for (const [id] of available) {
    const parts = id.split(".");
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      node[part] = node[part] ?? {};
      node = node[part];
    }
    node[parts[parts.length - 1]] = id;
  }

  function render(node, indent, top) {
    const pad = "  ".repeat(indent);
    const lines = [];
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string") {
        const T = pascal(value);
        const op = manifest.operations[value];
        const hasParams =
          Object.keys(op.pathParams ?? {}).length > 0 ||
          callableFilters(op).length > 0 ||
          Object.keys(op.params ?? {}).length > 0 ||
          Object.keys(op.body ?? {}).length > 0 ||
          (op.includes && op.includes.length > 0) ||
          op.paginated ||
          op.mutates;
        const sig = hasParams ? `params: T.${T}Params` : "";
        const arg = hasParams ? ", params" : "";
        const call = `(${sig}): Promise<Result<unknown>> =>\n${pad}  this.#core.call(${JSON.stringify(value)}${arg})`;
        // A class field is an assignment terminated by a semicolon. A nested
        // object property is a colon terminated by a comma. Getting this wrong
        // produces a file that looks right and does not parse.
        lines.push(top ? `${pad}readonly ${key} = ${call};` : `${pad}${key}: ${call},`);
      } else {
        lines.push(top ? `${pad}readonly ${key} = {` : `${pad}${key}: {`);
        lines.push(render(value, indent + 1, false));
        lines.push(top ? `${pad}};` : `${pad}},`);
      }
    }
    return lines.join("\n");
  }

  return `${HEADER}
import { AryeoCore, type ClientOptions, type Result } from "../core.js";
import type * as T from "./types.${manifest.generation}.js";

/**
 * Aryeo client for API generation ${manifest.generation}.
 *
 * Every method here is generated from the manifest, so the surface cannot
 * drift from what the API was measured to do.
 */
export class AryeoClient {
  readonly #core: AryeoCore;

  constructor(options: ClientOptions) {
    this.#core = new AryeoCore(options);
  }

  /** Escape hatch for an operation with no generated method. */
  get core(): AryeoCore {
    return this.#core;
  }

${render(tree, 1, true)}
}

export function createClient(options: ClientOptions): AryeoClient {
  return new AryeoClient(options);
}
`;
}

export async function emit(manifest) {
  const files = new Map();
  const suffix = manifest.generation;
  files.set(`operations.${suffix}.ts`, emitOperations(manifest));
  files.set(`types.${suffix}.ts`, emitTypes(manifest));
  files.set(`client.${suffix}.ts`, emitClient(manifest));
  return files;
}
