import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecordFilters } from "@/components/record-filters";
import { ExcelExportLink } from "@/components/excel-export-link";
import { parseTargetFilters } from "@/lib/queries/targets";
import type { FilterSearchParams } from "@/lib/filters";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

const periodLabels = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
  CUSTOM: "Özel dönem",
} as const;

const DAY_IN_MILLISECONDS = 86_400_000;

type TargetHealth =
  | "INACTIVE"
  | "PLANNED"
  | "ACHIEVED"
  | "MISSED"
  | "ON_TRACK"
  | "AT_RISK"
  | "BEHIND";

const targetHealthLabels: Record<TargetHealth, string> = {
  INACTIVE: "Pasif",
  PLANNED: "Planlandı",
  ACHIEVED: "Tamamlandı",
  MISSED: "Hedef kaçtı",
  ON_TRACK: "Hedefte",
  AT_RISK: "Riskli",
  BEHIND: "Geride",
};

const targetHealthClasses: Record<TargetHealth, string> = {
  INACTIVE: "bg-slate-800 text-slate-300",
  PLANNED: "bg-blue-950 text-blue-300",
  ACHIEVED: "bg-emerald-950 text-emerald-300",
  MISSED: "bg-red-950 text-red-300",
  ON_TRACK: "bg-emerald-950 text-emerald-300",
  AT_RISK: "bg-amber-950 text-amber-300",
  BEHIND: "bg-red-950 text-red-300",
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  return (
    Math.floor(
      (startOfUtcDay(endDate).getTime() -
        startOfUtcDay(startDate).getTime()) /
      DAY_IN_MILLISECONDS,
    ) + 1
  );
}

function formatQuantity(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("tr-TR", {
    maximumFractionDigits: 3,
  });
}

function getTargetHealth({
  isActive,
  startDate,
  endDate,
  currentDate,
  actualQuantity,
  targetQuantity,
  forecastRate,
}: {
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  currentDate: Date;
  actualQuantity: number;
  targetQuantity: number;
  forecastRate: number | null;
}): TargetHealth {
  if (!isActive) {
    return "INACTIVE";
  }

  if (currentDate < startDate) {
    return "PLANNED";
  }

  if (currentDate > endDate) {
    return actualQuantity >= targetQuantity ? "ACHIEVED" : "MISSED";
  }

  if ((forecastRate ?? 0) >= 100) {
    return "ON_TRACK";
  }

  if ((forecastRate ?? 0) >= 90) {
    return "AT_RISK";
  }

  return "BEHIND";
}

