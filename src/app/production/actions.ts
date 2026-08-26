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
    const recordMessage = existingRecord.archivedAt
      ? "Bu tarih, tesis–ürün ve vardiya için arşivlenmiş bir kayıt bulunuyor. Yeni kayıt oluşturmak yerine arşivdeki kaydı geri almalısınız."
      : "Bu tarih, tesis–ürün ve vardiya için zaten bir üretim kaydı bulunuyor.";

    return {
      errors: {
        recordDate: [recordMessage],
      },
      message: existingRecord.archivedAt
        ? "Aynı üretim kaydının arşivlenmiş sürümü bulunuyor."
        : "Aynı üretim kaydı ikinci kez oluşturulamaz.",
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
export async function updateProductionRecord(
  recordId: number,
  _previousState: ProductionRecordFormState,
  formData: FormData,
): Promise<ProductionRecordFormState> {
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return {
      message: "Geçersiz üretim kaydı.",
    };
  }

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

  const currentRecord = await prisma.productionRecord.findUnique({
    where: {
      id: recordId,
    },
  });

  if (!currentRecord) {
    return {
      message: "Düzenlenmek istenen üretim kaydı bulunamadı.",
    };
  }
  if (currentRecord.archivedAt) {
    return {
      message:
        "Arşivlenmiş üretim kaydı düzenlenemez. Önce kaydı geri almalısınız.",
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
      message: "Üretim kaydı güncellenemedi.",
    };
  }

  if (data.operatingMinutes > shift.plannedMinutes) {
    return {
      errors: {
        operatingMinutes: [
          `Çalışma süresi vardiyanın planlanan ${shift.plannedMinutes} dakikalık süresini aşamaz.`,
        ],
      },
      message: "Üretim kaydı güncellenemedi.",
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
      message: "Üretim kaydı güncellenemedi.",
    };
  }

  const recordDate = new Date(`${data.recordDate}T00:00:00.000Z`);

  const duplicateRecord = await prisma.productionRecord.findFirst({
    where: {
      id: {
        not: recordId,
      },
      recordDate,
      facilityProductId: data.facilityProductId,
      shiftId: data.shiftId,
    },
  });

  if (duplicateRecord) {
    return {
      errors: {
        recordDate: [
          "Bu tarih, tesis–ürün ve vardiya için başka bir üretim kaydı bulunuyor.",
        ],
      },
      message: "Üretim kaydı başka bir kayıtla çakışıyor.",
    };
  }

  try {
    await prisma.productionRecord.update({
      where: {
        id: recordId,
      },
      data: {
        recordDate,
        facilityProductId: data.facilityProductId,
        shiftId: data.shiftId,
        quantity: data.quantity,
        operatingMinutes: data.operatingMinutes,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("Üretim kaydı güncellenemedi:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  revalidatePath("/");
  revalidatePath("/production");

  redirect("/production");
}

export async function archiveProductionRecord(
  formData: FormData,
): Promise<void> {
  const recordId = Number(formData.get("recordId"));

  if (!Number.isInteger(recordId) || recordId <= 0) {
    return;
  }

  const productionRecord =
    await prisma.productionRecord.findUnique({
      where: {
        id: recordId,
      },
    });

  if (!productionRecord || productionRecord.archivedAt) {
    return;
  }

  await prisma.productionRecord.update({
    where: {
      id: recordId,
    },
    data: {
      archivedAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/production");
  revalidatePath("/products");
  revalidatePath("/targets");
}

export async function restoreProductionRecord(
  formData: FormData,
): Promise<void> {
  const recordId = Number(formData.get("recordId"));

  if (!Number.isInteger(recordId) || recordId <= 0) {
    return;
  }

  const productionRecord =
    await prisma.productionRecord.findUnique({
      where: {
        id: recordId,
      },
    });

  if (!productionRecord || !productionRecord.archivedAt) {
    return;
  }

  await prisma.productionRecord.update({
    where: {
      id: recordId,
    },
    data: {
      archivedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/production");
  revalidatePath("/products");
  revalidatePath("/targets");
}