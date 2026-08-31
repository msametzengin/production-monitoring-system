import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Üretim Analiz ve Takip Sistemi";

  const worksheet = workbook.addWorksheet(
    "Hedef Import Şablonu",
    {
      views: [{ state: "frozen", ySplit: 1 }],
    },
  );

  worksheet.columns = [
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
    { header: "Dönem", key: "period", width: 18 },
    {
      header: "Başlangıç Tarihi",
      key: "startDate",
      width: 20,
    },
    {
      header: "Bitiş Tarihi",
      key: "endDate",
      width: 20,
    },
    {
      header: "Hedef Miktarı",
      key: "targetQuantity",
      width: 20,
    },
    { header: "Aktif", key: "isActive", width: 14 },
    { header: "Not", key: "notes", width: 42 },
  ];

  worksheet.addRow({
    facilityCode: "EMT-01",
    productCode: "BRK-001",
    period: "Günlük",
    startDate: new Date(Date.UTC(2026, 8, 1)),
    endDate: new Date(Date.UTC(2026, 8, 1)),
    targetQuantity: 400,
    isActive: "EVET",
    notes: "Örnek satırdır; kullanmadan önce düzenleyin.",
  });

  worksheet.getColumn("startDate").numFmt = "dd.mm.yyyy";
  worksheet.getColumn("endDate").numFmt = "dd.mm.yyyy";
  worksheet.getColumn("targetQuantity").numFmt =
    "#,##0.000";

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  };

  const headerRow = worksheet.getRow(1);

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
  });

  const info = workbook.addWorksheet("Açıklamalar");

  info.columns = [
    { key: "field", width: 24 },
    { key: "description", width: 80 },
  ];

  info.addRows([
    {
      field: "Dönem",
      description:
        "Günlük, Haftalık, Aylık veya Özel yazılmalıdır.",
    },
    {
      field: "Günlük hedef",
      description:
        "Başlangıç ve bitiş tarihleri aynı olmalıdır.",
    },
    {
      field: "Aktif",
      description: "EVET veya HAYIR yazılmalıdır.",
    },
    {
      field: "Çakışma",
      description:
        "Aynı tesis–ürün ve dönemde aktif hedefler tarih olarak çakışamaz.",
    },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="hedef-import-sablonu.xlsx"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}