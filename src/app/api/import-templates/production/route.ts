import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Üretim Analiz ve Takip Sistemi";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(
    "Üretim Import Şablonu",
    {
      views: [{ state: "frozen", ySplit: 1 }],
    },
  );

  worksheet.columns = [
    { header: "Tarih", key: "date", width: 16 },
    {
      header: "Tesis Kodu",
      key: "facilityCode",
      width: 18,
    },
    {
      header: "Ürün Kodu",
      key: "productCode",
      width: 18,
    },
    {
      header: "Vardiya Kodu",
      key: "shiftCode",
      width: 18,
    },
    {
      header: "Üretim Miktarı",
      key: "quantity",
      width: 20,
    },
    {
      header: "Çalışma Süresi (dk)",
      key: "operatingMinutes",
      width: 24,
    },
    { header: "Not", key: "notes", width: 42 },
  ];

  worksheet.addRow({
    date: new Date(Date.UTC(2026, 7, 15)),
    facilityCode: "EMT-01",
    productCode: "BRK-001",
    shiftCode: "V1",
    quantity: 350.5,
    operatingMinutes: 450,
    notes: "Örnek satırdır; kullanmadan önce silin.",
  });

  worksheet.getColumn("date").numFmt = "dd.mm.yyyy";
  worksheet.getColumn("quantity").numFmt = "#,##0.000";

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 7 },
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

  const instructions = workbook.addWorksheet("Açıklamalar");

  instructions.columns = [
    { key: "field", width: 28 },
    { key: "description", width: 75 },
  ];

  instructions.addRows([
    {
      field: "Tarih",
      description:
        "Excel tarihi, gg.aa.yyyy veya yyyy-aa-gg biçiminde olmalıdır.",
    },
    {
      field: "Tesis Kodu",
      description:
        "Uygulamada kayıtlı ve aktif tesis kodu kullanılmalıdır.",
    },
    {
      field: "Ürün Kodu",
      description:
        "Tesise bağlı, aktif ürün kodu kullanılmalıdır.",
    },
    {
      field: "Vardiya Kodu",
      description:
        "Uygulamada kayıtlı ve aktif vardiya kodu kullanılmalıdır.",
    },
    {
      field: "Üretim Miktarı",
      description: "Sıfırdan büyük sayısal değer olmalıdır.",
    },
    {
      field: "Çalışma Süresi (dk)",
      description:
        "Tam sayı olmalı ve vardiyanın planlanan süresini aşmamalıdır.",
    },
    {
      field: "Not",
      description:
        "İsteğe bağlıdır ve en fazla 1000 karakter olabilir.",
    },
  ]);

  instructions.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="uretim-import-sablonu.xlsx"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}