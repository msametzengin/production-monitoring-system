"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ProductFormState } from "./actions";

type MeasurementUnit =
  | "TON"
  | "KILOGRAM"
  | "CUBIC_METER"
  | "UNIT";

type ProductInitialValues = {
  code: string;
  name: string;
  category: string;
  description: string;
  measurementUnit: MeasurementUnit;
  isActive: boolean;
};

type ProductAction = (
  previousState: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

type ProductFormProps = {
  action: ProductAction;
  initialValues?: ProductInitialValues;
  submitLabel?: string;
};

const initialState: ProductFormState = {};

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

export function ProductForm({
  action,
  initialValues,
  submitLabel = "Ürünü oluştur",
}: ProductFormProps) {
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
            Ürün kodu
          </label>

          <input
            id="code"
            name="code"
            type="text"
            defaultValue={initialValues?.code ?? ""}
            placeholder="Örnek: BRK-001"
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
            Ürün adı
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
            placeholder="Örnek: Borik Asit"
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

          <input
            id="category"
            name="category"
            type="text"
            defaultValue={initialValues?.category ?? ""}
            placeholder="Örnek: Bor Ürünleri"
            aria-invalid={Boolean(state.errors?.category)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.category} />
        </div>

        <div>
          <label
            htmlFor="measurementUnit"
            className="text-sm font-medium text-slate-300"
          >
            Ölçü birimi
          </label>

          <select
            id="measurementUnit"
            name="measurementUnit"
            defaultValue={
              initialValues?.measurementUnit ?? "TON"
            }
            aria-invalid={Boolean(
              state.errors?.measurementUnit,
            )}
            className={inputClassName}
          >
            <option value="TON">Ton</option>
            <option value="KILOGRAM">Kilogram</option>
            <option value="CUBIC_METER">Metreküp</option>
            <option value="UNIT">Adet</option>
          </select>

          <FieldError
            messages={state.errors?.measurementUnit}
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
            placeholder="Ürün hakkında isteğe bağlı açıklama"
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
                Aktif ürün
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Pasif ürünler yeni üretim kayıtlarında seçilemez.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Link
          href="/products"
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}