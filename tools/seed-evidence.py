"""One-off seeder for the 2026-08-29 probe evidence.

Kept in the repo so the shape of an evidence file is documented by example.
Counts are real; identifiers and customer data are not recorded.
"""
import io
import json
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "evidence")


def w(name, doc):
    doc = {
        "probedAt": "2026-08-29",
        "generation": "v1",
        "account": {
            "kind": "enterprise",
            "note": "Identifiers and customer data removed. Counts are real.",
        },
        **doc,
    }
    with io.open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, indent=2) + "\n")


w("2026-08-29-orders.json", {
    "endpoint": "/orders",
    "unfilteredTotal": 5383,
    "filters": [
        {"param": "filter[search]", "value": "<known order number>", "total": 1, "verdict": "honoured"},
        {"param": "filter[appointment_start_at_gte]+[_lte]", "value": "30 day window", "total": 278, "verdict": "honoured"},
        {"param": "filter[created_at_gte]+[_lte]", "value": "30 day window", "total": 310, "verdict": "honoured"},
        {"param": "filter[appointment_status]", "value": "scheduled", "total": 5072, "verdict": "honoured"},
        {"param": "filter[user_ids][0]", "value": "<7 team members, one at a time>",
         "totals": [0, 630, 38, 0, 3025, 275, 1342], "verdict": "honoured"},
        {"param": "filter[listing_id]", "total": 5383, "verdict": "ignored"},
        {"param": "sort=-appointment_start", "verdict": "honoured",
         "note": "ascending and descending return different first pages"},
    ],
    "pagination": [
        {"perPageRequested": 100, "returned": 100},
        {"perPageRequested": 200, "returned": 100},
        {"perPageRequested": 500, "returned": 100, "note": "server ceiling is 100"},
    ],
    "includeAllowlist": "items, itemsCount, itemsExists, tags, tagsCount, tagsExists, customer, customerGroup, listing, appointments, appointments.users, unconfirmed_appointments, order_form, discounts, discounts.coupon, payments, taxes",
    "orderItemShape": {
        "keysOnOrderPayload": ["amount", "description", "gross_total_amount", "id", "is_canceled",
                               "is_serviceable", "object", "purchasable_type", "quantity",
                               "sub_title", "subtitle", "title", "unit_price_amount"],
        "note": "No product_id and no nested product. include=items.product is rejected.",
        "detailRoute": {"path": "/order-items/{id}?include=product,product_variant",
                        "productIdPresent": True, "productVariantDuration": 30},
    },
})

w("2026-08-29-listings.json", {
    "endpoint": "/listings",
    "unfilteredTotal": 5112,
    "filters": [
        {"param": "filter[status]", "value": "for_sale", "total": 37, "verdict": "honoured"},
        {"param": "filter[status]", "value": "sold", "total": 3, "verdict": "honoured"},
        {"param": "filter[status]", "value": "off_market", "total": 0, "verdict": "honoured"},
        {"param": "filter[status]", "value": "__bogus__", "total": 5112, "verdict": "ignored",
         "note": "An unrecognised VALUE is ignored exactly like an unrecognised NAME. This is why a junk probe value proves nothing."},
        {"param": "filter[delivery_status]", "value": "delivered", "total": 4949, "verdict": "honoured"},
        {"param": "filter[delivery_status]", "value": "undelivered", "total": 161, "verdict": "honoured"},
    ],
    "includeAllowlist": "customers, customers.owner, list_agent, list_agent.social_profiles, list_agent.owner, co_list_agent, co_list_agent.social_profiles, co_list_agent.owner, images, videos, floor_plans, files, interactive_content, property_website, orders, orders.items, orders.appointments, marketing_materials, marketing_materials.exports, esoft_order_lines",
    "subResources": [
        {"path": "/listings/{id}/stats", "http": 200,
         "shape": "main_listing_stats: totalUsers, totalViews, topReferrer, allReferrers, avgTimeOnPage",
         "note": "camelCase keys, unlike the rest of the API"},
        {"path": "/listings/{id}/details/search", "http": 200,
         "shape": "bedrooms, bathrooms, square_feet, year_built, lot_size_acres",
         "note": "takes no query despite the path"},
        {"path": "/listings/{id}/cubi-casa", "http": 200,
         "shape": "results, suggested, current_sync, show_all"},
    ],
    "mediaVolume": {"sampledListing": "delivered", "images": 31, "floorPlans": 2, "videos": 0,
                    "imageKeys": ["caption", "display_in_gallery", "filename", "id", "index",
                                  "large_url", "object", "original_url", "thumbnail_url"]},
})

