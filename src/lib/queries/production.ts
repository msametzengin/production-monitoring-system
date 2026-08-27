import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  filterDateSchema,
  filterIdSchema,
  filterSearchSchema,
  getQueryValue,
  type FilterSearchParams,
} from "@/lib/filters";

const productionFiltersSchema = z
  .object({
    q: filterSearchSchema,
    facilityId: filterIdSchema,
    productId: filterIdSchema,
    shiftId: filterIdSchema,
    startDate: filterDateSchema,
    endDate: filterDateSchema,

    status: z.enum(["all", "active", "archived"], {
      message: "Geçerli bir kayıt durumu seçmelisiniz.",
    }),

    source: z.enum(["all", "MANUAL", "EXCEL_IMPORT"], {
      message: "Geçerli bir kayıt kaynağı seçmelisiniz.",
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

export function parseProductionFilters(
  params: FilterSearchParams,
) {
  const values = {
    q: getQueryValue(params, "q"),
    facilityId: getQueryValue(params, "facilityId"),
    productId: getQueryValue(params, "productId"),
    shiftId: getQueryValue(params, "shiftId"),
    startDate: getQueryValue(params, "startDate"),
    endDate: getQueryValue(params, "endDate"),
    status: getQueryValue(params, "status") || "all",
    source: getQueryValue(params, "source") || "all",
  };

  const result = productionFiltersSchema.safeParse(values);

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
  const where: Prisma.ProductionRecordWhereInput = {};

  if (filters.status === "active") {
    where.archivedAt = null;
  } else if (filters.status === "archived") {
    where.archivedAt = {
      not: null,
    };
  }

  if (filters.source !== "all") {
    where.source = filters.source;
  }

  if (filters.shiftId) {
    where.shiftId = Number(filters.shiftId);
  }

  if (filters.facilityId || filters.productId) {
    where.facilityProduct = {
      ...(filters.facilityId
        ? {
            facilityId: Number(filters.facilityId),
          }
        : {}),
      ...(filters.productId
        ? {
            productId: Number(filters.productId),
          }
        : {}),
    };
  }

  if (filters.startDate || filters.endDate) {
    where.recordDate = {
      ...(filters.startDate
        ? {
            gte: new Date(
              `${filters.startDate}T00:00:00.000Z`,
            ),
          }
        : {}),
      ...(filters.endDate
        ? {
            lte: new Date(
              `${filters.endDate}T00:00:00.000Z`,
            ),
          }
        : {}),
    };
  }

  if (filters.q) {
    where.OR = [
      {
        notes: {
          contains: filters.q,
        },
      },
      {
        facilityProduct: {
          facility: {
            name: {
              contains: filters.q,
            },
          },
        },
      },
      {
        facilityProduct: {
          facility: {
            code: {
              contains: filters.q,
            },
          },
        },
      },
      {
        facilityProduct: {
          product: {
            name: {
              contains: filters.q,
            },
          },
        },
      },
      {
        facilityProduct: {
          product: {
            code: {
              contains: filters.q,
            },
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