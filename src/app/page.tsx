import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const facilities = await prisma.facility.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Eti Maden Emet
          </p>

          <h1 className="text-3xl font-bold">
            Üretim Analiz ve Takip Sistemi
          </h1>

          <p className="mt-3 text-slate-400">
            MySQL veritabanında kayıtlı tesisler
          </p>
        </header>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tesisler</h2>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {facilities.length} tesis
            </span>
          </div>

          {facilities.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
              Henüz tesis kaydı bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {facilities.map((facility) => (
                <article
                  key={facility.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-emerald-400">
                        {facility.code}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold">
                        {facility.name}
                      </h3>
                    </div>

                    <span
                      className={
                        facility.isActive
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400"
                          : "rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400"
                      }
                    >
                      {facility.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Konum</dt>
                      <dd>{facility.location ?? "Belirtilmedi"}</dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Günlük kapasite</dt>
                      <dd>
                        {facility.dailyCapacity
                          ? Number(facility.dailyCapacity).toLocaleString("tr-TR")
                          : "Belirtilmedi"}{" "}
                        {facility.capacityUnit === "TON" ? "ton" : ""}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Planlanan çalışma</dt>
                      <dd>{facility.plannedDailyMinutes / 60} saat</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}