"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FacilityFormState } from "./actions";

type CapacityUnit =
  | "TON"
  | "KILOGRAM"
  | "CUBIC_METER"
  | "UNIT";

type FacilityInitialValues = {
  code: string;
  name: string;
  location: string;
  description: string;
  dailyCapacity: string;
  capacityUnit: CapacityUnit;
  plannedDailyMinutes: number;
  isActive: boolean;
};

type FacilityAction = (
  previousState: FacilityFormState,
  formData: FormData,
) => Promise<FacilityFormState>;

type FacilityFormProps = {
  action: FacilityAction;
  initialValues?: FacilityInitialValues;
  submitLabel?: string;
};

const initialState: FacilityFormState = {};

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

export function FacilityForm({
  action,
  initialValues,
  submitLabel = "Tesisi oluştur",
}: FacilityFormProps) {
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
            Tesis kodu
          </label>

          <input
            id="code"
            name="code"
            type="text"
            defaultValue={initialValues?.code ?? ""}
            placeholder="Örnek: EMT-01"
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
            Tesis adı
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
            placeholder="Örnek: Emet İşletmesi"
            aria-invalid={Boolean(state.errors?.name)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.name} />
        </div>

        <div>
          <label
            htmlFor="location"
            className="text-sm font-medium text-slate-300"
          >
            Konum
          </label>

          <input
            id="location"
            name="location"
            type="text"
            defaultValue={initialValues?.location ?? ""}
            placeholder="Örnek: Emet / Kütahya"
            aria-invalid={Boolean(state.errors?.location)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.location} />
        </div>

        <div>
          <label
            htmlFor="dailyCapacity"
            className="text-sm font-medium text-slate-300"
          >
            Günlük kapasite
          </label>

          <input
            id="dailyCapacity"
            name="dailyCapacity"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={initialValues?.dailyCapacity ?? ""}
            placeholder="Örnek: 1000"
            aria-invalid={Boolean(
              state.errors?.dailyCapacity,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.dailyCapacity}
          />
        </div>

        <div>
          <label
            htmlFor="capacityUnit"
            className="text-sm font-medium text-slate-300"
          >
            Kapasite birimi
          </label>

          <select
            id="capacityUnit"
            name="capacityUnit"
            defaultValue={
              initialValues?.capacityUnit ?? "TON"
            }
            aria-invalid={Boolean(
              state.errors?.capacityUnit,
            )}
            className={inputClassName}
          >
            <option value="TON">Ton</option>
            <option value="KILOGRAM">Kilogram</option>
            <option value="CUBIC_METER">Metreküp</option>
            <option value="UNIT">Adet</option>
          </select>

          <FieldError messages={state.errors?.capacityUnit} />
        </div>

        <div>
          <label
            htmlFor="plannedDailyMinutes"
            className="text-sm font-medium text-slate-300"
          >
            Planlanan günlük çalışma (dakika)
          </label>

          <input
            id="plannedDailyMinutes"
            name="plannedDailyMinutes"
            type="number"
            min="1"
            max="1440"
            step="1"
            defaultValue={
              initialValues?.plannedDailyMinutes ?? 1440
            }
            aria-invalid={Boolean(
              state.errors?.plannedDailyMinutes,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.plannedDailyMinutes}
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
            placeholder="Tesis hakkında isteğe bağlı açıklama"
            aria-invalid={Boolean(
              state.errors?.description,
            )}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.description} />
        </div>

        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={
                initialValues
                  ? initialValues.isActive
                  : true
              }
              className="h-4 w-4 accent-emerald-500"
            />

            <span>
              <span className="block text-sm font-medium text-slate-200">
                Aktif tesis
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Pasif tesisler yeni üretim kayıtlarında seçilemez.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Link
          href="/facilities"
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}