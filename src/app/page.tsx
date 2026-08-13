import { prisma } from "@/lib/prisma";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const facilities = await prisma.facility.findMany({
    include: {
      products: {
        where: {
          isActive: true,
        },
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const productionRecords = await prisma.productionRecord.findMany({
    take: 10,
    orderBy: [
      {
        recordDate: "desc",
      },
      {
        createdAt: "desc",
      },
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
            MySQL veritabanında kayıtlı tesisler
          </p>
        </header>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tesisler</h2>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {facilities.length} tesis
            </span>
          </div>

          {facilities.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
              Henüz tesis kaydı bulunmuyor.
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
              {productionRecords.length} kayıt
            </span>
          </div>

          {productionRecords.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
              Henüz üretim kaydı bulunmuyor.
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
      </div>
    </main>
  );
}