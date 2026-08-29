<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class ListingsResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Floor plan scan state: results, suggested match, current sync.
     *
     * Read only. Attaching a scan is an Aryeo admin operation; a bearer-authenticated POST is refused.
     */
    public function cubicasaGet(string $listingId): \Envesko\Aryeo\Result
    {
        return $this->core->call('listings.cubicasa.get', array_filter([
            'listingId' => $listingId,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Structured property details: bedrooms, bathrooms, square feet, year built, lot size.
     *
     * The path says search but it takes no query and returns the same five fields regardless.
     */
    public function detailsGet(string $listingId): \Envesko\Aryeo\Result
    {
        return $this->core->call('listings.details.get', array_filter([
            'listingId' => $listingId,
        ], static fn ($value) => $value !== null));
    }

    /**
     * One listing, with whatever relationships you ask to expand.
     *
     * Media expansions are large. A delivered listing routinely carries thirty or more images, each with several sizes. Ask for one media type at a time.
     */
    public function get(string $listingId, ?array $include = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('listings.get', array_filter([
            'listingId' => $listingId,
            'include' => $include,
        ], static fn ($value) => $value !== null));
    }

    /**
     * The property and everything shot for it.
     *
     * An unrecognised status value is ignored rather than rejected and returns the full collection, which reads exactly like an unsupported filter. Probe with a real value.
     *
     * There is no address, agents, group or downloads include. The agent is list_agent.
     */
    public function list(?string $search = null, ?string $status = null, ?string $deliveryStatus = null, ?array $include = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('listings.list', array_filter([
            'search' => $search,
            'status' => $status,
            'deliveryStatus' => $deliveryStatus,
            'include' => $include,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Property website engagement.
     *
     * Returns camelCase keys under main_listing_stats, unlike the rest of the API.
     */
    public function statsGet(string $listingId): \Envesko\Aryeo\Result
    {
        return $this->core->call('listings.stats.get', array_filter([
            'listingId' => $listingId,
        ], static fn ($value) => $value !== null));
    }
}
