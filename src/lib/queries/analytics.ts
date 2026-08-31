import "server-only";

import { prisma } from "@/lib/prisma";
import { runProductionAnalysis } from "@/lib/analytics/python";
import type {
  AnalysisUnit,
  ProductionAnalyticsSeries,
} from "@/lib/analytics/types";
import type { parseProductionFilters } from "./production";

const MAX_ANALYSIS_RECORDS = 20_000;

const unitLabels: Record<AnalysisUnit, string> = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
};

type AnalyticsFilters = ReturnType<typeof parseProductionFilters>;

export async function getProductionAnalytics(
  filters: AnalyticsFilters,
): Promise<ProductionAnalyticsSeries[]> {
  if (filters.where === null) return [];

  const recordCount = await prisma.productionRecord.count({
    where: filters.where,
  });

  if (recordCount > MAX_ANALYSIS_RECORDS) {
    throw new Error(
      `Analiz en fazla ${MAX_ANALYSIS_RECORDS.toLocaleString("tr-TR")} üretim kaydıyla çalışabilir. Tarih, tesis veya ürün filtresini daraltın.`,
    );
  }

  const records = await prisma.productionRecord.findMany({
    where: filters.where,
    orderBy: [
      { facilityProductId: "asc" },
      { recordDate: "asc" },
      { shiftId: "asc" },
    ],
    select: {
      recordDate: true,
      quantity: true,
      operatingMinutes: true,
      shift: {
        select: {
          code: true,
          name: true,
        },
      },
      facilityProduct: {
        select: {
          id: true,
          facility: {
            select: {
              code: true,
              name: true,
            },
          },
          product: {
            select: {
              code: true,
              name: true,
              measurementUnit: true,
            },
          },
        },
      },
    },
  });

  const groups = new Map<number, typeof records>();
  for (const record of records) {
    const relationId = record.facilityProduct.id;
    const group = groups.get(relationId);
    if (group) group.push(record);
    else groups.set(relationId, [record]);
  }

  return Promise.all(
    [...groups.values()].map(async (group) => {
      const first = group[0];
      if (!first) throw new Error("Analiz serisi için üretim kaydı bulunamadı.");

      const unit = first.facilityProduct.product.measurementUnit as AnalysisUnit;
      const analysis = await runProductionAnalysis({
        ...(filters.values.startDate
          ? { start_date: filters.values.startDate }
          : {}),
        ...(filters.values.endDate ? { end_date: filters.values.endDate } : {}),
        output_unit: unit,
        rolling_window_days: 7,
        records: group.map((record) => ({
          date: record.recordDate.toISOString().slice(0, 10),
          quantity: Number(record.quantity),
          unit,
          shift_code: record.shift.code,
          shift_name: record.shift.name,
          operating_minutes: record.operatingMinutes,
        })),
      });

      return {
        id: first.facilityProduct.id,
        label: [
          first.facilityProduct.facility.code,
          first.facilityProduct.facility.name,
          first.facilityProduct.product.code,
          first.facilityProduct.product.name,
        ].join(" · "),
        unitLabel: unitLabels[unit],
        analysis,
      };
    }),
  );
}
