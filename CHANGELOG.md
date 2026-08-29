# Changelog

Notable changes to the published packages. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semantic versioning](https://semver.org/spec/v2.0.0.html).

The three version axes are described in [docs/versioning.md](docs/versioning.md). In short: a new Aryeo API generation landing is a **minor** release, because the surface you call does not change. Only removing something from the public surface is a major.

## Unreleased

### Added

- The capability manifest: 36 operations across orders, listings, appointments, scheduling, the customer directory, the catalogue, tags, tasks and payroll, with 44 filters recorded as honoured, ignored or rejected.
- Committed evidence for every measured claim, scrubbed of identifiers and customer data.
- A manifest validator that refuses a measured claim citing no evidence, a mutating operation with no confirmation contract, and an honoured array filter that does not record its array form.
- A credential scanner over `evidence/`, with a self-test so the heuristic cannot quietly rot.
- Public repository files: security policy, code of conduct, issue and pull request templates, dependency updates and ownership.

Nothing is published yet. There is no client to install until the emitters land.
