"""Makes the write operations callable, behind the confirmation gate.

They were all marked unverified, which the client treats as a hard block, so
none of them could be called and the confirmation gate had nothing to guard.
That was over-cautious in the wrong place: the contracts come from code that
has been running against live accounts for a long time, and the protection a
caller actually needs is the gate, not an absent method.

`unverified` now means what it should: the contract is not known. Where the
contract is known but this repository has never fired the request, that is
recorded as exercisedHere: false, which is a fact about us rather than about
the API.

orders.create stays unverified because its body fields genuinely are not
known, and guessing them creates malformed orders on somebody's account.
"""
import collections
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "manifest", "generations", "v1.json")

# Confirmed by the Envesko production integrations, which are the authority on
# these routes: they have been calling them for a long time.
PROMOTE = {
    "appointments.cancel": "POST is what the production integrations send. Confirmed 2026-08-29.",
    "appointments.create": None,
    "appointments.reschedule": None,
    "customers.create": None,
    "orders.deliver": None,
    "orders.tags.add": None,
    "orders.tags.remove": None,
    "payroll.items.create": None,
}


def main():
    manifest = json.load(io.open(PATH, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    changed = []

    for op_id, note in PROMOTE.items():
        op = manifest["operations"].get(op_id)
        if op is None:
            print("missing: " + op_id)
            continue

        op["availability"] = collections.OrderedDict([
            ("state", "available"),
            ("note", note or
                "Contract taken from the Envesko production integrations, which call this route "
                "against live accounts. Not fired from this repository."),
        ])
        op["exercisedHere"] = False
        changed.append(op_id)

    # The one whose body is genuinely unknown stays blocked.
    orders_create = manifest["operations"].get("orders.create")
    if orders_create is not None:
        orders_create["availability"]["note"] = (
            "The route exists, but its accepted body fields are not known. Guessing them creates "
            "malformed orders on a real account, so this stays uncallable until somebody records "
            "the contract."
        )

    manifest["operations"] = collections.OrderedDict(sorted(manifest["operations"].items()))
    io.open(PATH, "w", encoding="utf-8").write(json.dumps(manifest, indent=2) + "\n")

    print("callable now: " + ", ".join(changed))
    print("still blocked: orders.create (body unknown)")


if __name__ == "__main__":
    main()
