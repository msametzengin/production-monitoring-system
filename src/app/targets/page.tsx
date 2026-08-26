import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const productionTargets =
    await prisma.productionTarget.findMany({
      orderBy: {
        startDate: "desc",
      },
      include: {
        facilityProduct: {
          include: {
            facility: true,
            product: true,
          },
        },
      },
    });

  const targetSummaries = await Promise.all(
    productionTargets.map(async (target) => {
      const productionSummary =
        await prisma.productionRecord.aggregate({
          where: {
            archivedAt: null,
            facilityProductId:
              target.facilityProductId,
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

      const targetQuantity = Number(
        target.targetQuantity,
      );

      const realizationRate =
        targetQuantity > 0
          ? Math.round(
              (actualQuantity / targetQuantity) * 1000,
            ) / 10
          : 0;

      return {
        ...target,
        actualQuantity,
        targetQuantity,
        realizationRate,
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
                href="/targets/new"
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni hedef
              </Link>
            </div>
          </div>
        </header>

        {targetSummaries.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Henüz üretim hedefi bulunmuyor.
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
                  className={`rounded-xl border bg-slate-900 p-6 ${
                    target.isActive
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
                        className={
                          target.isActive
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400"
                            : "rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300"
                        }
                      >
                        {target.isActive
                          ? "Aktif"
                          : "Pasif"}
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
                      className={`h-full rounded-full ${
                        target.isActive
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

                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-slate-400">
                        Hedef
                      </dt>

                      <dd className="mt-1 text-lg font-semibold">
                        {target.targetQuantity.toLocaleString(
                          "tr-TR",
                        )}{" "}
                        {unit}
                      </dd>
                    </div>

                    <div className="text-right">
                      <dt className="text-slate-400">
                        Gerçekleşen
                      </dt>

                      <dd className="mt-1 text-lg font-semibold">
                        {target.actualQuantity.toLocaleString(
                          "tr-TR",
                        )}{" "}
                        {unit}
                      </dd>
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