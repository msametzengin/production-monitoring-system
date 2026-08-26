"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { facilitySchema } from "@/lib/validations/facility";

export type FacilityFormState = {
  errors?: {
    code?: string[];
    name?: string[];
    location?: string[];
    description?: string[];
    dailyCapacity?: string[];
    capacityUnit?: string[];
    plannedDailyMinutes?: string[];
    isActive?: string[];
  };
  message?: string;
};

function getFacilityFormData(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location") ?? "",
    description: formData.get("description") ?? "",
    dailyCapacity: formData.get("dailyCapacity"),
    capacityUnit: formData.get("capacityUnit"),
    plannedDailyMinutes: formData.get("plannedDailyMinutes"),
    isActive: formData.get("isActive"),
  };
}

function revalidateFacilityPages() {
  revalidatePath("/");
  revalidatePath("/facilities");
  revalidatePath("/products");
  revalidatePath("/production");
  revalidatePath("/production/new");
}

export async function createFacility(
  _previousState: FacilityFormState,
  formData: FormData,
): Promise<FacilityFormState> {
  const validationResult = facilitySchema.safeParse(
    getFacilityFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const data = validationResult.data;

  const existingFacility = await prisma.facility.findUnique({
    where: {
      code: data.code,
    },
  });

  if (existingFacility) {
    return {
      errors: {
        code: ["Bu tesis kodu zaten kullanılıyor."],
      },
      message: "Tesis oluşturulamadı.",
    };
  }

  try {
    await prisma.facility.create({
      data: {
        code: data.code,
        name: data.name,
        location: data.location ?? null,
        description: data.description ?? null,
        dailyCapacity: data.dailyCapacity ?? null,
        capacityUnit: data.capacityUnit,
        plannedDailyMinutes: data.plannedDailyMinutes,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Tesis oluşturulamadı:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateFacilityPages();
  redirect("/facilities");
}

export async function updateFacility(
  facilityId: number,
  _previousState: FacilityFormState,
  formData: FormData,
): Promise<FacilityFormState> {
  if (!Number.isInteger(facilityId) || facilityId <= 0) {
    return {
      message: "Geçersiz tesis kaydı.",
    };
  }

  const validationResult = facilitySchema.safeParse(
    getFacilityFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const currentFacility = await prisma.facility.findUnique({
    where: {
      id: facilityId,
    },
  });

  if (!currentFacility) {
    return {
      message: "Düzenlenmek istenen tesis bulunamadı.",
    };
  }

  const data = validationResult.data;

  const duplicateCode = await prisma.facility.findFirst({
    where: {
      id: {
        not: facilityId,
      },
      code: data.code,
    },
  });

  if (duplicateCode) {
    return {
      errors: {
        code: ["Bu tesis kodu başka bir tesis tarafından kullanılıyor."],
      },
      message: "Tesis güncellenemedi.",
    };
  }

  try {
    await prisma.facility.update({
      where: {
        id: facilityId,
      },
      data: {
        code: data.code,
        name: data.name,
        location: data.location ?? null,
        description: data.description ?? null,
        dailyCapacity: data.dailyCapacity ?? null,
        capacityUnit: data.capacityUnit,
        plannedDailyMinutes: data.plannedDailyMinutes,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    console.error("Tesis güncellenemedi:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateFacilityPages();
  redirect("/facilities");
}