import { createFacility } from "../actions";
import { FacilityForm } from "../facility-form";

export default function NewFacilityPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Tesis Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Tesis
          </h1>

          <p className="mt-2 text-slate-400">
            Üretim tesisinin temel bilgilerini ve kapasitesini girin.
          </p>
        </header>

        <FacilityForm
          action={createFacility}
          submitLabel="Tesisi oluştur"
        />
      </div>
    </main>
  );
}