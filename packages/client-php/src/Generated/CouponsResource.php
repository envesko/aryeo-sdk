<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class CouponsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    public function list(?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('coupons.list', array_filter([
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
