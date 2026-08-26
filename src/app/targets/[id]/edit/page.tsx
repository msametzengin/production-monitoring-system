import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProductionTarget } from "../../actions";
import { ProductionTargetForm } from "../../production-target-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

type EditProductionTargetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditProductionTargetPage({
  params,
}: EditProductionTargetPageProps) {
  const { id } = await params;
  const targetId = Number(id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    notFound();
  }

  const productionTarget =
    await prisma.productionTarget.findUnique({
      where: {
        id: targetId,
      },
    });

  if (!productionTarget) {
    notFound();
  }

  const facilityProductRecords =
    await prisma.facilityProduct.findMany({
      include: {
        facility: true,
        product: true,
      },
    });

  const facilityProducts = facilityProductRecords
    .filter(
      (facilityProduct) =>
        facilityProduct.id ===
          productionTarget.facilityProductId ||
        (facilityProduct.isActive &&
          facilityProduct.facility.isActive &&
          facilityProduct.product.isActive),
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

  const updateAction = updateProductionTarget.bind(
    null,
    productionTarget.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Planlama
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Üretim Hedefini Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            Hedef #{productionTarget.id} için planlama
            bilgilerini güncelleyin.
          </p>
        </header>

        <ProductionTargetForm
          action={updateAction}
          facilityProducts={facilityProducts}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            facilityProductId:
              productionTarget.facilityProductId,
            period: productionTarget.period,
            startDate: productionTarget.startDate
              .toISOString()
              .slice(0, 10),
            endDate: productionTarget.endDate
              .toISOString()
              .slice(0, 10),
            targetQuantity:
              productionTarget.targetQuantity.toString(),
            notes: productionTarget.notes ?? "",
            isActive: productionTarget.isActive,
          }}
        />
      </div>
    </main>
  );
}