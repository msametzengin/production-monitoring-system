import { prisma } from "@/lib/prisma";
import {
  MAX_IMPORT_FILE_BYTES,
  parseProductionWorkbook,
  type ParsedProductionRow,
} from "@/lib/imports/production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckedProductionRow = ParsedProductionRow & {
  facilityProductId?: number;
  shiftId?: number;
  plannedMinutes?: number;
};

function jsonError(message: string, status = 400) {
  return Response.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function checkRows(
  rows: ParsedProductionRow[],
): Promise<CheckedProductionRow[]> {
  const [facilityProducts, shifts] = await Promise.all([
    prisma.facilityProduct.findMany({
      where: {
        isActive: true,
        facility: { isActive: true },
        product: { isActive: true },
      },
      select: {
        id: true,
        facility: {
          select: {
            code: true,
          },
        },
        product: {
          select: {
            code: true,
          },
        },
      },
    }),

    prisma.shift.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        plannedMinutes: true,
      },
    }),
  ]);

  const facilityProductMap = new Map(
    facilityProducts.map((relation) => [
      [
        relation.facility.code.toUpperCase(),
        relation.product.code.toUpperCase(),
      ].join("|"),
      relation,
    ]),
  );

  const shiftMap = new Map(
    shifts.map((shift) => [
      shift.code.toUpperCase(),
      shift,
    ]),
  );

  const checkedRows: CheckedProductionRow[] = rows.map(
    (row) => {
      const checkedRow: CheckedProductionRow = {
        ...row,
        errors: [...row.errors],
      };

      if (!row.facilityCode) {
        checkedRow.errors.push("Tesis kodu zorunludur.");
      }

      if (!row.productCode) {
        checkedRow.errors.push("Ürün kodu zorunludur.");
      }

      if (!row.shiftCode) {
        checkedRow.errors.push("Vardiya kodu zorunludur.");
      }

      const facilityProduct = facilityProductMap.get(
        [row.facilityCode, row.productCode].join("|"),
      );

      if (
        row.facilityCode &&
        row.productCode &&
        !facilityProduct
      ) {
        checkedRow.errors.push(
          "Aktif tesis–ürün ilişkisi bulunamadı.",
        );
      }

      const shift = shiftMap.get(row.shiftCode);

      if (row.shiftCode && !shift) {
        checkedRow.errors.push(
          "Aktif vardiya bulunamadı.",
        );
      }

      if (
        shift &&
        row.operatingMinutes !== null &&
        row.operatingMinutes > shift.plannedMinutes
      ) {
        checkedRow.errors.push(
          `Çalışma süresi vardiyanın ${shift.plannedMinutes} dakikalık planlanan süresini aşamaz.`,
        );
      }

      checkedRow.facilityProductId = facilityProduct?.id;
      checkedRow.shiftId = shift?.id;
      checkedRow.plannedMinutes = shift?.plannedMinutes;

      return checkedRow;
    },
  );

  const fileKeys = new Set<string>();

  for (const row of checkedRows) {
    if (
      !row.recordDate ||
      !row.facilityProductId ||
      !row.shiftId
    ) {
      continue;
    }

    const key = [
      row.recordDate,
      row.facilityProductId,
      row.shiftId,
    ].join("|");

    if (fileKeys.has(key)) {
      row.errors.push(
        "Aynı tarih, tesis–ürün ve vardiya dosyada birden fazla kez bulunuyor.",
      );
    } else {
      fileKeys.add(key);
    }
  }

  const resolvableRows = checkedRows.filter(
    (row) =>
      row.recordDate &&
      row.facilityProductId &&
      row.shiftId,
  );

  if (resolvableRows.length === 0) {
    return checkedRows;
  }

  const dates = resolvableRows.map(
    (row) =>
      new Date(`${row.recordDate}T00:00:00.000Z`),
  );

  const facilityProductIds = [
    ...new Set(
      resolvableRows.map(
        (row) => row.facilityProductId!,
      ),
    ),
  ];

  const shiftIds = [
    ...new Set(
      resolvableRows.map((row) => row.shiftId!),
    ),
  ];

  const existingRecords =
    await prisma.productionRecord.findMany({
      where: {
        recordDate: {
          gte: new Date(
            Math.min(
              ...dates.map((date) => date.getTime()),
            ),
          ),
          lte: new Date(
            Math.max(
              ...dates.map((date) => date.getTime()),
            ),
          ),
        },
        facilityProductId: {
          in: facilityProductIds,
        },
        shiftId: {
          in: shiftIds,
        },
      },
      select: {
        recordDate: true,
        facilityProductId: true,
        shiftId: true,
        archivedAt: true,
      },
    });

  const existingMap = new Map(
    existingRecords.map((record) => [
      [
        dateKey(record.recordDate),
        record.facilityProductId,
        record.shiftId,
      ].join("|"),
      record,
    ]),
  );

  for (const row of checkedRows) {
    if (
      !row.recordDate ||
      !row.facilityProductId ||
      !row.shiftId
    ) {
      continue;
    }

    const existingRecord = existingMap.get(
      [
        row.recordDate,
        row.facilityProductId,
        row.shiftId,
      ].join("|"),
    );

    if (existingRecord?.archivedAt) {
      row.errors.push(
        "Bu satıra ait arşivlenmiş üretim kaydı bulunuyor.",
      );
    } else if (existingRecord) {
      row.errors.push(
        "Bu satıra ait üretim kaydı zaten bulunuyor.",
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
    return jsonError("Bir Excel dosyası seçmelisiniz.");
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return jsonError(
      "Yalnızca .xlsx uzantılı Excel dosyaları kabul edilir.",
    );
  }

  if (file.size === 0) {
    return jsonError("Seçilen Excel dosyası boş.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return jsonError(
      "Excel dosyası en fazla 5 MB olabilir.",
      413,
    );
  }

  if (mode !== "preview" && mode !== "import") {
    return jsonError("Geçersiz import işlemi.");
  }

  let rows: ParsedProductionRow[];

  try {
    rows = await parseProductionWorkbook(
      await file.arrayBuffer(),
    );
  } catch (error) {
    return jsonError(
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
        ? "Excel dosyası kontrol edildi."
        : "Üretim kayıtları içe aktarıldı.",
    summary: {
      totalRows: checkedRows.length,
      validRows: validRows.length,
      invalidRows,
      importedRows: 0,
    },
    rows: checkedRows.map((row) => ({
      rowNumber: row.rowNumber,
      recordDate: row.recordDate,
      facilityCode: row.facilityCode,
      productCode: row.productCode,
      shiftCode: row.shiftCode,
      quantity: row.quantity,
      operatingMinutes: row.operatingMinutes,
      notes: row.notes,
      errors: row.errors,
    })),
  };

  if (mode === "preview") {
    return Response.json(result);
  }

  if (invalidRows > 0) {
    await prisma.importBatch.create({
      data: {
        resource: "PRODUCTION",
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
          "Hatalı satırlar bulunduğu için hiçbir kayıt içe aktarılmadı.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.productionRecord.createMany({
        data: validRows.map((row) => ({
          recordDate: new Date(
            `${row.recordDate}T00:00:00.000Z`,
          ),
          facilityProductId: row.facilityProductId!,
          shiftId: row.shiftId!,
          quantity: row.quantity!,
          operatingMinutes: row.operatingMinutes!,
          source: "EXCEL_IMPORT",
          notes: row.notes || null,
        })),
      }),

      prisma.importBatch.create({
        data: {
          resource: "PRODUCTION",
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
    console.error("Üretim Excel importu başarısız:", error);

    return jsonError(
      "Veritabanı işlemi sırasında import tamamlanamadı. Hiçbir kayıt eklenmedi.",
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