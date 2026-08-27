import { prisma } from "@/lib/prisma";
import { RecordFilters } from "@/components/record-filters";
import { parseDashboardFilters } from "@/lib/queries/dashboard";
import type { FilterSearchParams } from "@/lib/filters";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<FilterSearchParams>;
};

export default async function Home({
  searchParams,
}: DashboardPageProps) {
  const filters = parseDashboardFilters(await searchParams);

  const [
    facilities,
    facilityOptions,
    productOptions,
    productionRecords,
    productionSummary,
    productionTargets,
    downtimeGroups,
  ] = await Promise.all([
    filters.facilityWhere === null
      ? Promise.resolve([])
      : prisma.facility.findMany({
          where: filters.facilityWhere,
          include: {
            products: {
              where: {
                isActive: true,
                product: {
                  isActive: true,
                },
                ...(filters.values.productId
                  ? {
                      productId: Number(
                        filters.values.productId,
                      ),
                    }
                  : {}),
              },
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),

    prisma.facility.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    filters.productionWhere === null
      ? Promise.resolve([])
      : prisma.productionRecord.findMany({
          where: filters.productionWhere,
          take: 10,
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
        }),

    // Bu sorguda take yok: tüm eşleşen kayıtları toplar.
    filters.productionWhere === null
      ? Promise.resolve(null)
      : prisma.productionRecord.aggregate({
          where: filters.productionWhere,
          _count: {
            _all: true,
          },
          _sum: {
            operatingMinutes: true,
          },
        }),

    filters.targetWhere === null
      ? Promise.resolve([])
      : prisma.productionTarget.findMany({
          where: filters.targetWhere,
          take: 10,
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

    filters.downtimeWhere === null
      ? Promise.resolve([])
      : prisma.downtimeRecord.groupBy({
          by: ["type"],
          where: filters.downtimeWhere,
          _sum: {
            durationMinutes: true,
          },
        }),
  ]);

  const totalProductionCount =
    productionSummary?._count._all ?? 0;

  const totalOperatingMinutes =
    productionSummary?._sum.operatingMinutes ?? 0;

  const downtimeSummary = downtimeGroups.reduce(
    (summary, group) => {
      const minutes = group._sum.durationMinutes ?? 0;

      summary.total += minutes;

      if (group.type === "PLANNED") {
        summary.planned += minutes;
      } else {
        summary.unplanned += minutes;
      }

      return summary;
    },
    {
      total: 0,
      planned: 0,
      unplanned: 0,
    },
  );

  const targetSummaries = await Promise.all(
    productionTargets.map(async (target) => {
      // Dashboard tarihleri hedefleri seçer.
      // Gerçekleşen miktar hedefin tam döneminden hesaplanır.
      const production = await prisma.productionRecord.aggregate({
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
        production._sum.quantity ?? 0,
      );

      const targetQuantity = Number(target.targetQuantity);

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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Eti Maden Emet
          </p>

          <h1 className="text-3xl font-bold">
            Üretim Analiz ve Takip Sistemi
          </h1>

          <p className="mt-3 text-slate-400">
            Tesis, ürün ve tarihe göre üretim özeti
          </p>
        </header>
                <RecordFilters
          action="/"
          values={filters.values}
          error={filters.error}
          fields={[
            {
              name: "facilityId",
              label: "Tesis",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm tesisler",
                },
                ...facilityOptions.map((facility) => ({
                  value: String(facility.id),
                  label: `${facility.code} · ${facility.name}${
                    facility.isActive ? "" : " (pasif)"
                  }`,
                })),
              ],
            },
            {
              name: "productId",
              label: "Ürün",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm ürünler",
                },
                ...productOptions.map((product) => ({
                  value: String(product.id),
                  label: `${product.code} · ${product.name}${
                    product.isActive ? "" : " (pasif)"
                  }`,
                })),
              ],
            },
            {
              name: "startDate",
              label: "Başlangıç tarihi",
              type: "date",
            },
            {
              name: "endDate",
              label: "Bitiş tarihi",
              type: "date",
            },
          ]}
        />

        <div className="mb-8 space-y-2 text-xs leading-5 text-slate-400">
          <p>
            Çalışma toplamı, filtreye uyan tüm arşivlenmemiş
            üretim kayıtlarının sürelerini toplar. Farklı ürünlerin
            süreleri örtüşebilir; bu değer tesisin kesintisiz
            çalışma süresi değildir.
          </p>
          <p>
            Duruşlar tesis ve başlangıç gününe göre filtrelenir;
            kayıtların tam süreleri toplanır. Ürün seçimi duruş
            özetini değiştirmez.
          </p>
          <p>
            Tarih aralığıyla kesişen en güncel 10 aktif hedef
            gösterilir. Karşılaştırmalar hedeflerin kendi tam
            dönemlerine aittir. Tesis kartları tarih filtresinden
            etkilenmez.
          </p>
        </div>
        {filters.error ? (
          <p className="rounded-xl border border-slate-800 p-6 text-slate-400">
            Özetleri görmek için filtre hatasını düzeltin.
          </p>
        ) : (
          <>
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Üretim Özeti</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Kayıt çalışma toplamı</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {totalOperatingMinutes} dk
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Toplam duruş</p>
              <p className="mt-2 text-2xl font-bold">
                {downtimeSummary.total} dk
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Planlı duruş</p>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {downtimeSummary.planned} dk
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Plansız duruş</p>
              <p className="mt-2 text-2xl font-bold text-red-400">
                {downtimeSummary.unplanned} dk
              </p>
            </article>
          </div>

          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold">
              Hedef - Gerçekleşen Üretim
            </h3>

            {targetSummaries.length === 0 ? (
              <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
                Filtrelere uygun aktif üretim hedefi bulunmuyor.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {targetSummaries.map((target) => (
                  <article
                    key={target.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {target.facilityProduct.product.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {target.facilityProduct.facility.name}
                        </p>
                      </div>

                      <span
                        className={
                          target.realizationRate >= 100
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                            : "rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-400"
                        }
                      >
                        %
                        {target.realizationRate.toLocaleString("tr-TR", {
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </div>

                    <p className="mt-4 text-sm text-slate-400">
                      {target.startDate.toLocaleDateString("tr-TR", {
                        timeZone: "UTC",
                      })}
                      {" - "}
                      {target.endDate.toLocaleDateString("tr-TR", {
                        timeZone: "UTC",
                      })}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.min(
                            Math.max(target.realizationRate, 0),
                            100,
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Hedef</p>
                        <p className="mt-1 font-semibold">
                          {target.targetQuantity.toLocaleString("tr-TR")}{" "}
                          {
                            measurementUnitLabels[
                            target.facilityProduct.product.measurementUnit
                            ]
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-slate-400">Gerçekleşen</p>
                        <p className="mt-1 font-semibold">
                          {target.actualQuantity.toLocaleString("tr-TR")}{" "}
                          {
                            measurementUnitLabels[
                            target.facilityProduct.product.measurementUnit
                            ]
                          }
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tesisler</h2>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {facilities.length} tesis
            </span>
          </div>

          {facilities.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
              Tesis ve ürün seçimine uygun tesis bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {facilities.map((facility) => (
                <article
                  key={facility.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-emerald-400">
                        {facility.code}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold">
                        {facility.name}
                      </h3>
                    </div>

                    <span
                      className={
                        facility.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400"
                      }
                    >
                      {facility.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Konum</dt>
                      <dd>{facility.location ?? "Belirtilmedi"}</dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Günlük kapasite</dt>
                      <dd>
                        {facility.dailyCapacity
                          ? Number(facility.dailyCapacity).toLocaleString("tr-TR")
                          : "Belirtilmedi"}{" "}
                        {measurementUnitLabels[facility.capacityUnit]}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Planlanan çalışma</dt>
                      <dd>{facility.plannedDailyMinutes / 60} saat</dd>
                    </div>
                  </dl>
                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <p className="mb-3 text-sm text-slate-400">Üretilen ürünler</p>

                    {facility.products.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Bu tesise bağlı ürün bulunmuyor.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {facility.products.map((facilityProduct) => (
                          <span
                            key={facilityProduct.id}
                            className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-300"
                          >
                            {facilityProduct.product.name}

                            {facilityProduct.nominalDailyCapacity
                              ? ` · ${Number(
                                facilityProduct.nominalDailyCapacity,
                              ).toLocaleString("tr-TR")} ${`${measurementUnitLabels[
                              facilityProduct.product.measurementUnit
                              ]}/gün`
                              }`
                              : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Son Üretim Kayıtları</h2>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {productionRecords.length} gösterilen / {totalProductionCount} kayıt
            </span>
          </div>

          {productionRecords.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
              Filtrelere uygun üretim kaydı bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">Tesis</th>
                    <th className="px-4 py-3 font-medium">Ürün</th>
                    <th className="px-4 py-3 font-medium">Vardiya</th>
                    <th className="px-4 py-3 text-right font-medium">Üretim</th>
                    <th className="px-4 py-3 text-right font-medium">Çalışma</th>
                    <th className="px-4 py-3 text-right font-medium">Oran</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {productionRecords.map((record) => {
                    const operatingRate =
                      record.shift.plannedMinutes > 0
                        ? Math.round(
                          (record.operatingMinutes /
                            record.shift.plannedMinutes) *
                          100,
                        )
                        : 0;

                    return (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap px-4 py-3">
                          {record.recordDate.toLocaleDateString("tr-TR", {
                            timeZone: "UTC",
                          })}
                        </td>

                        <td className="px-4 py-3">
                          {record.facilityProduct.facility.name}
                        </td>

                        <td className="px-4 py-3">
                          {record.facilityProduct.product.name}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {record.shift.name}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                          {Number(record.quantity).toLocaleString("tr-TR")}{" "}
                          {measurementUnitLabels[
                            record.facilityProduct.product.measurementUnit
                          ]}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {record.operatingMinutes} dk
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-400">
                          %{operatingRate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </main>
  );
}