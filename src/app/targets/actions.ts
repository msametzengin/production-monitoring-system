"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productionTargetSchema } from "@/lib/validations/production-target";

export type ProductionTargetFormState = {
  errors?: {
    facilityProductId?: string[];
    period?: string[];
    startDate?: string[];
    endDate?: string[];
    targetQuantity?: string[];
    notes?: string[];
    isActive?: string[];
  };
  message?: string;
};

function getProductionTargetFormData(formData: FormData) {
  return {
    facilityProductId: formData.get("facilityProductId"),
    period: formData.get("period"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    targetQuantity: formData.get("targetQuantity"),
    notes: formData.get("notes") ?? "",
    isActive: formData.get("isActive"),
  };
}

function createUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function revalidateTargetPages() {
  revalidatePath("/");
  revalidatePath("/targets");
  revalidatePath("/products");
}

async function validateFacilityProduct(
  facilityProductId: number,
) {
  return prisma.facilityProduct.findUnique({
    where: {
      id: facilityProductId,
    },
    include: {
      facility: true,
      product: true,
    },
  });
}

async function findExactTarget(
  facilityProductId: number,
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
  startDate: Date,
  endDate: Date,
  ignoredTargetId?: number,
) {
  return prisma.productionTarget.findFirst({
    where: {
      id:
        ignoredTargetId === undefined
          ? undefined
          : {
              not: ignoredTargetId,
            },
      facilityProductId,
      period,
      startDate,
      endDate,
    },
  });
}

async function findOverlappingActiveTarget(
  facilityProductId: number,
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
  startDate: Date,
  endDate: Date,
  ignoredTargetId?: number,
) {
  return prisma.productionTarget.findFirst({
    where: {
      id:
        ignoredTargetId === undefined
          ? undefined
          : {
              not: ignoredTargetId,
            },
      facilityProductId,
      period,
      isActive: true,
      startDate: {
        lte: endDate,
      },
      endDate: {
        gte: startDate,
      },
    },
  });
}

export async function createProductionTarget(
  _previousState: ProductionTargetFormState,
  formData: FormData,
): Promise<ProductionTargetFormState> {
  const validationResult = productionTargetSchema.safeParse(
    getProductionTargetFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const data = validationResult.data;
  const startDate = createUtcDate(data.startDate);
  const endDate = createUtcDate(data.endDate);

  const facilityProduct = await validateFacilityProduct(
    data.facilityProductId,
  );

  if (
    !facilityProduct ||
    !facilityProduct.isActive ||
    !facilityProduct.facility.isActive ||
    !facilityProduct.product.isActive
  ) {
    return {
      errors: {
        facilityProductId: [
          "Seçilen tesis–ürün ilişkisi bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim hedefi oluşturulamadı.",
    };
  }

  const exactTarget = await findExactTarget(
    data.facilityProductId,
    data.period,
    startDate,
    endDate,
  );

  if (exactTarget) {
    return {
      errors: {
        endDate: [
          "Bu tesis, ürün, dönem ve tarih aralığı için zaten bir hedef bulunuyor.",
        ],
      },
      message: "Aynı üretim hedefi ikinci kez oluşturulamaz.",
    };
  }

  if (data.isActive) {
    const overlappingTarget =
      await findOverlappingActiveTarget(
        data.facilityProductId,
        data.period,
        startDate,
        endDate,
      );

    if (overlappingTarget) {
      return {
        errors: {
          endDate: [
            "Seçilen tarih aralığı aynı dönemdeki başka bir aktif hedefle çakışıyor.",
          ],
        },
        message: "Çakışan aktif üretim hedefi oluşturulamaz.",
      };
    }
  }

  try {
    await prisma.productionTarget.create({
      data: {
        facilityProductId: data.facilityProductId,
        period: data.period,
        startDate,
        endDate,
        targetQuantity: data.targetQuantity,
        notes: data.notes ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Üretim hedefi oluşturulamadı:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateTargetPages();
  redirect("/targets");
}

export async function updateProductionTarget(
  targetId: number,
  _previousState: ProductionTargetFormState,
  formData: FormData,
): Promise<ProductionTargetFormState> {
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return {
      message: "Geçersiz üretim hedefi kaydı.",
    };
  }

  const validationResult = productionTargetSchema.safeParse(
    getProductionTargetFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const currentTarget =
    await prisma.productionTarget.findUnique({
      where: {
        id: targetId,
      },
    });

  if (!currentTarget) {
    return {
      message: "Düzenlenmek istenen üretim hedefi bulunamadı.",
    };
  }

  const data = validationResult.data;
  const startDate = createUtcDate(data.startDate);
  const endDate = createUtcDate(data.endDate);

  const facilityProduct = await validateFacilityProduct(
    data.facilityProductId,
  );

  const relationCanBeUsed =
    facilityProduct &&
    facilityProduct.isActive &&
    facilityProduct.facility.isActive &&
    facilityProduct.product.isActive;

  if (
    !relationCanBeUsed &&
    (data.facilityProductId !==
      currentTarget.facilityProductId ||
      data.isActive)
  ) {
    return {
      errors: {
        facilityProductId: [
          "Aktif bir hedef için aktif tesis–ürün ilişkisi seçmelisiniz.",
        ],
      },
      message: "Üretim hedefi güncellenemedi.",
    };
  }

  const exactTarget = await findExactTarget(
    data.facilityProductId,
    data.period,
    startDate,
    endDate,
    targetId,
  );

  if (exactTarget) {
    return {
      errors: {
        endDate: [
          "Bu tesis, ürün, dönem ve tarih aralığı için başka bir hedef bulunuyor.",
        ],
      },
      message: "Üretim hedefi güncellenemedi.",
    };
  }

  if (data.isActive) {
    const overlappingTarget =
      await findOverlappingActiveTarget(
        data.facilityProductId,
        data.period,
        startDate,
        endDate,
        targetId,
      );

    if (overlappingTarget) {
      return {
        errors: {
          endDate: [
            "Seçilen tarih aralığı aynı dönemdeki başka bir aktif hedefle çakışıyor.",
          ],
        },
        message: "Üretim hedefi güncellenemedi.",
      };
    }
  }

  try {
    await prisma.productionTarget.update({
      where: {
        id: targetId,
      },
      data: {
        facilityProductId: data.facilityProductId,
        period: data.period,
        startDate,
        endDate,
        targetQuantity: data.targetQuantity,
        notes: data.notes ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Üretim hedefi güncellenemedi:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateTargetPages();
  redirect("/targets");
}