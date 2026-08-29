<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class ProductCategoriesResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Categories the product catalogue is organised into.
     */
    public function list(?string $search = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('productCategories.list', array_filter([
            'search' => $search,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
