import { prisma } from "@/lib/prisma";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

const sourceLabels = {
  MANUAL: "Manuel",
  EXCEL_IMPORT: "Excel",
} as const;

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const productionRecords = await prisma.productionRecord.findMany({
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
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Üretim Yönetimi
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Üretim Kayıtları</h1>

              <p className="mt-2 text-slate-400">
                Tesis, ürün ve vardiya bazlı gerçekleşen üretimler
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {productionRecords.length} kayıt
            </span>
          </div>
        </header>

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
                  <th className="px-4 py-3 text-right font-medium">
                    Çalışma
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Oran</th>
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Not</th>
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
                    <tr key={record.id} className="hover:bg-slate-900">
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
                        {
                          measurementUnitLabels[
                            record.facilityProduct.product.measurementUnit
                          ]
                        }
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {record.operatingMinutes} dk
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-400">
                        %{operatingRate}
                      </td>

                      <td className="px-4 py-3">
                        {sourceLabels[record.source]}
                      </td>

                      <td className="min-w-48 px-4 py-3 text-slate-400">
                        {record.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}