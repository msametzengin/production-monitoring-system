import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProductionRecord } from "../../actions";
import { ProductionRecordForm } from "../../production-record-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

type EditProductionRecordPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditProductionRecordPage({
  params,
}: EditProductionRecordPageProps) {
  const { id } = await params;
  const recordId = Number(id);

  if (!Number.isInteger(recordId) || recordId <= 0) {
    notFound();
  }

  const productionRecord = await prisma.productionRecord.findUnique({
    where: {
      id: recordId,
    },
  });

  if (!productionRecord) {
    notFound();
  }

  const [facilityProductRecords, shifts] = await Promise.all([
    prisma.facilityProduct.findMany({
      where: {
        isActive: true,
      },
      include: {
        facility: true,
        product: true,
      },
    }),

    prisma.shift.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
  ]);

  const facilityProducts = facilityProductRecords
    .filter(
      (facilityProduct) =>
        facilityProduct.facility.isActive &&
        facilityProduct.product.isActive,
    )
    .sort((first, second) =>
      first.facility.name.localeCompare(
        second.facility.name,
        "tr",
      ),
    )
    .map((facilityProduct) => ({
      id: facilityProduct.id,
      facilityName: facilityProduct.facility.name,
      productName: facilityProduct.product.name,
      unitLabel:
        measurementUnitLabels[
          facilityProduct.product.measurementUnit
        ],
    }));

  const shiftOptions = shifts.map((shift) => ({
    id: shift.id,
    code: shift.code,
    name: shift.name,
    plannedMinutes: shift.plannedMinutes,
  }));

  const updateAction = updateProductionRecord.bind(
    null,
    productionRecord.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Üretim Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Üretim Kaydını Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            Kayıt #{productionRecord.id} için üretim bilgilerini
            güncelleyin.
          </p>
        </header>

        <ProductionRecordForm
          action={updateAction}
          facilityProducts={facilityProducts}
          shifts={shiftOptions}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            recordDate: productionRecord.recordDate
              .toISOString()
              .slice(0, 10),
            facilityProductId:
              productionRecord.facilityProductId,
            shiftId: productionRecord.shiftId,
            quantity: productionRecord.quantity.toString(),
            operatingMinutes:
              productionRecord.operatingMinutes,
            notes: productionRecord.notes ?? "",
          }}
        />
      </div>
    </main>
  );
}