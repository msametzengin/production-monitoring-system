import { AnalyticsCharts } from "@/components/analytics-charts";
import { RecordFilters } from "@/components/record-filters";
import type { ProductionAnalyticsSeries } from "@/lib/analytics/types";
import type { FilterSearchParams } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import { getProductionAnalytics } from "@/lib/queries/analytics";
import { parseProductionFilters } from "@/lib/queries/production";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnalyticsPageProps = {
  searchParams: Promise<FilterSearchParams>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;

  const filters = parseProductionFilters({
    ...params,
    q: "",
    shiftId: "",
    status: "active",
    source: "all",
  });

  const [facilityOptions, productOptions] =
    await Promise.all([
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
    ]);

  let analyticsData: ProductionAnalyticsSeries[] = [];
  let analysisError: string | null = null;

  if (filters.where !== null) {
    try {
      analyticsData =
        await getProductionAnalytics(filters);
    } catch (error) {
      analysisError =
        error instanceof Error
          ? error.message
          : "Üretim analizi oluşturulamadı.";
    }
  }

  const filterValues = {
    facilityId: filters.values.facilityId,
    productId: filters.values.productId,
    startDate: filters.values.startDate,
    endDate: filters.values.endDate,
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
            İleri Analiz
          </p>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Üretim Analizleri
              </h1>

              <p className="mt-3 text-slate-400">
                Üretim trendleri, hareketli ortalamalar
                ve vardiya karşılaştırmaları
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {analyticsData.length} analiz serisi
            </span>
          </div>
        </header>

        <section className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
          <p className="text-sm font-medium text-sky-300">
            Python ve Pandas analiz katmanı aktif
          </p>

          <p className="mt-2 text-xs leading-5 text-sky-200/70">
            Veritabanındaki kayıtlar tesis–ürün bazında
            ayrılır ve yerel Python ortamında analiz
            edilir. Farklı ölçü birimleri aynı toplamda
            birleştirilmez.
          </p>
        </section>

        <RecordFilters
          action="/analytics"
          values={filterValues}
          error={filters.error}
          fields={[
            {
              name: "facilityId",
              label: "Tesis",
              type: "select",
              options: [
                {
                  value: "",
                  label: "Tüm tesisler",
                },
                ...facilityOptions.map((facility) => ({
                  value: String(facility.id),
                  label: `${facility.code} · ${facility.name}${
                    facility.isActive
                      ? ""
                      : " (pasif)"
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
                ...productOptions.map((product) => ({
                  value: String(product.id),
                  label: `${product.code} · ${product.name}${
                    product.isActive
                      ? ""
                      : " (pasif)"
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
          ]}
        />

        {analysisError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-6"
          >
            <p className="font-semibold text-red-300">
              Analiz oluşturulamadı
            </p>

            <p className="mt-2 text-sm text-red-200">
              {analysisError}
            </p>
          </div>
        ) : filters.error ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Analizi görmek için filtre hatasını
            düzeltin.
          </div>
        ) : (
          <AnalyticsCharts data={analyticsData} />
        )}
      </div>
    </main>
  );
}