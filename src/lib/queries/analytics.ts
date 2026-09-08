import "server-only";

import { prisma } from "@/lib/prisma";
import { runProductionAnalysis } from "@/lib/analytics/python";
import type {
  AnalysisUnit,
  DowntimeParetoAnalysis,
  ProductionAnalysisPoint,
  ProductionAnalyticsSeries,
  ProductionAnomalySummary,
} from "@/lib/analytics/types";
import type { parseProductionFilters } from "./production";
import type { parseDowntimeFilters } from "./downtimes";

const MAX_ANALYSIS_RECORDS = 20_000;

const unitLabels: Record<AnalysisUnit, string> = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
};
function roundNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function quantile(
  sortedValues: number[],
  ratio: number,
) {
  const position =
    (sortedValues.length - 1) * ratio;

  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];

  if (
    lowerValue === undefined ||
    upperValue === undefined
  ) {
    throw new Error(
      "Anomali sınırları hesaplanamadı.",
    );
  }

  if (lowerIndex === upperIndex) {
    return lowerValue;
  }

  return (
    lowerValue +
    (upperValue - lowerValue) *
    (position - lowerIndex)
  );
}

function createAnomalySummary(
  points: ProductionAnalysisPoint[],
): ProductionAnomalySummary {
  const observedPoints = points.flatMap((point) =>
    point.quantity === null
      ? []
      : [
        {
          date: point.date,
          quantity: point.quantity,
        },
      ],
  );

  if (observedPoints.length < 4) {
    return {
      method: "IQR_1_5",
      sampleSize: observedPoints.length,
      median: null,
      lowerBound: null,
      upperBound: null,
      anomalyCount: 0,
      points: [],
    };
  }

  const sortedValues = observedPoints
    .map((point) => point.quantity)
    .sort((a, b) => a - b);

  const firstQuartile = quantile(
    sortedValues,
    0.25,
  );

  const median = quantile(sortedValues, 0.5);

  const thirdQuartile = quantile(
    sortedValues,
    0.75,
  );

  const interquartileRange =
    thirdQuartile - firstQuartile;

  const lowerBound =
    firstQuartile -
    interquartileRange * 1.5;

  const upperBound =
    thirdQuartile +
    interquartileRange * 1.5;

  const anomalyPoints = observedPoints
    .filter(
      (point) =>
        point.quantity < lowerBound ||
        point.quantity > upperBound,
    )
    .map((point) => ({
      date: point.date,
      quantity: point.quantity,
      direction:
        point.quantity > upperBound
          ? ("HIGH" as const)
          : ("LOW" as const),
      deviationPercent:
        median !== 0
          ? roundNumber(
            ((point.quantity - median) /
              median) *
            100,
          )
          : null,
    }));

  return {
    method: "IQR_1_5",
    sampleSize: observedPoints.length,
    median: roundNumber(median),
    lowerBound: roundNumber(lowerBound),
    upperBound: roundNumber(upperBound),
    anomalyCount: anomalyPoints.length,
    points: anomalyPoints,
  };
}
type AnalyticsFilters = ReturnType<typeof parseProductionFilters>;
type DowntimeAnalyticsFilters = ReturnType<
  typeof parseDowntimeFilters