w("2026-08-29-appointments.json", {
    "endpoint": "/appointments",
    "unfilteredTotal": 5422,
    "filters": [
        {"param": "filter[start_at_gte]+[_lte]", "value": "7 day window", "total": 66, "verdict": "honoured"},
        {"param": "filter[search]", "total": 3, "verdict": "honoured"},
        {"param": "filter[appointment_start_at_gte]+[_lte]", "total": 5422, "verdict": "ignored",
         "note": "This is the /orders spelling. Accepted here and ignored."},
        {"param": "filter[status]", "value": "scheduled", "total": 5422, "verdict": "ignored"},
        {"param": "filter[appointment_status]", "value": "scheduled", "total": 5422, "verdict": "ignored"},
        {"param": "filter[tense]", "http": 422, "verdict": "rejected",
         "body": "The selected filter.tense is invalid."},
    ],
    "includeAllowlist": "order.customerGroup, owner, appointment_attendances, appointment_attendances.company_team_member, users, company, companyCount, companyExists, items, itemsCount, itemsExists, companyTeamMembers, companyTeamMembersCount, companyTeamMembersExists, companyTeamMembers.user, companyTeamMembers.restrictedUsers, order, orderCount, orderExists, order.address, order.customer, order.customer.ownerCustomerTeamMember, order.customer.ownerCustomerTeamMember.user, order.customerTeamMembership, order.customerTeamMembership.customerTeam, order.customerTeamMembership.user, order.listing, order.items, order.items.appointment, order.tags",
    "detailRoute": {
        "path": "/appointments/{id}", "http": 200,
        "keys": ["appointment_attendances", "can_cancel", "can_reschedule", "customer_choice_enabled",
                 "deleted_at", "description", "duration", "end_at", "id",
                 "initial_assigned_company_team_member_id", "initial_requested_company_team_member_ids",
                 "is_within_cancellation_lock_period", "is_within_rescheduling_lock_period", "items",
                 "late_cancellation_fee", "order", "postponed_at", "preference_type",
                 "previous_start_at", "requires_confirmation", "rescheduled_at", "start_at",
                 "status", "title", "updated_at", "user_has_appointments_manage_permission"],
    },
    "availabilityRoute": {"path": "/appointments/{id}/availability",
                          "requires": ["assignee_id", "duration"], "http": 200,
                          "body": {"has_conflicts": False}},
    "scheduling": [
        {"path": "/scheduling/available-dates",
         "requires": ["timezone", "interval", "filter[start_at]", "filter[end_at]"],
         "http": 200, "result": "6 available dates over a 7 day window",
         "note": "filter[timeframe] is named in validation messages but every value tried was refused"},
        {"path": "/scheduling/available-timeslots",
         "requires": ["timezone", "date", "interval", "duration"],
         "note": "one day per request; passing an order id is refused"},
    ],
    "timezone": {"storage": "UTC",
                 "note": "A local calendar day must be converted to instants before filtering, or the window lands hours out."},
})

