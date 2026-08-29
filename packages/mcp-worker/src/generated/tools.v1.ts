// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

export interface ToolDefinition {
  name: string;
  operationId: string;
  description: string;
  inputSchema: Record<string, unknown>;
  mutates?: boolean;
}

/**
 * 39 tools, one per callable operation. Adding an operation to the
 * manifest adds a tool here; there is no hand-maintained list to fall behind.
 */
export const TOOLS: ToolDefinition[] = [
  {
    "name": "appointments_availability_get",
    "operationId": "appointments.availability.get",
    "description": "Whether a given team member can take this appointment at a given length. Returns a single flag, has_conflicts.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "assignee_id": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "duration": {
          "type": "integer"
        }
      },
      "required": [
        "appointmentId",
        "assignee_id",
        "duration"
      ]
    }
  },
  {
    "name": "appointments_cancel",
    "operationId": "appointments.cancel",
    "description": "Cancels an appointment somebody is expecting. Read can_cancel and the lock period flags from appointments.get first. WRITE. Cancels the appointment in Aryeo. Anybody holding that slot is told it is gone. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "reason": {
          "type": "string"
        },
        "notify_customer": {
          "type": "boolean"
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "appointmentId",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "appointments_create",
    "operationId": "appointments.create",
    "description": "Books an appointment against an existing order. Aryeo stores whatever span it is given and does not derive length from the order's products, so the caller owns the number. The order must already carry an address or the booking is refused. WRITE. Creates a real appointment. The customer is notified unless notify_customer is false. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "start_at": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "end_at": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z. Required. A duration field is accepted and silently discarded, so sending duration alone books nothing."
        },
        "notify_customer": {
          "type": "boolean"
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "order_id",
        "start_at",
        "end_at",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "appointments_get",
    "operationId": "appointments.get",
    "description": "One appointment, including whether it can still be cancelled or moved. Carries can_cancel, can_reschedule and the lock period flags. Read them before attempting either mutation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "appointmentId"
      ]
    }
  },
  {
    "name": "appointments_list",
    "operationId": "appointments.list",
    "description": "Shoots on the calendar, by date window or search. Filters applied by the API: startAtGte, startAtLte, search. status cannot be filtered by the API and is applied after fetching, over a bounded scan. Check meta.truncated before treating the result as complete. Do not look for orderId: the API accepts it and returns everything. Use orders.get. Do not look for tense: the API accepts it and returns everything. Valid include values: order, order.address, order.customer, order.customerGroup, order.customerTeamMembership, order.listing, order.items, order.items.appointment, order.tags, owner, users, items, company, companyTeamMembers, companyTeamMembers.user, appointment_attendances, appointment_attendances.company_team_member. Page size is capped at 100 by the API. The date filters are start_at_gte and start_at_lte. The orders spelling appointment_start_at_gte is accepted here and ignored. start_at is stored in UTC. A local calendar day must be converted to instants before filtering or the window lands hours out. The assigned photographer is users or companyTeamMembers. There is no customer, listing or address include; those are under order.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "startAtGte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "startAtLte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "search": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "description": "Applied after fetching; the API cannot filter on this. filter[status] and filter[appointment_status] both return the full collection."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "order",
              "order.address",
              "order.customer",
              "order.customerGroup",
              "order.customerTeamMembership",
              "order.listing",
              "order.items",
              "order.items.appointment",
              "order.tags",
              "owner",
              "users",
              "items",
              "company",
              "companyTeamMembers",
              "companyTeamMembers.user",
              "appointment_attendances",
              "appointment_attendances.company_team_member"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "appointments_reschedule",
    "operationId": "appointments.reschedule",
    "description": "Moves an appointment to a new start, keeping its length. Takes no duration. To change how long a shoot runs, cancel and rebook. Read can_reschedule and the lock period flags from appointments.get first. WRITE. Moves a real appointment. Anybody holding the old slot is told it has changed. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "start_at": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "notify_customer": {
          "type": "boolean"
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "appointmentId",
        "start_at",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "appointments_tour_link_get",
    "operationId": "appointments.tourLink.get",
    "description": "The 3D tour link for an appointment, where one exists.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "appointmentId"
      ]
    }
  },
  {
    "name": "company_team_members_events_list",
    "operationId": "companyTeamMembers.events.list",
    "description": "A team member's calendar events over a window. Calendar events, which is not the same set as shoots. For what somebody is booked on, use orders.list with userIds.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "memberId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "start": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z. Plain dates are accepted as well as full timestamps."
        },
        "end": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        }
      },
      "required": [
        "memberId",
        "start",
        "end"
      ]
    }
  },
  {
    "name": "company_team_members_get",
    "operationId": "companyTeamMembers.get",
    "description": "One member of your company team. Valid include values: company, company.feature_flags, restrictedCustomers.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "memberId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "company",
              "company.feature_flags",
              "restrictedCustomers"
            ]
          }
        }
      },
      "required": [
        "memberId"
      ]
    }
  },
  {
    "name": "company_team_members_list",
    "operationId": "companyTeamMembers.list",
    "description": "Photographers, editors and staff. These ids are what orders.list filters on. Valid include values: company, company.feature_flags, restrictedCustomers. Page size is capped at 100 by the API. There is no company_user include; it is rejected. That data is nested by default.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "company",
              "company.feature_flags",
              "restrictedCustomers"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "coupons_list",
    "operationId": "coupons.list",
    "description": "Discount coupons defined for the company. Valid include values: promotion_codes, discountables. Page size is capped at 100 by the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "promotion_codes",
              "discountables"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "customer_teams_list",
    "operationId": "customerTeams.list",
    "description": "Agency and brokerage groupings above individual customers. Filters applied by the API: search. Valid include values: createdBy, memberships, pricing_plan, tags. Page size is capped at 100 by the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string"
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "createdBy",
              "memberships",
              "membershipsCount",
              "pricing_plan",
              "adminMembershipsCount",
              "tags"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "customer_users_list",
    "operationId": "customerUsers.list",
    "description": "The individual agents behind customer records, with contact details and account standing. Valid include values: active_customer_team_memberships, active_customer_team_memberships.user, active_customer_team_memberships.customer_team, customer_team_memberships, customer_team_memberships.user. Page size is capped at 100 by the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "active_customer_team_memberships",
              "active_customer_team_memberships.user",
              "active_customer_team_memberships.customer_team",
              "customer_team_memberships",
              "customer_team_memberships.user"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "customers_create",
    "operationId": "customers.create",
    "description": "Adds a customer, which in Aryeo means an agent or agency rather than an end consumer. A name field sent here is overwritten; Aryeo sets it from the first and last name. internal_notes is accepted and dropped. WRITE. Aryeo emails the owner an invitation immediately and also creates a customer team. The record stays inactive until they accept. Pass confirm set to the target's email to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "owner_first_name": {
          "type": "string"
        },
        "owner_last_name": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "phone": {
          "type": "string"
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's email to confirm this write."
        }
      },
      "required": [
        "owner_first_name",
        "owner_last_name",
        "email",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "customers_get",
    "operationId": "customers.get",
    "description": "One customer by id. Valid include values: users, team_members, customer_teams, customer_team_memberships, customer_team_memberships.customer_team, custom_field_entries, custom_field_entries.custom_field, social_profiles, billing_address, sso_users. Absent from the published API documentation but returns a full record.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customerId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "users",
              "team_members",
              "customer_teams",
              "customer_team_memberships",
              "customer_team_memberships.customer_team",
              "custom_field_entries",
              "custom_field_entries.custom_field",
              "social_profiles",
              "billing_address",
              "sso_users"
            ]
          }
        }
      },
      "required": [
        "customerId"
      ]
    }
  },
  {
    "name": "customers_list",
    "operationId": "customers.list",
    "description": "Customers, which in Aryeo means agents and agencies rather than end consumers. Filters applied by the API: search, email. Valid include values: users, team_members, customer_teams, customer_team_memberships, customer_team_memberships.customer_team, custom_field_entries, custom_field_entries.custom_field, social_profiles, billing_address, sso_users. Page size is capped at 100 by the API. There is no orders or listings include here.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "users",
              "team_members",
              "customer_teams",
              "customer_team_memberships",
              "customer_team_memberships.customer_team",
              "custom_field_entries",
              "custom_field_entries.custom_field",
              "social_profiles",
              "billing_address",
              "sso_users"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "listings_cubicasa_get",
    "operationId": "listings.cubicasa.get",
    "description": "Floor plan scan state: results, suggested match, current sync. Read only. Attaching a scan is an Aryeo admin operation; a bearer-authenticated POST is refused.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "listingId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "listingId"
      ]
    }
  },
  {
    "name": "listings_details_get",
    "operationId": "listings.details.get",
    "description": "Structured property details: bedrooms, bathrooms, square feet, year built, lot size. The path says search but it takes no query and returns the same five fields regardless.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "listingId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "listingId"
      ]
    }
  },
  {
    "name": "listings_get",
    "operationId": "listings.get",
    "description": "One listing, with whatever relationships you ask to expand. Valid include values: customers, customers.owner, list_agent, co_list_agent, images, videos, floor_plans, files, interactive_content, property_website, orders, orders.items, orders.appointments, marketing_materials, esoft_order_lines. Media expansions are large. A delivered listing routinely carries thirty or more images, each with several sizes. Ask for one media type at a time.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "listingId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "customers",
              "customers.owner",
              "list_agent",
              "co_list_agent",
              "images",
              "videos",
              "floor_plans",
              "files",
              "interactive_content",
              "property_website",
              "orders",
              "orders.items",
              "orders.appointments",
              "marketing_materials",
              "esoft_order_lines"
            ]
          }
        }
      },
      "required": [
        "listingId"
      ]
    }
  },
  {
    "name": "listings_list",
    "operationId": "listings.list",
    "description": "The property and everything shot for it. Filters applied by the API: search, status, deliveryStatus. Valid include values: customers, customers.owner, list_agent, list_agent.social_profiles, list_agent.owner, co_list_agent, co_list_agent.social_profiles, co_list_agent.owner, images, videos, floor_plans, files, interactive_content, property_website, orders, orders.items, orders.appointments, marketing_materials, marketing_materials.exports, esoft_order_lines. Page size is capped at 100 by the API. An unrecognised status value is ignored rather than rejected and returns the full collection, which reads exactly like an unsupported filter. Probe with a real value. There is no address, agents, group or downloads include. The agent is list_agent.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string",
          "description": "Matches address and MLS number."
        },
        "status": {
          "type": "string",
          "enum": [
            "draft",
            "coming_soon",
            "for_lease",
            "for_sale",
            "pending_sale",
            "pending_lease",
            "for_rent",
            "sold",
            "leased",
            "off_market"
          ]
        },
        "deliveryStatus": {
          "type": "string",
          "enum": [
            "delivered",
            "undelivered"
          ]
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "customers",
              "customers.owner",
              "list_agent",
              "list_agent.social_profiles",
              "list_agent.owner",
              "co_list_agent",
              "co_list_agent.social_profiles",
              "co_list_agent.owner",
              "images",
              "videos",
              "floor_plans",
              "files",
              "interactive_content",
              "property_website",
              "orders",
              "orders.items",
              "orders.appointments",
              "marketing_materials",
              "marketing_materials.exports",
              "esoft_order_lines"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "listings_stats_get",
    "operationId": "listings.stats.get",
    "description": "Property website engagement. Returns camelCase keys under main_listing_stats, unlike the rest of the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "listingId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "listingId"
      ]
    }
  },
  {
    "name": "order_forms_list",
    "operationId": "orderForms.list",
    "description": "Public booking page templates, with their live URLs and settings. This endpoint does not validate include values, so none are offered. Page size is capped at 100 by the API. Accepts an unknown include with a 200 rather than returning an allowlist, so its expansions cannot be discovered from outside.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "order_items_get",
    "operationId": "orderItems.get",
    "description": "A single line item, and the only route that exposes the catalogue product behind it. Valid include values: product, product_variant, order, order.company, appointment, taxes, discount_amounts, discount_amounts.discount, discount_amounts.discount.coupon, tasks, tasks.company_team_member, tasks.company_team_member.user. product_variant.duration is the configured shoot length for that line, which is what appointment length should be derived from. This is also the only reliable way to reach the tasks attached to an order.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderItemId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "product",
              "product_variant",
              "order",
              "order.company",
              "appointment",
              "taxes",
              "discount_amounts",
              "discount_amounts.discount",
              "discount_amounts.discount.coupon",
              "tasks",
              "tasks.company_team_member",
              "tasks.company_team_member.user"
            ]
          }
        }
      },
      "required": [
        "orderItemId"
      ]
    }
  },
  {
    "name": "orders_deliver",
    "operationId": "orders.deliver",
    "description": "Publishes the listing and emails the agent. WRITE. Publishes the Aryeo listing and emails the agent. They see it within seconds and it cannot be recalled. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "orderId",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "orders_get",
    "operationId": "orders.get",
    "description": "One order, with whatever relationships you ask to expand. Valid include values: items, tags, customer, customerGroup, listing, appointments, appointments.users, unconfirmed_appointments, order_form, discounts, discounts.coupon, payments, taxes. include=items.product is rejected. Product identity is only on the order item detail route.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "items",
              "tags",
              "customer",
              "customerGroup",
              "listing",
              "appointments",
              "appointments.users",
              "unconfirmed_appointments",
              "order_form",
              "discounts",
              "discounts.coupon",
              "payments",
              "taxes"
            ]
          }
        }
      },
      "required": [
        "orderId"
      ]
    }
  },
  {
    "name": "orders_list",
    "operationId": "orders.list",
    "description": "The job record: what was bought, when it is shot, who shoots it. Filters applied by the API: search, appointmentStartAtGte, appointmentStartAtLte, createdAtGte, createdAtLte, appointmentStatus, userIds, status, paymentStatus, fulfillmentStatus. listingId cannot be filtered by the API and is applied after fetching, over a bounded scan. Check meta.truncated before treating the result as complete. Valid include values: items, tags, customer, customerGroup, listing, appointments, appointments.users, unconfirmed_appointments, order_form, discounts, discounts.coupon, payments, taxes. Sort by: appointment_start, -appointment_start, created_at, -created_at. Page size is capped at 100 by the API. There is no address, agents or group include here. The assigned photographer is appointments.users. Line items come back without any product identity. See orderItems.get.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string",
          "description": "Matches order number and address."
        },
        "appointmentStartAtGte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "appointmentStartAtLte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "createdAtGte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "createdAtLte": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "appointmentStatus": {
          "type": "string",
          "enum": [
            "scheduled",
            "unscheduled",
            "canceled"
          ]
        },
        "userIds": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Company team member ids. This is how you ask what one photographer shot."
        },
        "status": {
          "type": "string",
          "enum": [
            "open",
            "draft",
            "canceled",
            "confirmed"
          ],
          "description": "Filters the order lifecycle, which is not the same field as the response status. Most live orders are open even though their response status reads CONFIRMED."
        },
        "paymentStatus": {
          "type": "string",
          "enum": [
            "paid",
            "unpaid",
            "partially_paid"
          ]
        },
        "fulfillmentStatus": {
          "type": "string",
          "enum": [
            "fulfilled",
            "unfulfilled",
            "partially_fulfilled"
          ]
        },
        "listingId": {
          "type": "string",
          "description": "Applied after fetching; the API cannot filter on this. An Aryeo UUID. filter[listing_id], filter[listing] and filter[listing_ids][] were each accepted and each returned the full collection."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "items",
              "itemsCount",
              "itemsExists",
              "tags",
              "tagsCount",
              "tagsExists",
              "customer",
              "customerGroup",
              "listing",
              "appointments",
              "appointments.users",
              "unconfirmed_appointments",
              "order_form",
              "discounts",
              "discounts.coupon",
              "payments",
              "taxes"
            ]
          }
        },
        "sort": {
          "type": "string",
          "enum": [
            "appointment_start",
            "-appointment_start",
            "created_at",
            "-created_at"
          ]
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "orders_payment_info_get",
    "operationId": "orders.paymentInfo.get",
    "description": "Amount, upfront percentage, currency and tipping configuration.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "orderId"
      ]
    }
  },
  {
    "name": "orders_tags_add",
    "operationId": "orders.tags.add",
    "description": "Attaches a tag to an order. Tags drive automation in connected systems, so adding one can have effects beyond Aryeo. WRITE. Tagging an order can trigger downstream automation in connected systems. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "tag_id": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "orderId",
        "tag_id",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "orders_tags_remove",
    "operationId": "orders.tags.remove",
    "description": "Detaches a tag from an order. Removing a tag can equally trigger or suppress downstream automation. WRITE. Removing a tag can equally trigger or suppress downstream automation. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "tagId": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "orderId",
        "tagId",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "payroll_items_create",
    "operationId": "payroll.items.create",
    "description": "Records a pay run item against an order and a team member. Aryeo renders neither newlines nor HTML in the title, so multi-line narrative has to use a visual separator. WRITE. Records money owed against a real order and a real person. Pass confirm set to the target's number to prove you have read the record first. This route is described from production usage and has not been exercised by the SDK authors.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string"
        },
        "amount": {
          "type": "integer",
          "description": "Cents. The production caller multiplies its own major-unit figure by 100."
        },
        "submitted_date": {
          "type": "string",
          "description": "YYYY-MM-DD."
        },
        "company_team_member_id": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "order_id": {
          "type": "string",
          "description": "An Aryeo UUID."
        },
        "note": {
          "type": "string",
          "description": "Sometimes refused. The production caller retries with the note merged into the title."
        },
        "confirm": {
          "type": "string",
          "description": "Echo the target's number to confirm this write."
        }
      },
      "required": [
        "title",
        "amount",
        "submitted_date",
        "company_team_member_id",
        "order_id",
        "confirm"
      ]
    },
    "mutates": true
  },
  {
    "name": "payroll_items_list",
    "operationId": "payroll.items.list",
    "description": "Pay run items. Amounts are in minor units. Filters applied by the API: orderIds, companyTeamMemberIds, submittedDateGte, submittedDateLte. Do not look for orderId: the API accepts it and returns everything. Use orderIds. Do not look for companyTeamMemberId: the API accepts it and returns everything. Use companyTeamMemberIds. Do not look for userIds: the API accepts it and returns everything. Do not look for createdAtGte: the API accepts it and returns everything. Use submittedDateGte. Do not look for search: the API accepts it and returns everything. Do not look for status: the API accepts it and returns everything. Valid include values: company_team_member, company_team_member.user, companyTeamMember, companyTeamMember.user, created_by_company_team_member, created_by_company_team_member.user, createdByCompanyTeamMember, createdByCompanyTeamMember.user, order, order.address, order.customer, owner, pay_run. Sort by: created_at, -created_at. Page size is capped at 100 by the API. The default record carries no order or team member. Ask for the includes. pay_run is an accepted include but came back empty on every account checked.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "companyTeamMemberIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "submittedDateGte": {
          "type": "string",
          "description": "YYYY-MM-DD."
        },
        "submittedDateLte": {
          "type": "string",
          "description": "YYYY-MM-DD."
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "company_team_member",
              "company_team_member.user",
              "companyTeamMember",
              "companyTeamMember.user",
              "created_by_company_team_member",
              "created_by_company_team_member.user",
              "createdByCompanyTeamMember",
              "createdByCompanyTeamMember.user",
              "order",
              "order.address",
              "order.customer",
              "owner",
              "pay_run"
            ]
          }
        },
        "sort": {
          "type": "string",
          "enum": [
            "created_at",
            "-created_at"
          ]
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "product_categories_list",
    "operationId": "productCategories.list",
    "description": "Categories the product catalogue is organised into. Filters applied by the API: search. Page size is capped at 100 by the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string"
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "products_list",
    "operationId": "products.list",
    "description": "The service catalogue. Variants carry the configured shoot duration. Filters applied by the API: search, type. Valid include values: categories, order_form_categories, order_form_categories.order_form, providers. Page size is capped at 100 by the API. There is no single product route. Use search to locate one. variants is not an include; it is already in the default response.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string"
        },
        "type": {
          "type": "string",
          "enum": [
            "main",
            "addon"
          ]
        },
        "include": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "categories",
              "order_form_categories",
              "order_form_categories.order_form",
              "providers"
            ]
          }
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "scheduling_available_dates_list",
    "operationId": "scheduling.availableDates.list",
    "description": "Which days have availability across a range. Answers a whole window in one request. Filters applied by the API: startAt, endAt. Do not look for timeframe: the API accepts it and returns everything. Prefer this before available-timeslots: it covers a range in one call, while timeslots takes one day per call.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "startAt": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "endAt": {
          "type": "string",
          "description": "ISO 8601, for example 2026-08-10T00:00:00Z."
        },
        "timezone": {
          "type": "string"
        },
        "interval": {
          "type": "integer"
        },
        "duration": {
          "type": "integer"
        }
      },
      "required": [
        "timezone",
        "interval"
      ]
    }
  },
  {
    "name": "scheduling_available_timeslots_list",
    "operationId": "scheduling.availableTimeslots.list",
    "description": "Bookable start times on one day. One day per request. Passing an order id is refused. Aryeo does not derive appointment length from the order. Whoever calls owns the duration, so derive it from the line items.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "timezone": {
          "type": "string"
        },
        "date": {
          "type": "string",
          "description": "YYYY-MM-DD."
        },
        "interval": {
          "type": "integer"
        },
        "duration": {
          "type": "integer",
          "description": "Sizes each returned slot. There is no default; the caller owns this number."
        }
      },
      "required": [
        "timezone",
        "date",
        "interval",
        "duration"
      ]
    }
  },
  {
    "name": "tags_list",
    "operationId": "tags.list",
    "description": "Tag definitions. Resolve a name to an id here before tagging an order. Filters applied by the API: type. Page size is capped at 100 by the API. Absent from the published API documentation, but stable and in daily production use.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "order",
            "product",
            "customer_team"
          ]
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "tasks_get",
    "operationId": "tasks.get",
    "description": "One task: the work assigned against an order line, with its due and completion state.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "taskId": {
          "type": "string",
          "description": "An Aryeo UUID."
        }
      },
      "required": [
        "taskId"
      ]
    }
  },
  {
    "name": "tasks_list",
    "operationId": "tasks.list",
    "description": "Per-item work assignments: editing, delivery prep, package completion. Filters applied by the API: search. Do not look for orderId: the API accepts it and returns everything. Use orderItems.get. Do not look for status: the API accepts it and returns everything. Do not look for isComplete: the API accepts it and returns everything. This endpoint does not validate include values, so none are offered. Page size is capped at 100 by the API. Almost nothing filters here. Only search narrows; order id, status and completion are all accepted and ignored. There is no way to ask for one order's tasks. Use orderItems.get with the tasks include.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "search": {
          "type": "string"
        },
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  },
  {
    "name": "territories_list",
    "operationId": "territories.list",
    "description": "Service territories the company operates in. Page size is capped at 100 by the API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "perPage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      }
    }
  }
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));
