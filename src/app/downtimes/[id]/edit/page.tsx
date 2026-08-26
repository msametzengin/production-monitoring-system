import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateDowntimeRecord } from "../../actions";
import { DowntimeRecordForm } from "../../downtime-record-form";

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

type EditDowntimeRecordPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditDowntimeRecordPage({
  params,
}: EditDowntimeRecordPageProps) {
  const { id } = await params;
  const recordId = Number(id);

  if (!Number.isInteger(recordId) || recordId <= 0) {
    notFound();
  }

  const record = await prisma.downtimeRecord.findUnique({
    where: {
      id: recordId,
    },
  });

  if (!record) {
    notFound();
  }

  const [facilityRecords, reasonRecords] =
    await Promise.all([
      prisma.facility.findMany({
        orderBy: {
          name: "asc",
        },
      }),

      prisma.downtimeReason.findMany({
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const facilities = facilityRecords
    .filter(
      (facility) =>
        facility.isActive ||
        facility.id === record.facilityId,
    )
    .map((facility) => ({
      id: facility.id,
      code: facility.code,
      name: facility.name,
    }));

  const downtimeReasons = reasonRecords
    .filter(
      (reason) =>
        reason.isActive ||
        reason.id === record.downtimeReasonId,
    )
    .map((reason) => ({
      id: reason.id,
      code: reason.code,
      name: reason.name,
      categoryLabel: categoryLabels[reason.category],
      defaultType: reason.defaultType,
    }));

  const updateAction = updateDowntimeRecord.bind(
    null,
    record.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Üretim Duruşunu Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            Kayıt #{record.id} için duruş bilgilerini
            güncelleyin.
          </p>
        </header>

        <DowntimeRecordForm
          action={updateAction}
          facilities={facilities}
          downtimeReasons={downtimeReasons}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            facilityId: record.facilityId,
            downtimeReasonId:
              record.downtimeReasonId,
            type: record.type,
            startedAt: record.startedAt
              .toISOString()
              .slice(0, 16),
            endedAt: record.endedAt
              .toISOString()
              .slice(0, 16),
            notes: record.notes ?? "",
          }}
        />
      </div>
    </main>
  );
}