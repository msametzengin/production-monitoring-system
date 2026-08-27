import { prisma } from "@/lib/prisma";
import type { parseDashboardFilters } from "./dashboard";

export type DashboardChartData = {
  production: {
    id: number;
    label: string;
    unit: string;
    points: { date: string; quantity: number }[];
  }[];
  downtimeReasons: {
    id: number;
    name: string;
    minutes: number;
  }[];
};

const unitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export async function getDashboardChartData(
  filters: ReturnType<typeof parseDashboardFilters>,
): Promise<DashboardChartData> {
  if (
    filters.productionWhere === null ||
    filters.downtimeWhere === null
  ) {
    return { production: [], downtimeReasons: [] };
  }

  const [productionGroups, downtimeGroups] = await Promise.all([
    prisma.productionRecord.groupBy({
      by: ["recordDate", "facilityProductId"],
      where: filters.productionWhere,
      _sum: { quantity: true },
      orderBy: [
        { recordDate: "asc" },
        { facilityProductId: "asc" },
      ],
    }),
    prisma.downtimeRecord.groupBy({
      by: ["downtimeReasonId"],
      where: filters.downtimeWhere,
      _sum: { durationMinutes: true },
    }),
  ]);

  const relationIds = [
    ...new Set(productionGroups.map((group) => group.facilityProductId)),
  ];

  const [relations, reasons] = await Promise.all([
    relationIds.length === 0
      ? Promise.resolve([])
      : prisma.facilityProduct.findMany({
          where: { id: { in: relationIds } },
          select: {
            id: true,
            facility: { select: { code: true, name: true } },
            product: {
              select: {
                code: true,
                name: true,
                measurementUnit: true,
              },
            },
          },
        }),
    downtimeGroups.length === 0
      ? Promise.resolve([])
      : prisma.downtimeReason.findMany({
          where: {
            id: {
              in: downtimeGroups.map((group) => group.downtimeReasonId),
            },
          },
          select: { id: true, code: true, name: true },
        }),
  ]);

  const relationMap = new Map(relations.map((item) => [item.id, item]));
  const reasonMap = new Map(reasons.map((item) => [item.id, item]));
  const seriesMap = new Map<
    number,
    DashboardChartData["production"][number]
  >();

  for (const group of productionGroups) {
    const relation = relationMap.get(group.facilityProductId);

    if (!relation) {
      throw new Error("Grafik için tesis–ürün ilişkisi bulunamadı.");
    }

    let series = seriesMap.get(relation.id);

    if (!series) {
      series = {
        id: relation.id,
        label: [
          relation.facility.code,
          relation.facility.name,
          relation.product.code,
          relation.product.name,
        ].join(" · "),
        unit: unitLabels[relation.product.measurementUnit],
        points: [],
      };
      seriesMap.set(relation.id, series);
    }

    series.points.push({
      date: group.recordDate.toISOString().slice(0, 10),
      quantity: Number(group._sum.quantity ?? 0),
    });
  }

  const downtimeReasons = downtimeGroups.map((group) => {
    const reason = reasonMap.get(group.downtimeReasonId);

    if (!reason) {
      throw new Error("Grafik için duruş nedeni bulunamadı.");
    }

    return {
      id: reason.id,
      name: reason.code + " · " + reason.name,
      minutes: group._sum.durationMinutes ?? 0,
    };
  });

  return {
    production: [...seriesMap.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "tr"),
    ),
    downtimeReasons: downtimeReasons.sort(
      (a, b) => b.minutes - a.minutes || a.id - b.id,
    ),
  };
}