w("2026-08-29-payroll.json", {
    "endpoint": "/payroll/pay-run-items",
    "unfilteredTotal": 2404,
    "filters": [
        {"param": "filter[order_ids][0]", "total": 1, "verdict": "honoured",
         "note": "every returned item belonged to the requested order"},
        {"param": "filter[order_id]", "total": 2404, "verdict": "ignored",
         "note": "singular spelling does nothing"},
        {"param": "filter[company_team_member_ids][0]", "total": 2, "verdict": "honoured"},
        {"param": "filter[company_team_member_id]", "total": 2404, "verdict": "ignored"},
        {"param": "filter[user_ids][0]", "total": 2404, "verdict": "ignored"},
        {"param": "filter[submitted_date_gte]+[_lte]", "value": "one month", "total": 287, "verdict": "honoured"},
        {"param": "filter[created_at_gte]+[_lte]", "total": 2404, "verdict": "ignored"},
        {"param": "filter[search]", "total": 2404, "verdict": "ignored"},
        {"param": "filter[status]", "http": 422, "verdict": "rejected",
         "body": "The selected filter.status is invalid."},
        {"param": "sort", "http": 400, "verdict": "rejected",
         "body": "Allowed sort(s) are created_at."},
    ],
    "recordShape": {
        "default": ["object", "id", "title", "amount", "status", "submitted_date"],
        "note": "no order and no team member without includes; amount is in minor units",
        "statusValuesObserved": {"OUTSTANDING": 10, "SUBMITTED": 86, "DRAFT": 4},
    },
    "includeAllowlist": "companyTeamMember, companyTeamMemberCount, companyTeamMemberExists, companyTeamMember.user, createdByCompanyTeamMember, createdByCompanyTeamMemberCount, createdByCompanyTeamMemberExists, createdByCompanyTeamMember.user, order, orderCount, orderExists, order.address, order.customer, owner, ownerCount, ownerExists, created_by_company_team_member, created_by_company_team_member.user, company_team_member, company_team_member.user, pay_run",
    "routes": [
        {"path": "/payroll/pay-run-items/{id}", "http": 401, "verdict": "unauthorised",
         "note": "refused for every id tried, with the same credential whose collection call succeeds"},
        {"path": "/payroll/pay-runs", "http": 404, "verdict": "absent"},
        {"path": "/pay-runs", "http": 404, "verdict": "absent"},
        {"path": "/payrolls", "http": 404, "verdict": "absent"},
        {"path": "/payroll-items", "http": 404, "verdict": "absent"},
        {"path": "/payroll/runs", "http": 404, "verdict": "absent"},
    ],
    "payRunInclude": {"accepted": True, "value": None,
                      "note": "returned null on every row sampled"},
})

w("2026-08-29-directory.json", {
    "endpoints": [
        {"path": "/customers", "total": 988,
         "filters": [
             {"param": "filter[search]", "value": "a", "total": 115, "verdict": "honoured"},
             {"param": "filter[email]", "value": "<address not on the account>", "total": 0, "verdict": "honoured"},
         ],
         "includeAllowlist": "users, team_members, customer_teams, customer_team_memberships, customer_team_memberships.customer_team, custom_field_entries, custom_field_entries.custom_field, social_profiles, billing_address, sso_users"},
        {"path": "/customer-users", "total": 988,
         "note": "same population as /customers, different projection",
         "includeAllowlist": "active_customer_team_memberships, active_customer_team_memberships.user, active_customer_team_memberships.customer_team, customer_team_memberships, customer_team_memberships.user"},
        {"path": "/customer-teams", "total": 956,
         "includeAllowlist": "createdBy, createdByCount, createdByExists, memberships, membershipsCount, membershipsExists, pricing_plan, adminMembershipsCount, tags, tagsCount, tagsExists"},
        {"path": "/company-team-members", "total": 7,
         "recordKeys": ["calendar_color", "company_user", "external_id", "id",
                        "is_service_provider", "object", "permissions", "restrictions"],
         "includeAllowlist": "company, companyCount, companyExists, company.feature_flags, restrictedCustomers",
         "note": "include=company_user is rejected; company_user is nested by default"},
        {"path": "/company-team-members/{id}/events", "requires": ["start", "end"], "http": 200,
         "note": "plain dates accepted as well as full timestamps"},
    ],
})

