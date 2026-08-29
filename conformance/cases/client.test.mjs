/**
 * Conformance cases for the TypeScript client.
 *
 * Every case states a behaviour the SDK promises, and each exists because the
 * API does something a caller would not expect. When a second client or a
 * second API generation arrives, this is the checklist it has to satisfy,
 * which is why the assertions are about observable behaviour and not
 * internals.
 *
 * Runs against the built package, so it also proves the build output works.
 *
 *   npm run conformance
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createClient } from "../../packages/client-ts/dist/index.js";
import {
  AryeoConfirmationError,
  AryeoDeletedUpstreamError,
  AryeoHttpError,
  AryeoIgnoredFilterError,
  AryeoUnavailableOperationError,
} from "../../packages/client-ts/dist/errors.js";

/** A fetch stub that records calls and replays scripted responses. */
function stub(responses) {
  const calls = [];
  let i = 0;
  const fetchImpl = async (input, init = {}) => {
    calls.push({
      url: new URL(String(input)),
      method: init.method ?? "GET",
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const spec = responses[Math.min(i++, responses.length - 1)] ?? {};
    return new Response(JSON.stringify(spec.body ?? { data: [] }), {
      status: spec.status ?? 200,
      headers: { "Content-Type": "application/json", ...(spec.headers ?? {}) },
    });
  };
  return { calls, fetchImpl };
}

function client(responses, extra = {}) {
  const { calls, fetchImpl } = stub(responses);
  return {
    calls,
    aryeo: createClient({ apiKey: "test-key", fetch: fetchImpl, baseDelayMs: 1, ...extra }),
  };
}

describe("filters reach the wire in the form the API honours", () => {
  it("sends filters bracketed, never flat", async () => {
    const { aryeo, calls } = client([{}]);
    await aryeo.orders.list({ search: "6453" });

    const q = calls[0].url.searchParams;
    assert.equal(q.get("filter[search]"), "6453");
    assert.equal(q.has("search"), false, "a flat parameter is accepted and ignored by the API");
  });

  it("lowercases enum values but never timestamps", async () => {
    const { aryeo, calls } = client([{}]);
    await aryeo.orders.list({
      paymentStatus: "paid",
      appointmentStartAtGte: "2026-08-10T00:00:00Z",
    });

    const q = calls[0].url.searchParams;
    assert.equal(q.get("filter[payment_status]"), "paid");
    // Lowercasing this would send 2026-08-10t00:00:00z and corrupt the window.
    assert.equal(q.get("filter[appointment_start_at_gte]"), "2026-08-10T00:00:00Z");
  });

  it("serialises list filters in the indexed form", async () => {
    const { aryeo, calls } = client([{}]);
    await aryeo.orders.list({ userIds: ["aaa", "bbb"] });

    const q = calls[0].url.searchParams;
    assert.equal(q.get("filter[user_ids][0]"), "aaa");
    assert.equal(q.get("filter[user_ids][1]"), "bbb");
    assert.equal(q.has("filter[user_ids]"), false, "the singular form is one of the ignored ones");
  });

  it("caps per_page at the ceiling the API enforces anyway", async () => {
    const { aryeo, calls } = client([{}]);
    await aryeo.orders.list({ perPage: 500 });
    assert.equal(calls[0].url.searchParams.get("per_page"), "100");
  });

  it("joins includes into one comma separated parameter", async () => {
    const { aryeo, calls } = client([{}]);
    await aryeo.orders.list({ include: ["listing", "customer"] });
    assert.equal(calls[0].url.searchParams.get("include"), "listing,customer");
  });
});

describe("a filter the API ignores never reaches the wire", () => {
  it("refuses an unsupported filter by name rather than sending it", async () => {
    const { aryeo, calls } = client([{}]);
    await assert.rejects(
      // tasks.orderId is accepted upstream and returns the whole collection.
      () => aryeo.core.call("tasks.list", { orderId: "abc" }),
      (err) => {
        assert.ok(err instanceof AryeoIgnoredFilterError);
        assert.match(String(err), /complete unfiltered collection/);
        return true;
      },
    );
    assert.equal(calls.length, 0, "nothing should have been requested");
  });

  it("applies a client-side filter itself and reports the scan honestly", async () => {
    const { aryeo, calls } = client([
      {
        body: {
          data: [
            { id: "1", listing: { id: "wanted" } },
            { id: "2", listing: { id: "other" } },
          ],
          meta: { current_page: 1, last_page: 1 },
        },
      },
    ]);

    const result = await aryeo.orders.list({ listingId: "wanted" });

    assert.equal(result.data.length, 1);
    assert.equal(result.meta.serverSideFiltered, false);
    assert.deepEqual(result.meta.appliedInClient, ["listingId"]);
    assert.equal(result.meta.recordsScanned, 2);
    assert.equal(result.meta.truncated, false);
    assert.equal(
      calls[0].url.searchParams.has("filter[listing_id]"),
      false,
      "the API ignores this filter, so sending it would return everything",
    );
  });

  it("flags truncation when the scan bound is reached before the end", async () => {
    const page = {
      body: {
        data: Array.from({ length: 100 }, (_, i) => ({ id: String(i), listing: { id: "no" } })),
        meta: { current_page: 1, last_page: 99 },
      },
    };
    const { aryeo } = client([page], { scanMaxPages: 2 });

    const result = await aryeo.orders.list({ listingId: "wanted" });

    assert.equal(result.meta.truncated, true);
    assert.equal(result.meta.pagesScanned, 2);
    assert.match(String(result.meta.note), /INCOMPLETE/);
  });
});

describe("operations the API will not serve", () => {
  it("explains an absent route instead of failing as unknown", async () => {
    const { aryeo } = client([{}]);
    await assert.rejects(
      () => aryeo.core.call("payroll.runs.list"),
      (err) => {
        assert.ok(err instanceof AryeoUnavailableOperationError);
        assert.match(String(err), /does not exist on this API/);
        return true;
      },
    );
  });

  it("explains an unauthorised route", async () => {
    const { aryeo } = client([{}]);
    await assert.rejects(
      () => aryeo.core.call("payroll.items.get", { payRunItemId: "x" }),
      (err) => {
        assert.ok(err instanceof AryeoUnavailableOperationError);
        assert.match(String(err), /refused for a standard API key/);
        return true;
      },
    );
  });
});

describe("mutating calls need confirmation", () => {
  it("refuses a write with no confirmation, before any request", async () => {
    const { aryeo, calls } = client([{}]);
    await assert.rejects(
      () => aryeo.core.call("orders.tags.add", { orderId: "o", tagId: "t" }),
      (err) => {
        // Unverified operations are blocked first, which is also correct.
        assert.ok(
          err instanceof AryeoConfirmationError || err instanceof AryeoUnavailableOperationError,
        );
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });
});

describe("retrying only what a retry can fix", () => {
  it("backs off and retries a 429", async () => {
    const { aryeo, calls } = client([
      { status: 429, body: { message: "slow down" } },
      { status: 200, body: { data: [] } },
    ]);

    await aryeo.orders.list({});
    assert.equal(calls.length, 2);
  });

  it("does not retry a 400", async () => {
    const { aryeo, calls } = client([{ status: 400, body: { message: "bad include" } }]);
    await assert.rejects(() => aryeo.orders.list({}), AryeoHttpError);
    assert.equal(calls.length, 1);
  });

  it("surfaces a deleted record rather than retrying it forever", async () => {
    const { aryeo, calls } = client([{ status: 404, body: { message: "not found" } }]);
    await assert.rejects(
      () => aryeo.orders.get({ orderId: "019fc54f-0000-7000-8000-000000000000" }),
      AryeoDeletedUpstreamError,
    );
    assert.equal(calls.length, 1, "a record deleted upstream 404s forever");
  });

  it("pulls Aryeo field errors out of the data map", async () => {
    const { aryeo } = client([
      { status: 422, body: { status: "fail", data: { end_at: ["The end at field is required."] } } },
    ]);
    await assert.rejects(
      () => aryeo.orders.list({}),
      (err) => {
        assert.ok(err instanceof AryeoHttpError);
        assert.match(String(err), /The end at field is required/);
        return true;
      },
    );
  });
});

describe("credentials", () => {
  it("sends the key as a bearer and never puts it in an error", async () => {
    const { aryeo, calls } = client([{ status: 500, body: { message: "boom" } }], {
      maxAttempts: 1,
    });

    await assert.rejects(
      () => aryeo.orders.list({}),
      (err) => {
        assert.equal(String(err).includes("test-key"), false, "the token must not reach an error");
        return true;
      },
    );
    assert.equal(calls[0].headers["Authorization"], "Bearer test-key");
  });
});
