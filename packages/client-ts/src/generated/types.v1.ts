// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

export type Generation = "v1";

export type OrdersListInclude = "items" | "itemsCount" | "itemsExists" | "tags" | "tagsCount" | "tagsExists" | "customer" | "customerGroup" | "listing" | "appointments" | "appointments.users" | "unconfirmed_appointments" | "order_form" | "discounts" | "discounts.coupon" | "payments" | "taxes";

export type OrdersListSort = "appointment_start" | "-appointment_start" | "created_at" | "-created_at";

/**
 * The job record: what was bought, when it is shot, who shoots it.
 *
 * There is no address, agents or group include here. The assigned photographer is appointments.users.
 *
 * Line items come back without any product identity. See orderItems.get.
 */
export interface OrdersListParams {
  search?: string;
  appointmentStartAtGte?: string;
  appointmentStartAtLte?: string;
  createdAtGte?: string;
  createdAtLte?: string;
  appointmentStatus?: "scheduled" | "unscheduled" | "canceled";
  userIds?: string[];
  status?: "open" | "draft" | "canceled" | "confirmed";
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  fulfillmentStatus?: "fulfilled" | "unfulfilled" | "partially_fulfilled";
  /** Applied by the client; the API does not filter on this. */
  listingId?: string;
  include?: OrdersListInclude[];
  sort?: OrdersListSort;
  page?: number;
  perPage?: number;
}

export type OrdersGetInclude = "items" | "tags" | "customer" | "customerGroup" | "listing" | "appointments" | "appointments.users" | "unconfirmed_appointments" | "order_form" | "discounts" | "discounts.coupon" | "payments" | "taxes";

/**
 *
 * include=items.product is rejected. Product identity is only on the order item detail route.
 */
export interface OrdersGetParams {
  orderId: string;
  include?: OrdersGetInclude[];
}

/**
 * Amount, upfront percentage, currency and tipping configuration.
 */
export interface OrdersPaymentInfoGetParams {
  orderId: string;
}

export type OrderItemsGetInclude = "product" | "product_variant" | "order" | "order.company" | "appointment" | "taxes" | "discount_amounts" | "discount_amounts.discount" | "discount_amounts.discount.coupon" | "tasks" | "tasks.company_team_member" | "tasks.company_team_member.user";

/**
 * A single line item, and the only route that exposes the catalogue product behind it.
 *
 * product_variant.duration is the configured shoot length for that line, which is what appointment length should be derived from.
 *
 * This is also the only reliable way to reach the tasks attached to an order.
 */
export interface OrderItemsGetParams {
  orderItemId: string;
  include?: OrderItemsGetInclude[];
}

export type ListingsListInclude = "customers" | "customers.owner" | "list_agent" | "list_agent.social_profiles" | "list_agent.owner" | "co_list_agent" | "co_list_agent.social_profiles" | "co_list_agent.owner" | "images" | "videos" | "floor_plans" | "files" | "interactive_content" | "property_website" | "orders" | "orders.items" | "orders.appointments" | "marketing_materials" | "marketing_materials.exports" | "esoft_order_lines";

/**
 * The property and everything shot for it.
 *
 * An unrecognised status value is ignored rather than rejected and returns the full collection, which reads exactly like an unsupported filter. Probe with a real value.
 *
 * There is no address, agents, group or downloads include. The agent is list_agent.
 */
export interface ListingsListParams {
  search?: string;
  status?: "draft" | "coming_soon" | "for_lease" | "for_sale" | "pending_sale" | "pending_lease" | "for_rent" | "sold" | "leased" | "off_market";
  deliveryStatus?: "delivered" | "undelivered";
  include?: ListingsListInclude[];
  page?: number;
  perPage?: number;
}

export type ListingsGetInclude = "customers" | "customers.owner" | "list_agent" | "co_list_agent" | "images" | "videos" | "floor_plans" | "files" | "interactive_content" | "property_website" | "orders" | "orders.items" | "orders.appointments" | "marketing_materials" | "esoft_order_lines";

/**
 *
 * Media expansions are large. A delivered listing routinely carries thirty or more images, each with several sizes. Ask for one media type at a time.
 */
export interface ListingsGetParams {
  listingId: string;
  include?: ListingsGetInclude[];
}

