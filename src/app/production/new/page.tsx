import { prisma } from "@/lib/prisma";
import { ProductionRecordForm } from "../production-record-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

export const dynamic = "force-dynamic";

export default async function NewProductionRecordPage() {
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Üretim Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Üretim Kaydı
          </h1>

          <p className="mt-2 text-slate-400">
            Gerçekleşen üretim ve çalışma süresi bilgilerini girin.
          </p>
        </header>

        {facilityProducts.length === 0 || shiftOptions.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            Üretim kaydı oluşturabilmek için en az bir aktif
            tesis–ürün ilişkisi ve aktif vardiya bulunmalıdır.
          </div>
        ) : (
          <ProductionRecordForm
            facilityProducts={facilityProducts}
            shifts={shiftOptions}
          />
        )}
      </div>
    </main>
  );
}