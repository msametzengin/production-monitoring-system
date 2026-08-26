import { prisma } from "@/lib/prisma";
import Link from "next/link";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  const facilities = await prisma.facility.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      products: {
        where: {
          isActive: true,
        },
        include: {
          product: true,
        },
      },
      _count: {
        select: {
          downtimeRecords: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Tesis Yönetimi
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Tesisler</h1>

              <p className="mt-2 text-slate-400">
                Üretim tesisleri, kapasiteleri ve bağlı ürünler
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
                {facilities.length} tesis
              </span>

              <Link
                href="/facilities/new"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni tesis
              </Link>
            </div>
          </div>
        </header>

        {facilities.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Henüz tesis kaydı bulunmuyor.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {facilities.map((facility) => (
              <article
                key={facility.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-400">
                      {facility.code}
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      {facility.name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {facility.location ?? "Konum belirtilmedi"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={
                        facility.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400"
                      }
                    >
                      {facility.isActive ? "Aktif" : "Pasif"}
                    </span>

                    <Link
                      href={`/facilities/${facility.id}/edit`}
                      className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                    >
                      Düzenle
                    </Link>
                  </div>
                </div>

                {facility.description && (
                  <p className="mt-5 text-sm leading-6 text-slate-400">
                    {facility.description}
                  </p>
                )}

                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-950/60 p-4">
                    <dt className="text-xs text-slate-400">Günlük kapasite</dt>
                    <dd className="mt-2 font-semibold">
                      {facility.dailyCapacity !== null
                        ? Number(facility.dailyCapacity).toLocaleString("tr-TR")
                        : "—"}{" "}
                      {measurementUnitLabels[facility.capacityUnit]}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 p-4">
                    <dt className="text-xs text-slate-400">
                      Planlanan çalışma
                    </dt>
                    <dd className="mt-2 font-semibold">
                      {facility.plannedDailyMinutes / 60} saat
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 p-4">
                    <dt className="text-xs text-slate-400">Aktif ürün</dt>
                    <dd className="mt-2 font-semibold">
                      {facility.products.length}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 p-4">
                    <dt className="text-xs text-slate-400">Duruş kaydı</dt>
                    <dd className="mt-2 font-semibold">
                      {facility._count.downtimeRecords}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 border-t border-slate-800 pt-5">
                  <h3 className="text-sm font-medium text-slate-300">
                    Üretilen ürünler
                  </h3>

                  {facility.products.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Bu tesise bağlı aktif ürün bulunmuyor.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {facility.products.map((facilityProduct) => (
                        <span
                          key={facilityProduct.id}
                          className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-300"
                        >
                          {facilityProduct.product.name}

                          {facilityProduct.nominalDailyCapacity !== null
                            ? ` · ${Number(
                              facilityProduct.nominalDailyCapacity,
                            ).toLocaleString("tr-TR")} ${measurementUnitLabels[
                            facilityProduct.product.measurementUnit
                            ]
                            }/gün`
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
      </div>
    </main>
  );
}