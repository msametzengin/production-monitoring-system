import { prisma } from "@/lib/prisma";
import { parseProductionFilters } from "@/lib/queries/production";
import { parseTargetFilters } from "@/lib/queries/targets";
import { parseDowntimeFilters } from "@/lib/queries/downtimes";
import {
  createExcelResponse,
  type ExcelColumn,
  type ExcelRow,
} from "@/lib/excel/workbook";
import type { FilterSearchParams } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 50_000;

const unitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

const sourceLabels = {
  MANUAL: "Manuel",
  EXCEL_IMPORT: "Excel",
} as const;

const periodLabels = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
  CUSTOM: "Özel dönem",
} as const;

const downtimeTypeLabels = {
  PLANNED: "Planlı",
  UNPLANNED: "Plansız",
} as const;

const downtimeCategoryLabels = {
  MAINTENANCE: "Bakım",
  BREAKDOWN: "Arıza",
  ENERGY: "Enerji",
  RAW_MATERIAL: "Hammadde",
  PERSONNEL: "Personel",
  CLEANING: "Temizlik",
  PROCESS: "Proses",
  OTHER: "Diğer",
} as const;

function badRequest(message: string) {
  return Response.json(
    { error: message },
    { status: 400 },
  );
}

function filtersToRows(
  values: Record<string, string>,
  definitions: [string, string][],
) {
  return definitions.map(([key, label]) => ({
    label,
    value: values[key] || "Tümü",
  }));
}

function exportLimitError() {
  return Response.json(
    {
      error:
        "Tek Excel dosyasında en fazla " +
        MAX_EXPORT_ROWS.toLocaleString("tr-TR") +
        " kayıt dışa aktarılabilir. Filtreleri daraltın.",
    },
    { status: 413 },
  );
}