export const dynamic = "force-dynamic";

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<FilterSearchParams>;
}) {
  const { values, where, error } = parseTargetFilters(
    await searchParams,
  );

  const [productionTargets, facilities, products] =
    await Promise.all([
      where === null
        ? Promise.resolve([])
        : prisma.productionTarget.findMany({
          where,
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
        }),

      prisma.facility.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.product.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

  const currentDate = startOfUtcDay(new Date());

  const targetSummaries = await Promise.all(
    productionTargets.map(async (target) => {
      const productionSummary =
        await prisma.productionRecord.aggregate({
          where: {
            archivedAt: null,
            facilityProductId: target.facilityProductId,
            recordDate: {
              gte: target.startDate,
              lte: target.endDate,
            },
          },
          _sum: {
            quantity: true,
          },
        });

      const actualQuantity = Number(
        productionSummary._sum.quantity ?? 0,
      );

      const targetQuantity = Number(target.targetQuantity);

      const realizationRate =
        targetQuantity > 0
          ? Math.round(
            (actualQuantity / targetQuantity) * 1000,
          ) / 10
          : 0;

      const periodDayCount = getInclusiveDayCount(
        target.startDate,
        target.endDate,
      );

      let elapsedDayCount = 0;

      if (currentDate.getTime() >= target.startDate.getTime()) {
        const elapsedEndDate =
          currentDate.getTime() > target.endDate.getTime()
            ? target.endDate
            : currentDate;

        elapsedDayCount = getInclusiveDayCount(
          target.startDate,
          elapsedEndDate,
        );
      }

      const remainingDayCount = Math.max(
        periodDayCount - elapsedDayCount,
        0,
      );

      const expectedQuantity =
        periodDayCount > 0
          ? targetQuantity *
          (elapsedDayCount / periodDayCount)
          : 0;

      const deviationQuantity =
        actualQuantity - expectedQuantity;

      const remainingQuantity = Math.max(
        targetQuantity - actualQuantity,
        0,
      );

      const averageDailyQuantity =
        elapsedDayCount > 0
          ? actualQuantity / elapsedDayCount
          : null;

      let forecastQuantity: number | null = null;

      if (averageDailyQuantity !== null) {
        forecastQuantity =
          remainingDayCount === 0
            ? actualQuantity
            : averageDailyQuantity * periodDayCount;
      }

      const requiredDailyQuantity =
        remainingDayCount > 0
          ? remainingQuantity / remainingDayCount
          : null;

      const forecastRate =
        forecastQuantity !== null && targetQuantity > 0
          ? Math.round(
            (forecastQuantity / targetQuantity) * 1000,
          ) / 10
          : null;

      const health = getTargetHealth({
        isActive: target.isActive,
        startDate: target.startDate,
        endDate: target.endDate,
        currentDate,
        actualQuantity,
        targetQuantity,
        forecastRate,
      });

      return {
        ...target,
        actualQuantity,
        targetQuantity,
        realizationRate,
        remainingQuantity,
        remainingDayCount,
        deviationQuantity,
        requiredDailyQuantity,
        forecastQuantity,
        forecastRate,
        health,
      };
    }),
  );

  const activeTargetCount = targetSummaries.filter(
    (target) => target.isActive,
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Planlama
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Üretim Hedefleri
              </h1>

              <p className="mt-2 text-slate-400">
                Hedef ve gerçekleşen üretim
                karşılaştırmaları
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
                {activeTargetCount} aktif /{" "}
                {targetSummaries.length} toplam
              </span>
              <Link
                href="/targets/import"
                className="rounded-lg border border-sky-500/50 px-4 py-2 text-sm font-medium text-sky-400 transition hover:bg-sky-500/10"
              >
                Excel’den içe aktar
              </Link>
              <ExcelExportLink
                resource="targets"
                values={values}
                disabled={Boolean(error)}
              />
              <Link
                href="/targets/new"
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni hedef
              </Link>
            </div>
          </div>
        </header>
        <RecordFilters
          action="/targets"
          values={values}
          error={error}
          fields={[
            {
              name: "q",
              label: "Arama",
              type: "text",
              placeholder: "Tesis, ürün, kod veya not",
            },
            {
              name: "facilityId",
              label: "Tesis",
              type: "select",
              options: [
                { value: "", label: "Tüm tesisler" },
                ...facilities.map((facility) => ({
                  value: facility.id.toString(),
                  label: `${facility.code} · ${facility.name}${facility.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "productId",
              label: "Ürün",
              type: "select",
              options: [
                { value: "", label: "Tüm ürünler" },
                ...products.map((product) => ({
                  value: product.id.toString(),
                  label: `${product.code} · ${product.name}${product.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "period",
              label: "Hedef dönemi",
              type: "select",
              options: [
                { value: "all", label: "Tüm dönemler" },
                { value: "DAILY", label: "Günlük" },
                { value: "WEEKLY", label: "Haftalık" },
                { value: "MONTHLY", label: "Aylık" },
                { value: "CUSTOM", label: "Özel dönem" },
              ],
            },
            {
              name: "startDate",
              label: "Aralık başlangıcı",
              type: "date",
            },
            {
              name: "endDate",
              label: "Aralık bitişi",
              type: "date",
            },
            {
              name: "status",
              label: "Hedef durumu",
              type: "select",
              options: [
                { value: "all", label: "Tüm hedefler" },
                { value: "active", label: "Aktif hedefler" },
                { value: "inactive", label: "Pasif hedefler" },
              ],
            },
          ]}
        />

        <p className="mb-6 text-sm text-slate-400">
          Seçilen tarih aralığıyla kesişen hedefler gösterilir.
          Hedef ve gerçekleşen miktarlar, her hedefin kendi tam
          dönemine aittir.
        </p>

        {targetSummaries.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            {error
              ? "Sonuçları görmek için filtre hatasını düzeltin."
              : "Seçilen filtrelere uygun üretim hedefi bulunamadı."}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {targetSummaries.map((target) => {
              const unit =
                measurementUnitLabels[
                target.facilityProduct.product
                  .measurementUnit
                ];

              return (
                <article
                  key={target.id}
                  className={`rounded-xl border bg-slate-900 p-6 ${target.isActive
                    ? "border-slate-800"
                    : "border-slate-800 opacity-70"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-400">
                        {periodLabels[target.period]}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {
                          target.facilityProduct.product
                            .name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        {
                          target.facilityProduct.facility
                            .name
                        }
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${targetHealthClasses[target.health]
                          }`}
                      >
                        {targetHealthLabels[target.health]}
                      </span>

                      <span
                        className={
                          target.realizationRate >= 100
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                            : "rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-400"
                        }
                      >
                        %
                        {target.realizationRate.toLocaleString(
                          "tr-TR",
                          {
                            maximumFractionDigits: 1,
                          },
                        )}
                      </span>

                      <Link
                        href={`/targets/${target.id}/edit`}
                        className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
                      >
                        Düzenle
                      </Link>
                    </div>
                  </div>

                  <p className="mt-5 text-sm text-slate-400">
                    {target.startDate.toLocaleDateString(
                      "tr-TR",
                      {
                        timeZone: "UTC",
                      },
                    )}
                    {" - "}
                    {target.endDate.toLocaleDateString(
                      "tr-TR",
                      {
                        timeZone: "UTC",
                      },
                    )}
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${target.isActive
                        ? "bg-emerald-500"
                        : "bg-slate-600"
                        }`}
                      style={{
                        width: `${Math.min(
                          Math.max(
                            target.realizationRate,
                            0,
                          ),
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Hedef
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {formatQuantity(target.targetQuantity)} {unit}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Gerçekleşen
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {formatQuantity(target.actualQuantity)} {unit}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Kalan üretim
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {formatQuantity(target.remainingQuantity)} {unit}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Plan çizgisine göre sapma
                      </dt>
                      <dd
                        className={`mt-1 font-semibold ${target.deviationQuantity >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                          }`}
                      >
                        {target.deviationQuantity > 0 ? "+" : ""}
                        {formatQuantity(target.deviationQuantity)} {unit}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Günlük gerekli üretim
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {formatQuantity(target.requiredDailyQuantity)} {unit}
                      </dd>
                      <p className="mt-1 text-xs text-slate-500">
                        {target.remainingDayCount > 0
                          ? `${target.remainingDayCount} gün kaldı`
                          : "Dönem sona erdi"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950 p-3">
                      <dt className="text-xs text-slate-400">
                        Dönem sonu tahmini
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {formatQuantity(target.forecastQuantity)} {unit}
                      </dd>
                      <p className="mt-1 text-xs text-slate-500">
                        {target.forecastRate === null
                          ? "Henüz gerçekleşme yok"
                          : `%${target.forecastRate.toLocaleString("tr-TR")}`}
                      </p>
                    </div>
                  </dl>

                  {target.notes && (
                    <p className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400">
                      {target.notes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}