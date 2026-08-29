#!/usr/bin/env node
/**
 * Generation entry point.
 *
 * Loads the manifest, then hands it to every emitter in codegen/emitters/.
 * An emitter is a module exporting { name, outDir, emit(manifest) } where emit
 * returns a Map of relative path to file contents. Writing is done here rather
 * than in each emitter so --check can compare without touching the tree.
 *
 *   node codegen/index.mjs           write the output
 *   node codegen/index.mjs --check   fail if the output would differ
 *
 * There are no emitters yet. This exits cleanly and says so, because a build
 * script that crashes on a missing file teaches people to ignore it.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const emittersDir = join(root, "codegen", "emitters");
const generationsDir = join(root, "manifest", "generations");

const check = process.argv.includes("--check");

function loadManifests() {
  return readdirSync(generationsDir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => JSON.parse(readFileSync(join(generationsDir, n), "utf8")));
}

async function loadEmitters() {
  if (!existsSync(emittersDir)) return [];
  const files = readdirSync(emittersDir).filter((n) => n.endsWith(".mjs"));
  const loaded = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(emittersDir, file)).href);
    if (typeof mod.emit !== "function") {
      throw new Error(`codegen/emitters/${file} does not export emit()`);
    }
    loaded.push({ name: mod.name ?? file.replace(/\.mjs$/, ""), outDir: mod.outDir, emit: mod.emit });
  }
  return loaded;
}

const manifests = loadManifests();
const emitters = await loadEmitters();

if (emitters.length === 0) {
  console.log(
    `No emitters in codegen/emitters/ yet. ` +
      `${manifests.length} manifest(s) loaded, ${manifests.reduce((n, m) => n + Object.keys(m.operations).length, 0)} operations. Nothing to generate.`,
  );
  process.exit(0);
}

let differences = 0;
let written = 0;

for (const emitter of emitters) {
  for (const manifest of manifests) {
    const files = await emitter.emit(manifest);
    for (const [rel, contents] of files) {
      const target = join(root, emitter.outDir, rel);
      const existing = existsSync(target) ? readFileSync(target, "utf8") : null;

      if (existing === contents) continue;

      if (check) {
        differences++;
        console.error(`would change: ${relative(root, target)}`);
        continue;
      }

      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
      written++;
    }
  }
}

if (check && differences > 0) {
  console.error(`\n${differences} generated file(s) are stale. Run npm run generate and commit the result.`);
  process.exit(1);
}

console.log(check ? "generated output is current" : `wrote ${written} file(s)`);
