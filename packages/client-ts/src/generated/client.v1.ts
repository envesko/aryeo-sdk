// Generated from manifest/generations/*.json. Do not edit.
// Run: npm run generate

import { AryeoCore, type ClientOptions, type Result } from "../core.js";
import type * as T from "./types.v1.js";

/**
 * Aryeo client for API generation v1.
 *
 * Every method here is generated from the manifest, so the surface cannot
 * drift from what the API was measured to do.
 */
export class AryeoClient {
  readonly #core: AryeoCore;

  constructor(options: ClientOptions) {
    this.#core = new AryeoCore(options);
  }

  /** Escape hatch for an operation with no generated method. */
  get core(): AryeoCore {
    return this.#core;
  }

  readonly appointments = {
    availability: {
      get: (params: T.AppointmentsAvailabilityGetParams): Promise<Result<unknown>> =>
        this.#core.call("appointments.availability.get", params),
    },
    cancel: (params: T.AppointmentsCancelParams): Promise<Result<unknown>> =>
      this.#core.call("appointments.cancel", params),
    create: (params: T.AppointmentsCreateParams): Promise<Result<unknown>> =>
      this.#core.call("appointments.create", params),
    get: (params: T.AppointmentsGetParams): Promise<Result<unknown>> =>
      this.#core.call("appointments.get", params),
    list: (params: T.AppointmentsListParams): Promise<Result<unknown>> =>
      this.#core.call("appointments.list", params),
    reschedule: (params: T.AppointmentsRescheduleParams): Promise<Result<unknown>> =>
      this.#core.call("appointments.reschedule", params),
    tourLink: {
      get: (params: T.AppointmentsTourLinkGetParams): Promise<Result<unknown>> =>
        this.#core.call("appointments.tourLink.get", params),
    },
  };
  readonly companyTeamMembers = {
    events: {
      list: (params: T.CompanyTeamMembersEventsListParams): Promise<Result<unknown>> =>
        this.#core.call("companyTeamMembers.events.list", params),
    },
    get: (params: T.CompanyTeamMembersGetParams): Promise<Result<unknown>> =>
      this.#core.call("companyTeamMembers.get", params),
    list: (params: T.CompanyTeamMembersListParams): Promise<Result<unknown>> =>
      this.#core.call("companyTeamMembers.list", params),
  };
  readonly coupons = {
    list: (params: T.CouponsListParams): Promise<Result<unknown>> =>
      this.#core.call("coupons.list", params),
  };
  readonly customerTeams = {
    list: (params: T.CustomerTeamsListParams): Promise<Result<unknown>> =>
      this.#core.call("customerTeams.list", params),
  };
  readonly customerUsers = {
    list: (params: T.CustomerUsersListParams): Promise<Result<unknown>> =>
      this.#core.call("customerUsers.list", params),
  };
  readonly customers = {
    create: (params: T.CustomersCreateParams): Promise<Result<unknown>> =>
      this.#core.call("customers.create", params),
    get: (params: T.CustomersGetParams): Promise<Result<unknown>> =>
      this.#core.call("customers.get", params),
    list: (params: T.CustomersListParams): Promise<Result<unknown>> =>
      this.#core.call("customers.list", params),
  };
  readonly listings = {
    cubicasa: {
      get: (params: T.ListingsCubicasaGetParams): Promise<Result<unknown>> =>
        this.#core.call("listings.cubicasa.get", params),
    },
    details: {
      get: (params: T.ListingsDetailsGetParams): Promise<Result<unknown>> =>
        this.#core.call("listings.details.get", params),
    },
    get: (params: T.ListingsGetParams): Promise<Result<unknown>> =>
      this.#core.call("listings.get", params),
    list: (params: T.ListingsListParams): Promise<Result<unknown>> =>
      this.#core.call("listings.list", params),
    stats: {
      get: (params: T.ListingsStatsGetParams): Promise<Result<unknown>> =>
        this.#core.call("listings.stats.get", params),
    },
  };
  readonly orderForms = {
    list: (params: T.OrderFormsListParams): Promise<Result<unknown>> =>
      this.#core.call("orderForms.list", params),
  };
  readonly orderItems = {
    get: (params: T.OrderItemsGetParams): Promise<Result<unknown>> =>
      this.#core.call("orderItems.get", params),
  };
  readonly orders = {
    deliver: (params: T.OrdersDeliverParams): Promise<Result<unknown>> =>
      this.#core.call("orders.deliver", params),
    get: (params: T.OrdersGetParams): Promise<Result<unknown>> =>
      this.#core.call("orders.get", params),
    list: (params: T.OrdersListParams): Promise<Result<unknown>> =>
      this.#core.call("orders.list", params),
    paymentInfo: {
      get: (params: T.OrdersPaymentInfoGetParams): Promise<Result<unknown>> =>
        this.#core.call("orders.paymentInfo.get", params),
    },
    tags: {
      add: (params: T.OrdersTagsAddParams): Promise<Result<unknown>> =>
        this.#core.call("orders.tags.add", params),
      remove: (params: T.OrdersTagsRemoveParams): Promise<Result<unknown>> =>
        this.#core.call("orders.tags.remove", params),
    },
  };
  readonly payroll = {
    items: {
      create: (params: T.PayrollItemsCreateParams): Promise<Result<unknown>> =>
        this.#core.call("payroll.items.create", params),
      list: (params: T.PayrollItemsListParams): Promise<Result<unknown>> =>
        this.#core.call("payroll.items.list", params),
    },
  };
  readonly productCategories = {
    list: (params: T.ProductCategoriesListParams): Promise<Result<unknown>> =>
      this.#core.call("productCategories.list", params),
  };
  readonly products = {
    list: (params: T.ProductsListParams): Promise<Result<unknown>> =>
      this.#core.call("products.list", params),
  };
  readonly scheduling = {
    availableDates: {
      list: (params: T.SchedulingAvailableDatesListParams): Promise<Result<unknown>> =>
        this.#core.call("scheduling.availableDates.list", params),
    },
    availableTimeslots: {
      list: (params: T.SchedulingAvailableTimeslotsListParams): Promise<Result<unknown>> =>
        this.#core.call("scheduling.availableTimeslots.list", params),
    },
  };
  readonly tags = {
    list: (params: T.TagsListParams): Promise<Result<unknown>> =>
      this.#core.call("tags.list", params),
  };
  readonly tasks = {
    get: (params: T.TasksGetParams): Promise<Result<unknown>> =>
      this.#core.call("tasks.get", params),
    list: (params: T.TasksListParams): Promise<Result<unknown>> =>
      this.#core.call("tasks.list", params),
  };
  readonly territories = {
    list: (params: T.TerritoriesListParams): Promise<Result<unknown>> =>
      this.#core.call("territories.list", params),
  };
}

export function createClient(options: ClientOptions): AryeoClient {
  return new AryeoClient(options);
}
