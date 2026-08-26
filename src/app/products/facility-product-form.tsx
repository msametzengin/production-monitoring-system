"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FacilityProductFormState } from "./actions";

type FacilityOption = {
  id: number;
  code: string;
  name: string;
};

type FacilityProductInitialValues = {
  facilityId: number;
  nominalDailyCapacity: string;
  isActive: boolean;
};

type FacilityProductAction = (
  previousState: FacilityProductFormState,
  formData: FormData,
) => Promise<FacilityProductFormState>;

type FacilityProductFormProps = {
  action: FacilityProductAction;
  facilities: FacilityOption[];
  cancelHref: string;
  initialValues?: FacilityProductInitialValues;
  lockFacility?: boolean;
  submitLabel?: string;
};

const initialState: FacilityProductFormState = {};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60";

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

export function FacilityProductForm({
  action,
  facilities,
  cancelHref,
  initialValues,
  lockFacility = false,
  submitLabel = "Tesise bağla",
}: FacilityProductFormProps) {
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
            htmlFor="facilityId"
            className="text-sm font-medium text-slate-300"
          >
            Tesis
          </label>

          {lockFacility && initialValues ? (
            <>
              <input
                type="hidden"
                name="facilityId"
                value={initialValues.facilityId}
              />

              <select
                id="facilityId"
                disabled
                defaultValue={
                  initialValues.facilityId.toString()
                }
                className={inputClassName}
              >
                {facilities.map((facility) => (
                  <option
                    key={facility.id}
                    value={facility.id}
                  >
                    {facility.code} · {facility.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              id="facilityId"
              name="facilityId"
              defaultValue={
                initialValues?.facilityId.toString() ?? ""
              }
              aria-invalid={Boolean(
                state.errors?.facilityId,
              )}
              className={inputClassName}
            >
              <option value="">Tesis seçin</option>

              {facilities.map((facility) => (
                <option
                  key={facility.id}
                  value={facility.id}
                >
                  {facility.code} · {facility.name}
                </option>
              ))}
            </select>
          )}

          <FieldError messages={state.errors?.facilityId} />
        </div>

        <div>
          <label
            htmlFor="nominalDailyCapacity"
            className="text-sm font-medium text-slate-300"
          >
            Nominal günlük kapasite
          </label>

          <input
            id="nominalDailyCapacity"
            name="nominalDailyCapacity"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={
              initialValues?.nominalDailyCapacity ?? ""
            }
            placeholder="Örnek: 1000"
            aria-invalid={Boolean(
              state.errors?.nominalDailyCapacity,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.nominalDailyCapacity}
          />
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
                Aktif tesis–ürün ilişkisi
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Pasif ilişkiler yeni üretim kayıtlarında seçilemez.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}