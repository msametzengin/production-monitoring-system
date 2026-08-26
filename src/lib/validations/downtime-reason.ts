import { z } from "zod";

export const downtimeReasonSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Duruş nedeni kodu en az 2 karakter olmalıdır.")
    .max(
      30,
      "Duruş nedeni kodu en fazla 30 karakter olabilir.",
    )
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Kodda yalnızca harf, rakam ve tire kullanılabilir.",
    )
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(2, "Duruş nedeni adı en az 2 karakter olmalıdır.")
    .max(
      120,
      "Duruş nedeni adı en fazla 120 karakter olabilir.",
    ),

  category: z.enum(
    [
      "MAINTENANCE",
      "BREAKDOWN",
      "ENERGY",
      "RAW_MATERIAL",
      "PERSONNEL",
      "CLEANING",
      "PROCESS",
      "OTHER",
    ],
    {
      message: "Geçerli bir duruş kategorisi seçmelisiniz.",
    },
  ),

  defaultType: z.enum(["PLANNED", "UNPLANNED"], {
    message: "Geçerli bir varsayılan duruş türü seçmelisiniz.",
  }),

  description: z
    .string()
    .trim()
    .max(
      2000,
      "Açıklama en fazla 2000 karakter olabilir.",
    )
    .transform((value) => value || undefined),

  isActive: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export type DowntimeReasonInput = z.infer<
  typeof downtimeReasonSchema
>;