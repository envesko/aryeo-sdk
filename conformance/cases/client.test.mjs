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

describe("item groupings", () => {
  it("sends one documented item ID with a read-only request", async () => {
    const { aryeo, calls } = client([{ body: { data: [] } }]);
    const id = "00000000-0000-4000-8000-000000000000";
    await aryeo.core.call("scheduling.itemGroupings.list", { item_ids: id });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].url.pathname, "/v1/scheduling/item-groupings");
    assert.equal(calls[0].url.searchParams.get("item_ids"), id);
    assert.equal(calls[0].body, undefined);
  });

  it("refuses missing, malformed and multi-item values before a request", async () => {
    const { aryeo, calls } = client([{}]);
    for (const value of [undefined, "", "not-a-uuid", ["00000000-0000-4000-8000-000000000000"]]) {
      await assert.rejects(
        () => aryeo.core.call("scheduling.itemGroupings.list", { item_ids: value }),
        /item_ids must be one UUID string/,
      );
    }
    assert.equal(calls.length, 0);
  });
});

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

  it("requests listing identity on every scan page and preserves requested includes", async () => {
    for (const include of [undefined, ["customer"], ["listing", "customer"]]) {
      const calls = [];
      const aryeo = createClient({
        apiKey: "test-key",
        fetch: async (input) => {
          const url = new URL(String(input));
          calls.push(url);
          const page = Number(url.searchParams.get("page"));
          const includes = (url.searchParams.get("include") ?? "").split(",");
          const listing = includes.includes("listing") ? { listing: { id: "wanted" } } : {};
          return new Response(JSON.stringify({
            data: [{ id: String(page), ...listing }],
            meta: { current_page: page, last_page: 2 },
          }));
        },
      });
      const result = await aryeo.orders.list({ listingId: "wanted", ...(include ? { include } : {}) });
      assert.deepEqual(result.data.map((order) => order.id), ["1", "2"]);
      assert.equal(calls.length, 2);
      for (const url of calls) {
        const includes = url.searchParams.get("include").split(",");
        assert.equal(includes.filter((name) => name === "listing").length, 1);
        for (const name of include ?? []) assert.ok(includes.includes(name));
        assert.equal(url.searchParams.has("filter[listing_id]"), false);
      }
    }
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

  it("surfaces an ordinary 404 without claiming the record was deleted", async () => {
    const { aryeo, calls } = client([{ status: 404, body: { message: "not found" } }]);
    await assert.rejects(
      () => aryeo.orders.get({ orderId: "019fc54f-0000-7000-8000-000000000000" }),
      (err) => err instanceof AryeoHttpError && !(err instanceof AryeoDeletedUpstreamError),
    );
    assert.equal(calls.length, 1);
  });

  it("does not repeat a write after a retryable response or network timeout", async () => {
    for (const failure of ["response", "timeout"]) {
      let calls = 0;
      const aryeo = createClient({
        apiKey: "test-key",
        maxAttempts: 4,
        baseDelayMs: 0,
        fetch: async () => {
          calls++;
          if (failure === "timeout") throw new DOMException("timed out", "AbortError");
          return new Response("temporary failure", { status: 503 });
        },
      });
      await assert.rejects(() => aryeo.core.call("orders.tags.add", {
        orderId: "order", tag_id: "tag", confirm: "order number",
      }));
      assert.equal(calls, 1, `${failure} must not replay the write`);
    }
  });

  it("times out a stalled response body without replaying the write", { timeout: 2000 }, async () => {
    let calls = 0;
    let signal;
    const aryeo = createClient({
      apiKey: "test-key",
      maxAttempts: 4,
      timeoutMs: 30,
      fetch: async (_input, init) => {
        calls++;
        signal = init.signal;
        return new Response(new ReadableStream({
          start(controller) { controller.enqueue(new TextEncoder().encode("{")); },
        }));
      },
    });
    await assert.rejects(
      () => aryeo.core.call("orders.tags.add", {
        orderId: "order", tag_id: "tag", confirm: "order number",
      }),
      { name: "AbortError" },
    );
    assert.equal(signal.aborted, true);
    assert.equal(calls, 1);
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
