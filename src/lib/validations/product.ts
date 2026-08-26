import { z } from "zod";

export const productSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Ürün kodu en az 2 karakter olmalıdır.")
    .max(30, "Ürün kodu en fazla 30 karakter olabilir.")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Ürün kodunda yalnızca harf, rakam ve tire kullanılabilir.",
    )
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(2, "Ürün adı en az 2 karakter olmalıdır.")
    .max(120, "Ürün adı en fazla 120 karakter olabilir."),

  category: z
    .string()
    .trim()
    .max(100, "Kategori en fazla 100 karakter olabilir.")
    .transform((value) => value || undefined),

  description: z
    .string()
    .trim()
    .max(2000, "Açıklama en fazla 2000 karakter olabilir.")
    .transform((value) => value || undefined),

  measurementUnit: z.enum([
    "TON",
    "KILOGRAM",
    "CUBIC_METER",
    "UNIT",
  ]),

  isActive: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export type ProductInput = z.infer<typeof productSchema>;