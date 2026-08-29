<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class OrdersResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Publishes the listing and emails the agent.
     */
    public function deliver(string $orderId, string $confirm): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.deliver', array_filter([
            'orderId' => $orderId,
            'confirm' => $confirm,
        ], static fn ($value) => $value !== null));
    }

    /**
     * include=items.product is rejected. Product identity is only on the order item detail route.
     */
    public function get(string $orderId, ?array $include = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.get', array_filter([
            'orderId' => $orderId,
            'include' => $include,
        ], static fn ($value) => $value !== null));
    }

    /**
     * The job record: what was bought, when it is shot, who shoots it.
     *
     * There is no address, agents or group include here. The assigned photographer is appointments.users.
     *
     * Line items come back without any product identity. See orderItems.get.
     */
    public function list(?string $search = null, ?string $appointmentStartAtGte = null, ?string $appointmentStartAtLte = null, ?string $createdAtGte = null, ?string $createdAtLte = null, ?string $appointmentStatus = null, ?array $userIds = null, ?string $status = null, ?string $paymentStatus = null, ?string $fulfillmentStatus = null, ?string $listingId = null, ?array $include = null, ?string $sort = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.list', array_filter([
            'search' => $search,
            'appointmentStartAtGte' => $appointmentStartAtGte,
            'appointmentStartAtLte' => $appointmentStartAtLte,
            'createdAtGte' => $createdAtGte,
            'createdAtLte' => $createdAtLte,
            'appointmentStatus' => $appointmentStatus,
            'userIds' => $userIds,
            'status' => $status,
            'paymentStatus' => $paymentStatus,
            'fulfillmentStatus' => $fulfillmentStatus,
            'listingId' => $listingId,
            'include' => $include,
            'sort' => $sort,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Amount, upfront percentage, currency and tipping configuration.
     */
    public function paymentInfoGet(string $orderId): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.paymentInfo.get', array_filter([
            'orderId' => $orderId,
        ], static fn ($value) => $value !== null));
    }

    public function tagsAdd(string $orderId, string $tag_id, string $confirm): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.tags.add', array_filter([
            'orderId' => $orderId,
            'tag_id' => $tag_id,
            'confirm' => $confirm,
        ], static fn ($value) => $value !== null));
    }

    public function tagsRemove(string $orderId, string $tagId, string $confirm): \Envesko\Aryeo\Result
    {
        return $this->core->call('orders.tags.remove', array_filter([
            'orderId' => $orderId,
            'tagId' => $tagId,
            'confirm' => $confirm,
        ], static fn ($value) => $value !== null));
    }
}
