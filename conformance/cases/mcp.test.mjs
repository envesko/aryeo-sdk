/**
 * Conformance cases for the MCP server.
 *
 * The server is thin on purpose: it maps MCP calls onto the client and gets
 * out of the way. What these cases guard is that it stays thin, that the tool
 * surface tracks the manifest, and that the two things an MCP server can get
 * dangerously wrong are right: it must not be open to whoever finds the URL,
 * and it must not let a write through without confirmation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { OPERATIONS } from "../../packages/client-ts/dist/index.js";

const source = readFileSync(
  new URL("../../packages/mcp-worker/src/generated/tools.v1.ts", import.meta.url),
  "utf8",
);
const TOOLS = JSON.parse(
  /export const TOOLS: ToolDefinition\[\] = (\[[\s\S]*?\]);\n\nexport const/.exec(source)[1],
);

const byName = new Map(TOOLS.map((t) => [t.name, t]));
const available = Object.entries(OPERATIONS).filter(([, d]) => d.availability === "available");

describe("the tool surface tracks the manifest", () => {
  it("exposes one tool per callable operation and no others", () => {
    assert.equal(TOOLS.length, available.length);
    for (const [id] of available) {
      assert.ok(
        TOOLS.some((t) => t.operationId === id),
        `${id} is callable but has no tool`,
      );
    }
  });

  it("exposes nothing the API will not serve", () => {
    for (const tool of TOOLS) {
      assert.equal(
        OPERATIONS[tool.operationId].availability,
        "available",
        `${tool.name} points at an operation that cannot be called`,
      );
    }
  });

  it("gives every tool a description worth reading", () => {
    for (const tool of TOOLS) {
      assert.ok(tool.description.length > 30, `${tool.name} has a thin description`);
    }
  });
});

describe("a tool never advertises a parameter the API ignores", () => {
  for (const tool of TOOLS) {
    const descriptor = OPERATIONS[tool.operationId];
    const dead = Object.entries(descriptor.filters ?? {}).filter(
      ([, f]) => (f.state === "ignored" && f.strategy !== "client-side") || f.state === "rejected",
    );
    if (dead.length === 0) continue;

    it(`${tool.name} omits ${dead.map(([n]) => n).join(", ")}`, () => {
      for (const [name] of dead) {
        assert.equal(
          Object.hasOwn(tool.inputSchema.properties, name),
          false,
          `${tool.name} offers ${name}, which the API accepts and ignores`,
        );
        // And the description should say why, so an agent stops looking.
        assert.match(tool.description, new RegExp(`Do not look for ${name}`));
      }
    });
  }
});

describe("writes are unmistakable", () => {
  for (const tool of TOOLS.filter((t) => t.mutates)) {
    it(`${tool.name} demands confirmation and says what it does`, () => {
      assert.ok(
        tool.inputSchema.required?.includes("confirm"),
        `${tool.name} is a write and must require confirm`,
      );
      assert.match(tool.description, /^|WRITE/);
      assert.ok(
        tool.description.includes("WRITE"),
        `${tool.name} must announce itself as a write in its description`,
      );
    });
  }

  it("no read is marked as a write, and no write as a read", () => {
    for (const tool of TOOLS) {
      const mutates = Boolean(OPERATIONS[tool.operationId].mutates);
      assert.equal(Boolean(tool.mutates), mutates, `${tool.name} disagrees with the manifest`);
    }
  });
});

describe("client-side filtering is disclosed to the agent", () => {
  for (const tool of TOOLS) {
    const descriptor = OPERATIONS[tool.operationId];
    const clientSide = Object.entries(descriptor.filters ?? {}).filter(
      ([, f]) => f.state === "ignored" && f.strategy === "client-side",
    );
    if (clientSide.length === 0) continue;

    it(`${tool.name} warns that ${clientSide.map(([n]) => n).join(", ")} is scanned, not queried`, () => {
      assert.match(tool.description, /applied after fetching/i);
      // An agent that cannot tell a complete answer from a partial one will
      // present a truncated scan as fact.
      assert.match(tool.description, /meta\.truncated/);
    });
  }
});

describe("tool names are stable and well formed", () => {
  it("are lowercase with underscores, and unique", () => {
    const seen = new Set();
    for (const tool of TOOLS) {
      assert.match(tool.name, /^[a-z][a-z0-9_]*$/, `${tool.name} is not a usable tool name`);
      assert.equal(seen.has(tool.name), false, `${tool.name} is duplicated`);
      seen.add(tool.name);
    }
  });

  it("keep the manifest id recoverable", () => {
    for (const tool of TOOLS) {
      assert.ok(byName.has(tool.name));
      assert.ok(typeof tool.operationId === "string" && tool.operationId.includes("."));
    }
  });
});

describe("the server refuses to run unprotected", () => {
  const worker = readFileSync(
    new URL("../../packages/mcp-worker/src/index.ts", import.meta.url),
    "utf8",
  );

  it("treats a missing auth secret as a refusal, not as open access", () => {
    assert.match(worker, /if \(!env\.MCP_AUTH_TOKEN\) return false;/);
  });

  it("compares the bearer in constant time", () => {
    assert.match(worker, /secretsMatch/);
    assert.match(worker, /diff \|= a\.charCodeAt\(i\) \^ b\.charCodeAt\(i\)/);
  });

  it("answers an unauthorised request with a 401 and a challenge", () => {
    assert.match(worker, /status: 401/);
    assert.match(worker, /WWW-Authenticate/);
  });
});
