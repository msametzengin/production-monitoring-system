import Link from "next/link";
import { prisma } from "@/lib/prisma";

const categoryLabels = {
  MAINTENANCE: "Bakım",
  BREAKDOWN: "Arıza",
  ENERGY: "Enerji",
  RAW_MATERIAL: "Hammadde",
  PERSONNEL: "Personel",
  CLEANING: "Temizlik",
  PROCESS: "Proses",
  OTHER: "Diğer",
} as const;

const typeLabels = {
  PLANNED: "Planlı",
  UNPLANNED: "Plansız",
} as const;

export const dynamic = "force-dynamic";

export default async function DowntimeReasonsPage() {
  const reasons = await prisma.downtimeReason.findMany({
    orderBy: [
      {
        isActive: "desc",
      },
      {
        name: "asc",
      },
    ],
    include: {
      _count: {
        select: {
          downtimeRecords: true,
        },
      },
    },
  });

  const activeCount = reasons.filter(
    (reason) => reason.isActive,
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Duruş Nedenleri
              </h1>

              <p className="mt-2 text-slate-400">
                Üretim duruşlarında kullanılan neden ve
                kategori tanımları
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
                {activeCount} aktif / {reasons.length} toplam
              </span>

              <Link
                href="/downtimes"
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Duruş kayıtları
              </Link>

              <Link
                href="/downtimes/reasons/new"
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Yeni neden
              </Link>
            </div>
          </div>
        </header>

        {reasons.length === 0 ? (
          <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
            Henüz duruş nedeni bulunmuyor.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reasons.map((reason) => (
              <article
                key={reason.id}
                className={`rounded-xl border border-slate-800 bg-slate-900 p-6 ${
                  reason.isActive ? "" : "opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-400">
                      {reason.code}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {reason.name}
                    </h2>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={
                        reason.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400"
                          : "rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300"
                      }
                    >
                      {reason.isActive ? "Aktif" : "Pasif"}
                    </span>

                    <Link
                      href={`/downtimes/reasons/${reason.id}/edit`}
                      className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
                    >
                      Düzenle
                    </Link>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-950 p-3">
                    <dt className="text-xs text-slate-400">
                      Kategori
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {categoryLabels[reason.category]}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-950 p-3">
                    <dt className="text-xs text-slate-400">
                      Varsayılan tür
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {typeLabels[reason.defaultType]}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-950 p-3">
                    <dt className="text-xs text-slate-400">
                      Kayıt sayısı
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {reason._count.downtimeRecords}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400">
                  {reason.description ??
                    "Açıklama girilmemiş."}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}