>;

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
          plannedMinutes: true,
        },
      },
      facilityProduct: {
        select: {
          id: true,
          nominalDailyCapacity: true,
          facility: {
            select: {
              id: true,
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
      const totalOperatingMinutes = group.reduce(
        (total, record) =>
          total + record.operatingMinutes,
        0,
      );

      const totalPlannedMinutes = group.reduce(
        (total, record) =>
          total + record.shift.plannedMinutes,
        0,
      );

      const lostPlannedMinutes = Math.max(
        totalPlannedMinutes - totalOperatingMinutes,
        0,
      );

      const nominalDailyCapacity =
        first.facilityProduct.nominalDailyCapacity === null
          ? null
          : Number(
            first.facilityProduct
              .nominalDailyCapacity,
          );

      const capacityReference =
        nominalDailyCapacity === null
          ? null
          : nominalDailyCapacity *
          analysis.observedDayCount;

      const operatingRate =
        totalPlannedMinutes > 0
          ? Math.round(
            (totalOperatingMinutes /
              totalPlannedMinutes) *
            1000,
          ) / 10
          : null;

      const capacityUtilization =
        capacityReference !== null &&
          capacityReference > 0
          ? Math.round(
            (analysis.totalQuantity /
              capacityReference) *
            1000,
          ) / 10
          : null;

      const averageDailyQuantity =
        analysis.observedDayCount > 0
          ? Math.round(
            (analysis.totalQuantity /
              analysis.observedDayCount) *
            1000,
          ) / 1000
          : null;

      const quantityPerOperatingHour =
        totalOperatingMinutes > 0
          ? Math.round(
            (analysis.totalQuantity /
              totalOperatingMinutes) *
            60 *
            1000,
          ) / 1000
          : null;

      const downtimeGroups =
        await prisma.downtimeRecord.groupBy({
          by: ["type"],
          where: {
            facilityId:
              first.facilityProduct.facility.id,
            startedAt: {
              gte: new Date(
                `${analysis.startDate}T00:00:00.000Z`,
              ),
              lte: new Date(
                `${analysis.endDate}T23:59:59.999Z`,
              ),
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

      const plannedDowntimeMinutes =
        downtimeGroups.find(
          (group) => group.type === "PLANNED",
        )?._sum.durationMinutes ?? 0;

      const unplannedDowntimeMinutes =
        downtimeGroups.find(
          (group) => group.type === "UNPLANNED",
        )?._sum.durationMinutes ?? 0;

      const totalDowntimeMinutes =
        plannedDowntimeMinutes +
        unplannedDowntimeMinutes;

      const plannedEstimatedLoss =
        quantityPerOperatingHour === null
          ? null
          : roundNumber(
            quantityPerOperatingHour *
            (plannedDowntimeMinutes / 60),
          );

      const unplannedEstimatedLoss =
        quantityPerOperatingHour === null
          ? null
          : roundNumber(
            quantityPerOperatingHour *
            (unplannedDowntimeMinutes / 60),
          );

      const totalEstimatedLoss =
        plannedEstimatedLoss === null ||
          unplannedEstimatedLoss === null
          ? null
          : roundNumber(
            plannedEstimatedLoss +
            unplannedEstimatedLoss,
          );

      const potentialQuantity =
        totalEstimatedLoss === null
          ? null
          : analysis.totalQuantity +
          totalEstimatedLoss;

      const lossRate =
        totalEstimatedLoss !== null &&
          potentialQuantity !== null &&
          potentialQuantity > 0
          ? roundNumber(
            (totalEstimatedLoss /
              potentialQuantity) *
            100,
          )
          : null;

      const lossEstimate = {
        totalDowntimeMinutes,
        plannedDowntimeMinutes,
        unplannedDowntimeMinutes,
        quantityPerOperatingHour,
        totalEstimatedLoss,
        plannedEstimatedLoss,
        unplannedEstimatedLoss,
        lossRate,
      };

      const performance = {
        totalOperatingMinutes,
        totalPlannedMinutes,
        lostPlannedMinutes,
        operatingRate,
        nominalDailyCapacity,
        capacityReference,
        capacityUtilization,
        averageDailyQuantity,
        quantityPerOperatingHour,
      };
      const anomalySummary =
        createAnomalySummary(analysis.points);
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
        performance,
        lossEstimate,
        anomalySummary,
      };
    }),
  );
}
export async function getDowntimePareto(
  filters: DowntimeAnalyticsFilters,
): Promise<DowntimeParetoAnalysis> {
  if (filters.where === null) {
    return {
      totalMinutes: 0,
      totalRecords: 0,
      vitalReasonCount: 0,
      items: [],
    };
  }

  const groups =
    await prisma.downtimeRecord.groupBy({
      by: ["downtimeReasonId"],
      where: filters.where,
      _sum: {
        durationMinutes: true,
      },
      _count: {
        _all: true,
      },
    });

  if (groups.length === 0) {
    return {
      totalMinutes: 0,
      totalRecords: 0,
      vitalReasonCount: 0,
      items: [],
    };
  }

  const reasons =
    await prisma.downtimeReason.findMany({
      where: {
        id: {
          in: groups.map(
            (group) =>
              group.downtimeReasonId,
          ),
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
    });

  const reasonMap = new Map(
    reasons.map((reason) => [
      reason.id,
      reason,
    ]),
  );

  const sortedGroups = groups
    .map((group) => {
      const reason = reasonMap.get(
        group.downtimeReasonId,
      );

      if (!reason) {
        throw new Error(
          "Pareto analizi için duruş nedeni bulunamadı.",
        );
      }

      return {
        id: reason.id,
        code: reason.code,
        name: reason.name,
        category: reason.category,
        minutes:
          group._sum.durationMinutes ?? 0,
        recordCount: group._count._all,
      };
    })
    .sort(
      (a, b) =>
        b.minutes - a.minutes ||
        a.code.localeCompare(
          b.code,
          "tr",
        ),
    );

  const totalMinutes = sortedGroups.reduce(
    (total, item) => total + item.minutes,
    0,
  );

  const totalRecords = sortedGroups.reduce(
    (total, item) =>
      total + item.recordCount,
    0,
  );

  let cumulativePercentage = 0;

  const items = sortedGroups.map((item) => {
    const percentage =
      totalMinutes > 0
        ? (item.minutes / totalMinutes) * 100
        : 0;

    const cumulativeBefore =
      cumulativePercentage;

    cumulativePercentage += percentage;

    return {
      ...item,
      percentage: roundNumber(percentage),
      cumulativePercentage: roundNumber(
        Math.min(cumulativePercentage, 100),
      ),
      isVital:
        totalMinutes > 0 &&
        cumulativeBefore < 80,
    };
  });

  return {
    totalMinutes,
    totalRecords,
    vitalReasonCount: items.filter(
      (item) => item.isVital,
    ).length,
    items,
  };
}
