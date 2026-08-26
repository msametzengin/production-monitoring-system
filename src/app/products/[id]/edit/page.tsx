import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProduct } from "../../actions";
import { ProductForm } from "../../product-form";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    notFound();
  }

  const updateAction = updateProduct.bind(
    null,
    product.id,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Ürün Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Ürünü Düzenle
          </h1>

          <p className="mt-2 text-slate-400">
            {product.code} kodlu ürünün bilgilerini güncelleyin.
          </p>
        </header>

        <ProductForm
          action={updateAction}
          submitLabel="Değişiklikleri kaydet"
          initialValues={{
            code: product.code,
            name: product.name,
            category: product.category ?? "",
            description: product.description ?? "",
            measurementUnit: product.measurementUnit,
            isActive: product.isActive,
          }}
        />
      </div>
    </main>
  );
}