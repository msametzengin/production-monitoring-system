"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { downtimeRecordSchema } from "@/lib/validations/downtime-record";

export type DowntimeRecordFormState = {
  errors?: {
    facilityId?: string[];
    downtimeReasonId?: string[];
    type?: string[];
    startedAt?: string[];
    endedAt?: string[];
    notes?: string[];
  };
  message?: string;
};

function getDowntimeRecordFormData(formData: FormData) {
  return {
    facilityId: formData.get("facilityId"),
    downtimeReasonId: formData.get("downtimeReasonId"),
    type: formData.get("type"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    notes: formData.get("notes") ?? "",
  };
}

function createUtcDateTime(value: string) {
  return new Date(`${value}:00.000Z`);
}

function calculateDurationMinutes(
  startedAt: Date,
  endedAt: Date,
) {
  return Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 60_000,
  );
}

function revalidateDowntimePages() {
  revalidatePath("/");
  revalidatePath("/facilities");
  revalidatePath("/downtimes");
}

async function findOverlappingDowntime(
  facilityId: number,
  startedAt: Date,
  endedAt: Date,
  ignoredRecordId?: number,
) {
  return prisma.downtimeRecord.findFirst({
    where: {
      id:
        ignoredRecordId === undefined
          ? undefined
          : {
              not: ignoredRecordId,
            },
      facilityId,
      startedAt: {
        lt: endedAt,
      },
      endedAt: {
        gt: startedAt,
      },
    },
  });
}

export async function createDowntimeRecord(
  _previousState: DowntimeRecordFormState,
  formData: FormData,
): Promise<DowntimeRecordFormState> {
  const validationResult = downtimeRecordSchema.safeParse(
    getDowntimeRecordFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const data = validationResult.data;
  const startedAt = createUtcDateTime(data.startedAt);
  const endedAt = createUtcDateTime(data.endedAt);

  const [facility, downtimeReason] = await Promise.all([
    prisma.facility.findUnique({
      where: {
        id: data.facilityId,
      },
    }),

    prisma.downtimeReason.findUnique({
      where: {
        id: data.downtimeReasonId,
      },
    }),
  ]);

  if (!facility || !facility.isActive) {
    return {
      errors: {
        facilityId: [
          "Seçilen tesis bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim duruşu oluşturulamadı.",
    };
  }

  if (!downtimeReason || !downtimeReason.isActive) {
    return {
      errors: {
        downtimeReasonId: [
          "Seçilen duruş nedeni bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim duruşu oluşturulamadı.",
    };
  }

  const overlappingRecord =
    await findOverlappingDowntime(
      data.facilityId,
      startedAt,
      endedAt,
    );

  if (overlappingRecord) {
    return {
      errors: {
        endedAt: [
          "Bu zaman aralığı tesisteki başka bir duruş kaydıyla çakışıyor.",
        ],
      },
      message: "Çakışan üretim duruşu oluşturulamaz.",
    };
  }

  const durationMinutes = calculateDurationMinutes(
    startedAt,
    endedAt,
  );

  try {
    await prisma.downtimeRecord.create({
      data: {
        facilityId: data.facilityId,
        downtimeReasonId: data.downtimeReasonId,
        type: data.type,
        startedAt,
        endedAt,
        durationMinutes,
        source: "MANUAL",
        notes: data.notes ?? null,
      },
    });
  } catch (error) {
    console.error("Üretim duruşu oluşturulamadı:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateDowntimePages();
  redirect("/downtimes");
}

export async function updateDowntimeRecord(
  recordId: number,
  _previousState: DowntimeRecordFormState,
  formData: FormData,
): Promise<DowntimeRecordFormState> {
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return {
      message: "Geçersiz üretim duruşu kaydı.",
    };
  }

  const validationResult = downtimeRecordSchema.safeParse(
    getDowntimeRecordFormData(formData),
  );

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Lütfen formdaki hatalı alanları kontrol edin.",
    };
  }

  const currentRecord =
    await prisma.downtimeRecord.findUnique({
      where: {
        id: recordId,
      },
    });

  if (!currentRecord) {
    return {
      message: "Düzenlenmek istenen duruş kaydı bulunamadı.",
    };
  }

  const data = validationResult.data;
  const startedAt = createUtcDateTime(data.startedAt);
  const endedAt = createUtcDateTime(data.endedAt);

  const [facility, downtimeReason] = await Promise.all([
    prisma.facility.findUnique({
      where: {
        id: data.facilityId,
      },
    }),

    prisma.downtimeReason.findUnique({
      where: {
        id: data.downtimeReasonId,
      },
    }),
  ]);

  if (
    !facility ||
    (!facility.isActive &&
      facility.id !== currentRecord.facilityId)
  ) {
    return {
      errors: {
        facilityId: [
          "Seçilen tesis bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim duruşu güncellenemedi.",
    };
  }

  if (
    !downtimeReason ||
    (!downtimeReason.isActive &&
      downtimeReason.id !==
        currentRecord.downtimeReasonId)
  ) {
    return {
      errors: {
        downtimeReasonId: [
          "Seçilen duruş nedeni bulunamadı veya aktif değil.",
        ],
      },
      message: "Üretim duruşu güncellenemedi.",
    };
  }

  const overlappingRecord =
    await findOverlappingDowntime(
      data.facilityId,
      startedAt,
      endedAt,
      recordId,
    );

  if (overlappingRecord) {
    return {
      errors: {
        endedAt: [
          "Bu zaman aralığı tesisteki başka bir duruş kaydıyla çakışıyor.",
        ],
      },
      message: "Üretim duruşu güncellenemedi.",
    };
  }

  const durationMinutes = calculateDurationMinutes(
    startedAt,
    endedAt,
  );

  try {
    await prisma.downtimeRecord.update({
      where: {
        id: recordId,
      },
      data: {
        facilityId: data.facilityId,
        downtimeReasonId: data.downtimeReasonId,
        type: data.type,
        startedAt,
        endedAt,
        durationMinutes,
        notes: data.notes ?? null,
      },
    });
  } catch (error) {
    console.error("Üretim duruşu güncellenemedi:", error);

    return {
      message:
        "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidateDowntimePages();
  redirect("/downtimes");
}