async function exportProduction(
  params: FilterSearchParams,
) {
  const { values, where, error } =
    parseProductionFilters(params);

  if (where === null) {
    return badRequest(
      error ?? "Üretim filtreleri geçersiz.",
    );
  }

  const records =
    await prisma.productionRecord.findMany({
      where,
      take: MAX_EXPORT_ROWS + 1,
      orderBy: [
        { recordDate: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: {
        shift: true,
        facilityProduct: {
          include: {
            facility: true,
            product: true,
          },
        },
      },
    });

  if (records.length > MAX_EXPORT_ROWS) {
    return exportLimitError();
  }

  const columns: ExcelColumn[] = [
    {
      header: "Kayıt ID",
      key: "id",
      width: 12,
    },
    {
      header: "Tarih",
      key: "date",
      width: 14,
      numFmt: "dd.mm.yyyy",
    },
    {
      header: "Tesis Kodu",
      key: "facilityCode",
      width: 16,
    },
    {
      header: "Tesis",
      key: "facilityName",
      width: 24,
    },
    {
      header: "Ürün Kodu",
      key: "productCode",
      width: 16,
    },
    {
      header: "Ürün",
      key: "productName",
      width: 24,
    },
    {
      header: "Vardiya Kodu",
      key: "shiftCode",
      width: 16,
    },
    {
      header: "Vardiya",
      key: "shiftName",
      width: 20,
    },
    {
      header: "Üretim Miktarı",
      key: "quantity",
      width: 18,
      numFmt: "#,##0.000",
    },
    {
      header: "Birim",
      key: "unit",
      width: 12,
    },
    {
      header: "Çalışma (dk)",
      key: "operatingMinutes",
      width: 16,
    },
    {
      header: "Çalışma Oranı",
      key: "operatingRate",
      width: 16,
      numFmt: "0.00%",
    },
    {
      header: "Kaynak",
      key: "source",
      width: 14,
    },
    {
      header: "Not",
      key: "notes",
      width: 40,
    },
    {
      header: "Durum",
      key: "status",
      width: 14,
    },
    {
      header: "Arşivlenme Zamanı",
      key: "archivedAt",
      width: 22,
      numFmt: "dd.mm.yyyy hh:mm",
    },
  ];

  const rows: ExcelRow[] = records.map(
    (record) => ({
      id: record.id,
      date: record.recordDate,
      facilityCode:
        record.facilityProduct.facility.code,
      facilityName:
        record.facilityProduct.facility.name,
      productCode:
        record.facilityProduct.product.code,
      productName:
        record.facilityProduct.product.name,
      shiftCode: record.shift.code,
      shiftName: record.shift.name,
      quantity: Number(record.quantity),
      unit:
        unitLabels[
          record.facilityProduct.product
            .measurementUnit
        ],
      operatingMinutes: record.operatingMinutes,
      operatingRate:
        record.shift.plannedMinutes > 0
          ? record.operatingMinutes /
            record.shift.plannedMinutes
          : 0,
      source: sourceLabels[record.source],
      notes: record.notes ?? "",
      status: record.archivedAt
        ? "Arşivde"
        : "Aktif",
      archivedAt: record.archivedAt,
    }),
  );

  return createExcelResponse({
    title: "Üretim Kayıtları",
    sheetName: "Üretim Kayıtları",
    filePrefix: "uretim-kayitlari",
    columns,
    rows,
    filters: filtersToRows(values, [
      ["q", "Arama"],
      ["facilityId", "Tesis ID"],
      ["productId", "Ürün ID"],
      ["shiftId", "Vardiya ID"],
      ["startDate", "Başlangıç tarihi"],
      ["endDate", "Bitiş tarihi"],
      ["status", "Kayıt durumu"],
      ["source", "Kaynak"],
    ]),
  });
}

async function exportTargets(
  params: FilterSearchParams,
) {
  const { values, where, error } =
    parseTargetFilters(params);

  if (where === null) {
    return badRequest(
      error ?? "Hedef filtreleri geçersiz.",
    );
  }

  const targets =
    await prisma.productionTarget.findMany({
      where,
      take: MAX_EXPORT_ROWS + 1,
      orderBy: [
        { startDate: "desc" },
        { id: "desc" },
      ],
      include: {
        facilityProduct: {
          include: {
            facility: true,
            product: true,
          },
        },
      },
    });

  if (targets.length > MAX_EXPORT_ROWS) {
    return exportLimitError();
  }

  const firstTarget = targets[0];

  const productionGroups = firstTarget
    ? await prisma.productionRecord.groupBy({
        by: [
          "facilityProductId",
          "recordDate",
        ],
        where: {
          archivedAt: null,
          facilityProductId: {
            in: [
              ...new Set(
                targets.map(
                  (target) =>
                    target.facilityProductId,
                ),
              ),
            ],
          },
          recordDate: {
            gte: targets.reduce(
              (minimum, target) =>
                target.startDate < minimum
                  ? target.startDate
                  : minimum,
              firstTarget.startDate,
            ),
            lte: targets.reduce(
              (maximum, target) =>
                target.endDate > maximum
                  ? target.endDate
                  : maximum,
              firstTarget.endDate,
            ),
          },
        },
        _sum: {
          quantity: true,
        },
      })
    : [];

  const actualByRelation = new Map<
    number,
    {
      date: Date;
      quantity: number;
    }[]
  >();

  for (const group of productionGroups) {
    const points =
      actualByRelation.get(
        group.facilityProductId,
      ) ?? [];

    points.push({
      date: group.recordDate,
      quantity: Number(
        group._sum.quantity ?? 0,
      ),
    });

    actualByRelation.set(
      group.facilityProductId,
      points,
    );
  }

  const rows: ExcelRow[] = targets.map(
    (target) => {
      const actual = (
        actualByRelation.get(
          target.facilityProductId,
        ) ?? []
      ).reduce(
        (total, point) =>
          point.date >= target.startDate &&
          point.date <= target.endDate
            ? total + point.quantity
            : total,
        0,
      );

      const targetQuantity = Number(
        target.targetQuantity,
      );

      return {
        id: target.id,
        facilityCode:
          target.facilityProduct.facility.code,
        facilityName:
          target.facilityProduct.facility.name,
        productCode:
          target.facilityProduct.product.code,
        productName:
          target.facilityProduct.product.name,
        unit:
          unitLabels[
            target.facilityProduct.product
              .measurementUnit
          ],
        period: periodLabels[target.period],
        startDate: target.startDate,
        endDate: target.endDate,
        targetQuantity,
        actualQuantity: actual,
        realizationRate:
          targetQuantity > 0
            ? actual / targetQuantity
            : 0,
        status: target.isActive
          ? "Aktif"
          : "Pasif",
        notes: target.notes ?? "",
      };
    },
  );

  const columns: ExcelColumn[] = [
    {
      header: "Hedef ID",
      key: "id",
      width: 12,
    },
    {
      header: "Tesis Kodu",
      key: "facilityCode",
      width: 16,
    },
    {
      header: "Tesis",
      key: "facilityName",
      width: 24,
    },
    {
      header: "Ürün Kodu",
      key: "productCode",
      width: 16,
    },
    {
      header: "Ürün",
      key: "productName",
      width: 24,
    },
    {
      header: "Birim",
      key: "unit",
      width: 12,
    },
    {
      header: "Dönem",
      key: "period",
      width: 16,
    },
    {
      header: "Başlangıç",
      key: "startDate",
      width: 14,
      numFmt: "dd.mm.yyyy",
    },
    {
      header: "Bitiş",
      key: "endDate",
      width: 14,
      numFmt: "dd.mm.yyyy",
    },
    {
      header: "Hedef",
      key: "targetQuantity",
      width: 16,
      numFmt: "#,##0.000",
    },
    {
      header: "Gerçekleşen",
      key: "actualQuantity",
      width: 16,
      numFmt: "#,##0.000",
    },
    {
      header: "Gerçekleşme Oranı",
      key: "realizationRate",
      width: 20,
      numFmt: "0.00%",
    },
    {
      header: "Durum",
      key: "status",
      width: 14,
    },
    {
      header: "Not",
      key: "notes",
      width: 40,
    },
  ];

  return createExcelResponse({
    title: "Üretim Hedefleri",
    sheetName: "Üretim Hedefleri",
    filePrefix: "uretim-hedefleri",
    columns,
    rows,
    filters: filtersToRows(values, [
      ["q", "Arama"],
      ["facilityId", "Tesis ID"],
      ["productId", "Ürün ID"],
      ["period", "Hedef dönemi"],
      ["startDate", "Başlangıç tarihi"],
      ["endDate", "Bitiş tarihi"],
      ["status", "Hedef durumu"],
    ]),
  });
}

async function exportDowntimes(
  params: FilterSearchParams,
) {
  const { values, where, error } =
    parseDowntimeFilters(params);

  if (where === null) {
    return badRequest(
      error ?? "Duruş filtreleri geçersiz.",
    );
  }

  const records =
    await prisma.downtimeRecord.findMany({
      where,
      take: MAX_EXPORT_ROWS + 1,
      orderBy: [
        { startedAt: "desc" },
        { id: "desc" },
      ],
      include: {
        facility: true,
        downtimeReason: true,
      },
    });

  if (records.length > MAX_EXPORT_ROWS) {
    return exportLimitError();
  }

  const columns: ExcelColumn[] = [
    {
      header: "Kayıt ID",
      key: "id",
      width: 12,
    },
    {
      header: "Tesis Kodu",
      key: "facilityCode",
      width: 16,
    },
    {
      header: "Tesis",
      key: "facilityName",
      width: 24,
    },
    {
      header: "Neden Kodu",
      key: "reasonCode",
      width: 18,
    },
    {
      header: "Duruş Nedeni",
      key: "reasonName",
      width: 24,
    },
    {
      header: "Kategori",
      key: "category",
      width: 16,
    },
    {
      header: "Tür",
      key: "type",
      width: 14,
    },
    {
      header: "Başlangıç",
      key: "startedAt",
      width: 22,
      numFmt: "dd.mm.yyyy hh:mm",
    },
    {
      header: "Bitiş",
      key: "endedAt",
      width: 22,
      numFmt: "dd.mm.yyyy hh:mm",
    },
    {
      header: "Süre (dk)",
      key: "durationMinutes",
      width: 14,
    },
    {
      header: "Kaynak",
      key: "source",
      width: 14,
    },
    {
      header: "Not",
      key: "notes",
      width: 40,
    },
  ];

  const rows: ExcelRow[] = records.map(
    (record) => ({
      id: record.id,
      facilityCode: record.facility.code,
      facilityName: record.facility.name,
      reasonCode:
        record.downtimeReason.code,
      reasonName:
        record.downtimeReason.name,
      category:
        downtimeCategoryLabels[
          record.downtimeReason.category
        ],
      type: downtimeTypeLabels[record.type],
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      durationMinutes:
        record.durationMinutes,
      source: sourceLabels[record.source],
      notes: record.notes ?? "",
    }),
  );

  return createExcelResponse({
    title: "Üretim Duruşları",
    sheetName: "Üretim Duruşları",
    filePrefix: "uretim-duruslari",
    columns,
    rows,
    filters: filtersToRows(values, [
      ["q", "Arama"],
      ["facilityId", "Tesis ID"],
      ["reasonId", "Duruş nedeni ID"],
      ["type", "Duruş türü"],
      ["category", "Kategori"],
      [
        "startDate",
        "Başlangıç günü: en erken",
      ],
      [
        "endDate",
        "Başlangıç günü: en geç",
      ],
      ["source", "Kaynak"],
    ]),
  });
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      resource: string;
    }>;
  },
) {
  const { resource } = await params;

  const query = Object.fromEntries(
    new URL(request.url).searchParams.entries(),
  );

  if (resource === "production") {
    return exportProduction(query);
  }

  if (resource === "targets") {
    return exportTargets(query);
  }

  if (resource === "downtimes") {
    return exportDowntimes(query);
  }

  return Response.json(
    {
      error:
        "Dışa aktarma türü bulunamadı.",
    },
    {
      status: 404,
    },
  );
}