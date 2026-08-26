import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createFacilityProduct } from "../../actions";
import { FacilityProductForm } from "../../facility-product-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

type ProductFacilitiesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductFacilitiesPage({
  params,
}: ProductFacilitiesPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const [product, activeFacilities] = await Promise.all([
    prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        facilities: {
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
    }),

    prisma.facility.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const createAction = createFacilityProduct.bind(
    null,
    product.id,
  );

  const facilityOptions = activeFacilities.map((facility) => ({
    id: facility.id,
    code: facility.code,
    name: facility.name,
  }));

  const relations = [...product.facilities].sort(
    (first, second) =>
      first.facility.name.localeCompare(
        second.facility.name,
        "tr",
      ),
  );

  const unit =
    measurementUnitLabels[product.measurementUnit];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Tesis–Ürün Yönetimi
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {product.name} · Tesis İlişkileri
              </h1>

              <p className="mt-2 text-slate-400">
                Ürün kodu: {product.code} · Ölçü birimi: {unit}
              </p>
            </div>

            <Link
              href="/products"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Ürünlere dön
            </Link>
          </div>
        </header>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Mevcut İlişkiler
          </h2>

          {relations.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-6 text-slate-400">
              Bu ürün henüz herhangi bir tesise bağlanmamış.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {relations.map((relation) => (
                <article
                  key={relation.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-400">
                        {relation.facility.code}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold">
                        {relation.facility.name}
                      </h3>
                    </div>

                    <span
                      className={
                        relation.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400"
                      }
                    >
                      {relation.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-400">Kapasite</dt>
                      <dd className="mt-1 font-semibold">
                        {relation.nominalDailyCapacity !== null
                          ? Number(
                              relation.nominalDailyCapacity,
                            ).toLocaleString("tr-TR")
                          : "—"}{" "}
                        {unit}/gün
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-400">Üretim</dt>
                      <dd className="mt-1 font-semibold">
                        {relation._count.productionRecords}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-400">Hedef</dt>
                      <dd className="mt-1 font-semibold">
                        {relation._count.productionTargets}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <Link
                      href={`/products/${product.id}/facilities/${relation.id}/edit`}
                      className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                    >
                      İlişkiyi düzenle
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">
            Yeni Tesis Bağlantısı
          </h2>

          {facilityOptions.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
              Bağlantı kurulabilecek aktif tesis bulunmuyor.
            </div>
          ) : (
            <FacilityProductForm
              action={createAction}
              facilities={facilityOptions}
              cancelHref="/products"
              submitLabel="Ürünü tesise bağla"
            />
          )}
        </section>
      </div>
    </main>
  );
}