<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class TasksResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * One task: the work assigned against an order line, with its due and completion state.
     */
    public function get(string $taskId): \Envesko\Aryeo\Result
    {
        return $this->core->call('tasks.get', array_filter([
            'taskId' => $taskId,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Per-item work assignments: editing, delivery prep, package completion.
     *
     * Almost nothing filters here. Only search narrows; order id, status and completion are all accepted and ignored.
     *
     * There is no way to ask for one order's tasks. Use orderItems.get with the tasks include.
     *
     * orderId is accepted by the API and ignored, returning everything, so it is not offered here. Use orderItems.get.
     *
     * status is accepted by the API and ignored, returning everything, so it is not offered here.
     *
     * isComplete is accepted by the API and ignored, returning everything, so it is not offered here.
     */
    public function list(?string $search = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('tasks.list', array_filter([
            'search' => $search,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
