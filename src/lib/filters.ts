import { z } from "zod";

export type FilterSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function getQueryValue(
  params: FilterSearchParams,
  name: string,
) {
  const value = params[name];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const filterSearchSchema = z
  .string()
  .trim()
  .max(100, "Arama metni en fazla 100 karakter olabilir.");

export const filterIdSchema = z.string().refine(
  (value) =>
    value === "" ||
    (/^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value)) &&
      Number(value) <= 2_147_483_647),
  "Filtrelerde geçersiz bir kayıt seçimi var.",
);

export const filterDateSchema = z.string().refine(
  (value) => {
    if (value === "") {
      return true;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value < "1000-01-01"
    ) {
      return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  },
  "Geçerli bir filtre tarihi seçmelisiniz.",
);