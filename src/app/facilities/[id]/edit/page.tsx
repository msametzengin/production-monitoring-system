import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateFacility } from "../../actions";
import { FacilityForm } from "../../facility-form";

type EditFacilityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditFacilityPage({
  params,
}: EditFacilityPageProps) {
  const { id } = await params;
  const facilityId = Number(id);

  if (!Number.isInteger(facilityId) || facilityId <= 0) {
    notFound();
  }

  const facility = await prisma.facility.findUnique({
    where: {
      id: facilityId,
    },
  });

  if (!facility) {
    notFound();
  }

  const updateAction = updateFacility.bind(
    null,
    facility.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Tesis Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Tesisi Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            {facility.code} kodlu tesisin bilgilerini güncelleyin.
          </p>
        </header>

        <FacilityForm
          action={updateAction}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            code: facility.code,
            name: facility.name,
            location: facility.location ?? "",
            description: facility.description ?? "",
            dailyCapacity:
              facility.dailyCapacity?.toString() ?? "",
            capacityUnit: facility.capacityUnit,
            plannedDailyMinutes:
              facility.plannedDailyMinutes,
            isActive: facility.isActive,
          }}
        />
      </div>
    </main>
  );
}