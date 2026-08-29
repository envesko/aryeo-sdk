<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class CompanyTeamMembersResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Calendar events, which is not the same set as shoots. For what somebody is booked on, use orders.list with userIds.
     */
    public function eventsList(string $memberId, string $start, string $end): \Envesko\Aryeo\Result
    {
        return $this->core->call('companyTeamMembers.events.list', array_filter([
            'memberId' => $memberId,
            'start' => $start,
            'end' => $end,
        ], static fn ($value) => $value !== null));
    }

    public function get(string $memberId, ?array $include = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('companyTeamMembers.get', array_filter([
            'memberId' => $memberId,
            'include' => $include,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Photographers, editors and staff. These ids are what orders.list filters on.
     *
     * There is no company_user include; it is rejected. That data is nested by default.
     */
    public function list(?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('companyTeamMembers.list', array_filter([
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
