import { prisma } from "@/lib/prisma";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      facilities: {
        where: {
          isActive: true,
        },
        include: {
          facility: true,
          _count: {
            select: {
              productionRecords: {
                where: {
                  archivedAt: null,
                },
              },
              productionTargets: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Ürün Yönetimi
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Ürünler</h1>

              <p className="mt-2 text-slate-400">
                Ürün bilgileri, tesis ilişkileri ve üretim kapasiteleri
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {products.length} ürün
            </span>
          </div>
        </header>

        {products.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Henüz ürün kaydı bulunmuyor.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {products.map((product) => {
              const productionRecordCount = product.facilities.reduce(
                (total, facilityProduct) =>
                  total + facilityProduct._count.productionRecords,
                0,
              );

              const targetCount = product.facilities.reduce(
                (total, facilityProduct) =>
                  total + facilityProduct._count.productionTargets,
                0,
              );

              return (
                <article
                  key={product.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-emerald-400">
                        {product.code}
                      </p>

                      <h2 className="mt-1 text-2xl font-semibold">
                        {product.name}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {product.category ?? "Kategori belirtilmedi"}
                      </p>
                    </div>

                    <span
                      className={
                        product.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400"
                      }
                    >
                      {product.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  {product.description && (
                    <p className="mt-5 text-sm leading-6 text-slate-400">
                      {product.description}
                    </p>
                  )}

                  <dl className="mt-6 grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-slate-950/60 p-4">
                      <dt className="text-xs text-slate-400">Ölçü birimi</dt>
                      <dd className="mt-2 font-semibold">
                        {measurementUnitLabels[product.measurementUnit]}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-4">
                      <dt className="text-xs text-slate-400">Üretim kaydı</dt>
                      <dd className="mt-2 font-semibold">
                        {productionRecordCount}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-4">
                      <dt className="text-xs text-slate-400">Hedef kaydı</dt>
                      <dd className="mt-2 font-semibold">{targetCount}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="text-sm font-medium text-slate-300">
                      Bağlı tesisler
                    </h3>

                    {product.facilities.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Bu ürüne bağlı aktif tesis bulunmuyor.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {product.facilities.map((facilityProduct) => (
                          <div
                            key={facilityProduct.id}
                            className="flex items-center justify-between gap-4 rounded-lg bg-slate-950/60 p-4 text-sm"
                          >
                            <div>
                              <p className="font-medium">
                                {facilityProduct.facility.name}
                              </p>

                              <p className="mt-1 text-slate-500">
                                {facilityProduct.facility.code}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-slate-400">
                                Nominal kapasite
                              </p>

                              <p className="mt-1 font-semibold">
                                {facilityProduct.nominalDailyCapacity !== null
                                  ? Number(
                                    facilityProduct.nominalDailyCapacity,
                                  ).toLocaleString("tr-TR")
                                  : "—"}{" "}
                                {measurementUnitLabels[product.measurementUnit]}
                                /gün
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}