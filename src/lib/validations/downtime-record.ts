import { z } from "zod";

const dateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Geçerli bir tarih ve saat seçmelisiniz.",
  )
  .refine((value) => {
    const date = new Date(`${value}:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 16) === value
    );
  }, "Geçerli bir tarih ve saat seçmelisiniz.");

export const downtimeRecordSchema = z
  .object({
    facilityId: z.coerce
      .number()
      .int()
      .positive("Tesis seçimi zorunludur."),

    downtimeReasonId: z.coerce
      .number()
      .int()
      .positive("Duruş nedeni seçimi zorunludur."),

    type: z.enum(["PLANNED", "UNPLANNED"], {
      message: "Geçerli bir duruş türü seçmelisiniz.",
    }),

    startedAt: dateTimeSchema,
    endedAt: dateTimeSchema,

    notes: z
      .string()
      .trim()
      .max(
        1000,
        "Not alanı en fazla 1000 karakter olabilir.",
      )
      .transform((value) => value || undefined),
  })
  .superRefine((data, context) => {
    if (data.endedAt <= data.startedAt) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message:
          "Bitiş zamanı başlangıç zamanından sonra olmalıdır.",
      });
    }
  });

export type DowntimeRecordInput = z.infer<
  typeof downtimeRecordSchema
>;