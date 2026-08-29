<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class CustomersResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * One customer by id.
     *
     * Absent from the published API documentation but returns a full record.
     */
    public function get(string $customerId, ?array $include = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('customers.get', array_filter([
            'customerId' => $customerId,
            'include' => $include,
        ], static fn ($value) => $value !== null));
    }

    /**
     * There is no orders or listings include here.
     */
    public function list(?string $search = null, ?string $email = null, ?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('customers.list', array_filter([
            'search' => $search,
            'email' => $email,
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
