import { prisma } from "@/lib/prisma";
import {
  MAX_IMPORT_FILE_BYTES,
} from "@/lib/imports/production";
import {
  parseTargetWorkbook,
  type ParsedTargetRow,
} from "@/lib/imports/targets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckedTargetRow = ParsedTargetRow & {
  facilityProductId?: number;
};

function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, message },
    { status },
  );
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function intervalsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return (
    firstStart <= secondEnd &&
    firstEnd >= secondStart
  );
}

async function checkRows(
  rows: ParsedTargetRow[],
): Promise<CheckedTargetRow[]> {
  const facilityProducts =
    await prisma.facilityProduct.findMany({
      where: {
        isActive: true,
        facility: { isActive: true },
        product: { isActive: true },
      },
      select: {
        id: true,
        facility: {
          select: { code: true },
        },
        product: {
          select: { code: true },
        },
      },
    });

  const relationMap = new Map(
    facilityProducts.map((relation) => [
      [
        relation.facility.code.toUpperCase(),
        relation.product.code.toUpperCase(),
      ].join("|"),
      relation.id,
    ]),
  );

  const checkedRows: CheckedTargetRow[] = rows.map(
    (row) => {
      const checkedRow: CheckedTargetRow = {
        ...row,
        errors: [...row.errors],
      };

      if (!row.facilityCode) {
        checkedRow.errors.push("Tesis kodu zorunludur.");
      }

      if (!row.productCode) {
        checkedRow.errors.push("Ürün kodu zorunludur.");
      }

      const relationId = relationMap.get(
        [row.facilityCode, row.productCode].join("|"),
      );

      if (
        row.facilityCode &&
        row.productCode &&
        !relationId
      ) {
        checkedRow.errors.push(
          "Aktif tesis–ürün ilişkisi bulunamadı.",
        );
      }

      checkedRow.facilityProductId = relationId;

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
      !row.facilityProductId ||
      !row.period ||
      !row.startDate ||
      !row.endDate
    ) {
      continue;
    }

    const previousRows = checkedRows.slice(0, index);

    const exactDuplicate = previousRows.find(
      (previous) =>
        previous.facilityProductId ===
          row.facilityProductId &&
        previous.period === row.period &&
        previous.startDate === row.startDate &&
        previous.endDate === row.endDate,
    );

    if (exactDuplicate) {
      row.errors.push(
        "Aynı hedef dosyada birden fazla kez bulunuyor.",
      );
      continue;
    }

    if (row.isActive) {
      const overlappingRow = previousRows.find(
        (previous) =>
          previous.isActive === true &&
          previous.facilityProductId ===
            row.facilityProductId &&
          previous.period === row.period &&
          previous.startDate !== null &&
          previous.endDate !== null &&
          intervalsOverlap(
            previous.startDate,
            previous.endDate,
            row.startDate!,
            row.endDate!,
          ),
      );

      if (overlappingRow) {
        row.errors.push(
          "Dosyada aynı döneme ait başka bir aktif hedefle çakışıyor.",
        );
      }
    }
  }

  const resolvableRows = checkedRows.filter(
    (row) =>
      row.facilityProductId &&
      row.period &&
      row.startDate &&
      row.endDate,
  );

  if (resolvableRows.length === 0) {
    return checkedRows;
  }

  const earliestStart = resolvableRows.reduce(
    (minimum, row) =>
      row.startDate! < minimum
        ? row.startDate!
        : minimum,
    resolvableRows[0].startDate!,
  );

  const latestEnd = resolvableRows.reduce(
    (maximum, row) =>
      row.endDate! > maximum
        ? row.endDate!
        : maximum,
    resolvableRows[0].endDate!,
  );

  const existingTargets =
    await prisma.productionTarget.findMany({
      where: {
        facilityProductId: {
          in: [
            ...new Set(
              resolvableRows.map(
                (row) => row.facilityProductId!,
              ),
            ),
          ],
        },
        startDate: {
          lte: toDate(latestEnd),
        },
        endDate: {
          gte: toDate(earliestStart),
        },
      },
      select: {
        facilityProductId: true,
        period: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

  for (const row of checkedRows) {
    if (
      !row.facilityProductId ||
      !row.period ||
      !row.startDate ||
      !row.endDate
    ) {
      continue;
    }

    const exactTarget = existingTargets.find(
      (target) =>
        target.facilityProductId ===
          row.facilityProductId &&
        target.period === row.period &&
        target.startDate.toISOString().slice(0, 10) ===
          row.startDate &&
        target.endDate.toISOString().slice(0, 10) ===
          row.endDate,
    );

    if (exactTarget) {
      row.errors.push(
        "Bu hedef veritabanında zaten bulunuyor.",
      );
      continue;
    }

    if (row.isActive) {
      const overlappingTarget = existingTargets.find(
        (target) =>
          target.isActive &&
          target.facilityProductId ===
            row.facilityProductId &&
          target.period === row.period &&
          target.startDate <= toDate(row.endDate!) &&
          target.endDate >= toDate(row.startDate!),
      );

      if (overlappingTarget) {
        row.errors.push(
          "Veritabanındaki başka bir aktif hedefle çakışıyor.",
        );
      }
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

  let rows: ParsedTargetRow[];

  try {
    rows = await parseTargetWorkbook(
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
        ? "Hedef Excel dosyası kontrol edildi."
        : "Üretim hedefleri içe aktarıldı.",
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
        productCode: row.productCode,
        period: row.period ?? "",
        startDate: row.startDate,
        endDate: row.endDate,
        targetQuantity: row.targetQuantity,
        isActive:
          row.isActive === null
            ? ""
            : row.isActive
              ? "Evet"
              : "Hayır",
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
        resource: "TARGET",
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
          "Hatalı hedefler bulunduğu için hiçbir kayıt eklenmedi.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.productionTarget.createMany({
        data: validRows.map((row) => ({
          facilityProductId:
            row.facilityProductId!,
          period: row.period!,
          startDate: toDate(row.startDate!),
          endDate: toDate(row.endDate!),
          targetQuantity: row.targetQuantity!,
          isActive: row.isActive!,
          notes: row.notes || null,
        })),
      }),

      prisma.importBatch.create({
        data: {
          resource: "TARGET",
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
    console.error("Hedef Excel importu başarısız:", error);

    return errorResponse(
      "Veritabanı işlemi tamamlanamadı. Hiçbir hedef eklenmedi.",
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