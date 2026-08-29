"""Adds the operations that were verified or read from production but never
written into the manifest.

Two candidates were deliberately left out, and the reason matters. Listing
media and order line items are not distinct API operations: they are
`listings.get` and `orders.get` with particular includes and a projection over
the response. Recording them here would be describing the client rather than
the API, which is the one thing the manifest must not do. They belong as
convenience methods over the operations that already exist.
"""
import collections
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "manifest", "generations", "v1.json")

CUSTOMER_INCLUDES = [
    "users", "team_members", "customer_teams",
    "customer_team_memberships", "customer_team_memberships.customer_team",
    "custom_field_entries", "custom_field_entries.custom_field",
    "social_profiles", "billing_address", "sso_users",
]

NEW = {
    "customers.get": {
        "path": "/customers/{customerId}",
        "method": "GET",
        "summary": "One customer by id.",
        "availability": {"state": "available"},
        "pathParams": {"customerId": {"type": "uuid", "required": True}},
        "includes": CUSTOMER_INCLUDES,
        "quirks": [
            "Absent from the published API documentation but returns a full record.",
        ],
        "evidence": {"file": "2026-08-29-directory.json", "date": "2026-08-29"},
    },

    "appointments.tourLink.get": {
        "path": "/appointments/{appointmentId}/3dh-tour-link",
        "method": "GET",
        "summary": "The 3D tour link for an appointment, where one exists.",
        "availability": {"state": "available"},
        "pathParams": {"appointmentId": {"type": "uuid", "required": True}},
        "evidence": {"file": "2026-08-29-appointments.json", "date": "2026-08-29"},
    },

    "customers.create": {
        "path": "/customers",
        "method": "POST",
        "summary": "Adds a customer, which in Aryeo means an agent or agency rather than an end consumer.",
        "availability": {
            "state": "unverified",
            "note": "Described from production code that reports having exercised it. Not exercised from this repository.",
        },
        "mutates": True,
        "confirmation": {
            "kind": "echoIdentifier",
            "field": "email",
            "warns": "Aryeo emails the owner an invitation immediately and also creates a customer team. The record stays inactive until they accept.",
        },
        "body": {
            "owner_first_name": {"type": "string", "required": True},
            "owner_last_name": {"type": "string", "required": True},
            "email": {"type": "string", "required": True},
            "phone": {"type": "string"},
        },
        "quirks": [
            "A name field sent here is overwritten; Aryeo sets it from the first and last name.",
            "internal_notes is accepted and dropped.",
        ],
        "evidence": {"file": "2026-08-29-writes.json", "date": "2026-08-29", "source": "production"},
    },

    "appointments.create": {
        "path": "/appointments/store",
        "method": "POST",
        "summary": "Books an appointment against an existing order.",
        "availability": {
            "state": "unverified",
            "note": "Described from production code. Not exercised from this repository, because booking one puts a real slot in somebody's calendar.",
        },
        "mutates": True,
        "confirmation": {
            "kind": "echoIdentifier",
            "field": "number",
            "warns": "Creates a real appointment. The customer is notified unless notify_customer is false.",
        },
        "body": {
            "order_id": {"type": "uuid", "required": True},
            "start_at": {"type": "datetime", "required": True},
            "end_at": {"type": "datetime", "required": True,
                       "note": "Required. A duration field is accepted and silently discarded, so sending duration alone books nothing."},
            "notify_customer": {"type": "boolean", "default": True},
        },
        "quirks": [
            "Aryeo stores whatever span it is given and does not derive length from the order's products, so the caller owns the number.",
            "The order must already carry an address or the booking is refused.",
        ],
        "evidence": {"file": "2026-08-29-writes.json", "date": "2026-08-29", "source": "production"},
    },

    "appointments.reschedule": {
        "path": "/appointments/{appointmentId}/reschedule",
        "method": "PUT",
        "summary": "Moves an appointment to a new start, keeping its length.",
        "availability": {
            "state": "unverified",
            "note": "Described from production code. The method is PUT here while cancellation is POST; both are unconfirmed. See BLOCKERS.md.",
        },
        "mutates": True,
        "confirmation": {
            "kind": "echoIdentifier",
            "field": "number",
            "warns": "Moves a real appointment. Anybody holding the old slot is told it has changed.",
        },
        "pathParams": {"appointmentId": {"type": "uuid", "required": True}},
        "body": {
            "start_at": {"type": "datetime", "required": True},
            "notify_customer": {"type": "boolean", "default": True},
        },
        "quirks": [
            "Takes no duration. To change how long a shoot runs, cancel and rebook.",
            "Read can_reschedule and the lock period flags from appointments.get first.",
        ],
        "evidence": {"file": "2026-08-29-writes.json", "date": "2026-08-29", "source": "production"},
    },

    "payroll.items.create": {
        "path": "/payroll/pay-run-items",
        "method": "POST",
        "summary": "Records a pay run item against an order and a team member.",
        "availability": {
            "state": "unverified",
            "note": "Described from production code that has written these for a long time. Not exercised from this repository: it records money owed to a person.",
        },
        "mutates": True,
        "confirmation": {
            "kind": "echoIdentifier",
            "field": "number",
            "warns": "Records money owed against a real order and a real person.",
        },
        "body": {
            "title": {"type": "string", "required": True},
            "amount": {"type": "money", "required": True, "units": "minor units",
                       "note": "Cents. The production caller multiplies its own major-unit figure by 100."},
            "submitted_date": {"type": "date", "required": True},
            "company_team_member_id": {"type": "uuid", "required": True},
            "order_id": {"type": "uuid", "required": True},
            "note": {"type": "string",
                     "note": "Sometimes refused. The production caller retries with the note merged into the title."},
        },
        "quirks": [
            "Aryeo renders neither newlines nor HTML in the title, so multi-line narrative has to use a visual separator.",
        ],
        "evidence": {"file": "2026-08-29-writes.json", "date": "2026-08-29", "source": "production"},
    },
}


def main():
    manifest = json.load(io.open(PATH, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    added = []
    for key, value in NEW.items():
        if key in manifest["operations"]:
            continue
        manifest["operations"][key] = value
        added.append(key)

    # Keep the table in a stable order so a diff stays readable.
    manifest["operations"] = collections.OrderedDict(sorted(manifest["operations"].items()))

    io.open(PATH, "w", encoding="utf-8").write(json.dumps(manifest, indent=2) + "\n")
    print("added: " + (", ".join(added) if added else "nothing, all present"))
    print("operations now: %d" % len(manifest["operations"]))


if __name__ == "__main__":
    main()
