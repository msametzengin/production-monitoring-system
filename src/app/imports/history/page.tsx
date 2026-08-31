import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const resourceLabels = {
  PRODUCTION: "Üretim",
  TARGET: "Hedef",
  DOWNTIME: "Duruş",
} as const;

const statusLabels = {
  COMPLETED: "Tamamlandı",
  PARTIAL: "Kısmi",
  FAILED: "Başarısız",
} as const;

export default async function ImportHistoryPage() {
  const batches = await prisma.importBatch.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const totalRows = batches.reduce(
    (total, batch) => total + batch.totalRows,
    0,
  );

  const importedRows = batches.reduce(
    (total, batch) => total + batch.importedRows,
    0,
  );

  const invalidRows = batches.reduce(
    (total, batch) => total + batch.invalidRows,
    0,
  );

  const successfulImports = batches.filter(
    (batch) => batch.status === "COMPLETED",
  ).length;

  const dataQualityRate =
    totalRows > 0
      ? ((totalRows - invalidRows) / totalRows) * 100
      : 100;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Veri Yönetimi
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Excel Import Geçmişi
              </h1>

              <p className="mt-2 text-slate-400">
                İçe aktarma işlemleri ve veri kalitesi özeti
              </p>
            </div>

            <Link
              href="/production"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Üretim kayıtlarına dön
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Import işlemi"
            value={batches.length.toLocaleString("tr-TR")}
          />

          <SummaryCard
            label="Başarılı işlem"
            value={successfulImports.toLocaleString("tr-TR")}
            color="text-emerald-400"
          />

          <SummaryCard
            label="İçe aktarılan satır"
            value={importedRows.toLocaleString("tr-TR")}
            color="text-sky-400"
          />

          <SummaryCard
            label="Veri kalitesi"
            value={`%${dataQualityRate.toLocaleString("tr-TR", {
              maximumFractionDigits: 1,
            })}`}
            color={
              dataQualityRate >= 95
                ? "text-emerald-400"
                : dataQualityRate >= 80
                  ? "text-amber-400"
                  : "text-red-400"
            }
          />
        </section>

        {batches.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Henüz tamamlanmış bir Excel import işlemi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Zaman</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Dosya</th>
                  <th className="px-4 py-3 text-right">
                    Toplam
                  </th>
                  <th className="px-4 py-3 text-right">
                    Geçerli
                  </th>
                  <th className="px-4 py-3 text-right">
                    Hatalı
                  </th>
                  <th className="px-4 py-3 text-right">
                    Aktarılan
                  </th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {batch.createdAt.toLocaleString(
                        "tr-TR",
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {resourceLabels[batch.resource]}
                    </td>

                    <td className="max-w-72 truncate px-4 py-3">
                      {batch.fileName}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {batch.totalRows}
                    </td>

                    <td className="px-4 py-3 text-right text-emerald-400">
                      {batch.validRows}
                    </td>

                    <td className="px-4 py-3 text-right text-red-400">
                      {batch.invalidRows}
                    </td>

                    <td className="px-4 py-3 text-right text-sky-400">
                      {batch.importedRows}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          batch.status === "COMPLETED"
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400"
                            : batch.status === "PARTIAL"
                              ? "rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-400"
                              : "rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-400"
                        }
                      >
                        {statusLabels[batch.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-slate-100",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}