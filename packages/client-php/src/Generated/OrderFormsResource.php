<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class OrderFormsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Public booking page templates, with their live URLs and settings.
     *
     * Accepts an unknown include with a 200 rather than returning an allowlist, so its expansions cannot be discovered from outside.
     */
    public function list(?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('orderForms.list', array_filter([
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
