"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { downtimeReasonSchema } from "@/lib/validations/downtime-reason";

export type DowntimeReasonFormState = {
  errors?: {
    code?: string[];
    name?: string[];
    category?: string[];
    defaultType?: string[];
    description?: string[];
    isActive?: string[];
  };
  message?: string;
};

function getDowntimeReasonFormData(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    category: formData.get("category"),
    defaultType: formData.get("defaultType"),
    description: formData.get("description") ?? "",
    isActive: formData.get("isActive"),
  };
}

function revalidateDowntimeReasonPages() {
  revalidatePath("/");
  revalidatePath("/downtimes");
  revalidatePath("/downtimes/new");
  revalidatePath("/downtimes/reasons");
}

export async function createDowntimeReason(
  _previousState: DowntimeReasonFormState,
  formData: FormData,
): Promise<DowntimeReasonFormState> {
  const validationResult = downtimeReasonSchema.safeParse(
    getDowntimeReasonFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const data = validationResult.data;

  const existingReason =
    await prisma.downtimeReason.findUnique({
      where: {
        code: data.code,
      },
    });

  if (existingReason) {
    return {
      errors: {
        code: ["Bu duruş nedeni kodu zaten kullanılıyor."],
      },
      message: "Duruş nedeni oluşturulamadı.",
    };
  }

  try {
    await prisma.downtimeReason.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        defaultType: data.defaultType,
        description: data.description ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Duruş nedeni oluşturulamadı:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateDowntimeReasonPages();
  redirect("/downtimes/reasons");
}

export async function updateDowntimeReason(
  reasonId: number,
  _previousState: DowntimeReasonFormState,
  formData: FormData,
): Promise<DowntimeReasonFormState> {
  if (!Number.isInteger(reasonId) || reasonId <= 0) {
    return {
      message: "Geçersiz duruş nedeni kaydı.",
    };
  }

  const validationResult = downtimeReasonSchema.safeParse(
    getDowntimeReasonFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const currentReason =
    await prisma.downtimeReason.findUnique({
      where: {
        id: reasonId,
      },
    });

  if (!currentReason) {
    return {
      message: "Düzenlenmek istenen duruş nedeni bulunamadı.",
    };
  }

  const data = validationResult.data;

  const duplicateCode =
    await prisma.downtimeReason.findFirst({
      where: {
        id: {
          not: reasonId,
        },
        code: data.code,
      },
    });

  if (duplicateCode) {
    return {
      errors: {
        code: [
          "Bu kod başka bir duruş nedeni tarafından kullanılıyor.",
        ],
      },
      message: "Duruş nedeni güncellenemedi.",
    };
  }

  try {
    await prisma.downtimeReason.update({
      where: {
        id: reasonId,
      },
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        defaultType: data.defaultType,
        description: data.description ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Duruş nedeni güncellenemedi:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateDowntimeReasonPages();
  redirect("/downtimes/reasons");
}