import { z } from "zod";

const optionalDailyCapacity = z.preprocess(
  (value) =>
    value === "" || value === null ? undefined : value,
  z.coerce
    .number()
    .positive("Günlük kapasite sıfırdan büyük olmalıdır.")
    .max(
      9_999_999_999.99,
      "Günlük kapasite izin verilen sınırı aşıyor.",
    )
    .optional(),
);

export const facilitySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Tesis kodu en az 2 karakter olmalıdır.")
    .max(20, "Tesis kodu en fazla 20 karakter olabilir.")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Tesis kodunda yalnızca harf, rakam ve tire kullanılabilir.",
    )
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(2, "Tesis adı en az 2 karakter olmalıdır.")
    .max(100, "Tesis adı en fazla 100 karakter olabilir."),

  location: z
    .string()
    .trim()
    .max(150, "Konum en fazla 150 karakter olabilir.")
    .transform((value) => value || undefined),

  description: z
    .string()
    .trim()
    .max(2000, "Açıklama en fazla 2000 karakter olabilir.")
    .transform((value) => value || undefined),

  dailyCapacity: optionalDailyCapacity,

  capacityUnit: z.enum([
    "TON",
    "KILOGRAM",
    "CUBIC_METER",
    "UNIT",
  ]),

  plannedDailyMinutes: z.coerce
    .number()
    .int("Planlanan çalışma süresi tam sayı olmalıdır.")
    .min(1, "Planlanan çalışma süresi en az 1 dakika olmalıdır.")
    .max(
      1440,
      "Planlanan çalışma süresi 1440 dakikadan fazla olamaz.",
    ),

  isActive: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export type FacilityInput = z.infer<typeof facilitySchema>;