# Security

## Reporting a vulnerability

Use [private vulnerability reporting](https://github.com/envesko/aryeo-sdk/security/advisories/new) on this repository. It is the fastest route and it keeps the report private until a fix is out.

Do not open a public issue for a security problem.

We aim to acknowledge within three working days and to agree a disclosure timeline with you before anything is published. If you would prefer email, ask in the advisory and we will move it there.

## What is in scope

This is a client library. The things that would matter most:

- A credential leaking into logs, error messages, exception traces or generated output.
- A path or query parameter that is interpolated without encoding, allowing a caller to reach an endpoint they did not intend.
- A dependency with a known advisory that we ship in a published package.
- Anything in `evidence/` that turns out to identify a real customer, property or account.

## What is not in scope

- Vulnerabilities in the Aryeo platform itself. Report those to Aryeo.
- Rate limiting or abuse of an account you control.
- Findings that require an attacker to already hold your API token.

## Handling credentials

An Aryeo API token grants full access to a company's orders, listings, customers and media. Treat one as you would a database password.

The probe tooling reads a token from the environment, never from a file it might commit, and redacts it from everything it prints. If you are adding tooling that touches a token, redact at the transport layer rather than at each call site: a real incident in the estate this SDK came from was caused by a generic error handler logging a whole request, headers included.

Never commit a raw probe response. `evidence/` holds counts and shapes, and CI refuses anything credential shaped.
