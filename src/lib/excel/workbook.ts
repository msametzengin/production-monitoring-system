import ExcelJS, { type CellValue } from "exceljs";

export type ExcelColumn = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
};

export type ExcelRow = Record<string, CellValue>;

type ExcelExportOptions = {
  title: string;
  sheetName: string;
  filePrefix: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
  filters: { label: string; value: string }[];
};

export async function createExcelResponse({
  title,
  sheetName,
  filePrefix,
  columns,
  rows,
  filters,
}: ExcelExportOptions) {
  const workbook = new ExcelJS.Workbook();
  const createdAt = new Date();

  workbook.creator = "Üretim Analiz ve Takip Sistemi";
  workbook.created = createdAt;
  workbook.modified = createdAt;

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  worksheet.addRows(rows);
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
  });

  for (const column of columns) {
    if (column.numFmt) {
      worksheet.getColumn(column.key).numFmt = column.numFmt;
    }
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }
  });

  const info = workbook.addWorksheet("Rapor Bilgileri");

  info.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 55 },
  ];

  info.addRows([
    { label: "Rapor", value: title },
    { label: "Oluşturulma zamanı", value: createdAt },
    { label: "Kayıt sayısı", value: rows.length },
    { label: "", value: "" },
    { label: "Uygulanan filtre", value: "Değer" },
    ...filters.map((filter) => ({
      label: filter.label,
      value: filter.value,
    })),
  ]);

  info.getCell("B2").numFmt = "dd.mm.yyyy hh:mm:ss";
  info.getRow(5).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  info.getRow(5).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF334155" },
  };

  info.views = [{ state: "frozen", ySplit: 5 }];

  const buffer = await workbook.xlsx.writeBuffer();

  const timestamp = createdAt
    .toISOString()
    .slice(0, 19)
    .replaceAll(":", "-");

  const filename = filePrefix + "-" + timestamp + ".xlsx";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="' + filename + '"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}