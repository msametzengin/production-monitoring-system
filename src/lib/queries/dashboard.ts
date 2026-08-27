import type { Prisma } from "@/generated/prisma/client";
import {
  getQueryValue,
  type FilterSearchParams,
} from "@/lib/filters";
import { parseProductionFilters } from "./production";
import { parseTargetFilters } from "./targets";
import { parseDowntimeFilters } from "./downtimes";

export function parseDashboardFilters(
  params: FilterSearchParams,
) {
  const values = {
    facilityId: getQueryValue(params, "facilityId"),
    productId: getQueryValue(params, "productId"),
    startDate: getQueryValue(params, "startDate"),
    endDate: getQueryValue(params, "endDate"),
  };

  const production = parseProductionFilters({
    ...values,
    status: "active",
  });

  const targets = parseTargetFilters({
    ...values,
    status: "active",
  });

  // Duruşlarda ürün ilişkisi bulunmuyor.
  const downtimes = parseDowntimeFilters({
    facilityId: values.facilityId,
    startDate: values.startDate,
    endDate: values.endDate,
  });

  const error =
    production.error ?? targets.error ?? downtimes.error;

  const facilityWhere: Prisma.FacilityWhereInput = {};

  if (!error) {
    if (values.facilityId) {
      facilityWhere.id = Number(values.facilityId);
    }

    if (values.productId) {
      facilityWhere.products = {
        some: {
          productId: Number(values.productId),
        },
      };
    }
  }

  return {
    values,
    error,
    facilityWhere: error ? null : facilityWhere,
    productionWhere: error ? null : production.where,
    targetWhere: error ? null : targets.where,
    downtimeWhere: error ? null : downtimes.where,
  };
}