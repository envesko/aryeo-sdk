/**
 * Manifest-driven conformance.
 *
 * The hand-written cases in client.test.mjs cover behaviours somebody thought
 * to check. These cover every operation in the manifest, and keep covering
 * them as operations are added, which is the difference between a suite that
 * ages well and one that quietly stops meaning anything.
 *
 * Each claim recorded in the manifest is asserted against what the client
 * actually does with it.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createClient, OPERATIONS } from "../../packages/client-ts/dist/index.js";
import {
  AryeoIgnoredFilterError,
  AryeoUnavailableOperationError,
} from "../../packages/client-ts/dist/errors.js";

function harness(body = { data: [], meta: { current_page: 1, last_page: 1 } }) {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    calls.push({ url: new URL(String(input)), method: init.method ?? "GET" });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return {
    calls,
    aryeo: createClient({ apiKey: "k", fetch: fetchImpl, baseDelayMs: 1 }),
  };
}

/** A value the client will accept for a filter of this shape. */
function sampleFor(filter) {
  if (filter.arrayForm) return ["019ffe0c-1cd5-71c1-8686-5bf7520bcb2b"];
  return "sample";
}

/** Fill required path parameters with something well formed. */
function pathParamsFor(descriptor) {
  const out = {};
  for (const match of descriptor.path.matchAll(/\{(\w+)\}/g)) {
    out[match[1]] = "019ffe0c-1cd5-71c1-8686-5bf7520bcb2b";
  }
  return out;
}

const entries = Object.entries(OPERATIONS);

describe("every operation is reachable or explains itself", () => {
  for (const [id, descriptor] of entries) {
    if (descriptor.availability === "available") continue;

    it(`${id} is ${descriptor.availability} and says so`, async () => {
      const { aryeo, calls } = harness();
      await assert.rejects(
        () => aryeo.core.call(id, pathParamsFor(descriptor)),
        AryeoUnavailableOperationError,
      );
      assert.equal(calls.length, 0, "an unusable operation must not reach the network");
    });
  }
});

describe("honoured filters serialise to the parameter the API honours", () => {
  for (const [id, descriptor] of entries) {
    if (descriptor.availability !== "available") continue;
    const honoured = Object.entries(descriptor.filters ?? {}).filter(
      ([, f]) => f.state === "honoured",
    );
    if (honoured.length === 0) continue;

    it(`${id} sends ${honoured.length} filter(s) bracketed`, async () => {
      const { aryeo, calls } = harness();
      const params = pathParamsFor(descriptor);
      for (const [name, filter] of honoured) params[name] = sampleFor(filter);

      await aryeo.core.call(id, params);

      const q = calls[0].url.searchParams;
      for (const [name, filter] of honoured) {
        const key = filter.arrayForm ? `${filter.wire}[0]` : filter.wire;
        assert.ok(q.has(key), `${id}: expected ${key} on the wire for ${name}`);
        // The flat spelling of any filter is accepted upstream and ignored.
        assert.equal(q.has(name), false, `${id}: ${name} must not be sent flat`);
      }
    });
  }
});

describe("filters the API ignores are never sent", () => {
  for (const [id, descriptor] of entries) {
    if (descriptor.availability !== "available") continue;
    const dead = Object.entries(descriptor.filters ?? {}).filter(
      ([, f]) => f.state === "ignored" || f.state === "rejected",
    );
    if (dead.length === 0) continue;

    for (const [name, filter] of dead) {
      const clientSide = filter.state === "ignored" && filter.strategy === "client-side";

      it(`${id}.${name} is ${clientSide ? "applied here, not upstream" : "refused rather than sent"}`, async () => {
        const { aryeo, calls } = harness();
        const params = { ...pathParamsFor(descriptor), [name]: sampleFor(filter) };

        if (clientSide) {
          const result = await aryeo.core.call(id, params);
          assert.equal(result.meta.serverSideFiltered, false);
          assert.ok(result.meta.appliedInClient.includes(name));
        } else {
          await assert.rejects(() => aryeo.core.call(id, params), AryeoIgnoredFilterError);
          assert.equal(calls.length, 0);
        }

        // Either way, the parameter must not have reached the API.
        for (const call of calls) {
          assert.equal(
            call.url.searchParams.has(filter.wire ?? `filter[${name}]`),
            false,
            `${id}: ${name} reached the wire and would return an unfiltered set`,
          );
        }
      });
    }
  }
});

describe("mutating operations are gated", () => {
  for (const [id, descriptor] of entries) {
    if (!descriptor.mutates) continue;

    it(`${id} records how a caller confirms it`, () => {
      assert.ok(
        typeof descriptor.confirmField === "string" && descriptor.confirmField.length > 0,
        `${id} mutates upstream state and must name a field to echo`,
      );
      // Nothing that changes data should be callable until it has been
      // exercised deliberately against a record that does not matter.
      assert.equal(
        descriptor.availability,
        "unverified",
        `${id} mutates and is marked ${descriptor.availability}; confirm it was exercised on purpose`,
      );
    });
  }
});

describe("paged operations respect the ceiling the API enforces", () => {
  for (const [id, descriptor] of entries) {
    if (descriptor.availability !== "available" || !descriptor.paginated) continue;

    it(`${id} caps per_page at ${descriptor.perPageMax ?? 100}`, async () => {
      const { aryeo, calls } = harness();
      await aryeo.core.call(id, { ...pathParamsFor(descriptor), perPage: 1000 });
      assert.equal(
        calls[0].url.searchParams.get("per_page"),
        String(descriptor.perPageMax ?? 100),
      );
    });
  }
});

describe("the manifest itself stays coherent", () => {
  it("every operation declares an availability the client understands", () => {
    const known = new Set(["available", "unauthorised", "absent", "unverified"]);
    for (const [id, descriptor] of entries) {
      assert.ok(known.has(descriptor.availability), `${id}: ${descriptor.availability}`);
    }
  });

  it("no honoured filter is missing its wire parameter", () => {
    for (const [id, descriptor] of entries) {
      for (const [name, filter] of Object.entries(descriptor.filters ?? {})) {
        if (filter.state !== "honoured") continue;
        assert.ok(filter.wire, `${id}.${name} is honoured but records no wire parameter`);
      }
    }
  });

  it("no ignored filter carries a wire parameter it could be sent with", () => {
    for (const [id, descriptor] of entries) {
      for (const [name, filter] of Object.entries(descriptor.filters ?? {})) {
        if (filter.state !== "ignored") continue;
        assert.equal(filter.wire, undefined, `${id}.${name} is ignored but records a wire parameter`);
      }
    }
  });
});
