import Link from "next/link";
import {
  DataImportForm,
  type ImportColumn,
} from "@/components/data-import-form";

export const dynamic = "force-dynamic";

const columns: ImportColumn[] = [
  { key: "facilityCode", label: "Tesis" },
  { key: "reasonCode", label: "Neden" },
  { key: "type", label: "Tür" },
  { key: "startedAt", label: "Başlangıç" },
  { key: "endedAt", label: "Bitiş" },
  {
    key: "durationMinutes",
    label: "Süre (dk)",
    align: "right",
  },
];

export default function DowntimeImportPage() {
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
                Duruş Kayıtlarını İçe Aktar
              </h1>

              <p className="mt-2 text-slate-400">
                Planlı ve plansız duruşları Excel
                dosyasından toplu olarak aktarın.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/import-templates/downtimes"
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
                href="/downtimes"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                Geri dön
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
          Duruş süresi otomatik hesaplanır. Aynı tesiste
          çakışan tek bir zaman aralığı varsa hiçbir kayıt
          eklenmez.
        </div>

        <DataImportForm
          endpoint="/api/imports/downtimes"
          returnHref="/downtimes"
          columns={columns}
        />
      </div>
    </main>
  );
}