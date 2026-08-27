import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RecordFilters } from "@/components/record-filters";
import { ExcelExportLink } from "@/components/excel-export-link";
import { parseDowntimeFilters } from "@/lib/queries/downtimes";
import type { FilterSearchParams } from "@/lib/filters";

const downtimeTypeLabels = {
  PLANNED: "Planlı",
  UNPLANNED: "Plansız",
} as const;

const downtimeCategoryLabels = {
  MAINTENANCE: "Bakım",
  BREAKDOWN: "Arıza",
  ENERGY: "Enerji",
  RAW_MATERIAL: "Hammadde",
  PERSONNEL: "Personel",
  CLEANING: "Temizlik",
  PROCESS: "Proses",
  OTHER: "Diğer",
} as const;

const sourceLabels = {
  MANUAL: "Manuel",
  EXCEL_IMPORT: "Excel",
} as const;

function formatDateTime(date: Date) {
  return date.toLocaleString("tr-TR", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const dynamic = "force-dynamic";

export default async function DowntimesPage({
  searchParams,
}: {
  searchParams: Promise<FilterSearchParams>;
}) {
  const { values, where, error } = parseDowntimeFilters(
    await searchParams,
  );

  const [downtimeRecords, facilities, reasons] =
    await Promise.all([
      where === null
        ? Promise.resolve([])
        : prisma.downtimeRecord.findMany({
          where,
          orderBy: [
            { startedAt: "desc" },
            { id: "desc" },
          ],
          include: {
            facility: true,
            downtimeReason: true,
          },
        }),

      prisma.facility.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.downtimeReason.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);
  const summary = downtimeRecords.reduce(
    (result, record) => {
      result.total += record.durationMinutes;

      if (record.type === "PLANNED") {
        result.planned += record.durationMinutes;
      } else {
        result.unplanned += record.durationMinutes;
      }

      return result;
    },
    {
      total: 0,
      planned: 0,
      unplanned: 0,
    },
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Üretim Duruşları
              </h1>

              <p className="mt-2 text-slate-400">
                Planlı ve plansız üretim duruşlarının takibi
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
                {downtimeRecords.length} kayıt
              </span>
              <ExcelExportLink
                resource="downtimes"
                values={values}
                disabled={Boolean(error)}
              />
              <Link
                href="/downtimes/reasons"
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Duruş nedenleri
              </Link>

              <Link
                href="/downtimes/new"
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni duruş
              </Link>
            </div>
          </div>
        </header>
        <RecordFilters
          action="/downtimes"
          values={values}
          error={error}
          fields={[
            {
              name: "q",
              label: "Arama",
              type: "text",
              placeholder: "Tesis, neden, kod veya not",
            },
            {
              name: "facilityId",
              label: "Tesis",
              type: "select",
              options: [
                { value: "", label: "Tüm tesisler" },
                ...facilities.map((facility) => ({
                  value: facility.id.toString(),
                  label: `${facility.code} · ${facility.name}${facility.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "reasonId",
              label: "Duruş nedeni",
              type: "select",
              options: [
                { value: "", label: "Tüm nedenler" },
                ...reasons.map((reason) => ({
                  value: reason.id.toString(),
                  label: `${reason.code} · ${reason.name}${reason.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "type",
              label: "Duruş türü",
              type: "select",
              options: [
                { value: "all", label: "Tüm türler" },
                { value: "PLANNED", label: "Planlı" },
                { value: "UNPLANNED", label: "Plansız" },
              ],
            },
            {
              name: "category",
              label: "Kategori",
              type: "select",
              options: [
                { value: "all", label: "Tüm kategoriler" },
                ...Object.entries(downtimeCategoryLabels).map(
                  ([value, label]) => ({
                    value,
                    label,
                  }),
                ),
              ],
            },
            {
              name: "startDate",
              label: "Başlangıç günü: en erken",
              type: "date",
            },
            {
              name: "endDate",
              label: "Başlangıç günü: en geç",
              type: "date",
            },
            {
              name: "source",
              label: "Kayıt kaynağı",
              type: "select",
              options: [
                { value: "all", label: "Tüm kaynaklar" },
                { value: "MANUAL", label: "Manuel" },
                { value: "EXCEL_IMPORT", label: "Excel" },
              ],
            },
          ]}
        />

        <p className="mb-6 text-sm text-slate-400">
          Tarihler duruşun başlangıç gününü filtreler.
          Özet kartları listelenen kayıtların tam sürelerini toplar.
        </p>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Toplam duruş</p>
            <p className="mt-2 text-2xl font-bold">{summary.total} dk</p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Planlı duruş</p>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {summary.planned} dk
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Plansız duruş</p>
            <p className="mt-2 text-2xl font-bold text-red-400">
              {summary.unplanned} dk
            </p>
          </article>
        </section>

        {downtimeRecords.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            {error
              ? "Sonuçları görmek için filtre hatasını düzeltin."
              : "Seçilen filtrelere uygun duruş kaydı bulunamadı."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Başlangıç</th>
                  <th className="px-4 py-3 font-medium">Bitiş</th>
                  <th className="px-4 py-3 font-medium">Tesis</th>
                  <th className="px-4 py-3 font-medium">Neden</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Tür</th>
                  <th className="px-4 py-3 text-right font-medium">Süre</th>
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Not</th>
                  <th className="px-4 py-3 font-medium">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {downtimeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-900">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateTime(record.startedAt)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateTime(record.endedAt)}
                    </td>

                    <td className="px-4 py-3">{record.facility.name}</td>

                    <td className="px-4 py-3 font-medium">
                      {record.downtimeReason.name}
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {
                        downtimeCategoryLabels[
                        record.downtimeReason.category
                        ]
                      }
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          record.type === "PLANNED"
                            ? "rounded-full bg-amber-500/15 px-3 py-1 text-amber-400"
                            : "rounded-full bg-red-500/15 px-3 py-1 text-red-400"
                        }
                      >
                        {downtimeTypeLabels[record.type]}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      {record.durationMinutes} dk
                    </td>

                    <td className="px-4 py-3">
                      {sourceLabels[record.source]}
                    </td>

                    <td className="min-w-56 px-4 py-3 text-slate-400">
                      {record.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/downtimes/${record.id}/edit`}
                        className="font-medium text-blue-400 transition hover:text-blue-300"
                      >
                        Düzenle
                      </Link>
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