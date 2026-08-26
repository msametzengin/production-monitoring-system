import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateDowntimeReason } from "../../actions";
import { DowntimeReasonForm } from "../../downtime-reason-form";

type EditDowntimeReasonPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditDowntimeReasonPage({
  params,
}: EditDowntimeReasonPageProps) {
  const { id } = await params;
  const reasonId = Number(id);

  if (!Number.isInteger(reasonId) || reasonId <= 0) {
    notFound();
  }

  const reason = await prisma.downtimeReason.findUnique({
    where: {
      id: reasonId,
    },
  });

  if (!reason) {
    notFound();
  }

  const updateAction = updateDowntimeReason.bind(
    null,
    reason.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Duruş Nedenini Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            {reason.code} kodlu duruş nedenini güncelleyin.
          </p>
        </header>

        <DowntimeReasonForm
          action={updateAction}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            code: reason.code,
            name: reason.name,
            category: reason.category,
            defaultType: reason.defaultType,
            description: reason.description ?? "",
            isActive: reason.isActive,
          }}
        />
      </div>
    </main>
  );
}