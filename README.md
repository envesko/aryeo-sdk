# Aryeo SDK

Typed clients for the [Aryeo](https://www.aryeo.com) real estate media platform, for TypeScript, PHP, and AI agents over the Model Context Protocol.

The SDK is built on a detailed map of the API: which parameters do what, which relationships each endpoint will expand, how paging and rate limits behave, and where the response shapes differ from what you would expect. That map comes from sustained production use and is maintained against live accounts.

You get a working integration on day one instead of week three.

> Everything here is verified against enterprise Aryeo accounts carrying thousands of orders, listings and appointments. Behaviour that only shows up at volume, such as paging ceilings and filters that quietly stop narrowing, is covered because we hit it ourselves.

## Packages

| Package | What it is |
|---|---|
| `@envesko/aryeo-client` | TypeScript client. Node, Bun, Cloudflare Workers, browser. Retries, paging helpers, full types. |
| `envesko/aryeo-php` | The same surface for PHP, method for method. PSR-18 transport, PSR-3 logging, no framework required. |
| `aryeo-mcp-worker` | Model Context Protocol server, so Claude and other agents can work an account directly. You host it yourself on Cloudflare Workers: see [the deployment guide](packages/mcp-worker/README.md). |
| `@envesko/aryeo-manifest` | The API description the other three are generated from. Useful on its own if you are writing a client in a language we do not ship yet. |

## Get started

```bash
npm i @envesko/aryeo-client
```

```ts
const aryeo = createClient({ apiKey });

// every shoot booked this week, with the photographer attached
const shoots = await aryeo.orders.list({
  appointmentStartAt: { gte: monday, lte: sunday },
  include: ["listing", "customer", "appointments.users"],
});
```

```php
$shoots = $aryeo->orders()->list(
    appointmentStartAtGte: $monday,
    appointmentStartAtLte: $sunday,
    include: ['listing', 'customer', 'appointments.users'],
);
```

## What the client handles

Each endpoint expands a different set of relationships, and the valid names are not always the obvious ones. They ship as enums, so your editor offers the right list and a wrong one never reaches the wire.

Filters are recorded with the effect they actually have. Where a parameter is accepted but does not narrow the result, the client says so in the response rather than handing you a list that looks filtered.

Date windows are converted to the instants the API compares against, so a query for one local day returns that day and not a window shifted by your offset.

Rate limit backoff, the hard page size ceiling, and the handful of endpoints that behave unlike the rest are handled for you.

## Run the MCP server

Point Claude at your own Aryeo account in about five minutes. One deployment serves one account, yours, and there is no shared instance to sign up for.

Every command runs on your own machine. Wrangler talks to Cloudflare for you; the worker runs on Cloudflare. Names in capitals are literal: you paste the actual token at the prompt, not into the command.

```bash
git clone https://github.com/envesko/aryeo-sdk && cd aryeo-sdk && npm install && npm run build
cd packages/mcp-worker
npx wrangler login                          # opens a browser
npx wrangler kv namespace create OAUTH_KV   # paste the id into wrangler.jsonc
npx wrangler secret put ARYEO_API_TOKEN
npx wrangler secret put MCP_APPROVAL_CODE
npx wrangler deploy
```

Full walkthrough, including what the approval code is for and how to revoke access: [packages/mcp-worker/README.md](packages/mcp-worker/README.md).

## Coverage

Aryeo is a media management platform, so orders and listings are the centre of it. Those two get the deepest treatment: every filter, every relationship, every sub-resource. Everything else hangs off them. See [docs/coverage.md](docs/coverage.md).

## Repository

This is a monorepo. The clients are generated from `manifest/`, which is the only place a fact about the API is written down. `packages/` is output and is regenerated on every build.

```
manifest/     the API description, per generation
evidence/     probe output backing every claim in the manifest
codegen/      emitters: typescript, php, mcp, docs
packages/     generated clients
conformance/  one suite, run against every client
```

Packagist reads `composer.json` from the root of this repository, so the PHP package is published straight from here with no separate mirror. `.gitattributes` keeps the Node tooling, the manifest and the evidence out of the Composer archive.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions are welcome, particularly from teams running Aryeo at scale.

## License

MIT, copyright Envesko. An independent project, not affiliated with Aryeo.
