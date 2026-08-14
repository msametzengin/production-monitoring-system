import { z } from "zod";

export const productionRecordSchema = z.object({
  recordDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir üretim tarihi seçmelisiniz."),

  facilityProductId: z.coerce
    .number()
    .int()
    .positive("Tesis ve ürün seçimi zorunludur."),

  shiftId: z.coerce
    .number()
    .int()
    .positive("Vardiya seçimi zorunludur."),

  quantity: z.coerce
    .number()
    .positive("Üretim miktarı sıfırdan büyük olmalıdır.")
    .max(99_999_999_999.999, "Üretim miktarı izin verilen sınırı aşıyor."),

  operatingMinutes: z.coerce
    .number()
    .int("Çalışma süresi tam sayı olmalıdır.")
    .min(1, "Çalışma süresi en az 1 dakika olmalıdır.")
    .max(1440, "Çalışma süresi 1440 dakikadan fazla olamaz."),

  notes: z
    .string()
    .trim()
    .max(1000, "Not alanı en fazla 1000 karakter olabilir.")
    .transform((value) => value || undefined),
});

export type ProductionRecordInput = z.infer<
  typeof productionRecordSchema
>;