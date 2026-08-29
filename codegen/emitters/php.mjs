/**
 * PHP emitter.
 *
 * Produces the same surface as the TypeScript client, method for method, from
 * the same manifest. The promise is that an integration moves between the two
 * stacks without relearning the API, so where PHP forces a difference the
 * naming still lines up: orders.list becomes $aryeo->orders()->list().
 *
 * The rules are identical to the TypeScript emitter, because they are
 * properties of the API rather than of a language: an honoured filter becomes
 * a named argument, an ignored one never becomes something that can be sent,
 * and an operation the API will not serve gets no method.
 *
 * Named arguments require PHP 8.0, and readonly promotion 8.1. The generated
 * code targets 8.1.
 */

export const name = "php";
export const outDir = "packages/client-php/src";

const HEADER = `<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate
`;

const PHP_TYPE = {
  string: "string",
  integer: "int",
  number: "float",
  boolean: "bool",
  uuid: "string",
  date: "string",
  datetime: "string",
  money: "int",
  array: "array",
  object: "array",
};

/** orders.paymentInfo.get -> paymentInfo, and the namespace above it. */
function segments(operationId) {
  return operationId.split(".");
}

function studly(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function phpType(spec) {
  return PHP_TYPE[spec?.type] ?? "string";
}

function callableFilters(op) {
  return Object.entries(op.filters ?? {}).filter(
    ([, f]) => f.state === "honoured" || (f.state === "ignored" && f.strategy === "client-side"),
  );
}

function phpValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return "[" + value.map(phpValue).join(", ") + "]";
  if (typeof value === "object") {
    const parts = Object.entries(value).map(([k, v]) => `'${k}' => ${phpValue(v)}`);
    return "[" + parts.join(", ") + "]";
  }
  return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

/** The descriptor table, shared with the runtime exactly as in TypeScript. */
function emitOperations(manifest) {
  const rows = [];
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
    const row = {
      path: op.path,
      method: op.method,
      availability: op.availability?.state,
      ...(op.mutates ? { mutates: true, confirmField: op.confirmation?.field } : {}),
      ...(op.paginated ? { paginated: true } : {}),
      ...(op.perPageMax ? { perPageMax: op.perPageMax } : {}),
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
      ...(op.params ? { params: Object.keys(op.params) } : {}),
      ...(op.body ? { body: Object.keys(op.body) } : {}),
      ...(op.includes ? { includes: op.includes } : {}),
      ...(op.sorts ? { sorts: op.sorts } : {}),
    };
    rows.push(`        ${phpValue(id)} => ${phpValue(row)},`);
  }

  return `${HEADER}
namespace Envesko\\Aryeo\\Generated;

/**
 * Every operation the manifest describes, including the ones that cannot be
 * called. The unusable ones are kept so the client can explain why, rather
 * than failing as an unknown name.
 */
final class Operations
{
    public const BASE_URL = ${phpValue(manifest.baseUrl)};

    public const PER_PAGE_MAX = ${manifest.defaults?.perPageMax ?? 100};

    /** @var array<string, array<string, mixed>> */
    public const ALL = [
${rows.join("\n")}
    ];

    /** @return array<string, mixed>|null */
    public static function get(string $operationId): ?array
    {
        return self::ALL[$operationId] ?? null;
    }
}
`;
}

