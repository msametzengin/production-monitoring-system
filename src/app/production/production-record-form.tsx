"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ProductionRecordFormState } from "./actions";

type FacilityProductOption = {
  id: number;
  facilityName: string;
  productName: string;
  unitLabel: string;
};

type ShiftOption = {
  id: number;
  code: string;
  name: string;
  plannedMinutes: number;
};

type ProductionRecordInitialValues = {
  recordDate: string;
  facilityProductId: number;
  shiftId: number;
  quantity: string;
  operatingMinutes: number;
  notes: string;
};

type ProductionRecordAction = (
  previousState: ProductionRecordFormState,
  formData: FormData,
) => Promise<ProductionRecordFormState>;

type ProductionRecordFormProps = {
  action: ProductionRecordAction;
  facilityProducts: FacilityProductOption[];
  shifts: ShiftOption[];
  initialValues?: ProductionRecordInitialValues;
  submitLabel?: string;
  cancelHref?: string;
};

const initialState: ProductionRecordFormState = {};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500";

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

export function ProductionRecordForm({
  action,
  facilityProducts,
  shifts,
  initialValues,
  submitLabel = "Üretim kaydını oluştur",
  cancelHref = "/production",
}: ProductionRecordFormProps) {
  const [state, formAction] = useActionState(action, initialState);

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
            htmlFor="recordDate"
            className="text-sm font-medium text-slate-300"
          >
            Üretim tarihi
          </label>

          <input
            id="recordDate"
            name="recordDate"
            type="date"
            defaultValue={initialValues?.recordDate ?? ""}
            aria-invalid={Boolean(state.errors?.recordDate)}
            className={inputClassName}
          />

          {state.errors?.recordDate?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.recordDate[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="facilityProductId"
            className="text-sm font-medium text-slate-300"
          >
            Tesis ve ürün
          </label>

          <select
            id="facilityProductId"
            name="facilityProductId"
            defaultValue={
              initialValues?.facilityProductId.toString() ?? ""
            }
            aria-invalid={Boolean(state.errors?.facilityProductId)}
            className={inputClassName}
          >
            <option value="">Tesis ve ürün seçin</option>

            {facilityProducts.map((facilityProduct) => (
              <option
                key={facilityProduct.id}
                value={facilityProduct.id}
              >
                {facilityProduct.facilityName} ·{" "}
                {facilityProduct.productName} (
                {facilityProduct.unitLabel})
              </option>
            ))}
          </select>

          {state.errors?.facilityProductId?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.facilityProductId[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="shiftId"
            className="text-sm font-medium text-slate-300"
          >
            Vardiya
          </label>

          <select
            id="shiftId"
            name="shiftId"
            defaultValue={initialValues?.shiftId.toString() ?? ""}
            aria-invalid={Boolean(state.errors?.shiftId)}
            className={inputClassName}
          >
            <option value="">Vardiya seçin</option>

            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.code} · {shift.name} ·{" "}
                {shift.plannedMinutes} dk
              </option>
            ))}
          </select>

          {state.errors?.shiftId?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.shiftId[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="quantity"
            className="text-sm font-medium text-slate-300"
          >
            Üretim miktarı
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={initialValues?.quantity ?? ""}
            placeholder="Örnek: 320.500"
            aria-invalid={Boolean(state.errors?.quantity)}
            className={inputClassName}
          />

          {state.errors?.quantity?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.quantity[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="operatingMinutes"
            className="text-sm font-medium text-slate-300"
          >
            Çalışma süresi (dakika)
          </label>

          <input
            id="operatingMinutes"
            name="operatingMinutes"
            type="number"
            min="1"
            max="1440"
            step="1"
            defaultValue={initialValues?.operatingMinutes ?? ""}
            placeholder="Örnek: 450"
            aria-invalid={Boolean(state.errors?.operatingMinutes)}
            className={inputClassName}
          />

          {state.errors?.operatingMinutes?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.operatingMinutes[0]}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-slate-300"
          >
            Not
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initialValues?.notes ?? ""}
            placeholder="Üretim kaydıyla ilgili isteğe bağlı açıklama"
            aria-invalid={Boolean(state.errors?.notes)}
            className={inputClassName}
          />

          {state.errors?.notes?.[0] && (
            <p className="mt-2 text-sm text-red-400">
              {state.errors.notes[0]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-6">
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