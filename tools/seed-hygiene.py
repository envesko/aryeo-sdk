"""One-off writer for the public repository files.

Kept so the set is reproducible and reviewable in one place.
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def w(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text.lstrip("\n"))
    print("wrote " + rel)


w("SECURITY.md", """
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
""")


w("CODE_OF_CONDUCT.md", """
# Code of conduct

## The short version

Be decent. Assume the person on the other end is trying to do good work with incomplete information, because they usually are.

## What is expected

- Keep discussion technical. Critique the code, the claim or the design, not the person.
- Disagree with reasons. "This is wrong" is not useful; "this returns the full collection when the filter is unsupported, here is the count" is.
- Accept that you may be the one who is wrong. This project exists partly because a confident wrong conclusion went unchallenged for months.
- Respect that maintainers have finite time. A slow response is not a slight.

## What is not acceptable

Harassment, personal attacks, discriminatory language, deliberate intimidation, sustained disruption, or publishing someone's private information.

## Scope

This applies in issues, pull requests, discussions, commit messages and any space where you are representing the project.

## Reporting

Report a problem through [private vulnerability reporting](https://github.com/envesko/aryeo-sdk/security/advisories/new), which is private and does not require an email address, or by contacting a maintainer directly.

Reports are handled confidentially. Maintainers will decide on a response, which may include a warning, a temporary block, or a permanent ban.

Maintainers who do not uphold this in good faith can expect the same consequences as anyone else.
""")


w(".github/PULL_REQUEST_TEMPLATE.md", """
## What this changes

<!-- One or two sentences. What is different afterwards. -->

## Type

- [ ] Manifest: a new or corrected description of the API
- [ ] Codegen or emitter
- [ ] Tooling
- [ ] Documentation
- [ ] Something else

## If this touches the manifest

- [ ] Probed against a live account, and the evidence file is committed
- [ ] Probed with a **real value**, and the result count is compared against the unfiltered total
- [ ] A conformance case covers the behaviour
- [ ] `npm test` passes
- [ ] Generated output regenerated and committed, if there is any

A reminder on the second box, because it is the one that goes wrong: an unrecognised filter **value** is ignored exactly like an unrecognised filter **name**. A junk probe value returns the full collection and looks identical to an unsupported filter.

## If this adds a mutating operation

- [ ] The contract comes from code already running in production, not from a live write
- [ ] Availability is marked `unverified` unless it has been exercised deliberately on a record that does not matter
- [ ] A confirmation contract is recorded

## Anything the reviewer should know

<!-- Surprises, open questions, things you were unsure about. -->
""")


w(".github/ISSUE_TEMPLATE/config.yml", """
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/envesko/aryeo-sdk/security/advisories/new
    about: Report privately. Please do not open a public issue.
  - name: Question about the Aryeo platform itself
    url: https://www.aryeo.com
    about: This project is independent and cannot answer questions about the platform, billing or accounts.
""")


w(".github/ISSUE_TEMPLATE/api-behaviour.yml", """
name: API behaviour report
description: The API does something the manifest does not describe, or describes wrongly.
labels: ["manifest"]
body:
  - type: markdown
    attributes:
      value: |
        This is the most valuable kind of report here. If your account behaves differently from ours, the manifest is wrong or incomplete.

  - type: input
    id: operation
    attributes:
      label: Operation
      description: The manifest id, or the path if it is not described yet.
      placeholder: orders.list, or GET /orders
    validations:
      required: true

  - type: dropdown
    id: kind
    attributes:
      label: What kind of difference
      options:
        - A filter behaves differently
        - A relationship expansion is accepted or rejected differently
        - A route exists or does not exist
        - A response shape differs
        - Something else
    validations:
      required: true

  - type: textarea
    id: measurement
    attributes:
      label: What you measured
      description: |
        Counts are what settle this. The unfiltered total, then the total with the parameter applied using a real value.
        Please remove tokens, customer names and addresses.
      placeholder: |
        GET /orders                                 -> 5383
        GET /orders?filter[thing]=<a real value>    -> 5383, so it did nothing
    validations:
      required: true

  - type: input
    id: scale
    attributes:
      label: Roughly how many records does the account hold
      description: Behaviour on forty records often differs from behaviour on five thousand.
      placeholder: about 5000 orders

  - type: textarea
    id: context
    attributes:
      label: Anything else
      description: Plan tier, region, or anything about the account that might explain the difference.
""")


w(".github/ISSUE_TEMPLATE/bug.yml", """
name: Bug in the SDK
description: A client, the codegen or the tooling misbehaves.
labels: ["bug"]
body:
  - type: dropdown
    id: package
    attributes:
      label: Package
      options:
        - "@envesko/aryeo-client"
        - "envesko/aryeo-php"
        - "aryeo-mcp-worker"
        - "@envesko/aryeo-manifest"
        - codegen or tooling
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: Version
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: What you expected, and what happened instead
    validations:
      required: true

  - type: textarea
    id: repro
    attributes:
      label: Smallest example that shows it
      description: Please remove tokens and customer data.
      render: text

  - type: input
    id: runtime
    attributes:
      label: Runtime
      placeholder: Node 22, PHP 8.3, Cloudflare Workers
""")


w(".github/dependabot.yml", """
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      # One pull request for routine development tooling rather than five.
      dev-dependencies:
        dependency-type: development
        update-types: ["minor", "patch"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
""")


w(".github/CODEOWNERS", """
# Everything, by default.
*                       @envesko

# The manifest is the source of truth for every generated client, so a change
# here changes all of them at once.
/manifest/              @envesko
/evidence/              @envesko

# Anything that decides what a mutating operation does, or that touches
# credential handling.
/tools/                 @envesko
/.github/workflows/     @envesko
/SECURITY.md            @envesko
""")


w("CHANGELOG.md", """
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
""")


print("\nhygiene files written")
