<?php

declare(strict_types=1);

// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

namespace Envesko\Aryeo;

/**
 * Aryeo client for API generation v1.
 *
 * The surface matches the TypeScript client method for method, because both
 * are generated from the same description of the API.
 */
final class Client
{
    private ?Generated\AppointmentsResource $appointments = null;
    private ?Generated\CompanyTeamMembersResource $companyTeamMembers = null;
    private ?Generated\CouponsResource $coupons = null;
    private ?Generated\CustomerTeamsResource $customerTeams = null;
    private ?Generated\CustomerUsersResource $customerUsers = null;
    private ?Generated\CustomersResource $customers = null;
    private ?Generated\ListingsResource $listings = null;
    private ?Generated\OrderFormsResource $orderForms = null;
    private ?Generated\OrderItemsResource $orderItems = null;
    private ?Generated\OrdersResource $orders = null;
    private ?Generated\PayrollResource $payroll = null;
    private ?Generated\ProductCategoriesResource $productCategories = null;
    private ?Generated\ProductsResource $products = null;
    private ?Generated\SchedulingResource $scheduling = null;
    private ?Generated\TagsResource $tags = null;
    private ?Generated\TasksResource $tasks = null;
    private ?Generated\TerritoriesResource $territories = null;

    public function __construct(private readonly Core $core)
    {
    }

    public static function create(string $apiKey, array $options = []): self
    {
        return new self(new Core($apiKey, $options));
    }

    public function core(): Core
    {
        return $this->core;
    }

    public function appointments(): Generated\AppointmentsResource
    {
        return $this->appointments ??= new Generated\AppointmentsResource($this->core);
    }

    public function companyTeamMembers(): Generated\CompanyTeamMembersResource
    {
        return $this->companyTeamMembers ??= new Generated\CompanyTeamMembersResource($this->core);
    }

    public function coupons(): Generated\CouponsResource
    {
        return $this->coupons ??= new Generated\CouponsResource($this->core);
    }

    public function customerTeams(): Generated\CustomerTeamsResource
    {
        return $this->customerTeams ??= new Generated\CustomerTeamsResource($this->core);
    }

    public function customerUsers(): Generated\CustomerUsersResource
    {
        return $this->customerUsers ??= new Generated\CustomerUsersResource($this->core);
    }

    public function customers(): Generated\CustomersResource
    {
        return $this->customers ??= new Generated\CustomersResource($this->core);
    }

    public function listings(): Generated\ListingsResource
    {
        return $this->listings ??= new Generated\ListingsResource($this->core);
    }

    public function orderForms(): Generated\OrderFormsResource
    {
        return $this->orderForms ??= new Generated\OrderFormsResource($this->core);
    }

    public function orderItems(): Generated\OrderItemsResource
    {
        return $this->orderItems ??= new Generated\OrderItemsResource($this->core);
    }

    public function orders(): Generated\OrdersResource
    {
        return $this->orders ??= new Generated\OrdersResource($this->core);
    }

    public function payroll(): Generated\PayrollResource
    {
        return $this->payroll ??= new Generated\PayrollResource($this->core);
    }

    public function productCategories(): Generated\ProductCategoriesResource
    {
        return $this->productCategories ??= new Generated\ProductCategoriesResource($this->core);
    }

    public function products(): Generated\ProductsResource
    {
        return $this->products ??= new Generated\ProductsResource($this->core);
    }

    public function scheduling(): Generated\SchedulingResource
    {
        return $this->scheduling ??= new Generated\SchedulingResource($this->core);
    }

    public function tags(): Generated\TagsResource
    {
        return $this->tags ??= new Generated\TagsResource($this->core);
    }

    public function tasks(): Generated\TasksResource
    {
        return $this->tasks ??= new Generated\TasksResource($this->core);
    }

    public function territories(): Generated\TerritoriesResource
    {
        return $this->territories ??= new Generated\TerritoriesResource($this->core);
    }
}
