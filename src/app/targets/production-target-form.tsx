"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ProductionTargetFormState } from "./actions";

type TargetPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM";

type FacilityProductOption = {
  id: number;
  facilityCode: string;
  facilityName: string;
  productCode: string;
  productName: string;
  unitLabel: string;
};

type ProductionTargetInitialValues = {
  facilityProductId: number;
  period: TargetPeriod;
  startDate: string;
  endDate: string;
  targetQuantity: string;
  notes: string;
  isActive: boolean;
};

type ProductionTargetAction = (
  previousState: ProductionTargetFormState,
  formData: FormData,
) => Promise<ProductionTargetFormState>;

type ProductionTargetFormProps = {
  action: ProductionTargetAction;
  facilityProducts: FacilityProductOption[];
  initialValues?: ProductionTargetInitialValues;
  submitLabel?: string;
  cancelHref?: string;
};

const initialState: ProductionTargetFormState = {};

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

export function ProductionTargetForm({
  action,
  facilityProducts,
  initialValues,
  submitLabel = "Üretim hedefini oluştur",
  cancelHref = "/targets",
}: ProductionTargetFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialState,
  );

  const [period, setPeriod] = useState<TargetPeriod>(
    initialValues?.period ?? "DAILY",
  );

  const [startDate, setStartDate] = useState(
    initialValues?.startDate ?? "",
  );

  const [endDate, setEndDate] = useState(
    initialValues?.endDate ?? "",
  );

  function handlePeriodChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const nextPeriod = event.target.value as TargetPeriod;

    setPeriod(nextPeriod);

    if (nextPeriod === "DAILY" && startDate) {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const nextStartDate = event.target.value;

    setStartDate(nextStartDate);

    if (period === "DAILY") {
      setEndDate(nextStartDate);
    }
  }

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
        <div className="md:col-span-2">
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
            aria-invalid={Boolean(
              state.errors?.facilityProductId,
            )}
            className={inputClassName}
          >
            <option value="">Tesis ve ürün seçin</option>

            {facilityProducts.map((facilityProduct) => (
              <option
                key={facilityProduct.id}
                value={facilityProduct.id}
              >
                {facilityProduct.facilityCode} ·{" "}
                {facilityProduct.facilityName} —{" "}
                {facilityProduct.productCode} ·{" "}
                {facilityProduct.productName} (
                {facilityProduct.unitLabel})
              </option>
            ))}
          </select>

          <FieldError
            messages={state.errors?.facilityProductId}
          />
        </div>

        <div>
          <label
            htmlFor="period"
            className="text-sm font-medium text-slate-300"
          >
            Hedef dönemi
          </label>

          <select
            id="period"
            name="period"
            value={period}
            onChange={handlePeriodChange}
            aria-invalid={Boolean(state.errors?.period)}
            className={inputClassName}
          >
            <option value="DAILY">Günlük</option>
            <option value="WEEKLY">Haftalık</option>
            <option value="MONTHLY">Aylık</option>
            <option value="CUSTOM">Özel dönem</option>
          </select>

          <FieldError messages={state.errors?.period} />
        </div>

        <div>
          <label
            htmlFor="targetQuantity"
            className="text-sm font-medium text-slate-300"
          >
            Hedef üretim miktarı
          </label>

          <input
            id="targetQuantity"
            name="targetQuantity"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={
              initialValues?.targetQuantity ?? ""
            }
            placeholder="Örnek: 400"
            aria-invalid={Boolean(
              state.errors?.targetQuantity,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.targetQuantity}
          />
        </div>

        <div>
          <label
            htmlFor="startDate"
            className="text-sm font-medium text-slate-300"
          >
            Başlangıç tarihi
          </label>

          <input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            aria-invalid={Boolean(state.errors?.startDate)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.startDate} />
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="text-sm font-medium text-slate-300"
          >
            Bitiş tarihi
          </label>

          <input
            id="endDate"
            name="endDate"
            type="date"
            min={startDate || undefined}
            value={endDate}
            readOnly={period === "DAILY"}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
            aria-invalid={Boolean(state.errors?.endDate)}
            className={`${inputClassName} ${
              period === "DAILY"
                ? "cursor-not-allowed opacity-70"
                : ""
            }`}
          />

          {period === "DAILY" && (
            <p className="mt-2 text-xs text-slate-500">
              Günlük hedefte bitiş tarihi otomatik olarak
              başlangıç tarihiyle aynı olur.
            </p>
          )}

          <FieldError messages={state.errors?.endDate} />
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
            placeholder="Üretim hedefiyle ilgili isteğe bağlı açıklama"
            aria-invalid={Boolean(state.errors?.notes)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.notes} />
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
                Aktif üretim hedefi
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Pasif hedefler gerçekleşme hesaplamalarında
                gösterilmez.
              </span>
            </span>
          </label>

          <FieldError messages={state.errors?.isActive} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-200 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}