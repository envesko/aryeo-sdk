#!/usr/bin/env node
/**
 * Checks the manifest holds together before anything is generated from it.
 *
 * Structural validity is only half the job. The rules that matter here are the
 * ones that keep the manifest honest: a claim about a filter has to point at
 * the measurement that produced it, and anything that mutates upstream state
 * has to say how a caller proves intent.
 *
 * No dependencies, so this runs anywhere without an install step.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const generationsDir = join(root, "manifest", "generations");
const evidenceDir = join(root, "evidence");

const errors = [];
const warnings = [];

const fail = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const evidenceFiles = new Set(
  readdirSync(evidenceDir).filter((name) => name.endsWith(".json")),
);

/** Filter states that assert something was measured, so must cite evidence. */
const MEASURED_STATES = new Set(["honoured", "ignored"]);

function checkEvidenceRef(where, ref) {
  if (!ref) return false;
  if (!ref.file) {
    fail(where, "evidence is missing a file");
    return false;
  }
  if (!evidenceFiles.has(ref.file)) {
    fail(where, `evidence file not found in evidence/: ${ref.file}`);
    return false;
  }
  if (!ref.date) fail(where, "evidence is missing a date");
  return true;
}

function checkOperation(generation, id, op) {
  const where = `${generation} ${id}`;

  if (!op.path) fail(where, "missing path");
  if (!op.method) fail(where, "missing method");
  if (!op.availability?.state) fail(where, "missing availability.state");

  const state = op.availability?.state;

  // An operation the API will not serve must say where to go instead, or the
  // caller is left with a dead end and no next move.
  if ((state === "absent" || state === "unauthorised") && !op.availability.alternative) {
    warn(where, `${state} with no alternative recorded`);
  }
  if ((state === "absent" || state === "unauthorised") && !op.availability.note) {
    fail(where, `${state} must carry a note explaining what was observed`);
  }

  // Anything that changes upstream state needs an explicit confirmation
  // contract. A boolean flag is not one, which is why the schema does not
  // offer that shape at all.
  if (op.mutates) {
    if (!op.confirmation) fail(where, "mutating operation without a confirmation contract");
    else {
      if (op.confirmation.kind !== "echoIdentifier") {
        fail(where, `unsupported confirmation kind: ${op.confirmation.kind}`);
      }
      if (!op.confirmation.field) fail(where, "confirmation is missing the field to echo");
      if (!op.confirmation.warns) warn(where, "confirmation has no warning text for the caller");
    }
    if (state === "available") {
      warn(where, "marked available; a mutating operation should stay unverified until it has been exercised deliberately");
    }
  }

  // The whole point of the document: a measured claim cites its measurement.
  for (const [name, filter] of Object.entries(op.filters ?? {})) {
    const fWhere = `${where} filter.${name}`;
    if (!filter.state) {
      fail(fWhere, "missing state");
      continue;
    }
    if (MEASURED_STATES.has(filter.state)) {
      const ref = filter.evidence ?? op.evidence;
      if (!checkEvidenceRef(fWhere, ref)) {
        fail(fWhere, `state "${filter.state}" asserts a measurement but cites no evidence`);
      }
    }
    if (filter.state === "honoured" && !filter.wire) {
      fail(fWhere, "honoured filter must record the wire parameter it sends");
    }
    if (filter.state === "ignored" && filter.wire) {
      fail(fWhere, "ignored filter must not record a wire parameter; it is never sent");
    }
    if (filter.state === "ignored" && !filter.strategy && !filter.useInstead) {
      warn(fWhere, "ignored with no strategy and no useInstead, so a caller is told nothing useful");
    }
    if (filter.type === "array" && filter.state === "honoured" && !filter.arrayForm) {
      fail(fWhere, "honoured array filter must record its arrayForm; the singular spelling is usually ignored");
    }
  }

  if (op.evidence) checkEvidenceRef(where, op.evidence);

  if (op.includes && op.includesUnvalidated) {
    fail(where, "cannot both list includes and be marked includesUnvalidated");
  }
}

let operationCount = 0;
let generationCount = 0;

for (const file of readdirSync(generationsDir).filter((n) => n.endsWith(".json"))) {
  const manifest = readJson(join(generationsDir, file));
  generationCount++;

  if (!manifest.generation) fail(file, "missing generation");
  if (!manifest.baseUrl) fail(file, "missing baseUrl");
  if (!manifest.operations) {
    fail(file, "missing operations");
    continue;
  }

  for (const [id, op] of Object.entries(manifest.operations)) {
    operationCount++;
    checkOperation(manifest.generation, id, op);
  }
}

// Evidence that nothing points at is not automatically wrong, but it usually
// means a manifest entry was dropped without its evidence being cleaned up.
const cited = new Set();
for (const file of readdirSync(generationsDir).filter((n) => n.endsWith(".json"))) {
  const text = readFileSync(join(generationsDir, file), "utf8");
  for (const name of evidenceFiles) if (text.includes(name)) cited.add(name);
}
for (const name of evidenceFiles) {
  if (!cited.has(name)) warn("evidence", `${name} is not cited by any operation`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

console.log(
  `\n${generationCount} generation(s), ${operationCount} operations, ` +
    `${evidenceFiles.size} evidence files, ${warnings.length} warning(s), ${errors.length} error(s)`,
);

process.exit(errors.length > 0 ? 1 : 0);
