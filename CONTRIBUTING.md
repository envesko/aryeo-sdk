# Contributing

Contributions are welcome, particularly from teams running Aryeo at scale. If your account does something ours does not, that is worth adding.

The clients are generated from a description of the API in `manifest/`. That description is the thing you edit. Everything under `packages/` is output and gets overwritten on the next build.

## Hard rules

**Never send a write request at an account to find out what it does.** Write shapes come from reading code that already runs in production. There is real money and real customer data behind those endpoints.

**Scrub anything you commit under `evidence/`.** No tokens, no customer names, no addresses. The tooling redacts the credential and refuses a file that still looks like it carries one.

**Conventional Commits, scoped to the package.** `feat(client-php)`, `fix(manifest)`.

## Adding or correcting an endpoint

Run the probe tool against a live account and commit what it prints. It captures status codes, result counts, and any list of valid values the API returns in an error body. Prefer an account with real volume: behaviour on forty records tells you very little about behaviour on five thousand.

Then edit `manifest/`, add a case to `conformance/`, and regenerate. CI regenerates too and fails if your tree differs, so generated code stays visible in the diff instead of turning up at release.

The conformance suite runs against every client and every API version we support, so a case you add there is also part of the plan for the next Aryeo API.

## Probing: use a real value

Aryeo treats an unrecognised filter value the same way it treats an unrecognised filter name. Both are ignored, and you get the full unfiltered collection back with a 200. So a made-up probe value tells you nothing: a filter that works and a filter that does not look identical from the outside.

Always probe with a value that exists in the account, and compare the count against the unfiltered total.

We got this wrong once. A junk status value was read as proof that listing status filtering was unsupported, and a client-side workaround was built on top of it. A real status narrows 5,112 listings to 37.

## Comments

Record the surprise, not the syntax. A route that returns 401 while its collection works, a relationship that is spelled differently here than everywhere else, a filter that only accepts the plural form: those are worth a line, because the next person will otherwise spend an afternoon rediscovering them. What the code plainly does needs no comment.

## No account to test against?

Open an issue with what you need checked and we will run it. Documentation fixes, typo corrections and ports to new languages are all reviewable without one.
