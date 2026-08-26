import { createDowntimeReason } from "../actions";
import { DowntimeReasonForm } from "../downtime-reason-form";

export default function NewDowntimeReasonPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Duruş Yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Yeni Duruş Nedeni
          </h1>

          <p className="mt-2 text-slate-400">
            Üretim duruşlarında kullanılacak neden ve
            varsayılan türü tanımlayın.
          </p>
        </header>

        <DowntimeReasonForm
          action={createDowntimeReason}
          submitLabel="Duruş nedenini oluştur"
        />
      </div>
    </main>
  );
}