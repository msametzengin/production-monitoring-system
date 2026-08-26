"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { DowntimeReasonFormState } from "./actions";

type DowntimeCategory =
  | "MAINTENANCE"
  | "BREAKDOWN"
  | "ENERGY"
  | "RAW_MATERIAL"
  | "PERSONNEL"
  | "CLEANING"
  | "PROCESS"
  | "OTHER";

type DowntimeType = "PLANNED" | "UNPLANNED";

type DowntimeReasonInitialValues = {
  code: string;
  name: string;
  category: DowntimeCategory;
  defaultType: DowntimeType;
  description: string;
  isActive: boolean;
};

type DowntimeReasonAction = (
  previousState: DowntimeReasonFormState,
  formData: FormData,
) => Promise<DowntimeReasonFormState>;

type DowntimeReasonFormProps = {
  action: DowntimeReasonAction;
  initialValues?: DowntimeReasonInitialValues;
  submitLabel?: string;
};

const initialState: DowntimeReasonFormState = {};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500";

function FieldError({
  messages,
}: {
  messages?: string[];
}) {
  if (!messages?.[0]) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-red-400">
      {messages[0]}
    </p>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Kaydediliyor..." : label}
    </button>
  );
}

export function DowntimeReasonForm({
  action,
  initialValues,
  submitLabel = "Duruş nedenini oluştur",
}: DowntimeReasonFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialState,
  );

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      {state.message && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="code"
            className="text-sm font-medium text-slate-300"
          >
            Neden kodu
          </label>

          <input
            id="code"
            name="code"
            type="text"
            defaultValue={initialValues?.code ?? ""}
            placeholder="Örnek: ENERJI-001"
            aria-invalid={Boolean(state.errors?.code)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.code} />
        </div>

        <div>
          <label
            htmlFor="name"
            className="text-sm font-medium text-slate-300"
          >
            Neden adı
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
            placeholder="Örnek: Enerji Kesintisi"
            aria-invalid={Boolean(state.errors?.name)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.name} />
        </div>

        <div>
          <label
            htmlFor="category"
            className="text-sm font-medium text-slate-300"
          >
            Kategori
          </label>

          <select
            id="category"
            name="category"
            defaultValue={
              initialValues?.category ?? "OTHER"
            }
            aria-invalid={Boolean(state.errors?.category)}
            className={inputClassName}
          >
            <option value="MAINTENANCE">Bakım</option>
            <option value="BREAKDOWN">Arıza</option>
            <option value="ENERGY">Enerji</option>
            <option value="RAW_MATERIAL">Hammadde</option>
            <option value="PERSONNEL">Personel</option>
            <option value="CLEANING">Temizlik</option>
            <option value="PROCESS">Proses</option>
            <option value="OTHER">Diğer</option>
          </select>

          <FieldError messages={state.errors?.category} />
        </div>

        <div>
          <label
            htmlFor="defaultType"
            className="text-sm font-medium text-slate-300"
          >
            Varsayılan duruş türü
          </label>

          <select
            id="defaultType"
            name="defaultType"
            defaultValue={
              initialValues?.defaultType ?? "UNPLANNED"
            }
            aria-invalid={Boolean(
              state.errors?.defaultType,
            )}
            className={inputClassName}
          >
            <option value="PLANNED">Planlı</option>
            <option value="UNPLANNED">Plansız</option>
          </select>

          <FieldError
            messages={state.errors?.defaultType}
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-slate-300"
          >
            Açıklama
          </label>

          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initialValues?.description ?? ""}
            placeholder="Duruş nedenine ilişkin isteğe bağlı açıklama"
            aria-invalid={Boolean(
              state.errors?.description,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.description}
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={initialValues?.isActive ?? true}
              className="mt-1 accent-emerald-500"
            />

            <span>
              <span className="block text-sm font-medium text-slate-200">
                Aktif duruş nedeni
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Pasif nedenler yeni duruş kayıtlarında
                seçilemez.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
        <Link
          href="/downtimes/reasons"
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-200 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}