w("2026-08-29-catalogue.json", {
    "endpoints": [
        {"path": "/products", "total": 13,
         "filters": [{"param": "filter[type]", "value": "main", "total": 8, "verdict": "honoured"}],
         "includeAllowlist": "categories, order_form_categories, order_form_categories.order_form, providers",
         "note": "no single product route; GET /products/{id} returns the plain text 404"},
        {"path": "/product-categories", "http": 200},
        {"path": "/coupons", "total": 1, "includeAllowlist": "promotion_codes, discountables"},
        {"path": "/order-forms", "total": 3, "includesUnvalidated": True,
         "note": "an unknown include returns 200 instead of an allowlist"},
        {"path": "/territories", "total": 2},
        {"path": "/tags", "total": 22,
         "filters": [
             {"param": "filter[type]", "value": "order", "total": 16, "verdict": "honoured"},
             {"param": "filter[type]", "value": "product", "total": 3, "verdict": "honoured"},
             {"param": "filter[type]", "value": "customer_team", "total": 1, "verdict": "honoured"},
         ],
         "recordKeys": ["color", "font_color", "id", "name", "object", "slug", "type"]},
    ],
    "unreachableWithStandardKey": [
        {"path": "/blocks", "http": 401},
        {"path": "/taxes", "http": 401},
        {"path": "/scheduling/item-groupings", "http": 403},
        {"path": "/scheduling/assignment", "http": 500},
        {"path": "/regions", "http": 422,
         "note": "filter[type] is required and scheduling, delivery, service and appointment were all refused as invalid, so the valid set is undiscoverable from outside"},
    ],
})

w("2026-08-29-tasks.json", {
    "endpoint": "/tasks",
    "unfilteredTotal": 8699,
    "recordKeys": ["completed_at", "description", "due_at", "id", "is_completed",
                   "name", "pay_run_item_amount", "quantity"],
    "filters": [
        {"param": "filter[search]", "value": "edit", "total": 26, "verdict": "honoured"},
        {"param": "filter[order_id]", "total": 8699, "verdict": "ignored"},
        {"param": "filter[order_ids][0]", "total": 8699, "verdict": "ignored"},
        {"param": "filter[status]", "value": "incomplete", "total": 8699, "verdict": "ignored"},
        {"param": "filter[is_complete]", "value": "false", "total": 8699, "verdict": "ignored"},
    ],
    "includesUnvalidated": True,
    "note": "An unknown include returns 200 rather than an allowlist, so the expansions cannot be discovered. Tasks for one order are reachable via /order-items/{id}?include=tasks.",
})

w("2026-08-29-writes.json", {
    "source": "production",
    "note": "Read out of code running against live accounts in the Envesko estate. NOT exercised by this repository. No write request has been issued from here against any account.",
    "operations": [
        {"path": "/orders/{id}/deliver", "method": "POST",
         "effect": "publishes the listing and emails the agent",
         "origin": "opc src/Oms/Domain/Orders/AryeoWrites.php",
         "upstreamCaveat": "the originating class states it was built but not tested against a live write"},
        {"path": "/orders", "method": "POST", "effect": "creates an order upstream",
         "origin": "opc src/Oms/Domain/Orders/AryeoWrites.php",
         "bodyFields": "not enumerated; guessing them creates malformed orders on a real account"},
        {"path": "/appointments/{id}/cancel", "method": "POST",
         "effect": "cancels an appointment",
         "origin": "opc src/Oms/Domain/Orders/AryeoWrites.php",
         "conflict": "an earlier MCP implementation used PUT for this route. Neither has been confirmed. Resolve before generating."},
        {"path": "/orders/{id}/tags", "method": "POST", "body": {"tag_id": "uuid"},
         "origin": "opc usersc/includes/custom_functions.php addTagToOrder"},
        {"path": "/orders/{id}/tags/{tagId}", "method": "DELETE",
         "origin": "opc usersc/includes/custom_functions.php removeTagFromOrder"},
        {"path": "/payroll/pay-run-items", "method": "POST",
         "body": {"title": "string", "amount": "minor units", "submitted_date": "date",
                  "company_team_member_id": "uuid", "order_id": "uuid", "note": "string, optional"},
         "origin": "opc usersc/includes/custom_functions.php createAryeoPayRunItem",
         "note": "a rejected note field is retried merged into title"},
    ],
    "operationalFindings": [
        {"finding": "A legacy error handler logged the full failing request including headers, which put a live API key into a log table.",
         "rule": "Redact credentials at the transport layer, never log request headers."},
        {"finding": "Orders deleted upstream return 404 forever, and a checker retried them in a loop.",
         "rule": "Retry only what is the API talking about its own problems: 429, 5xx and timeouts. Surface a 404 on a known record as a typed deleted-upstream error so callers reconcile instead of retrying."},
    ],
})

print("evidence written to " + OUT)
