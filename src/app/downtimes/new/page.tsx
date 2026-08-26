import { prisma } from "@/lib/prisma";
import { createDowntimeRecord } from "../actions";
import { DowntimeRecordForm } from "../downtime-record-form";

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

export const dynamic = "force-dynamic";

export default async function NewDowntimeRecordPage() {
  const [facilities, downtimeReasons] =
    await Promise.all([
      prisma.facility.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.downtimeReason.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const facilityOptions = facilities.map((facility) => ({
    id: facility.id,
    code: facility.code,
    name: facility.name,
  }));

  const reasonOptions = downtimeReasons.map((reason) => ({
    id: reason.id,
    code: reason.code,
    name: reason.name,
    categoryLabel: categoryLabels[reason.category],
    defaultType: reason.defaultType,
  }));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Üretim Duruşu
          </h1>

          <p className="mt-2 text-slate-400">
            Üretimin durduğu zaman aralığını ve nedenini
            kaydedin.
          </p>
        </header>

        {facilityOptions.length === 0 ||
        reasonOptions.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            Duruş kaydı oluşturabilmek için en az bir aktif
            tesis ve aktif duruş nedeni bulunmalıdır.
          </div>
        ) : (
          <DowntimeRecordForm
            action={createDowntimeRecord}
            facilities={facilityOptions}
            downtimeReasons={reasonOptions}
            submitLabel="Üretim duruşunu oluştur"
          />
        )}
      </div>
    </main>
  );
}