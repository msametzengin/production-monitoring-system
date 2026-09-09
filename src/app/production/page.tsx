import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RecordStatusButton } from "./record-status-button";
import { RecordFilters } from "@/components/record-filters";
import { ExcelExportLink } from "@/components/excel-export-link";
import { parseProductionFilters } from "@/lib/queries/production";
import {
  getQueryValue,
  type FilterSearchParams,
} from "@/lib/filters";

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

const PAGE_SIZE = 50;
export const dynamic = "force-dynamic";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<FilterSearchParams>;
}) {
  const params = await searchParams;

  const { values, where, error } =
    parseProductionFilters(params);

  const rawPage = getQueryValue(params, "page");
  const parsedPage = Number(rawPage);

  const requestedPage =
    /^[1-9]\d*$/.test(rawPage) &&
      Number.isSafeInteger(parsedPage)
      ? parsedPage
      : 1;

  const [
    totalRecordCount,
    activeRecordCount,
    archivedRecordCount,
    facilities,
    products,
    shifts,
  ] = await Promise.all([
    where === null
      ? Promise.resolve(0)
      : prisma.productionRecord.count({ where }),

    where === null
      ? Promise.resolve(0)
      : prisma.productionRecord.count({
        where: {
          AND: [where, { archivedAt: null }],
        },
      }),

    where === null
      ? Promise.resolve(0)
      : prisma.productionRecord.count({
        where: {
          AND: [
            where,
            {
              archivedAt: {
                not: null,
              },
            },
          ],
        },
      }),

    prisma.facility.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.shift.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecordCount / PAGE_SIZE),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const productionRecords =
    where === null
      ? []
      : await prisma.productionRecord.findMany({
        where,
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: [
          {
            recordDate: "desc",
          },
          {
            createdAt: "desc",
          },
          {
            id: "desc",
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

  function createPageHref(pageNumber: number) {
    const query = new URLSearchParams();

    for (const [name, value] of Object.entries(values)) {
      if (value && value !== "all") {
        query.set(name, value);
      }
    }

    query.set("page", pageNumber.toString());

    return `/production?${query.toString()}`;
  }

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

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400">
                  {activeRecordCount} aktif
                </span>

                {archivedRecordCount > 0 && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
                    {archivedRecordCount} arşiv
                  </span>
                )}
              </div>
              <Link
                href="/production/import"
                className="rounded-lg border border-sky-500/50 px-4 py-2 text-sm font-medium text-sky-400 transition hover:bg-sky-500/10"
              >
                Excel’den içe aktar
              </Link>
              <ExcelExportLink
                resource="production"
                values={values}
                disabled={Boolean(error)}
              />
              <Link
                href="/production/new"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni üretim kaydı
              </Link>
            </div>
          </div>
        </header>
        <RecordFilters
          action="/production"
          values={values}
          error={error}
          fields={[
            {
              name: "q",
              label: "Arama",
              type: "text",
              placeholder: "Tesis, ürün, kod veya not",
            },
            {
              name: "facilityId",
              label: "Tesis",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm tesisler",
                },
                ...facilities.map((facility) => ({
                  value: facility.id.toString(),
                  label: `${facility.code} · ${facility.name}${facility.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "productId",
              label: "Ürün",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm ürünler",
                },
                ...products.map((product) => ({
                  value: product.id.toString(),
                  label: `${product.code} · ${product.name}${product.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "shiftId",
              label: "Vardiya",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm vardiyalar",
                },
                ...shifts.map((shift) => ({
                  value: shift.id.toString(),
                  label: `${shift.code} · ${shift.name}${shift.isActive ? "" : " (pasif)"
                    }`,
                })),
              ],
            },
            {
              name: "startDate",
              label: "Başlangıç tarihi",
              type: "date",
            },
            {
              name: "endDate",
              label: "Bitiş tarihi",
              type: "date",
            },
            {
              name: "status",
              label: "Kayıt durumu",
              type: "select",
              options: [
                {
                  value: "all",
                  label: "Tüm kayıtlar",
                },
                {
                  value: "active",
                  label: "Aktif kayıtlar",
                },
                {
                  value: "archived",
                  label: "Arşivdeki kayıtlar",
                },
              ],
            },
            {
              name: "source",
              label: "Kayıt kaynağı",
              type: "select",
              options: [
                {
                  value: "all",
                  label: "Tüm kaynaklar",
                },
                {
                  value: "MANUAL",
                  label: "Manuel",
                },
                {
                  value: "EXCEL_IMPORT",
                  label: "Excel",
                },
              ],
            },
          ]}
        />

        {productionRecords.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            {error
              ? "Sonuçları görmek için filtre hatasını düzeltin."
              : "Seçilen filtrelere uygun üretim kaydı bulunamadı."}
          </div>
        ) : (
          <>
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
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">İşlem</th>
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
                      <tr
                        key={record.id}
                        className={
                          record.archivedAt
                            ? "bg-slate-950/40 text-slate-500"
                            : "hover:bg-slate-900"
                        }
                      >
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
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={
                              record.archivedAt
                                ? "rounded-full bg-slate-700/50 px-3 py-1 text-xs text-slate-400"
                                : "rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400"
                            }
                          >
                            {record.archivedAt ? "Arşivde" : "Aktif"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-4">
                            {!record.archivedAt && (
                              <Link
                                href={`/production/${record.id}/edit`}
                                className="font-medium text-emerald-400 transition hover:text-emerald-300"
                              >
                                Düzenle
                              </Link>
                            )}

                            <RecordStatusButton
                              recordId={record.id}
                              isArchived={Boolean(record.archivedAt)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Üretim kayıtları sayfaları"
                className="mt-5 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-sm text-slate-400">
                  {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    totalRecordCount,
                  )}{" "}
                  / {totalRecordCount} kayıt · Sayfa{" "}
                  {currentPage} / {totalPages}
                </p>

                <div className="flex items-center gap-3">
                  {currentPage > 1 ? (
                    <Link
                      href={createPageHref(currentPage - 1)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      Önceki
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-600">
                      Önceki
                    </span>
                  )}

                  {currentPage < totalPages ? (
                    <Link
                      href={createPageHref(currentPage + 1)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      Sonraki
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-600">
                      Sonraki
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}