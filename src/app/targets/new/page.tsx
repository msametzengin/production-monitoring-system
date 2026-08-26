import { prisma } from "@/lib/prisma";
import { createProductionTarget } from "../actions";
import { ProductionTargetForm } from "../production-target-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

export default async function NewProductionTargetPage() {
  const facilityProductRecords =
    await prisma.facilityProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        facility: true,
        product: true,
      },
    });

  const facilityProducts = facilityProductRecords
    .filter(
      (facilityProduct) =>
        facilityProduct.facility.isActive &&
        facilityProduct.product.isActive,
    )
    .sort((first, second) => {
      const facilityComparison =
        first.facility.name.localeCompare(
          second.facility.name,
          "tr",
        );

      if (facilityComparison !== 0) {
        return facilityComparison;
      }

      return first.product.name.localeCompare(
        second.product.name,
        "tr",
      );
    })
    .map((facilityProduct) => ({
      id: facilityProduct.id,
      facilityCode: facilityProduct.facility.code,
      facilityName: facilityProduct.facility.name,
      productCode: facilityProduct.product.code,
      productName: facilityProduct.product.name,
      unitLabel:
        measurementUnitLabels[
          facilityProduct.product.measurementUnit
        ],
    }));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Planlama
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Üretim Hedefi
          </h1>

          <p className="mt-2 text-slate-400">
            Tesis ve ürün için dönemsel üretim hedefi
            oluşturun.
          </p>
        </header>

        {facilityProducts.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            Üretim hedefi oluşturabilmek için en az bir
            aktif tesis–ürün ilişkisi bulunmalıdır.
          </div>
        ) : (
          <ProductionTargetForm
            action={createProductionTarget}
            facilityProducts={facilityProducts}
            submitLabel="Üretim hedefini oluştur"
          />
        )}
      </div>
    </main>
  );
}