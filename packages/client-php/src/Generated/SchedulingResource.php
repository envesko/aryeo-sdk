<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class SchedulingResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Which days have availability across a range. Answers a whole window in one request.
     *
     * Prefer this before available-timeslots: it covers a range in one call, while timeslots takes one day per call.
     */
    public function availableDatesList(string $timezone, int $interval, ?string $startAt = null, ?string $endAt = null, ?int $duration = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('scheduling.availableDates.list', array_filter([
            'timezone' => $timezone,
            'interval' => $interval,
            'startAt' => $startAt,
            'endAt' => $endAt,
            'duration' => $duration,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Bookable start times on one day.
     *
     * One day per request. Passing an order id is refused.
     *
     * Aryeo does not derive appointment length from the order. Whoever calls owns the duration, so derive it from the line items.
     */
    public function availableTimeslotsList(string $timezone, string $date, int $interval, int $duration): \Envesko\Aryeo\Result
    {
        return $this->core->call('scheduling.availableTimeslots.list', array_filter([
            'timezone' => $timezone,
            'date' => $date,
            'interval' => $interval,
            'duration' => $duration,
        ], static fn ($value) => $value !== null));
    }
}
