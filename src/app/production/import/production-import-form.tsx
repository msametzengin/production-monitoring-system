"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useState,
} from "react";

type ImportRow = {
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

type ImportResult = {
  success: boolean;
  message: string;
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedRows: number;
  };
  rows?: ImportRow[];
};

function fileSignature(file: File) {
  return [
    file.name,
    file.size,
    file.lastModified,
  ].join(":");
}

export function ProductionImportForm() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] =
    useState<ImportResult | null>(null);
  const [previewSignature, setPreviewSignature] =
    useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<
    "preview" | "import" | null
  >(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const canImport =
    file !== null &&
    result?.success === true &&
    result.summary !== undefined &&
    result.summary.validRows > 0 &&
    result.summary.invalidRows === 0 &&
    previewSignature === fileSignature(file);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setResult(null);
    setPreviewSignature(null);
  }

  async function sendFile(
    mode: "preview" | "import",
  ) {
    if (!file || pendingMode) {
      return;
    }

    setPendingMode(mode);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("mode", mode);

    try {
      const response = await fetch(
        "/api/imports/production",
        {
          method: "POST",
          body: formData,
        },
      );

      const payload =
        (await response.json()) as ImportResult;

      setResult(payload);

      if (mode === "preview") {
        setPreviewSignature(fileSignature(file));
      }

      if (
        mode === "import" &&
        response.ok &&
        payload.success
      ) {
        setFile(null);
        setPreviewSignature(null);
        setFileInputKey((current) => current + 1);
        router.refresh();
      }
    } catch (error) {
      console.error("Excel import isteği başarısız:", error);

      setResult({
        success: false,
        message:
          "Sunucuyla iletişim kurulamadı. Geliştirme sunucusunun çalıştığını kontrol edin.",
      });
    } finally {
      setPendingMode(null);
    }
  }

  async function handlePreview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    await sendFile("preview");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handlePreview}
        className="rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label
              htmlFor="production-import-file"
              className="block text-sm font-medium text-slate-200"
            >
              Üretim Excel dosyası
            </label>

            <input
              key={fileInputKey}
              id="production-import-file"
              name="file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
            />

            <p className="mt-2 text-xs text-slate-400">
              Yalnızca .xlsx dosyaları kabul edilir.
              En fazla 5 MB ve 5.000 veri satırı.
            </p>
          </div>

          <button
            type="submit"
            disabled={!file || pendingMode !== null}
            className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingMode === "preview"
              ? "Kontrol ediliyor..."
              : "Dosyayı kontrol et"}
          </button>
        </div>
      </form>

      {result && (
        <section className="space-y-5">
          <div
            className={
              result.success
                ? "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                : "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            }
          >
            {result.message}
          </div>

          {result.summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Toplam satır"
                value={result.summary.totalRows}
              />

              <SummaryCard
                label="Geçerli"
                value={result.summary.validRows}
                color="text-emerald-400"
              />

              <SummaryCard
                label="Hatalı"
                value={result.summary.invalidRows}
                color={
                  result.summary.invalidRows > 0
                    ? "text-red-400"
                    : "text-slate-100"
                }
              />

              <SummaryCard
                label="İçe aktarılan"
                value={result.summary.importedRows}
                color="text-sky-400"
              />
            </div>
          )}

          {result.rows && result.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Satır</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Tesis</th>
                    <th className="px-4 py-3">Ürün</th>
                    <th className="px-4 py-3">Vardiya</th>
                    <th className="px-4 py-3 text-right">
                      Üretim
                    </th>
                    <th className="px-4 py-3 text-right">
                      Çalışma
                    </th>
                    <th className="px-4 py-3">Sonuç</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {result.rows
                    .slice(0, 100)
                    .map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.errors.length > 0
                            ? "bg-red-500/5"
                            : ""
                        }
                      >
                        <td className="px-4 py-3">
                          {row.rowNumber}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.recordDate ?? "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.facilityCode || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.productCode || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.shiftCode || "—"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {row.quantity ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {row.operatingMinutes !== null
                            ? `${row.operatingMinutes} dk`
                            : "—"}
                        </td>

                        <td className="min-w-72 px-4 py-3">
                          {row.errors.length === 0 ? (
                            <span className="text-emerald-400">
                              Geçerli
                            </span>
                          ) : (
                            <ul className="space-y-1 text-red-400">
                              {row.errors.map(
                                (error, index) => (
                                  <li
                                    key={`${row.rowNumber}-${index}`}
                                  >
                                    {error}
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {result.rows.length > 100 && (
                <p className="border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
                  Önizlemede ilk 100 satır gösteriliyor.
                  Bütün satırlar sunucuda kontrol edildi.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/production"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              Üretim kayıtlarına dön
            </Link>

            <button
              type="button"
              disabled={!canImport || pendingMode !== null}
              onClick={() => sendFile("import")}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingMode === "import"
                ? "İçe aktarılıyor..."
                : "Geçerli kayıtları içe aktar"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-slate-100",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>

      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {value.toLocaleString("tr-TR")}
      </p>
    </div>
  );
}