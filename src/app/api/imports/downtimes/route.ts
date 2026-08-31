import { prisma } from "@/lib/prisma";
import {
  MAX_IMPORT_FILE_BYTES,
} from "@/lib/imports/production";
import {
  parseDowntimeWorkbook,
  type ParsedDowntimeRow,
} from "@/lib/imports/downtimes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckedDowntimeRow = ParsedDowntimeRow & {
  facilityId?: number;
  downtimeReasonId?: number;
  durationMinutes?: number;
};

function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, message },
    { status },
  );
}

function toDate(value: string) {
  return new Date(`${value}:00.000Z`);
}

function intervalsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return (
    firstStart < secondEnd &&
    firstEnd > secondStart
  );
}

async function checkRows(
  rows: ParsedDowntimeRow[],
): Promise<CheckedDowntimeRow[]> {
  const [facilities, reasons] = await Promise.all([
    prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
      },
    }),

    prisma.downtimeReason.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
      },
    }),
  ]);

  const facilityMap = new Map(
    facilities.map((facility) => [
      facility.code.toUpperCase(),
      facility.id,
    ]),
  );

  const reasonMap = new Map(
    reasons.map((reason) => [
      reason.code.toUpperCase(),
      reason.id,
    ]),
  );

  const checkedRows: CheckedDowntimeRow[] = rows.map(
    (row) => {
      const checkedRow: CheckedDowntimeRow = {
        ...row,
        errors: [...row.errors],
      };

      if (!row.facilityCode) {
        checkedRow.errors.push("Tesis kodu zorunludur.");
      }

      if (!row.reasonCode) {
        checkedRow.errors.push(
          "Duruş nedeni kodu zorunludur.",
        );
      }

      const facilityId = facilityMap.get(
        row.facilityCode,
      );

      const reasonId = reasonMap.get(row.reasonCode);

      if (row.facilityCode && !facilityId) {
        checkedRow.errors.push(
          "Aktif tesis bulunamadı.",
        );
      }

      if (row.reasonCode && !reasonId) {
        checkedRow.errors.push(
          "Aktif duruş nedeni bulunamadı.",
        );
      }

      checkedRow.facilityId = facilityId;
      checkedRow.downtimeReasonId = reasonId;

      if (row.startedAt && row.endedAt) {
        checkedRow.durationMinutes = Math.round(
          (toDate(row.endedAt).getTime() -
            toDate(row.startedAt).getTime()) /
            60_000,
        );
      }

      return checkedRow;
    },
  );

  for (
    let index = 0;
    index < checkedRows.length;
    index += 1
  ) {
    const row = checkedRows[index];

    if (
      !row.facilityId ||
      !row.startedAt ||
      !row.endedAt
    ) {
      continue;
    }

    const overlappingRow = checkedRows
      .slice(0, index)
      .find(
        (previous) =>
          previous.facilityId === row.facilityId &&
          previous.startedAt !== null &&
          previous.endedAt !== null &&
          intervalsOverlap(
            previous.startedAt,
            previous.endedAt,
            row.startedAt!,
            row.endedAt!,
          ),
      );

    if (overlappingRow) {
      row.errors.push(
        "Dosyada aynı tesise ait başka bir duruşla çakışıyor.",
      );
    }
  }

  const resolvableRows = checkedRows.filter(
    (row) =>
      row.facilityId &&
      row.startedAt &&
      row.endedAt,
  );

  if (resolvableRows.length === 0) {
    return checkedRows;
  }

  const earliestStart = resolvableRows.reduce(
    (minimum, row) =>
      row.startedAt! < minimum
        ? row.startedAt!
        : minimum,
    resolvableRows[0].startedAt!,
  );

  const latestEnd = resolvableRows.reduce(
    (maximum, row) =>
      row.endedAt! > maximum
        ? row.endedAt!
        : maximum,
    resolvableRows[0].endedAt!,
  );

  const existingRecords =
    await prisma.downtimeRecord.findMany({
      where: {
        facilityId: {
          in: [
            ...new Set(
              resolvableRows.map(
                (row) => row.facilityId!,
              ),
            ),
          ],
        },
        startedAt: {
          lt: toDate(latestEnd),
        },
        endedAt: {
          gt: toDate(earliestStart),
        },
      },
      select: {
        facilityId: true,
        startedAt: true,
        endedAt: true,
      },
    });

  for (const row of checkedRows) {
    if (
      !row.facilityId ||
      !row.startedAt ||
      !row.endedAt
    ) {
      continue;
    }

    const overlap = existingRecords.find(
      (record) =>
        record.facilityId === row.facilityId &&
        record.startedAt < toDate(row.endedAt!) &&
        record.endedAt > toDate(row.startedAt!),
    );

    if (overlap) {
      row.errors.push(
        "Veritabanındaki başka bir duruş kaydıyla çakışıyor.",
      );
    }
  }

  return checkedRows;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode");

  if (!(file instanceof File)) {
    return errorResponse("Bir Excel dosyası seçmelisiniz.");
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return errorResponse(
      "Yalnızca .xlsx dosyaları kabul edilir.",
    );
  }

  if (file.size === 0) {
    return errorResponse("Seçilen dosya boş.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return errorResponse(
      "Excel dosyası en fazla 5 MB olabilir.",
      413,
    );
  }

  if (mode !== "preview" && mode !== "import") {
    return errorResponse("Geçersiz import işlemi.");
  }

  let rows: ParsedDowntimeRow[];

  try {
    rows = await parseDowntimeWorkbook(
      await file.arrayBuffer(),
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Excel dosyası okunamadı.",
    );
  }

  const checkedRows = await checkRows(rows);

  const validRows = checkedRows.filter(
    (row) => row.errors.length === 0,
  );

  const invalidRows =
    checkedRows.length - validRows.length;

  const result = {
    success: true,
    message:
      mode === "preview"
        ? "Duruş Excel dosyası kontrol edildi."
        : "Duruş kayıtları içe aktarıldı.",
    summary: {
      totalRows: checkedRows.length,
      validRows: validRows.length,
      invalidRows,
      importedRows: 0,
    },
    rows: checkedRows.map((row) => ({
      rowNumber: row.rowNumber,
      values: {
        facilityCode: row.facilityCode,
        reasonCode: row.reasonCode,
        type:
          row.type === "PLANNED"
            ? "Planlı"
            : row.type === "UNPLANNED"
              ? "Plansız"
              : "",
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationMinutes:
          row.durationMinutes ?? null,
      },
      errors: row.errors,
    })),
  };

  if (mode === "preview") {
    return Response.json(result);
  }

  if (invalidRows > 0) {
    await prisma.importBatch.create({
      data: {
        resource: "DOWNTIME",
        status: "FAILED",
        fileName: file.name,
        totalRows: checkedRows.length,
        validRows: validRows.length,
        invalidRows,
        importedRows: 0,
        completedAt: new Date(),
        errorSummary: {
          rows: checkedRows
            .filter((row) => row.errors.length > 0)
            .slice(0, 25)
            .map((row) => ({
              rowNumber: row.rowNumber,
              errors: row.errors,
            })),
        },
      },
    });

    return Response.json(
      {
        ...result,
        success: false,
        message:
          "Hatalı duruşlar bulunduğu için hiçbir kayıt eklenmedi.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.downtimeRecord.createMany({
        data: validRows.map((row) => ({
          facilityId: row.facilityId!,
          downtimeReasonId:
            row.downtimeReasonId!,
          type: row.type!,
          startedAt: toDate(row.startedAt!),
          endedAt: toDate(row.endedAt!),
          durationMinutes:
            row.durationMinutes!,
          source: "EXCEL_IMPORT",
          notes: row.notes || null,
        })),
      }),

      prisma.importBatch.create({
        data: {
          resource: "DOWNTIME",
          status: "COMPLETED",
          fileName: file.name,
          totalRows: checkedRows.length,
          validRows: validRows.length,
          invalidRows: 0,
          importedRows: validRows.length,
          completedAt: new Date(),
        },
      }),
    ]);
  } catch (error) {
    console.error("Duruş Excel importu başarısız:", error);

    return errorResponse(
      "Veritabanı işlemi tamamlanamadı. Hiçbir duruş eklenmedi.",
      500,
    );
  }

  return Response.json({
    ...result,
    summary: {
      ...result.summary,
      importedRows: validRows.length,
    },
  });
}