<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class CustomerTeamsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Agency and brokerage groupings above individual customers.
     */
    public function list(?string $search = null, ?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('customerTeams.list', array_filter([
            'search' => $search,
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
