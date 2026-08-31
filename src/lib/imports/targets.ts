import ExcelJS, { type Cell } from "exceljs";
import {
  MAX_IMPORT_ROWS,
} from "@/lib/imports/production";

export type TargetPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM";

export type ParsedTargetRow = {
  rowNumber: number;
  facilityCode: string;
  productCode: string;
  period: TargetPeriod | null;
  startDate: string | null;
  endDate: string | null;
  targetQuantity: number | null;
  isActive: boolean | null;
  notes: string;
  errors: string[];
};

const expectedHeaders = [
  "Tesis Kodu",
  "Ürün Kodu",
  "Dönem",
  "Başlangıç Tarihi",
  "Bitiş Tarihi",
  "Hedef Miktarı",
  "Aktif",
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
  if (cell.value instanceof Date) {
    return createIsoDate(
      cell.value.getFullYear(),
      cell.value.getMonth() + 1,
      cell.value.getDate(),
    );
  }

  if (typeof cell.value === "number") {
    const date = new Date(
      Date.UTC(1899, 11, 30) +
        Math.floor(cell.value) * 86_400_000,
    );

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

  const text = cell.text.trim().replaceAll(" ", "");

  if (!text) {
    return null;
  }

  const normalized = text.includes(",")
    ? text.replaceAll(".", "").replace(",", ".")
    : text;

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

function parsePeriod(value: string): TargetPeriod | null {
  const normalized = value
    .trim()
    .toLocaleUpperCase("tr-TR");

  const periods: Record<string, TargetPeriod> = {
    DAILY: "DAILY",
    GÜNLÜK: "DAILY",
    GUNLUK: "DAILY",
    WEEKLY: "WEEKLY",
    HAFTALIK: "WEEKLY",
    MONTHLY: "MONTHLY",
    AYLIK: "MONTHLY",
    CUSTOM: "CUSTOM",
    ÖZEL: "CUSTOM",
    OZEL: "CUSTOM",
    "ÖZEL DÖNEM": "CUSTOM",
    "OZEL DONEM": "CUSTOM",
  };

  return periods[normalized] ?? null;
}

function parseActive(value: string): boolean | null {
  const normalized = value
    .trim()
    .toLocaleUpperCase("tr-TR");

  if (
    ["EVET", "TRUE", "1", "AKTİF", "AKTIF"].includes(
      normalized,
    )
  ) {
    return true;
  }

  if (
    ["HAYIR", "FALSE", "0", "PASİF", "PASIF"].includes(
      normalized,
    )
  ) {
    return false;
  }

  return null;
}

export async function parseTargetWorkbook(
  buffer: ArrayBuffer,
): Promise<ParsedTargetRow[]> {
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
      "Excel sütunları hedef import şablonuyla uyuşmuyor.",
    );
  }

  const rows: ParsedTargetRow[] = [];

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const cells = expectedHeaders.map((_, index) =>
      row.getCell(index + 1),
    );

    if (cells.every((cell) => !cell.text.trim())) {
      continue;
    }

    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new Error(
        `Tek dosyada en fazla ${MAX_IMPORT_ROWS.toLocaleString("tr-TR")} satır bulunabilir.`,
      );
    }

    const period = parsePeriod(cells[2].text);
    const startDate = parseDateCell(cells[3]);
    const endDate = parseDateCell(cells[4]);
    const targetQuantity = parseNumberCell(cells[5]);
    const isActive = parseActive(cells[6].text);
    const notes = cells[7].text.trim();
    const errors: string[] = [];

    if (!period) {
      errors.push(
        "Dönem Günlük, Haftalık, Aylık veya Özel olmalıdır.",
      );
    }

    if (!startDate) {
      errors.push("Geçerli bir başlangıç tarihi girilmelidir.");
    }

    if (!endDate) {
      errors.push("Geçerli bir bitiş tarihi girilmelidir.");
    }

    if (startDate && endDate && endDate < startDate) {
      errors.push(
        "Bitiş tarihi başlangıç tarihinden önce olamaz.",
      );
    }

    if (
      period === "DAILY" &&
      startDate &&
      endDate &&
      startDate !== endDate
    ) {
      errors.push(
        "Günlük hedefte başlangıç ve bitiş aynı olmalıdır.",
      );
    }

    if (
      targetQuantity === null ||
      targetQuantity <= 0
    ) {
      errors.push("Hedef miktarı sıfırdan büyük olmalıdır.");
    }

    if (isActive === null) {
      errors.push(
        "Aktif alanı EVET veya HAYIR olmalıdır.",
      );
    }

    if (notes.length > 1_000) {
      errors.push("Not en fazla 1000 karakter olabilir.");
    }

    rows.push({
      rowNumber,
      facilityCode:
        cells[0].text.trim().toUpperCase(),
      productCode:
        cells[1].text.trim().toUpperCase(),
      period,
      startDate,
      endDate,
      targetQuantity,
      isActive,
      notes,
      errors,
    });
  }

  if (rows.length === 0) {
    throw new Error("İçe aktarılacak hedef bulunamadı.");
  }

  return rows;
}