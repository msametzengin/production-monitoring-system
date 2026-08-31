import Link from "next/link";
import { ProductionImportForm } from "./production-import-form";

export const dynamic = "force-dynamic";

export default function ProductionImportPage() {
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
                Üretim Kayıtlarını İçe Aktar
              </h1>

              <p className="mt-2 text-slate-400">
                Excel dosyasını önce kontrol edin,
                ardından hatasız kayıtları veritabanına aktarın.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/import-templates/production"
                className="rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
              >
                Excel şablonunu indir
              </a>

              <Link
                href="/production"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
              >
                Geri dön
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
          Önizleme veritabanında değişiklik yapmaz.
          Aktarım sırasında tek bir satır bile hatalıysa hiçbir
          üretim kaydı eklenmez.
        </div>

        <ProductionImportForm />
      </div>
    </main>
  );
}