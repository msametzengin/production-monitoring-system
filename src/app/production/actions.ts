"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productionRecordSchema } from "@/lib/validations/production-record";

export type ProductionRecordFormState = {
  errors?: {
    recordDate?: string[];
    facilityProductId?: string[];
    shiftId?: string[];
    quantity?: string[];
    operatingMinutes?: string[];
    notes?: string[];
  };
  message?: string;
};

export async function createProductionRecord(
  _previousState: ProductionRecordFormState,
  formData: FormData,
): Promise<ProductionRecordFormState> {
  const validationResult = productionRecordSchema.safeParse({
    recordDate: formData.get("recordDate"),
    facilityProductId: formData.get("facilityProductId"),
    shiftId: formData.get("shiftId"),
    quantity: formData.get("quantity"),
    operatingMinutes: formData.get("operatingMinutes"),
    notes: formData.get("notes") ?? "",
  });

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const data = validationResult.data;

  const shift = await prisma.shift.findFirst({
    where: {
      id: data.shiftId,
      isActive: true,
    },
  });

  if (!shift) {
    return {
      errors: {
        shiftId: ["Seçilen vardiya bulunamadı veya aktif değil."],
      },
      message: "Üretim kaydı oluşturulamadı.",
    };
  }

  if (data.operatingMinutes > shift.plannedMinutes) {
    return {
      errors: {
        operatingMinutes: [
          `Çalışma süresi vardiyanın planlanan ${shift.plannedMinutes} dakikalık süresini aşamaz.`,
        ],
      },
      message: "Üretim kaydı oluşturulamadı.",
    };
  }

  const facilityProduct = await prisma.facilityProduct.findFirst({
    where: {
      id: data.facilityProductId,
      isActive: true,
    },
    include: {
      facility: true,
      product: true,
    },
  });

  if (
    !facilityProduct ||
    !facilityProduct.facility.isActive ||
    !facilityProduct.product.isActive
  ) {
    return {
      errors: {
        facilityProductId: [
          "Seçilen tesis ve ürün ilişkisi bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim kaydı oluşturulamadı.",
    };
  }

  const recordDate = new Date(`${data.recordDate}T00:00:00.000Z`);

  const existingRecord = await prisma.productionRecord.findFirst({
    where: {
      recordDate,
      facilityProductId: data.facilityProductId,
      shiftId: data.shiftId,
    },
  });

  if (existingRecord) {
    return {
      errors: {
        recordDate: [
          "Bu tarih, tesis–ürün ve vardiya için zaten bir üretim kaydı bulunuyor.",
        ],
      },
      message: "Aynı üretim kaydı ikinci kez oluşturulamaz.",
    };
  }

  try {
    await prisma.productionRecord.create({
      data: {
        recordDate,
        facilityProductId: data.facilityProductId,
        shiftId: data.shiftId,
        quantity: data.quantity,
        operatingMinutes: data.operatingMinutes,
        source: "MANUAL",
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("Üretim kaydı oluşturulamadı:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  revalidatePath("/");
  revalidatePath("/production");

  redirect("/production");
}