# Blockers

Open questions that stop work, and unverified claims that must not be treated as settled. Anything here is a thing somebody has to decide or measure. Delete an entry when it is resolved, and move what was learned into the manifest.

## Waiting on an account or an owner

**Push is blocked on a missing token scope.** The repository exists at
`envesko/aryeo-sdk` with `main` as the default branch, but the first push is
rejected:

    refusing to allow an OAuth App to create or update workflow
    .github/workflows/ci.yml without `workflow` scope

The gh token holds `repo`, `read:org`, `gist` and `admin:public_key`. Adding a
scope needs the account owner to consent in a browser, so it cannot be done
from a script:

    gh auth refresh -h github.com -s workflow

**Private vulnerability reporting cannot be enabled yet.** GitHub offers it on
public repositories only, and the repository is currently private, so the API
returns 404. `SECURITY.md` and `CODE_OF_CONDUCT.md` both route reports through
it, and those links stay dead until the repository is made public. Enable it
immediately after flipping visibility:

    gh api -X PUT repos/envesko/aryeo-sdk/private-vulnerability-reporting

Worth setting the same thing as an organisation default so future repositories
get it without anybody remembering.

**SSH to GitHub is not working** for this machine (`Permission denied
(publickey)`), which is why `aryeo-mcp` cannot fetch or push. This repository
uses an HTTPS remote and the gh credential helper instead, so it is unaffected,
but the key is worth fixing.

**npm organisation.** `@envesko` must exist and be owned before the first publish. Scoped packages default to private, so every published package also needs `"publishConfig": { "access": "public" }`. Nothing in this repo can be published until this exists.

**Packagist vendor.** Claimed by the first submitted package. Submit this repository directly: `composer.json` is at the root and `.gitattributes` keeps everything that is not the PHP package out of the archive. No mirror repository is needed.

## Resolved

**Appointment cancellation method.** Settled 2026-08-29: POST is what the Envesko
production integrations send, and they are the authority on these routes. The manifest
records POST and the operation is callable behind the confirmation gate.

## Unverified, must be measured before it ships

**Order delivery has never been fired from here.** `POST /orders/{id}/deliver` publishes a listing and emails an agent. The contract comes from production code whose own author noted it was built but never tested against a live write. It is callable behind the confirmation gate and carries `exercisedHere: false`. Worth one deliberate run against an order that does not matter.

**Order creation body.** `POST /orders` is known to exist; its accepted fields are not enumerated. Guessing them creates malformed orders on a real account, so the manifest records the route with no body schema.

## Known behaviour with no route to a fix

**No pay run collection.** Every candidate path returns the path-not-found 404, and the `pay_run` relationship comes back empty on the accounts checked. There is nothing to build a pay run listing against. Revisit if a future account shows populated pay runs.

**Single pay run item is unauthorised.** `GET /payroll/pay-run-items/{id}` returns 401 for every id, with the same credential whose collection call succeeds. Clients resolve a single item through the collection instead.

**Endpoints a standard key cannot reach.** `/blocks` and `/taxes` return 401, `/scheduling/item-groupings` returns 403, `/scheduling/assignment` returns 500. Recorded in `evidence/2026-08-29-catalogue.json`. Re-probe with a differently scoped key before concluding they are unavailable to everyone.

**Regions.** `/regions` requires `filter[type]` and refuses every value tried, so the valid set cannot be discovered from outside. No client method is exposed.

**Endpoints that do not validate includes.** `/tasks` and `/order-forms` accept an unknown include with a 200 rather than returning an allowlist, so their real expansions are undiscoverable. Both are marked `includesUnvalidated` and expose no include parameter.

## Carried in from production experience

These are not blockers so much as things the clients must not get wrong. They are recorded in `evidence/2026-08-29-writes.json` and belong in the transport layer.

**Never log request headers.** A legacy error handler in the estate logged the full failing request for debugging, which put a live API key into a log table. Redaction belongs in the transport, not at each call site.

**Do not retry a 404 on a known record.** An order deleted upstream returns 404 forever, and a checker retried it in a loop. Retry only what is the API talking about its own problems: 429, 5xx and timeouts. A 404 on a record that is known to have existed should surface as a typed deleted-upstream error so callers reconcile.
