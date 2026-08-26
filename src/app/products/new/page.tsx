import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Ürün Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Ürün
          </h1>

          <p className="mt-2 text-slate-400">
            Ürünün temel bilgilerini ve ölçü birimini girin.
          </p>
        </header>

        <ProductForm
          action={createProduct}
          submitLabel="Ürünü oluştur"
        />
      </div>
    </main>
  );
}