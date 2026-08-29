<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

/**
 * Every operation the manifest describes, including the ones that cannot be
 * called. The unusable ones are kept so the client can explain why, rather
 * than failing as an unknown name.
 */
final class Operations
{
    public const BASE_URL = 'https://api.aryeo.com/v1';

    public const PER_PAGE_MAX = 100;

    /** @var array<string, array<string, mixed>> */
    public const ALL = [
        'appointments.availability.get' => ['path' => '/appointments/{appointmentId}/availability', 'method' => 'GET', 'availability' => 'available', 'params' => ['assignee_id', 'duration']],
        'appointments.cancel' => ['path' => '/appointments/{appointmentId}/cancel', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false, 'body' => ['reason', 'notify_customer']],
        'appointments.create' => ['path' => '/appointments/store', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false, 'body' => ['order_id', 'start_at', 'end_at', 'notify_customer']],
        'appointments.get' => ['path' => '/appointments/{appointmentId}', 'method' => 'GET', 'availability' => 'available'],
        'appointments.list' => ['path' => '/appointments', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'perPageMax' => 100, 'filters' => ['startAtGte' => ['state' => 'honoured', 'wire' => 'filter[start_at_gte]'], 'startAtLte' => ['state' => 'honoured', 'wire' => 'filter[start_at_lte]'], 'search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'status' => ['state' => 'ignored', 'strategy' => 'client-side'], 'orderId' => ['state' => 'ignored', 'strategy' => 'unsupported', 'useInstead' => 'orders.get'], 'tense' => ['state' => 'rejected']], 'includes' => ['order', 'order.address', 'order.customer', 'order.customerGroup', 'order.customerTeamMembership', 'order.listing', 'order.items', 'order.items.appointment', 'order.tags', 'owner', 'users', 'items', 'company', 'companyTeamMembers', 'companyTeamMembers.user', 'appointment_attendances', 'appointment_attendances.company_team_member']],
        'appointments.reschedule' => ['path' => '/appointments/{appointmentId}/reschedule', 'method' => 'PUT', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false, 'body' => ['start_at', 'notify_customer']],
        'appointments.tourLink.get' => ['path' => '/appointments/{appointmentId}/3dh-tour-link', 'method' => 'GET', 'availability' => 'available'],
        'companyTeamMembers.events.list' => ['path' => '/company-team-members/{memberId}/events', 'method' => 'GET', 'availability' => 'available', 'params' => ['start', 'end']],
        'companyTeamMembers.get' => ['path' => '/company-team-members/{memberId}', 'method' => 'GET', 'availability' => 'available', 'includes' => ['company', 'company.feature_flags', 'restrictedCustomers']],
        'companyTeamMembers.list' => ['path' => '/company-team-members', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'includes' => ['company', 'company.feature_flags', 'restrictedCustomers']],
        'coupons.list' => ['path' => '/coupons', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'includes' => ['promotion_codes', 'discountables']],
        'customerTeams.list' => ['path' => '/customer-teams', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]']], 'includes' => ['createdBy', 'memberships', 'membershipsCount', 'pricing_plan', 'adminMembershipsCount', 'tags']],
        'customerUsers.list' => ['path' => '/customer-users', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'includes' => ['active_customer_team_memberships', 'active_customer_team_memberships.user', 'active_customer_team_memberships.customer_team', 'customer_team_memberships', 'customer_team_memberships.user']],
        'customers.create' => ['path' => '/customers', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'email', 'exercisedHere' => false, 'body' => ['owner_first_name', 'owner_last_name', 'email', 'phone']],
        'customers.get' => ['path' => '/customers/{customerId}', 'method' => 'GET', 'availability' => 'available', 'includes' => ['users', 'team_members', 'customer_teams', 'customer_team_memberships', 'customer_team_memberships.customer_team', 'custom_field_entries', 'custom_field_entries.custom_field', 'social_profiles', 'billing_address', 'sso_users']],
        'customers.list' => ['path' => '/customers', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'email' => ['state' => 'honoured', 'wire' => 'filter[email]']], 'includes' => ['users', 'team_members', 'customer_teams', 'customer_team_memberships', 'customer_team_memberships.customer_team', 'custom_field_entries', 'custom_field_entries.custom_field', 'social_profiles', 'billing_address', 'sso_users']],
        'listings.cubicasa.get' => ['path' => '/listings/{listingId}/cubi-casa', 'method' => 'GET', 'availability' => 'available'],
        'listings.details.get' => ['path' => '/listings/{listingId}/details/search', 'method' => 'GET', 'availability' => 'available'],
        'listings.get' => ['path' => '/listings/{listingId}', 'method' => 'GET', 'availability' => 'available', 'includes' => ['customers', 'customers.owner', 'list_agent', 'co_list_agent', 'images', 'videos', 'floor_plans', 'files', 'interactive_content', 'property_website', 'orders', 'orders.items', 'orders.appointments', 'marketing_materials', 'esoft_order_lines']],
        'listings.list' => ['path' => '/listings', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'perPageMax' => 100, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'status' => ['state' => 'honoured', 'wire' => 'filter[status]'], 'deliveryStatus' => ['state' => 'honoured', 'wire' => 'filter[delivery_status]']], 'includes' => ['customers', 'customers.owner', 'list_agent', 'list_agent.social_profiles', 'list_agent.owner', 'co_list_agent', 'co_list_agent.social_profiles', 'co_list_agent.owner', 'images', 'videos', 'floor_plans', 'files', 'interactive_content', 'property_website', 'orders', 'orders.items', 'orders.appointments', 'marketing_materials', 'marketing_materials.exports', 'esoft_order_lines']],
        'listings.stats.get' => ['path' => '/listings/{listingId}/stats', 'method' => 'GET', 'availability' => 'available'],
        'orderForms.list' => ['path' => '/order-forms', 'method' => 'GET', 'availability' => 'available', 'paginated' => true],
        'orderItems.get' => ['path' => '/order-items/{orderItemId}', 'method' => 'GET', 'availability' => 'available', 'includes' => ['product', 'product_variant', 'order', 'order.company', 'appointment', 'taxes', 'discount_amounts', 'discount_amounts.discount', 'discount_amounts.discount.coupon', 'tasks', 'tasks.company_team_member', 'tasks.company_team_member.user']],
        'orders.create' => ['path' => '/orders', 'method' => 'POST', 'availability' => 'unverified', 'mutates' => true, 'confirmField' => 'number'],
        'orders.deliver' => ['path' => '/orders/{orderId}/deliver', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false],
        'orders.get' => ['path' => '/orders/{orderId}', 'method' => 'GET', 'availability' => 'available', 'includes' => ['items', 'tags', 'customer', 'customerGroup', 'listing', 'appointments', 'appointments.users', 'unconfirmed_appointments', 'order_form', 'discounts', 'discounts.coupon', 'payments', 'taxes']],
        'orders.list' => ['path' => '/orders', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'perPageMax' => 100, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'appointmentStartAtGte' => ['state' => 'honoured', 'wire' => 'filter[appointment_start_at_gte]'], 'appointmentStartAtLte' => ['state' => 'honoured', 'wire' => 'filter[appointment_start_at_lte]'], 'createdAtGte' => ['state' => 'honoured', 'wire' => 'filter[created_at_gte]'], 'createdAtLte' => ['state' => 'honoured', 'wire' => 'filter[created_at_lte]'], 'appointmentStatus' => ['state' => 'honoured', 'wire' => 'filter[appointment_status]'], 'userIds' => ['state' => 'honoured', 'wire' => 'filter[user_ids]', 'arrayForm' => 'indexed'], 'status' => ['state' => 'honoured', 'wire' => 'filter[status]'], 'paymentStatus' => ['state' => 'honoured', 'wire' => 'filter[payment_status]'], 'fulfillmentStatus' => ['state' => 'honoured', 'wire' => 'filter[fulfillment_status]'], 'listingId' => ['state' => 'ignored', 'strategy' => 'client-side']], 'includes' => ['items', 'itemsCount', 'itemsExists', 'tags', 'tagsCount', 'tagsExists', 'customer', 'customerGroup', 'listing', 'appointments', 'appointments.users', 'unconfirmed_appointments', 'order_form', 'discounts', 'discounts.coupon', 'payments', 'taxes'], 'sorts' => ['appointment_start', '-appointment_start', 'created_at', '-created_at']],
        'orders.paymentInfo.get' => ['path' => '/orders/{orderId}/payment-info', 'method' => 'GET', 'availability' => 'available'],
        'orders.tags.add' => ['path' => '/orders/{orderId}/tags', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false, 'body' => ['tag_id']],
        'orders.tags.remove' => ['path' => '/orders/{orderId}/tags/{tagId}', 'method' => 'DELETE', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false],
        'payroll.items.create' => ['path' => '/payroll/pay-run-items', 'method' => 'POST', 'availability' => 'available', 'mutates' => true, 'confirmField' => 'number', 'exercisedHere' => false, 'body' => ['title', 'amount', 'submitted_date', 'company_team_member_id', 'order_id', 'note']],
        'payroll.items.get' => ['path' => '/payroll/pay-run-items/{payRunItemId}', 'method' => 'GET', 'availability' => 'unauthorised'],
        'payroll.items.list' => ['path' => '/payroll/pay-run-items', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'perPageMax' => 100, 'filters' => ['orderIds' => ['state' => 'honoured', 'wire' => 'filter[order_ids]', 'arrayForm' => 'indexed'], 'companyTeamMemberIds' => ['state' => 'honoured', 'wire' => 'filter[company_team_member_ids]', 'arrayForm' => 'indexed'], 'submittedDateGte' => ['state' => 'honoured', 'wire' => 'filter[submitted_date_gte]'], 'submittedDateLte' => ['state' => 'honoured', 'wire' => 'filter[submitted_date_lte]'], 'orderId' => ['state' => 'ignored', 'useInstead' => 'orderIds'], 'companyTeamMemberId' => ['state' => 'ignored', 'useInstead' => 'companyTeamMemberIds'], 'userIds' => ['state' => 'ignored', 'strategy' => 'unsupported'], 'createdAtGte' => ['state' => 'ignored', 'strategy' => 'unsupported', 'useInstead' => 'submittedDateGte'], 'search' => ['state' => 'ignored', 'strategy' => 'unsupported'], 'status' => ['state' => 'rejected', 'strategy' => 'client-side']], 'includes' => ['company_team_member', 'company_team_member.user', 'companyTeamMember', 'companyTeamMember.user', 'created_by_company_team_member', 'created_by_company_team_member.user', 'createdByCompanyTeamMember', 'createdByCompanyTeamMember.user', 'order', 'order.address', 'order.customer', 'owner', 'pay_run'], 'sorts' => ['created_at', '-created_at']],
        'payroll.runs.list' => ['path' => '/payroll/pay-runs', 'method' => 'GET', 'availability' => 'absent'],
        'productCategories.list' => ['path' => '/product-categories', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]']]],
        'products.list' => ['path' => '/products', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'type' => ['state' => 'honoured', 'wire' => 'filter[type]']], 'includes' => ['categories', 'order_form_categories', 'order_form_categories.order_form', 'providers']],
        'scheduling.availableDates.list' => ['path' => '/scheduling/available-dates', 'method' => 'GET', 'availability' => 'available', 'filters' => ['startAt' => ['state' => 'honoured', 'wire' => 'filter[start_at]'], 'endAt' => ['state' => 'honoured', 'wire' => 'filter[end_at]'], 'timeframe' => ['state' => 'rejected']], 'params' => ['timezone', 'interval', 'duration']],
        'scheduling.availableTimeslots.list' => ['path' => '/scheduling/available-timeslots', 'method' => 'GET', 'availability' => 'available', 'params' => ['timezone', 'date', 'interval', 'duration']],
        'tags.list' => ['path' => '/tags', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['type' => ['state' => 'honoured', 'wire' => 'filter[type]']]],
        'tasks.get' => ['path' => '/tasks/{taskId}', 'method' => 'GET', 'availability' => 'available'],
        'tasks.list' => ['path' => '/tasks', 'method' => 'GET', 'availability' => 'available', 'paginated' => true, 'filters' => ['search' => ['state' => 'honoured', 'wire' => 'filter[search]'], 'orderId' => ['state' => 'ignored', 'strategy' => 'unsupported', 'useInstead' => 'orderItems.get'], 'status' => ['state' => 'ignored', 'strategy' => 'unsupported'], 'isComplete' => ['state' => 'ignored', 'strategy' => 'unsupported']]],
        'territories.list' => ['path' => '/territories', 'method' => 'GET', 'availability' => 'available', 'paginated' => true],
    ];

    /** @return array<string, mixed>|null */
    public static function get(string $operationId): ?array
    {
        return self::ALL[$operationId] ?? null;
    }
}
