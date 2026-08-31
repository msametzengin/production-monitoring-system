import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Üretim Analiz ve Takip Sistemi";

  const worksheet = workbook.addWorksheet(
    "Duruş Import Şablonu",
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
      header: "Neden Kodu",
      key: "reasonCode",
      width: 20,
    },
    { header: "Tür", key: "type", width: 16 },
    {
      header: "Başlangıç",
      key: "startedAt",
      width: 24,
    },
    {
      header: "Bitiş",
      key: "endedAt",
      width: 24,
    },
    { header: "Not", key: "notes", width: 42 },
  ];

  worksheet.addRow({
    facilityCode: "EMT-01",
    reasonCode: "BAKIM-001",
    type: "Planlı",
    startedAt: new Date(
      Date.UTC(2026, 8, 1, 9, 0),
    ),
    endedAt: new Date(
      Date.UTC(2026, 8, 1, 9, 15),
    ),
    notes: "Örnek satırdır; kullanmadan önce düzenleyin.",
  });

  worksheet.getColumn("startedAt").numFmt =
    "dd.mm.yyyy hh:mm";

  worksheet.getColumn("endedAt").numFmt =
    "dd.mm.yyyy hh:mm";

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 6 },
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
    { key: "field", width: 25 },
    { key: "description", width: 80 },
  ];

  info.addRows([
    {
      field: "Tür",
      description: "Planlı veya Plansız yazılmalıdır.",
    },
    {
      field: "Başlangıç / Bitiş",
      description:
        "Excel tarihi veya gg.aa.yyyy ss:dd biçimi kullanılabilir.",
    },
    {
      field: "Çakışma",
      description:
        "Aynı tesisteki duruş zamanları birbiriyle çakışamaz.",
    },
    {
      field: "Süre",
      description:
        "Süre başlangıç ve bitiş bilgilerinden otomatik hesaplanır.",
    },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="durus-import-sablonu.xlsx"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}