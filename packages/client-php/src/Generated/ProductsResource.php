<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class ProductsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * The service catalogue. Variants carry the configured shoot duration.
     *
     * There is no single product route. Use search to locate one.
     *
     * variants is not an include; it is already in the default response.
     */
    public function list(?string $search = null, ?string $type = null, ?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('products.list', array_filter([
            'search' => $search,
            'type' => $type,
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
