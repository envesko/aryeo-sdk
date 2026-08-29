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
     * Adds a customer, which in Aryeo means an agent or agency rather than an end consumer.
     *
     * A name field sent here is overwritten; Aryeo sets it from the first and last name.
     *
     * internal_notes is accepted and dropped.
     */
    public function create(string $owner_first_name, string $owner_last_name, string $email, string $confirm, ?string $phone = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('customers.create', array_filter([
            'owner_first_name' => $owner_first_name,
            'owner_last_name' => $owner_last_name,
            'email' => $email,
            'confirm' => $confirm,
            'phone' => $phone,
        ], static fn ($value) => $value !== null));
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
