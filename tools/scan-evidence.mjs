#!/usr/bin/env node
/**
 * Refuses to let a credential reach the repository through evidence/.
 *
 * Length alone does not work. `initial_requested_company_team_member_ids` is
 * 41 characters and `createdByCompanyTeamMemberExists` is 32, so a naive
 * length rule fails on the API's own field names and gets switched off by the
 * first person it annoys, which is worse than having no check.
 *
 * What actually distinguishes a token from an identifier is character mixing:
 * API keys carry digits and both cases in one unbroken run. Identifiers pick
 * a convention and stick to it, and UUIDs are lowercase hex with dashes.
 *
 * Run with --self-test to check the heuristic still behaves.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_RUN = 24;
const RUN = /[A-Za-z0-9+/=_-]{24,}/g;
const BEARER = /Bearer\s+[A-Za-z0-9._-]{12,}/i;

/**
 * A run is credential shaped when it mixes digits with both letter cases,
 * once the separators an identifier would use are taken out of the picture.
 */
export function looksLikeCredential(run) {
  if (run.length < MIN_RUN) return false;

  // Separated runs are identifiers: snake_case, kebab-case, dotted paths.
  // A token is one unbroken block.
  const unbroken = run.split(/[_\-.]/).sort((a, b) => b.length - a.length)[0] ?? "";
  if (unbroken.length < MIN_RUN) return false;

  const hasDigit = /[0-9]/.test(unbroken);
  const hasLower = /[a-z]/.test(unbroken);
  const hasUpper = /[A-Z]/.test(unbroken);

  // camelCase field names: letters in both cases, no digits.
  // Lowercase hex and UUID fragments: digits and lowercase, no uppercase.
  // Neither is a credential. All three classes together is.
  return hasDigit && hasLower && hasUpper;
}

function scanText(text) {
  const hits = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (BEARER.test(line)) hits.push({ line: index + 1, reason: "bearer token", sample: line.trim().slice(0, 60) });
    for (const match of line.match(RUN) ?? []) {
      if (looksLikeCredential(match)) {
        hits.push({ line: index + 1, reason: "credential shaped run", sample: match.slice(0, 12) + "..." });
      }
    }
  }
  return hits;
}

function selfTest() {
  const shouldFlag = [
    "x9fKq2mZp7Lw4TnB8vRc1JdHs6YgEa0UxQiOoPlM",
    "sk-Live-4kQ9zXbN2mVpL8wRtY6uJ3hGf1dScAeZ",
  ];
  const shouldPass = [
    "initial_requested_company_team_member_ids",
    "createdByCompanyTeamMemberExists",
    "active_customer_team_memberships.customer_team",
    "019ffe0c-1cd5-71c1-8686-5bf7520bcb2b",
    "marketing_materials.exports",
  ];
  let bad = 0;
  for (const s of shouldFlag) {
    if (!looksLikeCredential(s)) {
      console.error(`self-test: should have flagged ${s}`);
      bad++;
    }
  }
  for (const s of shouldPass) {
    if (looksLikeCredential(s)) {
      console.error(`self-test: false positive on ${s}`);
      bad++;
    }
  }
  console.log(bad === 0 ? "self-test passed" : `self-test failed: ${bad} case(s)`);
  return bad === 0;
}

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDir = join(dirname(here), "evidence");

if (process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 0 : 1);
}

let files = 0;
let findings = 0;
for (const name of readdirSync(evidenceDir)) {
  const path = join(evidenceDir, name);
  if (!statSync(path).isFile()) continue;
  files++;
  for (const hit of scanText(readFileSync(path, "utf8"))) {
    findings++;
    console.error(`${name}:${hit.line} ${hit.reason}: ${hit.sample}`);
  }
}

if (findings > 0) {
  console.error(`\n${findings} possible credential(s) in evidence/. Scrub before committing.`);
  process.exit(1);
}
console.log(`evidence/ clean: ${files} file(s) scanned`);
