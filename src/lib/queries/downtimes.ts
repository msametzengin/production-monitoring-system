import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  filterDateSchema,
  filterIdSchema,
  filterSearchSchema,
  getQueryValue,
  type FilterSearchParams,
} from "@/lib/filters";

const downtimeFiltersSchema = z
  .object({
    q: filterSearchSchema,
    facilityId: filterIdSchema,
    reasonId: filterIdSchema,
    startDate: filterDateSchema,
    endDate: filterDateSchema,

    type: z.enum(["all", "PLANNED", "UNPLANNED"], {
      message: "Geçerli bir duruş türü seçmelisiniz.",
    }),

    category: z.enum(
      [
        "all",
        "MAINTENANCE",
        "BREAKDOWN",
        "ENERGY",
        "RAW_MATERIAL",
        "PERSONNEL",
        "CLEANING",
        "PROCESS",
        "OTHER",
      ],
      {
        message: "Geçerli bir duruş kategorisi seçmelisiniz.",
      },
    ),

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

export function parseDowntimeFilters(
  params: FilterSearchParams,
) {
  const values = {
    q: getQueryValue(params, "q"),
    facilityId: getQueryValue(params, "facilityId"),
    reasonId: getQueryValue(params, "reasonId"),
    startDate: getQueryValue(params, "startDate"),
    endDate: getQueryValue(params, "endDate"),
    type: getQueryValue(params, "type") || "all",
    category: getQueryValue(params, "category") || "all",
    source: getQueryValue(params, "source") || "all",
  };

  const result = downtimeFiltersSchema.safeParse(values);

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
  const where: Prisma.DowntimeRecordWhereInput = {};

  if (filters.facilityId) {
    where.facilityId = Number(filters.facilityId);
  }

  if (filters.reasonId) {
    where.downtimeReasonId = Number(filters.reasonId);
  }

  if (filters.type !== "all") {
    where.type = filters.type;
  }

  if (filters.source !== "all") {
    where.source = filters.source;
  }

  if (filters.category !== "all") {
    where.downtimeReason = {
      category: filters.category,
    };
  }

  // Duruşun başlangıç gününe göre filtrele.
  if (filters.startDate || filters.endDate) {
    where.startedAt = {
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
              `${filters.endDate}T23:59:59.999Z`,
            ),
          }
        : {}),
    };
  }

  if (filters.q) {
    where.OR = [
      { notes: { contains: filters.q } },
      {
        facility: {
          name: { contains: filters.q },
        },
      },
      {
        facility: {
          code: { contains: filters.q },
        },
      },
      {
        downtimeReason: {
          name: { contains: filters.q },
        },
      },
      {
        downtimeReason: {
          code: { contains: filters.q },
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