/**
 * Property website engagement.
 *
 * Returns camelCase keys under main_listing_stats, unlike the rest of the API.
 */
export interface ListingsStatsGetParams {
  listingId: string;
}

/**
 * Structured property details: bedrooms, bathrooms, square feet, year built, lot size.
 *
 * The path says search but it takes no query and returns the same five fields regardless.
 */
export interface ListingsDetailsGetParams {
  listingId: string;
}

/**
 * Floor plan scan state: results, suggested match, current sync.
 *
 * Read only. Attaching a scan is an Aryeo admin operation; a bearer-authenticated POST is refused.
 */
export interface ListingsCubicasaGetParams {
  listingId: string;
}

export type AppointmentsListInclude = "order" | "order.address" | "order.customer" | "order.customerGroup" | "order.customerTeamMembership" | "order.listing" | "order.items" | "order.items.appointment" | "order.tags" | "owner" | "users" | "items" | "company" | "companyTeamMembers" | "companyTeamMembers.user" | "appointment_attendances" | "appointment_attendances.company_team_member";

/**
 *
 * The date filters are start_at_gte and start_at_lte. The orders spelling appointment_start_at_gte is accepted here and ignored.
 *
 * start_at is stored in UTC. A local calendar day must be converted to instants before filtering or the window lands hours out.
 *
 * The assigned photographer is users or companyTeamMembers. There is no customer, listing or address include; those are under order.
 *
 * @remarks orderId is accepted and ignored, returning everything, so it is not offered here. Use orders.get instead.
 *
 * @remarks tense is rejected with a 422, so it is not offered here.
 */
export interface AppointmentsListParams {
  startAtGte?: string;
  startAtLte?: string;
  search?: string;
  /** Applied by the client; the API does not filter on this. */
  status?: string;
  include?: AppointmentsListInclude[];
  page?: number;
  perPage?: number;
}

/**
 *
 * Carries can_cancel, can_reschedule and the lock period flags. Read them before attempting either mutation.
 */
export interface AppointmentsGetParams {
  appointmentId: string;
}

/**
 * Whether a given team member can take this appointment at a given length.
 *
 * Returns a single flag, has_conflicts.
 */
export interface AppointmentsAvailabilityGetParams {
  appointmentId: string;
  assignee_id: string;
  duration: number;
}

/**
 * Which days have availability across a range. Answers a whole window in one request.
 *
 * Prefer this before available-timeslots: it covers a range in one call, while timeslots takes one day per call.
 *
 * @remarks timeframe is rejected with a 422, so it is not offered here.
 */
export interface SchedulingAvailableDatesListParams {
  startAt?: string;
  endAt?: string;
  timezone: string;
  interval: number;
  duration?: number;
}

/**
 * Bookable start times on one day.
 *
 * One day per request. Passing an order id is refused.
 *
 * Aryeo does not derive appointment length from the order. Whoever calls owns the duration, so derive it from the line items.
 */
export interface SchedulingAvailableTimeslotsListParams {
  timezone: string;
  date: string;
  interval: number;
  duration: number;
}

export type CustomersListInclude = "users" | "team_members" | "customer_teams" | "customer_team_memberships" | "customer_team_memberships.customer_team" | "custom_field_entries" | "custom_field_entries.custom_field" | "social_profiles" | "billing_address" | "sso_users";

/**
 *
 * There is no orders or listings include here.
 */
export interface CustomersListParams {
  search?: string;
  email?: string;
  include?: CustomersListInclude[];
  page?: number;
  perPage?: number;
}

export type CustomerUsersListInclude = "active_customer_team_memberships" | "active_customer_team_memberships.user" | "active_customer_team_memberships.customer_team" | "customer_team_memberships" | "customer_team_memberships.user";

/**
 * The individual agents behind customer records, with contact details and account standing.
 */
export interface CustomerUsersListParams {
  include?: CustomerUsersListInclude[];
  page?: number;
  perPage?: number;
}

export type CustomerTeamsListInclude = "createdBy" | "memberships" | "membershipsCount" | "pricing_plan" | "adminMembershipsCount" | "tags";

/**
 * Agency and brokerage groupings above individual customers.
 */
export interface CustomerTeamsListParams {
  search?: string;
  include?: CustomerTeamsListInclude[];
  page?: number;
  perPage?: number;
}

