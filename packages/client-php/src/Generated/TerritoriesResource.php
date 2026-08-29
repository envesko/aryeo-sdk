<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class TerritoriesResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Service territories the company operates in.
     */
    public function list(?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('territories.list', array_filter([
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
