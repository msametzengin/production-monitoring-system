import { z } from "zod";

const optionalNominalCapacity = z.preprocess(
  (value) =>
    value === "" || value === null ? undefined : value,
  z.coerce
    .number()
    .positive(
      "Nominal günlük kapasite sıfırdan büyük olmalıdır.",
    )
    .max(
      9_999_999_999.99,
      "Nominal kapasite izin verilen sınırı aşıyor.",
    )
    .optional(),
);

export const facilityProductSchema = z.object({
  facilityId: z.coerce
    .number()
    .int()
    .positive("Tesis seçimi zorunludur."),

  nominalDailyCapacity: optionalNominalCapacity,

  isActive: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export type FacilityProductInput = z.infer<
  typeof facilityProductSchema
>;