/** One class per namespace, each method calling into the shared core. */
function emitResources(manifest) {
  const files = new Map();
  const groups = new Map();

  for (const [id, op] of Object.entries(manifest.operations)) {
    if (op.availability?.state !== "available") continue;
    const parts = segments(id);
    const group = parts[0];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ id, op, parts });
  }

  for (const [group, operations] of groups) {
    const className = studly(group) + "Resource";
    const methods = [];

    for (const { id, op, parts } of operations) {
      // orders.paymentInfo.get -> paymentInfoGet, keeping the manifest id
      // recoverable from the method name.
      const method =
        parts.length === 2
          ? parts[1]
          : parts.slice(1, -1).join("") + studly(parts[parts.length - 1]);
      const methodName = method.charAt(0).toLowerCase() + method.slice(1);

      const args = [];
      for (const [pname, p] of Object.entries(op.pathParams ?? {})) {
        args.push({ name: pname, type: phpType(p), required: true });
      }
      for (const [fname, f] of callableFilters(op)) {
        args.push({ name: fname, type: f.type === "array" ? "array" : phpType(f), required: false });
      }
      for (const [pname, p] of Object.entries(op.params ?? {})) {
        args.push({ name: pname, type: phpType(p), required: Boolean(p.required) });
      }
      for (const [bname, b] of Object.entries(op.body ?? {})) {
        args.push({ name: bname, type: phpType(b), required: Boolean(b.required) });
      }
      if (op.includes && op.includes.length > 0) args.push({ name: "include", type: "array", required: false });
      if (op.sorts && op.sorts.length > 0) args.push({ name: "sort", type: "string", required: false });
      if (op.paginated) {
        args.push({ name: "page", type: "int", required: false });
        args.push({ name: "perPage", type: "int", required: false });
      }
      if (op.mutates) args.push({ name: "confirm", type: "string", required: true });

      // Required first, then optional, as PHP demands.
      args.sort((a, b) => Number(b.required) - Number(a.required));

      const signature = args
        .map((a) => (a.required ? `${a.type} $${a.name}` : `?${a.type} $${a.name} = null`))
        .join(", ");

      const pairs = args.map((a) => `'${a.name}' => $${a.name}`).join(",\n            ");

      const doc = [];
      if (op.summary) doc.push(op.summary);
      for (const quirk of op.quirks ?? []) doc.push(quirk);
      for (const [fname, f] of Object.entries(op.filters ?? {})) {
        if (f.state === "ignored" && f.strategy !== "client-side") {
          doc.push(
            `${fname} is accepted by the API and ignored, returning everything, so it is not offered here.` +
              (f.useInstead ? ` Use ${f.useInstead}.` : ""),
          );
        }
      }
      const docblock =
        doc.length > 0 ? `    /**\n${doc.map((d) => `     * ${d}`).join("\n     *\n")}\n     */\n` : "";

      methods.push(
        `${docblock}    public function ${methodName}(${signature}): \\Envesko\\Aryeo\\Result\n` +
          `    {\n` +
          `        return $this->core->call(${phpValue(id)}, array_filter([\n` +
          `            ${pairs},\n` +
          `        ], static fn ($value) => $value !== null));\n` +
          `    }`,
      );
    }

    files.set(
      `Generated/${className}.php`,
      `${HEADER}
namespace Envesko\\Aryeo\\Generated;

use Envesko\\Aryeo\\Core;

final class ${className}
{
    public function __construct(private readonly Core $core)
    {
    }

${methods.join("\n\n")}
}
`,
    );
  }

  // The facade that hangs the resources together.
  const accessors = [...groups.keys()]
    .map(
      (group) =>
        `    public function ${group}(): Generated\\${studly(group)}Resource\n` +
        `    {\n` +
        `        return $this->${group} ??= new Generated\\${studly(group)}Resource($this->core);\n` +
        `    }`,
    )
    .join("\n\n");

  const props = [...groups.keys()]
    .map((group) => `    private ?Generated\\${studly(group)}Resource $${group} = null;`)
    .join("\n");

  files.set(
    "Client.php",
    `${HEADER}
namespace Envesko\\Aryeo;

/**
 * Aryeo client for API generation ${manifest.generation}.
 *
 * The surface matches the TypeScript client method for method, because both
 * are generated from the same description of the API.
 */
final class Client
{
${props}

    public function __construct(private readonly Core $core)
    {
    }

    public static function create(string $apiKey, array $options = []): self
    {
        return new self(new Core($apiKey, $options));
    }

    public function core(): Core
    {
        return $this->core;
    }

${accessors}
}
`,
  );

  return files;
}

export async function emit(manifest) {
  const files = new Map();
  files.set("Generated/Operations.php", emitOperations(manifest));
  for (const [path, contents] of emitResources(manifest)) files.set(path, contents);
  return files;
}
