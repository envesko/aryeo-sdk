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
