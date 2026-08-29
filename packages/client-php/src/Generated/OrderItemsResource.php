<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class OrderItemsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * A single line item, and the only route that exposes the catalogue product behind it.
     *
     * product_variant.duration is the configured shoot length for that line, which is what appointment length should be derived from.
     *
     * This is also the only reliable way to reach the tasks attached to an order.
     */
    public function get(string $orderItemId, ?array $include = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('orderItems.get', array_filter([
            'orderItemId' => $orderItemId,
            'include' => $include,
        ], static fn ($value) => $value !== null));
    }
}
