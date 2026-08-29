# @envesko/aryeo-client

Typed TypeScript client for the [Aryeo](https://www.aryeo.com) real estate media platform. Node, Bun, Cloudflare Workers and the browser.

Generated from a description of the API that records how each endpoint actually responds, so the parameters you are offered are the ones that work.

```bash
npm i @envesko/aryeo-client
```

```ts
import { createClient } from "@envesko/aryeo-client";

const aryeo = createClient({ apiKey: process.env.ARYEO_API_TOKEN });

// every shoot booked this week, with the photographer attached
const shoots = await aryeo.orders.list({
  appointmentStartAtGte: "2026-08-10T00:00:00Z",
  appointmentStartAtLte: "2026-08-17T00:00:00Z",
  include: ["listing", "customer", "appointments.users"],
});
```

## What it handles

Each endpoint expands a different set of relationships, and the valid names are not always the obvious ones. They ship as unions, so a wrong one fails in your editor rather than as a 400.

Some parameters are accepted by the API and then ignored, returning the complete collection. Those are never sent. Where one can be applied locally the client does so and reports what it scanned:

```ts
const result = await aryeo.orders.list({ listingId });
result.meta.serverSideFiltered; // false
result.meta.recordsScanned;     // how far it looked
result.meta.truncated;          // true means the result is incomplete
```

Retries cover rate limits, server errors and network timeouts. A record deleted upstream raises `AryeoDeletedUpstreamError` rather than being retried forever.

Anything that changes data requires you to echo an identifier off the target record, so it cannot fire by accident:

```ts
await aryeo.orders.tags.add({ orderId, tagId, confirm: String(order.number) });
```

## Errors

`AryeoHttpError`, `AryeoDeletedUpstreamError`, `AryeoUnavailableOperationError`, `AryeoConfirmationError`, `AryeoIgnoredFilterError`. All extend `AryeoError`.

## Documentation

Full coverage, the API notes behind it and the PHP equivalent: [envesko/aryeo-sdk](https://github.com/envesko/aryeo-sdk).

MIT, copyright Envesko. An independent project, not affiliated with Aryeo.