export type CompanyTeamMembersListInclude = "company" | "company.feature_flags" | "restrictedCustomers";

/**
 * Photographers, editors and staff. These ids are what orders.list filters on.
 *
 * There is no company_user include; it is rejected. That data is nested by default.
 */
export interface CompanyTeamMembersListParams {
  include?: CompanyTeamMembersListInclude[];
  page?: number;
  perPage?: number;
}

export type CompanyTeamMembersGetInclude = "company" | "company.feature_flags" | "restrictedCustomers";

export interface CompanyTeamMembersGetParams {
  memberId: string;
  include?: CompanyTeamMembersGetInclude[];
}

/**
 *
 * Calendar events, which is not the same set as shoots. For what somebody is booked on, use orders.list with userIds.
 */
export interface CompanyTeamMembersEventsListParams {
  memberId: string;
  start: string;
  end: string;
}

export type ProductsListInclude = "categories" | "order_form_categories" | "order_form_categories.order_form" | "providers";

/**
 * The service catalogue. Variants carry the configured shoot duration.
 *
 * There is no single product route. Use search to locate one.
 *
 * variants is not an include; it is already in the default response.
 */
export interface ProductsListParams {
  search?: string;
  type?: "main" | "addon";
  include?: ProductsListInclude[];
  page?: number;
  perPage?: number;
}

export interface ProductCategoriesListParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export type CouponsListInclude = "promotion_codes" | "discountables";

export interface CouponsListParams {
  include?: CouponsListInclude[];
  page?: number;
  perPage?: number;
}

/**
 * Public booking page templates, with their live URLs and settings.
 *
 * Accepts an unknown include with a 200 rather than returning an allowlist, so its expansions cannot be discovered from outside.
 */
export interface OrderFormsListParams {
  page?: number;
  perPage?: number;
}

export interface TerritoriesListParams {
  page?: number;
  perPage?: number;
}

/**
 * Tag definitions. Resolve a name to an id here before tagging an order.
 *
 * Absent from the published API documentation, but stable and in daily production use.
 */
export interface TagsListParams {
  type?: "order" | "product" | "customer_team";
  page?: number;
  perPage?: number;
}

/**
 * Per-item work assignments: editing, delivery prep, package completion.
 *
 * Almost nothing filters here. Only search narrows; order id, status and completion are all accepted and ignored.
 *
 * There is no way to ask for one order's tasks. Use orderItems.get with the tasks include.
 *
 * @remarks orderId is accepted and ignored, returning everything, so it is not offered here. Use orderItems.get instead.
 *
 * @remarks status is accepted and ignored, returning everything, so it is not offered here.
 *
 * @remarks isComplete is accepted and ignored, returning everything, so it is not offered here.
 */
export interface TasksListParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface TasksGetParams {
  taskId: string;
}

export type PayrollItemsListInclude = "company_team_member" | "company_team_member.user" | "companyTeamMember" | "companyTeamMember.user" | "created_by_company_team_member" | "created_by_company_team_member.user" | "createdByCompanyTeamMember" | "createdByCompanyTeamMember.user" | "order" | "order.address" | "order.customer" | "owner" | "pay_run";

export type PayrollItemsListSort = "created_at" | "-created_at";

/**
 * Pay run items. Amounts are in minor units.
 *
 * The default record carries no order or team member. Ask for the includes.
 *
 * pay_run is an accepted include but came back empty on every account checked.
 *
 * @remarks orderId is accepted and ignored, returning everything, so it is not offered here. Use orderIds instead.
 *
 * @remarks companyTeamMemberId is accepted and ignored, returning everything, so it is not offered here. Use companyTeamMemberIds instead.
 *
 * @remarks userIds is accepted and ignored, returning everything, so it is not offered here.
 *
 * @remarks createdAtGte is accepted and ignored, returning everything, so it is not offered here. Use submittedDateGte instead.
 *
 * @remarks search is accepted and ignored, returning everything, so it is not offered here.
 *
 * @remarks status is rejected with a 422, so it is not offered here.
 */
export interface PayrollItemsListParams {
  orderIds?: string[];
  companyTeamMemberIds?: string[];
  submittedDateGte?: string;
  submittedDateLte?: string;
  include?: PayrollItemsListInclude[];
  sort?: PayrollItemsListSort;
  page?: number;
  perPage?: number;
}
