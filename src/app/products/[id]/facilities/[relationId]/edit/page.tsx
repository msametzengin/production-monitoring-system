import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateFacilityProduct } from "@/app/products/actions";
import { FacilityProductForm } from "@/app/products/facility-product-form";

const measurementUnitLabels = {
  TON: "ton",
  KILOGRAM: "kg",
  CUBIC_METER: "m³",
  UNIT: "adet",
} as const;

type EditFacilityProductPageProps = {
  params: Promise<{
    id: string;
    relationId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditFacilityProductPage({
  params,
}: EditFacilityProductPageProps) {
  const { id, relationId } = await params;

  const productId = Number(id);
  const facilityProductId = Number(relationId);

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(facilityProductId) ||
    facilityProductId <= 0
  ) {
    notFound();
  }

  const relation = await prisma.facilityProduct.findFirst({
    where: {
      id: facilityProductId,
      productId,
    },
    include: {
      facility: true,
      product: true,
    },
  });

  if (!relation) {
    notFound();
  }

  const facilities = await prisma.facility.findMany({
    where: {
      OR: [
        {
          isActive: true,
        },
        {
          id: relation.facilityId,
        },
      ],
    },
    orderBy: {
      name: "asc",
    },
  });

  const facilityOptions = facilities.map((facility) => ({
    id: facility.id,
    code: facility.code,
    name: facility.name,
  }));

  const updateAction = updateFacilityProduct.bind(
    null,
    relation.id,
  );

  const cancelHref = `/products/${productId}/facilities`;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Tesis–Ürün Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Tesis İlişkisini Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            {relation.product.name} · {relation.facility.name} ·{" "}
            {
              measurementUnitLabels[
                relation.product.measurementUnit
              ]
            }
            /gün
          </p>
        </header>

        <FacilityProductForm
          action={updateAction}
          facilities={facilityOptions}
          cancelHref={cancelHref}
          lockFacility
          submitLabel="İlişkiyi güncelle"
          initialValues={{
            facilityId: relation.facilityId,
            nominalDailyCapacity:
              relation.nominalDailyCapacity?.toString() ?? "",
            isActive: relation.isActive,
          }}
        />
      </div>
    </main>
  );
}