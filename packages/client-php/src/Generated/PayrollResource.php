<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo\Generated;

use Envesko\Aryeo\Core;

final class PayrollResource
{
    public function __construct(private readonly Core $core)
    {
    }

    /**
     * Records a pay run item against an order and a team member.
     *
     * Aryeo renders neither newlines nor HTML in the title, so multi-line narrative has to use a visual separator.
     */
    public function itemsCreate(string $title, int $amount, string $submitted_date, string $company_team_member_id, string $order_id, string $confirm, ?string $note = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('payroll.items.create', array_filter([
            'title' => $title,
            'amount' => $amount,
            'submitted_date' => $submitted_date,
            'company_team_member_id' => $company_team_member_id,
            'order_id' => $order_id,
            'confirm' => $confirm,
            'note' => $note,
        ], static fn ($value) => $value !== null));
    }

    /**
     * Pay run items. Amounts are in minor units.
     *
     * The default record carries no order or team member. Ask for the includes.
     *
     * pay_run is an accepted include but came back empty on every account checked.
     *
     * orderId is accepted by the API and ignored, returning everything, so it is not offered here. Use orderIds.
     *
     * companyTeamMemberId is accepted by the API and ignored, returning everything, so it is not offered here. Use companyTeamMemberIds.
     *
     * userIds is accepted by the API and ignored, returning everything, so it is not offered here.
     *
     * createdAtGte is accepted by the API and ignored, returning everything, so it is not offered here. Use submittedDateGte.
     *
     * search is accepted by the API and ignored, returning everything, so it is not offered here.
     */
    public function itemsList(?array $orderIds = null, ?array $companyTeamMemberIds = null, ?string $submittedDateGte = null, ?string $submittedDateLte = null, ?array $include = null, ?string $sort = null, ?int $page = null, ?int $perPage = null): \Envesko\Aryeo\Result
    {
        return $this->core->call('payroll.items.list', array_filter([
            'orderIds' => $orderIds,
            'companyTeamMemberIds' => $companyTeamMemberIds,
            'submittedDateGte' => $submittedDateGte,
            'submittedDateLte' => $submittedDateLte,
            'include' => $include,
            'sort' => $sort,
            'page' => $page,
            'perPage' => $perPage,
        ], static fn ($value) => $value !== null));
    }
}
