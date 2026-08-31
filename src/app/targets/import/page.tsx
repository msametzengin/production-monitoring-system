import Link from "next/link";
import {
  DataImportForm,
  type ImportColumn,
} from "@/components/data-import-form";

export const dynamic = "force-dynamic";

const columns: ImportColumn[] = [
  { key: "facilityCode", label: "Tesis" },
  { key: "productCode", label: "Ürün" },
  { key: "period", label: "Dönem" },
  { key: "startDate", label: "Başlangıç" },
  { key: "endDate", label: "Bitiş" },
  {
    key: "targetQuantity",
    label: "Hedef",
    align: "right",
  },
  { key: "isActive", label: "Aktif" },
];

export default function TargetImportPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Veri Aktarımı
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Üretim Hedeflerini İçe Aktar
              </h1>

              <p className="mt-2 text-slate-400">
                Excel hedeflerini doğrulayın ve toplu
                olarak veritabanına aktarın.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/import-templates/targets"
                className="rounded-lg border border-emerald-500/50 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
              >
                Excel şablonunu indir
              </a>

              <Link
                href="/imports/history"
                className="rounded-lg border border-sky-500/50 px-4 py-2 text-sm text-sky-400 hover:bg-sky-500/10"
              >
                Import geçmişi
              </Link>

              <Link
                href="/targets"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                Geri dön
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
          Hatalı veya çakışan tek bir hedef varsa
          dosyadaki hiçbir kayıt eklenmez.
        </div>

        <DataImportForm
          endpoint="/api/imports/targets"
          returnHref="/targets"
          columns={columns}
        />
      </div>
    </main>
  );
}