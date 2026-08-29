/**
 * MCP emitter.
 *
 * Generates the tool definitions an MCP server exposes, from the same manifest
 * the clients come from. The old hand-written server this replaces could not
 * do that: its tools drifted from the API because somebody had to remember to
 * update them, and several advertised parameters that did nothing.
 *
 * The tool description is where an agent learns the things that would
 * otherwise cost it a wasted call: which relationship names are valid, which
 * parameters the API accepts and ignores, and what a write will do before it
 * does it. Those come out of the manifest rather than being written by hand.
 */

export const name = "mcp";
export const outDir = "packages/mcp-worker/src/generated";

const HEADER = `// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate
`;

const JSON_TYPE = {
  string: "string",
  integer: "integer",
  number: "number",
  boolean: "boolean",
  uuid: "string",
  date: "string",
  datetime: "string",
  money: "integer",
  array: "array",
  object: "object",
};

/** orders.list -> orders_list, which is what MCP tool names look like. */
function toolName(operationId) {
  return operationId.replace(/\./g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function schemaFor(spec, extra = {}) {
  const type = JSON_TYPE[spec.type] ?? "string";
  const out = { type, ...extra };
  if (spec.enum && spec.enum.length > 0) out.enum = spec.enum;
  if (spec.type === "uuid") out.description = trim(`${extra.description ?? ""} An Aryeo UUID.`);
  if (spec.type === "datetime") {
    out.description = trim(`${extra.description ?? ""} ISO 8601, for example 2026-08-10T00:00:00Z.`);
  }
  if (spec.type === "date") out.description = trim(`${extra.description ?? ""} YYYY-MM-DD.`);
  if (spec.type === "array") out.items = { type: "string" };
  if (spec.note) out.description = trim(`${out.description ?? ""} ${spec.note}`);
  return out;
}

const trim = (value) => value.replace(/\s+/g, " ").trim();

/**
 * The description an agent reads. Everything here saves it a request it would
 * otherwise make and get nothing useful from.
 */
function describe(id, op) {
  const parts = [];
  if (op.summary) parts.push(op.summary);

  const honoured = Object.entries(op.filters ?? {}).filter(([, f]) => f.state === "honoured");
  if (honoured.length > 0) {
    parts.push(`Filters applied by the API: ${honoured.map(([n]) => n).join(", ")}.`);
  }

  const clientSide = Object.entries(op.filters ?? {}).filter(
    ([, f]) => f.state === "ignored" && f.strategy === "client-side",
  );
  if (clientSide.length > 0) {
    parts.push(
      `${clientSide.map(([n]) => n).join(", ")} cannot be filtered by the API and is applied ` +
        `after fetching, over a bounded scan. Check meta.truncated before treating the result as complete.`,
    );
  }

  const dead = Object.entries(op.filters ?? {}).filter(
    ([, f]) => (f.state === "ignored" && f.strategy !== "client-side") || f.state === "rejected",
  );
  for (const [fname, f] of dead) {
    parts.push(
      `Do not look for ${fname}: the API accepts it and returns everything.` +
        (f.useInstead ? ` Use ${f.useInstead}.` : ""),
    );
  }

  if (op.includes && op.includes.length > 0) {
    parts.push(`Valid include values: ${op.includes.filter((i) => !/(Count|Exists)$/.test(i)).join(", ")}.`);
  } else if (op.includesUnvalidated) {
    parts.push("This endpoint does not validate include values, so none are offered.");
  }

  if (op.sorts && op.sorts.length > 0) parts.push(`Sort by: ${op.sorts.join(", ")}.`);
  if (op.paginated) parts.push(`Page size is capped at ${op.perPageMax ?? 100} by the API.`);

  for (const quirk of op.quirks ?? []) parts.push(quirk);

  if (op.mutates) {
    parts.push(
      `WRITE. ${op.confirmation?.warns ?? ""} Pass confirm set to the target's ` +
        `${op.confirmation?.field} to prove you have read the record first.`,
    );
    if (op.exercisedHere === false) {
      parts.push("This route is described from production usage and has not been exercised by the SDK authors.");
    }
  }

  return trim(parts.join(" "));
}

function inputSchema(op) {
  const properties = {};
  const required = [];

  for (const [pname, p] of Object.entries(op.pathParams ?? {})) {
    properties[pname] = schemaFor(p);
    required.push(pname);
  }
  for (const [fname, f] of Object.entries(op.filters ?? {})) {
    if (f.state === "honoured" || (f.state === "ignored" && f.strategy === "client-side")) {
      properties[fname] = schemaFor(f, {
        ...(f.state === "ignored"
          ? { description: "Applied after fetching; the API cannot filter on this." }
          : {}),
      });
    }
  }
  for (const [pname, p] of Object.entries(op.params ?? {})) {
    properties[pname] = schemaFor(p);
    if (p.required) required.push(pname);
  }
  for (const [bname, b] of Object.entries(op.body ?? {})) {
    properties[bname] = schemaFor(b);
    if (b.required) required.push(bname);
  }
  if (op.includes && op.includes.length > 0) {
    properties["include"] = { type: "array", items: { type: "string", enum: op.includes } };
  }
  if (op.sorts && op.sorts.length > 0) properties["sort"] = { type: "string", enum: op.sorts };
  if (op.paginated) {
    properties["page"] = { type: "integer", minimum: 1 };
    properties["perPage"] = { type: "integer", minimum: 1, maximum: op.perPageMax ?? 100 };
  }
  if (op.mutates) {
    properties["confirm"] = {
      type: "string",
      description: `Echo the target's ${op.confirmation?.field} to confirm this write.`,
    };
    required.push("confirm");
  }

  return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
}

export async function emit(manifest) {
  const tools = [];

  for (const [id, op] of Object.entries(manifest.operations)) {
    if (op.availability?.state !== "available") continue;
    tools.push({
      name: toolName(id),
      operationId: id,
      description: describe(id, op),
      inputSchema: inputSchema(op),
      ...(op.mutates ? { mutates: true } : {}),
    });
  }

  const contents = `${HEADER}
export interface ToolDefinition {
  name: string;
  operationId: string;
  description: string;
  inputSchema: Record<string, unknown>;
  mutates?: boolean;
}

/**
 * ${tools.length} tools, one per callable operation. Adding an operation to the
 * manifest adds a tool here; there is no hand-maintained list to fall behind.
 */
export const TOOLS: ToolDefinition[] = ${JSON.stringify(tools, null, 2)};

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));
`;

  return new Map([[`tools.${manifest.generation}.ts`, contents]]);
}
