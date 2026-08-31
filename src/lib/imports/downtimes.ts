import ExcelJS, { type Cell } from "exceljs";
import { MAX_IMPORT_ROWS } from "@/lib/imports/production";

export type ImportedDowntimeType =
  | "PLANNED"
  | "UNPLANNED";

export type ParsedDowntimeRow = {
  rowNumber: number;
  facilityCode: string;
  reasonCode: string;
  type: ImportedDowntimeType | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string;
  errors: string[];
};

const expectedHeaders = [
  "Tesis Kodu",
  "Neden Kodu",
  "Tür",
  "Başlangıç",
  "Bitiş",
  "Not",
];

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function createIsoDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string | null {
  const date = new Date(
    Date.UTC(year, month - 1, day, hour, minute),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return [
    year.toString().padStart(4, "0"),
    "-",
    month.toString().padStart(2, "0"),
    "-",
    day.toString().padStart(2, "0"),
    "T",
    hour.toString().padStart(2, "0"),
    ":",
    minute.toString().padStart(2, "0"),
  ].join("");
}

function parseDateTimeCell(cell: Cell): string | null {
  if (cell.value instanceof Date) {
    return createIsoDateTime(
      cell.value.getFullYear(),
      cell.value.getMonth() + 1,
      cell.value.getDate(),
      cell.value.getHours(),
      cell.value.getMinutes(),
    );
  }

  if (typeof cell.value === "number") {
    const date = new Date(
      Date.UTC(1899, 11, 30) +
        Math.round(cell.value * 86_400_000),
    );

    return createIsoDateTime(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    );
  }

  const text = cell.text.trim();

  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/,
  );

  if (isoMatch) {
    return createIsoDateTime(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
      Number(isoMatch[4]),
      Number(isoMatch[5]),
    );
  }

  const turkishMatch = text.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2}):(\d{2})$/,
  );

  if (turkishMatch) {
    return createIsoDateTime(
      Number(turkishMatch[3]),
      Number(turkishMatch[2]),
      Number(turkishMatch[1]),
      Number(turkishMatch[4]),
      Number(turkishMatch[5]),
    );
  }

  return null;
}

function parseType(
  value: string,
): ImportedDowntimeType | null {
  const normalized = value
    .trim()
    .toLocaleUpperCase("tr-TR");

  if (
    ["PLANLI", "PLANNED"].includes(normalized)
  ) {
    return "PLANNED";
  }

  if (
    ["PLANSIZ", "UNPLANNED"].includes(normalized)
  ) {
    return "UNPLANNED";
  }

  return null;
}

export async function parseDowntimeWorkbook(
  buffer: ArrayBuffer,
): Promise<ParsedDowntimeRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Excel çalışma sayfası bulunamadı.");
  }

  const headersValid = expectedHeaders.every(
    (expectedHeader, index) =>
      normalizeHeader(
        worksheet.getRow(1).getCell(index + 1).text,
      ) === normalizeHeader(expectedHeader),
  );

  if (!headersValid) {
    throw new Error(
      "Excel sütunları duruş import şablonuyla uyuşmuyor.",
    );
  }

  const rows: ParsedDowntimeRow[] = [];

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const worksheetRow = worksheet.getRow(rowNumber);

    const cells = expectedHeaders.map((_, index) =>
      worksheetRow.getCell(index + 1),
    );

    if (cells.every((cell) => !cell.text.trim())) {
      continue;
    }

    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new Error(
        `Tek dosyada en fazla ${MAX_IMPORT_ROWS.toLocaleString("tr-TR")} satır bulunabilir.`,
      );
    }

    const type = parseType(cells[2].text);
    const startedAt = parseDateTimeCell(cells[3]);
    const endedAt = parseDateTimeCell(cells[4]);
    const notes = cells[5].text.trim();
    const errors: string[] = [];

    if (!type) {
      errors.push("Tür Planlı veya Plansız olmalıdır.");
    }

    if (!startedAt) {
      errors.push(
        "Geçerli bir başlangıç tarihi ve saati girilmelidir.",
      );
    }

    if (!endedAt) {
      errors.push(
        "Geçerli bir bitiş tarihi ve saati girilmelidir.",
      );
    }

    if (
      startedAt &&
      endedAt &&
      endedAt <= startedAt
    ) {
      errors.push(
        "Bitiş zamanı başlangıç zamanından sonra olmalıdır.",
      );
    }

    if (notes.length > 1_000) {
      errors.push("Not en fazla 1000 karakter olabilir.");
    }

    rows.push({
      rowNumber,
      facilityCode:
        cells[0].text.trim().toUpperCase(),
      reasonCode:
        cells[1].text.trim().toUpperCase(),
      type,
      startedAt,
      endedAt,
      notes,
      errors,
    });
  }

  if (rows.length === 0) {
    throw new Error("İçe aktarılacak duruş bulunamadı.");
  }

  return rows;
}