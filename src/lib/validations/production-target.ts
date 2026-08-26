import { z } from "zod";

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Geçerli bir tarih seçmelisiniz.",
  )
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Geçerli bir tarih seçmelisiniz.");

export const productionTargetSchema = z
  .object({
    facilityProductId: z.coerce
      .number()
      .int()
      .positive("Tesis ve ürün seçimi zorunludur."),

    period: z.enum(
      ["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"],
      {
        message: "Hedef dönemi seçimi zorunludur.",
      },
    ),

    startDate: dateSchema,

    endDate: dateSchema,

    targetQuantity: z.coerce
      .number()
      .positive("Hedef miktarı sıfırdan büyük olmalıdır.")
      .max(
        99_999_999_999.999,
        "Hedef miktarı izin verilen sınırı aşıyor.",
      ),

    notes: z
      .string()
      .trim()
      .max(
        1000,
        "Not alanı en fazla 1000 karakter olabilir.",
      )
      .transform((value) => value || undefined),

    isActive: z.preprocess(
      (value) => value === "on" || value === true,
      z.boolean(),
    ),
  })
  .superRefine((data, context) => {
    if (data.endDate < data.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "Bitiş tarihi başlangıç tarihinden önce olamaz.",
      });
    }

    if (
      data.period === "DAILY" &&
      data.startDate !== data.endDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "Günlük hedefte başlangıç ve bitiş tarihleri aynı olmalıdır.",
      });
    }
  });

export type ProductionTargetInput = z.infer<
  typeof productionTargetSchema
>;