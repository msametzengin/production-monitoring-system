import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  filterDateSchema,
  filterIdSchema,
  filterSearchSchema,
  getQueryValue,
  type FilterSearchParams,
} from "@/lib/filters";

const targetFiltersSchema = z
  .object({
    q: filterSearchSchema,
    facilityId: filterIdSchema,
    productId: filterIdSchema,
    startDate: filterDateSchema,
    endDate: filterDateSchema,

    period: z.enum(
      ["all", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"],
      {
        message: "Geçerli bir hedef dönemi seçmelisiniz.",
      },
    ),

    status: z.enum(["all", "active", "inactive"], {
      message: "Geçerli bir hedef durumu seçmelisiniz.",
    }),
  })
  .superRefine((data, context) => {
    if (
      data.startDate &&
      data.endDate &&
      data.endDate < data.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "Bitiş tarihi başlangıç tarihinden önce olamaz.",
      });
    }
  });

export function parseTargetFilters(
  params: FilterSearchParams,
) {
  const values = {
    q: getQueryValue(params, "q"),
    facilityId: getQueryValue(params, "facilityId"),
    productId: getQueryValue(params, "productId"),
    startDate: getQueryValue(params, "startDate"),
    endDate: getQueryValue(params, "endDate"),
    period: getQueryValue(params, "period") || "all",
    status: getQueryValue(params, "status") || "all",
  };

  const result = targetFiltersSchema.safeParse(values);

  if (!result.success) {
    return {
      values,
      where: null,
      error:
        result.error.issues[0]?.message ??
        "Filtreleri kontrol edin.",
    };
  }

  const filters = result.data;
  const where: Prisma.ProductionTargetWhereInput = {};

  if (filters.status !== "all") {
    where.isActive = filters.status === "active";
  }

  if (filters.period !== "all") {
    where.period = filters.period;
  }

  if (filters.facilityId || filters.productId) {
    where.facilityProduct = {
      ...(filters.facilityId
        ? { facilityId: Number(filters.facilityId) }
        : {}),
      ...(filters.productId
        ? { productId: Number(filters.productId) }
        : {}),
    };
  }

  // Seçilen tarih aralığıyla kesişen hedefleri getir.
  if (filters.startDate) {
    where.endDate = {
      gte: new Date(`${filters.startDate}T00:00:00.000Z`),
    };
  }

  if (filters.endDate) {
    where.startDate = {
      lte: new Date(`${filters.endDate}T00:00:00.000Z`),
    };
  }

  if (filters.q) {
    where.OR = [
      { notes: { contains: filters.q } },
      {
        facilityProduct: {
          facility: {
            name: { contains: filters.q },
          },
        },
      },
      {
        facilityProduct: {
          facility: {
            code: { contains: filters.q },
          },
        },
      },
      {
        facilityProduct: {
          product: {
            name: { contains: filters.q },
          },
        },
      },
      {
        facilityProduct: {
          product: {
            code: { contains: filters.q },
          },
        },
      },
    ];
  }

  return {
    values: filters,
    where,
    error: null,
  };
}