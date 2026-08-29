<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class AppointmentsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Whether a given team member can take this appointment at a given length.
     *
     * Returns a single flag, has_conflicts.
     */
    public function availabilityGet(string $appointmentId, string $assignee_id, int $duration): \Envesko\Aryeo\Result
    {
        return $this->core->call('appointments.availability.get', array_filter([
            'appointmentId' => $appointmentId,
            'assignee_id' => $assignee_id,
            'duration' => $duration,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Carries can_cancel, can_reschedule and the lock period flags. Read them before attempting either mutation.
     */
    public function get(string $appointmentId): \Envesko\Aryeo\Result
    {
        return $this->core->call('appointments.get', array_filter([
            'appointmentId' => $appointmentId,
        ], static fn ($value) => $value !== null));
    }

    /**
     * The date filters are start_at_gte and start_at_lte. The orders spelling appointment_start_at_gte is accepted here and ignored.
     *
     * start_at is stored in UTC. A local calendar day must be converted to instants before filtering or the window lands hours out.
     *
     * The assigned photographer is users or companyTeamMembers. There is no customer, listing or address include; those are under order.
     *
     * orderId is accepted by the API and ignored, returning everything, so it is not offered here. Use orders.get.
     */
    public function list(?string $startAtGte = null, ?string $startAtLte = null, ?string $search = null, ?string $status = null, ?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('appointments.list', array_filter([
            'startAtGte' => $startAtGte,
            'startAtLte' => $startAtLte,
            'search' => $search,
            'status' => $status,
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }

    /**
     * The 3D tour link for an appointment, where one exists.
     */
    public function tourLinkGet(string $appointmentId): \Envesko\Aryeo\Result
    {
        return $this->core->call('appointments.tourLink.get', array_filter([
            'appointmentId' => $appointmentId,
        ], static fn ($value) => $value !== null));
    }
}
