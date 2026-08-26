"use client";

import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  archiveProductionRecord,
  restoreProductionRecord,
} from "./actions";

type RecordStatusButtonProps = {
  recordId: number;
  isArchived: boolean;
};

function SubmitButton({
  isArchived,
}: {
  isArchived: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        isArchived
          ? "font-medium text-blue-400 transition hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          : "font-medium text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending
        ? "İşleniyor..."
        : isArchived
          ? "Geri al"
          : "Arşivle"}
    </button>
  );
}

export function RecordStatusButton({
  recordId,
  isArchived,
}: RecordStatusButtonProps) {
  const action = isArchived
    ? restoreProductionRecord
    : archiveProductionRecord;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const message = isArchived
      ? "Bu üretim kaydını yeniden aktif hâle getirmek istiyor musunuz?"
      : "Bu üretim kaydını arşivlemek istiyor musunuz? Kayıt silinmeyecek ve daha sonra geri alınabilecektir.";

    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="recordId" value={recordId} />

      <SubmitButton isArchived={isArchived} />
    </form>
  );
}