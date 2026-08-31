import ExcelJS, { type Cell } from "exceljs";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

export type ParsedProductionRow = {
  rowNumber: number;
  recordDate: string | null;
  facilityCode: string;
  productCode: string;
  shiftCode: string;
  quantity: number | null;
  operatingMinutes: number | null;
  notes: string;
  errors: string[];
};

const expectedHeaders = [
  "Tarih",
  "Tesis Kodu",
  "Ürün Kodu",
  "Vardiya Kodu",
  "Üretim Miktarı",
  "Çalışma Süresi (dk)",
  "Not",
];

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function createIsoDate(
  year: number,
  month: number,
  day: number,
): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}

function parseDateCell(cell: Cell): string | null {
  const value = cell.value;

  if (value instanceof Date) {
    return createIsoDate(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  if (typeof value === "number") {
    const milliseconds =
      Date.UTC(1899, 11, 30) +
      Math.floor(value) * 24 * 60 * 60 * 1000;

    const date = new Date(milliseconds);

    return createIsoDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  const text = cell.text.trim();

  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (isoMatch) {
    return createIsoDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const turkishMatch = text.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/,
  );

  if (turkishMatch) {
    return createIsoDate(
      Number(turkishMatch[3]),
      Number(turkishMatch[2]),
      Number(turkishMatch[1]),
    );
  }

  return null;
}

function parseNumberCell(cell: Cell): number | null {
  if (typeof cell.value === "number") {
    return Number.isFinite(cell.value)
      ? cell.value
      : null;
  }

  const text = cell.text
    .trim()
    .replaceAll(" ", "");

  if (!text) {
    return null;
  }

  const normalized = text.includes(",")
    ? text.replaceAll(".", "").replace(",", ".")
    : text;

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

function rowIsEmpty(cells: Cell[]) {
  return cells.every((cell) => !cell.text.trim());
}

export async function parseProductionWorkbook(
  buffer: ArrayBuffer,
): Promise<ParsedProductionRow[]> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");
  }

  const actualHeaders = expectedHeaders.map((_, index) =>
    worksheet.getRow(1).getCell(index + 1).text,
  );

  const headerIsValid = expectedHeaders.every(
    (expectedHeader, index) =>
      normalizeHeader(actualHeaders[index]) ===
      normalizeHeader(expectedHeader),
  );

  if (!headerIsValid) {
    throw new Error(
      "Excel sütunları şablonla uyuşmuyor. Uygulamadaki üretim import şablonunu kullanın.",
    );
  }

  const rows: ParsedProductionRow[] = [];

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const worksheetRow = worksheet.getRow(rowNumber);

    const cells = expectedHeaders.map((_, index) =>
      worksheetRow.getCell(index + 1),
    );

    if (rowIsEmpty(cells)) {
      continue;
    }

    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new Error(
        `Tek dosyada en fazla ${MAX_IMPORT_ROWS.toLocaleString("tr-TR")} veri satırı bulunabilir.`,
      );
    }

    const recordDate = parseDateCell(cells[0]);
    const quantity = parseNumberCell(cells[4]);
    const operatingMinutes = parseNumberCell(cells[5]);

    const errors: string[] = [];

    if (!recordDate) {
      errors.push("Geçerli bir üretim tarihi girilmelidir.");
    }

    if (quantity === null || quantity <= 0) {
      errors.push("Üretim miktarı sıfırdan büyük olmalıdır.");
    }

    if (
      operatingMinutes === null ||
      !Number.isInteger(operatingMinutes) ||
      operatingMinutes < 1
    ) {
      errors.push(
        "Çalışma süresi en az 1 olan tam sayı olmalıdır.",
      );
    }

    const notes = cells[6].text.trim();

    if (notes.length > 1_000) {
      errors.push("Not alanı en fazla 1000 karakter olabilir.");
    }

    rows.push({
      rowNumber,
      recordDate,
      facilityCode: cells[1].text.trim().toUpperCase(),
      productCode: cells[2].text.trim().toUpperCase(),
      shiftCode: cells[3].text.trim().toUpperCase(),
      quantity,
      operatingMinutes,
      notes,
      errors,
    });
  }

  if (rows.length === 0) {
    throw new Error("Excel dosyasında içe aktarılacak veri bulunamadı.");
  }

  return rows;
}