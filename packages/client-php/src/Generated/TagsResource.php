<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class TagsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Tag definitions. Resolve a name to an id here before tagging an order.
     *
     * Absent from the published API documentation, but stable and in daily production use.
     */
    public function list(?string $type = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('tags.list', array_filter([
            'type' => $type,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
