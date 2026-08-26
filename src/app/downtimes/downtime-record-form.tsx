"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { DowntimeRecordFormState } from "./actions";

type DowntimeType = "PLANNED" | "UNPLANNED";

type FacilityOption = {
  id: number;
  code: string;
  name: string;
};

type DowntimeReasonOption = {
  id: number;
  code: string;
  name: string;
  categoryLabel: string;
  defaultType: DowntimeType;
};

type DowntimeRecordInitialValues = {
  facilityId: number;
  downtimeReasonId: number;
  type: DowntimeType;
  startedAt: string;
  endedAt: string;
  notes: string;
};

type DowntimeRecordAction = (
  previousState: DowntimeRecordFormState,
  formData: FormData,
) => Promise<DowntimeRecordFormState>;

type DowntimeRecordFormProps = {
  action: DowntimeRecordAction;
  facilities: FacilityOption[];
  downtimeReasons: DowntimeReasonOption[];
  initialValues?: DowntimeRecordInitialValues;
  submitLabel?: string;
};

const initialState: DowntimeRecordFormState = {};

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

export function DowntimeRecordForm({
  action,
  facilities,
  downtimeReasons,
  initialValues,
  submitLabel = "Üretim duruşunu oluştur",
}: DowntimeRecordFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialState,
  );

  const [reasonId, setReasonId] = useState(
    initialValues?.downtimeReasonId.toString() ?? "",
  );

  const [type, setType] = useState<DowntimeType>(
    initialValues?.type ?? "UNPLANNED",
  );

  const [startedAt, setStartedAt] = useState(
    initialValues?.startedAt ?? "",
  );

  const [endedAt, setEndedAt] = useState(
    initialValues?.endedAt ?? "",
  );

  const calculatedDuration = useMemo(() => {
    if (!startedAt || !endedAt) {
      return null;
    }

    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(endedAt).getTime();

    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime) ||
      endTime <= startTime
    ) {
      return null;
    }

    return Math.round(
      (endTime - startTime) / 60_000,
    );
  }, [startedAt, endedAt]);

  function handleReasonChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const nextReasonId = event.target.value;
    setReasonId(nextReasonId);

    const selectedReason = downtimeReasons.find(
      (reason) =>
        reason.id.toString() === nextReasonId,
    );

    if (selectedReason) {
      setType(selectedReason.defaultType);
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
        <div>
          <label
            htmlFor="facilityId"
            className="text-sm font-medium text-slate-300"
          >
            Tesis
          </label>

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
              <option key={facility.id} value={facility.id}>
                {facility.code} · {facility.name}
              </option>
            ))}
          </select>

          <FieldError
            messages={state.errors?.facilityId}
          />
        </div>

        <div>
          <label
            htmlFor="downtimeReasonId"
            className="text-sm font-medium text-slate-300"
          >
            Duruş nedeni
          </label>

          <select
            id="downtimeReasonId"
            name="downtimeReasonId"
            value={reasonId}
            onChange={handleReasonChange}
            aria-invalid={Boolean(
              state.errors?.downtimeReasonId,
            )}
            className={inputClassName}
          >
            <option value="">Duruş nedeni seçin</option>

            {downtimeReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.code} · {reason.name} (
                {reason.categoryLabel})
              </option>
            ))}
          </select>

          <FieldError
            messages={state.errors?.downtimeReasonId}
          />
        </div>

        <div>
          <label
            htmlFor="type"
            className="text-sm font-medium text-slate-300"
          >
            Duruş türü
          </label>

          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as DowntimeType)
            }
            aria-invalid={Boolean(state.errors?.type)}
            className={inputClassName}
          >
            <option value="PLANNED">Planlı</option>
            <option value="UNPLANNED">Plansız</option>
          </select>

          <p className="mt-2 text-xs text-slate-500">
            Neden seçildiğinde varsayılan tür otomatik gelir;
            gerekirse değiştirebilirsiniz.
          </p>

          <FieldError messages={state.errors?.type} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300">
            Hesaplanan süre
          </label>

          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-semibold text-emerald-400">
            {calculatedDuration === null
              ? "Tarih ve saatleri seçin"
              : `${calculatedDuration} dakika`}
          </div>
        </div>

        <div>
          <label
            htmlFor="startedAt"
            className="text-sm font-medium text-slate-300"
          >
            Başlangıç zamanı
          </label>

          <input
            id="startedAt"
            name="startedAt"
            type="datetime-local"
            step="60"
            value={startedAt}
            onChange={(event) =>
              setStartedAt(event.target.value)
            }
            aria-invalid={Boolean(
              state.errors?.startedAt,
            )}
            className={inputClassName}
          />

          <FieldError
            messages={state.errors?.startedAt}
          />
        </div>

        <div>
          <label
            htmlFor="endedAt"
            className="text-sm font-medium text-slate-300"
          >
            Bitiş zamanı
          </label>

          <input
            id="endedAt"
            name="endedAt"
            type="datetime-local"
            step="60"
            min={startedAt || undefined}
            value={endedAt}
            onChange={(event) =>
              setEndedAt(event.target.value)
            }
            aria-invalid={Boolean(
              state.errors?.endedAt,
            )}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.endedAt} />
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
            placeholder="Üretim duruşuyla ilgili isteğe bağlı açıklama"
            aria-invalid={Boolean(state.errors?.notes)}
            className={inputClassName}
          />

          <FieldError messages={state.errors?.notes} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
        <Link
          href="/downtimes"
          className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-200 transition hover:bg-slate-800"
        >
          İptal
        </Link>

        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}